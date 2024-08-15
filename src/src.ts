import { ZipReader, ZipWriter, BlobReader, BlobWriter } from "@zip.js/zip.js";

class BinaryAssetManager {
	private dbName: string = "BinaryAssetManagerDB";
	private storeName: string = "assets";
	private db: IDBDatabase | null = null;

	constructor() {}

	async initialize(): Promise<void> {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.dbName, 1);

			request.onerror = () =>
				reject(new Error("Failed to open database"));

			request.onsuccess = (event) => {
				this.db = (event.target as IDBOpenDBRequest).result;
				resolve();
			};

			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result;
				db.createObjectStore(this.storeName, { keyPath: "fileName" });
			};
		});
	}

	async addFile(file: File): Promise<void> {
		if (!this.db) throw new Error("Database not initialized");

		return new Promise((resolve, reject) => {
			const transaction = this.db.transaction(
				[this.storeName],
				"readwrite",
			);
			const store = transaction.objectStore(this.storeName);
			const request = store.put({
				fileName: file.name,
				file: file,
				size: file.size,
			});

			request.onerror = () => reject(new Error("Failed to add file"));
			request.onsuccess = () => resolve();
		});
	}

	async getFileUrl(fileName: string): Promise<string | null> {
		if (!this.db) throw new Error("Database not initialized");

		return new Promise((resolve, reject) => {
			const transaction = this.db.transaction(
				[this.storeName],
				"readonly",
			);
			const store = transaction.objectStore(this.storeName);
			const request = store.get(fileName);

			request.onerror = () => reject(new Error("Failed to get file"));
			request.onsuccess = () => {
				const result = request.result;
				if (result && result.file) {
					resolve(URL.createObjectURL(result.file));
				} else {
					resolve(null);
				}
			};
		});
	}

	async getTotalUsage(): Promise<number> {
		if (!this.db) throw new Error("Database not initialized");

		return new Promise((resolve, reject) => {
			const transaction = this.db.transaction(
				[this.storeName],
				"readonly",
			);
			const store = transaction.objectStore(this.storeName);
			const request = store.getAll();

			request.onerror = () => reject(new Error("Failed to get files"));
			request.onsuccess = () => {
				const files = request.result;
				const totalSize = files.reduce(
					(acc, file) => acc + file.size,
					0,
				);
				resolve(totalSize);
			};
		});
	}

	async downloadAsZip(): Promise<Blob> {
		if (!this.db) throw new Error("Database not initialized");

		const zipWriter = new ZipWriter(new BlobWriter("application/zip"));

		const transaction = this.db.transaction([this.storeName], "readonly");
		const store = transaction.objectStore(this.storeName);
		const request = store.getAll();

		return new Promise((resolve, reject) => {
			request.onerror = () => reject(new Error("Failed to get files"));
			request.onsuccess = async () => {
				const files = request.result;
				for (const file of files) {
					await zipWriter.add(
						file.fileName,
						new BlobReader(file.file),
					);
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
				const blob = await entry.getData(new BlobWriter());
				const file = new File([blob], entry.filename, {
					type: blob.type,
				});
				await this.addFile(file);
			}
		}

		await zipReader.close();
	}

	async deleteFile(fileName: string): Promise<void> {
		const transaction = this.db?.transaction(
			[this.storeName],
			"readwrite",
		);
		const store = transaction?.objectStore(this.storeName);
		store?.delete(fileName);
	}

	async clear(): Promise<void> {
		const transaction = this.db?.transaction(
			[this.storeName],
			"readwrite",
		);
		const store = transaction?.objectStore(this.storeName);
		store?.clear();
	}
}

export default BinaryAssetManager;
