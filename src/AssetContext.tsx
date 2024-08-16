import React, { createContext, useContext, useState, useEffect } from "react";
import BinaryAssetManager from "./src";

// Define the shape of our context
export interface BinaryAssetContextType {
	manager: BinaryAssetManager | null;
	isInitialized: boolean;
	addFile: (file: File) => Promise<void>;
	getFileUrl: (fileName: string) => Promise<string | null>;
	getTotalUsage: () => Promise<number>;
	downloadAsZip: () => Promise<Blob>;
	uploadZip: (zipFile: File) => Promise<void>;
	deleteFile: (fileName: string) => Promise<void>;
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
			setManager(newManager);
			setIsInitialized(true);
		};

		initManager();
	}, []);

	const addFile = async (file: File) => {
		if (!manager) throw new Error("Manager not initialized");
		await manager.addFile(file);
	};

	const getFileUrl = async (fileName: string) => {
		if (!manager) throw new Error("Manager not initialized");
		return await manager.getFileUrl(fileName);
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

	const deleteFile = async (fileName: string) => {
		if (!manager) throw new Error("Manager not initialized");
		await manager.deleteFile(fileName);
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
				getFileUrl,
				getTotalUsage,
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
