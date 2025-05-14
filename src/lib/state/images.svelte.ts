import { compressBase64Image, fileToDataURL } from "$lib/utils/file.js";
import { JsonEntityIndexedDbStorage } from "remult";

const store = new JsonEntityIndexedDbStorage();

class Images {
	async upload(file: File) {
		const dataUrl = await fileToDataURL(file);
		const compressed = await compressBase64Image({ base64: dataUrl, maxSizeKB: 400 });

		const key = `image-${crypto.randomUUID()}`;
		store.setItem(key, compressed);

		return key;
	}

	async get(key: string): Promise<string> {
		return await store.getItem(key);
	}

	async delete(key: string) {
		return await store.setItem(key, "");
	}
}

export const images = new Images();
