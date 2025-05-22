import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { images } from "./images.svelte";
import { fileToDataURL, compressBase64Image } from "$lib/utils/file.js";
import { JsonEntityIndexedDbStorage } from "$lib/remult.js";

// Mock dependencies
vi.mock("$lib/utils/file.js", () => ({
	fileToDataURL: vi.fn(),
	compressBase64Image: vi.fn(),
}));

vi.mock("$lib/remult.js", () => {
	const mockStoreInstance = {
		setItem: vi.fn(),
		getItem: vi.fn(),
		deleteItem: vi.fn(),
		init: vi.fn().mockResolvedValue(undefined), // Mock init if it's called internally
	};
	return {
		JsonEntityIndexedDbStorage: vi.fn(() => mockStoreInstance),
	};
});

// Helper to get the mocked store instance
const getMockedStore = () => new JsonEntityIndexedDbStorage();

describe("Images", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Mock crypto.randomUUID
		vi.spyOn(window.crypto, "randomUUID").mockReturnValue("123e4567-e89b-12d3-a456-426614174000");
	});

	describe("upload", () => {
		it("should process a file, store it, and return a key", async () => {
			const mockFile = new File(["dummy content"], "test.png", { type: "image/png" });
			const mockDataUrl = "data:image/png;base64,dummy";
			const mockCompressedDataUrl = "data:image/jpeg;base64,compresseddummy";

			(fileToDataURL as Mock).mockResolvedValue(mockDataUrl);
			(compressBase64Image as Mock).mockResolvedValue(mockCompressedDataUrl);
			const store = getMockedStore();

			const key = await images.upload(mockFile);

			expect(fileToDataURL).toHaveBeenCalledWith(mockFile);
			expect(compressBase64Image).toHaveBeenCalledWith({
				base64: mockDataUrl,
				maxSizeKB: 400,
			});
			expect(store.setItem).toHaveBeenCalledWith(`image-123e4567-e89b-12d3-a456-426614174000`, mockCompressedDataUrl);
			expect(key).toBe(`image-123e4567-e89b-12d3-a456-426614174000`);
		});
	});

	describe("get", () => {
		it("should retrieve an item from the store", async () => {
			const mockKey = "image-123";
			const mockStoredData = "data:image/jpeg;base64,somedata";
			const store = getMockedStore();
			(store.getItem as Mock).mockResolvedValue(mockStoredData);

			const result = await images.get(mockKey);

			expect(store.getItem).toHaveBeenCalledWith(mockKey);
			expect(result).toBe(mockStoredData);
		});

		it("should return undefined if item not found (or whatever getItem returns)", async () => {
			const mockKey = "image-not-found";
			const store = getMockedStore();
			(store.getItem as Mock).mockResolvedValue(undefined); // Simulate item not found

			const result = await images.get(mockKey);

			expect(store.getItem).toHaveBeenCalledWith(mockKey);
			expect(result).toBeUndefined();
		});
	});

	describe("delete", () => {
		it("should delete an item from the store", async () => {
			const mockKey = "image-to-delete";
			const store = getMockedStore();

			await images.delete(mockKey);

			expect(store.deleteItem).toHaveBeenCalledWith(mockKey);
		});
	});
});
