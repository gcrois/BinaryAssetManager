import { ZipReader, ZipWriter, BlobReader, BlobWriter } from "@zip.js/zip.js";
import { File as FileReference } from "trask/proto/definitions.ts";
import { v4 as uuid } from "uuid";

export type FileID = `asset:${string}`;

function createFileID(): FileID {
	return `asset:${uuid()}`;
}

export interface AssetEntry extends Omit<FileReference, "type"> {
	id: FileID;
	url?: string;
	file: Blob;
}

class BinaryAssetManager {
	private dbName: string = "BinaryAssetManagerDB";
	private storeName: string = "binaryassets";
	private db: IDBDatabase | null = null;
	private urlCache: Map<string, string> = new Map();

	constructor() {}

	async initialize(): Promise<void> {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.dbName, 2);

			request.onerror = (ev) => {
				console.error(ev);
				reject(new Error("Failed to open database"));
			};

			request.onsuccess = (event) => {
				this.db = (event.target as IDBOpenDBRequest).result;
				console.log("Database opened", this.db);
				resolve();
			};

			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result;
				db.createObjectStore(this.storeName, { keyPath: "id" });
				this.db = db;
				console.log("Database upgraded", db);
			};
		});
	}

	async addFile(file: File | Blob, name?: string): Promise<AssetEntry["id"]> {
		const id = createFileID();
		console.log("trying to add file", id);

		if (!this.db) throw new Error("Database not initialized");

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction(
				[this.storeName],
				"readwrite",
			);
			const store = transaction.objectStore(this.storeName);
			const item: AssetEntry = {
				id: id,
				name: name || (file instanceof File ? file.name : id),
				file: file,
				size: file.size,
				hash: "hash", // You might want to implement proper hashing
			};
			console.log(item);
			const request = store.put(item);

			request.onerror = (event) => {
				console.error(
					"Error adding file:",
					(event.target as any).error,
				);
				reject(new Error("Failed to add file"));
			};
			request.onsuccess = () => resolve(id);
		});
	}

	async addAssetEntry(entry: AssetEntry): Promise<AssetEntry["id"]> {
		if (!this.db) throw new Error("Database not initialized");

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction(
				[this.storeName],
				"readwrite",
			);
			const store = transaction.objectStore(this.storeName);
			const request = store.put(entry);

			request.onerror = () => reject(new Error("Failed to add file"));
			request.onsuccess = () => resolve(entry.id);
		});
	}

	async getFile(fileID: FileID): Promise<AssetEntry | null> {
		if (!this.db) throw new Error("Database not initialized");

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction(
				[this.storeName],
				"readonly",
			);
			const store = transaction.objectStore(this.storeName);
			const request = store.get(fileID);

			request.onerror = () => reject(new Error("Failed to get file"));
			request.onsuccess = () => {
				const result = request.result as AssetEntry;
				resolve(result ?? null);
			};
		});
	}

	async syncFile(file: File | Blob, id: FileID): Promise<AssetEntry["id"]> {
		if (!this.db) throw new Error("Database not initialized");

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction(
				[this.storeName],
				"readwrite",
			);
			const store = transaction.objectStore(this.storeName);
			const request = store.put({
				id: id,
				name: (file as File).name ?? id,
				file: file,
				size: file.size,
				hash: "hash",
			} as AssetEntry);

			request.onerror = () => reject(new Error("Failed to sync file"));
			request.onsuccess = () => resolve(id);
		});
	}

	async getFileUrl(fileID: FileID): Promise<string | null> {
		if (!this.db) throw new Error("Database not initialized");

		// Check if URL is already in cache
		if (this.urlCache.has(fileID)) {
			return this.urlCache.get(fileID)!;
		}

		return new Promise((resolve, reject) => {
			this.getFile(fileID)
				.then((file) => {
					if (!file) {
						resolve(null);
						return;
					}

					const url = URL.createObjectURL(file.file);
					this.urlCache.set(fileID, url);
					resolve(url);
				})
				.catch(reject);
		});
	}

	async getTotalUsage(): Promise<number> {
		if (!this.db) throw new Error("Database not initialized");

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction(
				[this.storeName],
				"readonly",
			);
			const store = transaction.objectStore(this.storeName);
			const request = store.getAll();

			request.onerror = () => reject(new Error("Failed to get files"));
			request.onsuccess = () => {
				const files = request.result as AssetEntry[];
				const totalSize = files.reduce(
					(acc, file) => acc + file.size,
					0,
				);
				resolve(totalSize);
			};
		});
	}

	async downloadAsZip(): Promise<Blob> {
		console.log("downloading as zip");
		if (!this.db) throw new Error("Database not initialized");

		const zipWriter = new ZipWriter(new BlobWriter("application/zip"));

		const transaction = this.db.transaction([this.storeName], "readonly");
		const store = transaction.objectStore(this.storeName);
		const request = store.getAll();

		return new Promise((resolve, reject) => {
			request.onerror = () => reject(new Error("Failed to get files"));
			request.onsuccess = async () => {
				const files = request.result as AssetEntry[];
				const usedNames = new Set<string>();

				for (const file of files) {
					let uniqueName = file.name;
					let counter = 1;

					// If the name already exists, add a counter to make it unique
					while (usedNames.has(uniqueName)) {
						const nameParts = file.name.split(".");
						if (nameParts.length > 1) {
							// For files with extensions
							const ext = nameParts.pop();
							uniqueName = `${nameParts.join(".")}_${counter}.${ext}`;
						} else {
							// For files without extensions
							uniqueName = `${file.name}_${counter}`;
						}
						counter++;
					}

					usedNames.add(uniqueName);

					try {
						await zipWriter.add(
							uniqueName,
							new BlobReader(file.file),
						);
					} catch (error) {
						console.error(
							`Failed to add file ${uniqueName} to zip:`,
							error,
						);
						// Optionally, you can choose to continue with other files instead of rejecting
						// reject(error);
					}
				}

				const zipBlob = await zipWriter.close();
				resolve(zipBlob);
			};
		});
	}

	async uploadZip(zipFile: File): Promise<void> {
		const zipReader = new ZipReader(new BlobReader(zipFile));
		const entries = await zipReader.getEntries();

		for (const entry of entries) {
			if (!entry.directory) {
				const blob = await entry?.getData?.(new BlobWriter());
				const file = new File([blob!], entry.filename, {
					type: blob!.type,
				});
				await this.addFile(file);
			}
		}

		await zipReader.close();
	}

	async deleteFile(fileId: FileID): Promise<void> {
		const transaction = this.db?.transaction([this.storeName], "readwrite");
		const store = transaction?.objectStore(this.storeName);
		store?.delete(fileId);

		// Remove the URL from the cache and revoke the object URL
		const url = this.urlCache.get(fileId);
		if (url) {
			URL.revokeObjectURL(url);
			this.urlCache.delete(fileId);
		}
	}

	async clear(): Promise<void> {
		const transaction = this.db?.transaction([this.storeName], "readwrite");
		const store = transaction?.objectStore(this.storeName);
		store?.clear();

		// Revoke all object URLs and clear the cache
		for (const url of this.urlCache.values()) {
			URL.revokeObjectURL(url);
		}
		this.urlCache.clear();
	}
}

export default BinaryAssetManager;
