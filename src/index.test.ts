import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import BinaryAssetManager, { FileID } from "./src";
import "fake-indexeddb/auto";

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => "blob:mocked-url");
global.URL.revokeObjectURL = vi.fn();

// Mock uuid
vi.mock("uuid", () => ({
	v4: vi.fn(() => "mocked-uuid"),
}));

// Mock zip.js
vi.mock("@zip.js/zip.js", () => ({
	ZipReader: vi.fn().mockImplementation(() => ({
		getEntries: vi.fn().mockResolvedValue([
			{
				directory: false,
				filename: "test1.txt",
				getData: vi.fn().mockResolvedValue(new Blob(["test1 content"])),
			},
			{
				directory: false,
				filename: "test2.txt",
				getData: vi.fn().mockResolvedValue(new Blob(["test2 content"])),
			},
		]),
		close: vi.fn(),
	})),
	ZipWriter: vi.fn().mockImplementation(() => ({
		add: vi.fn(),
		close: vi.fn().mockResolvedValue(new Blob(["mocked zip content"])),
	})),
	BlobReader: vi.fn(),
	BlobWriter: vi.fn(),
}));

describe("BinaryAssetManager", () => {
	let manager: BinaryAssetManager;

	beforeEach(async () => {
		manager = new BinaryAssetManager();
		await manager.initialize();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("should initialize successfully", () => {
		expect(manager).toBeDefined();
	});

	it("should add a file", async () => {
		const file = new File(["test content"], "test.txt", {
			type: "text/plain",
		});
		const fileId = await manager.addFile(file);
		expect(fileId).toMatch(/^file:/);
	});

	it("should sync a file", async () => {
		const file = new File(["test content"], "test.txt", {
			type: "text/plain",
		});
		const fileId = "file:existing-uuid" as FileID;
		const syncedFileId = await manager.syncFile(file, fileId);
		expect(syncedFileId).toBe(fileId);
	});

	it("should get a file URL", async () => {
		const file = new File(["test content"], "test.txt", {
			type: "text/plain",
		});
		const fileId = await manager.addFile(file);
		const url = await manager.getFileUrl(fileId);
		expect(url).toBe("blob:mocked-url");
	});

	it("should return null for non-existent file URL", async () => {
		const url = await manager.getFileUrl("file:non-existent" as FileID);
		expect(url).toBeNull();
	});

	it("should download as zip", async () => {
		const file1 = new File(["test content 1"], "test1.txt", {
			type: "text/plain",
		});
		const file2 = new File(["test content 2"], "test2.txt", {
			type: "text/plain",
		});
		await manager.addFile(file1);
		await manager.addFile(file2);
		const zipBlob = await manager.downloadAsZip();
		expect(zipBlob).toBeInstanceOf(Blob);
		expect(zipBlob.size).toBeGreaterThan(0);
	});

	it("should upload and extract zip", async () => {
		const zipFile = new File(["fake zip content"], "test.zip", {
			type: "application/zip",
		});
		await manager.uploadZip(zipFile);
		const totalUsage = await manager.getTotalUsage();
		expect(totalUsage).toBeGreaterThan(0);
	});

	it("should delete a file", async () => {
		const file = new File(["test content"], "test.txt", {
			type: "text/plain",
		});
		const fileId = await manager.addFile(file);
		await manager.deleteFile(fileId);
		const url = await manager.getFileUrl(fileId);
		expect(url).toBeNull();
	});

	it("should clear all files", async () => {
		const file1 = new File(["test content 1"], "test1.txt", {
			type: "text/plain",
		});
		const file2 = new File(["test content 2"], "test2.txt", {
			type: "text/plain",
		});
		await manager.addFile(file1);
		await manager.addFile(file2);
		await manager.clear();
		const totalUsage = await manager.getTotalUsage();
		expect(totalUsage).toBe(0);
	});
});
