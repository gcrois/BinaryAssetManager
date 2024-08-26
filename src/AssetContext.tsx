import React, { createContext, useContext, useState, useEffect } from "react";
import BinaryAssetManager, { FileID } from "./src";
import { AssetEntry } from "./src";

// Define the shape of our context
export interface BinaryAssetContextType {
	manager: BinaryAssetManager | null;
	isInitialized: boolean;
	addFile: (file: File | Blob) => Promise<FileID>;
	getFile: (fileId: FileID) => Promise<AssetEntry | null>;
	addAssetEntry: (asset: AssetEntry) => Promise<FileID>;
	getFileUrl: (fileId: FileID) => Promise<string | null>;
	getTotalUsage: () => Promise<number>;
	downloadAsZip: () => Promise<Blob>;
	uploadZip: (zipFile: File) => Promise<void>;
	deleteFile: (fileId: FileID) => Promise<void>;
	clear: () => Promise<void>;
}

// Create the context
const BinaryAssetContext = createContext<BinaryAssetContextType | undefined>(
	undefined,
);

// Create a provider component
export const BinaryAssetProvider: React.FC<React.PropsWithChildren<object>> = ({
	children,
}) => {
	const [manager, setManager] = useState<BinaryAssetManager | null>(null);
	const [isInitialized, setIsInitialized] = useState(false);

	useEffect(() => {
		const initManager = async () => {
			const newManager = new BinaryAssetManager();
			await newManager.initialize();
			console.log("BinaryAssetManager initialized");
			setManager(newManager);
			setIsInitialized(true);
		};

		initManager();
	}, []);

	const addFile = async (file: File | Blob) => {
		if (!manager) throw new Error("Manager not initialized");
		return await manager.addFile(file);
	};

	const addAssetEntry = async (asset: AssetEntry) => {
		if (!manager) throw new Error("Manager not initialized");
		return await manager.addAssetEntry(asset);
	};

	const getFile = async (fileId: FileID) => {
		if (!manager) throw new Error("Manager not initialized");
		return await manager.getFile(fileId);
	};

	const getFileUrl = async (fileId: FileID) => {
		if (!manager) throw new Error("Manager not initialized");
		return await manager.getFileUrl(fileId);
	};

	const getTotalUsage = async () => {
		if (!manager) throw new Error("Manager not initialized");
		return await manager.getTotalUsage();
	};

	const downloadAsZip = async () => {
		if (!manager) throw new Error("Manager not initialized");
		return await manager.downloadAsZip();
	};

	const uploadZip = async (zipFile: File) => {
		if (!manager) throw new Error("Manager not initialized");
		await manager.uploadZip(zipFile);
	};

	const deleteFile = async (fileId: FileID) => {
		if (!manager) throw new Error("Manager not initialized");
		await manager.deleteFile(fileId);
	};

	const clear = async () => {
		if (!manager) throw new Error("Manager not initialized");
		await manager.clear();
	};

	return (
		<BinaryAssetContext.Provider
			value={{
				manager,
				isInitialized,
				addFile,
				addAssetEntry,
				getFileUrl,
				getTotalUsage,
				getFile,
				downloadAsZip,
				uploadZip,
				deleteFile,
				clear,
			}}
		>
			{children}
		</BinaryAssetContext.Provider>
	);
};

// Create a custom hook for using the context
export const useBinaryAsset = () => {
	const context = useContext(BinaryAssetContext);
	if (context === undefined) {
		throw new Error(
			"useBinaryAsset must be used within a BinaryAssetProvider",
		);
	}
	return context;
};

export default BinaryAssetProvider;
