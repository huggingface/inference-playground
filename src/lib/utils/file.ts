export function fileToDataURL(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = function (event) {
			resolve(event.target?.result as string);
		};

		reader.onerror = function (error) {
			reject(error);
		};

		reader.readAsDataURL(file);
	});
}

interface CompressBase64Options {
	base64: string;
	maxSizeKB: number;
	outputFormat?: string; // 'image/jpeg' | 'image/webp'
	minQuality?: number; // default: 0.1
	maxQuality?: number; // default: 1.0
	maxIterations?: number; // default: 10
}

export async function compressBase64Image(options: CompressBase64Options): Promise<string> {
	const {
		base64,
		maxSizeKB,
		outputFormat = "image/jpeg",
		minQuality = 0.1,
		maxQuality = 1.0,
		maxIterations = 10,
	} = options;

	const img = await new Promise<HTMLImageElement>((resolve, reject) => {
		const image = new Image();
		image.crossOrigin = "Anonymous";
		image.onload = () => resolve(image);
		image.onerror = reject;
		image.src = base64;
	});

	const canvas = document.createElement("canvas");
	canvas.width = img.width;
	canvas.height = img.height;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Could not get canvas context");
	ctx.drawImage(img, 0, 0);

	let minQ = minQuality;
	let maxQ = maxQuality;
	let bestBase64 = "";

	for (let i = 0; i < maxIterations; i++) {
		const q = (minQ + maxQ) / 2;
		const b64 = canvas.toDataURL(outputFormat, q);
		const size = getBase64ImageSize(b64).kilobytes;

		if (size > maxSizeKB) {
			maxQ = q;
		} else {
			minQ = q;
			bestBase64 = b64;
		}
	}

	// If no quality produced a small enough image, return the lowest quality result
	if (!bestBase64) {
		bestBase64 = canvas.toDataURL(outputFormat, minQuality);
	}

	return bestBase64;
}

/**
 * Get the size of a Base64 image string in bytes and kilobytes.
 * @param base64 - The Base64 image string (with or without data URL prefix).
 * @returns { bytes: number, kilobytes: number, megabytes: number }
 */
export function getBase64ImageSize(base64: string): { bytes: number; kilobytes: number; megabytes: number } {
	// Remove data URL prefix if present
	const cleanedBase64 = base64.split(",")[1] || base64;

	// Calculate padding
	const padding = (cleanedBase64.match(/=+$/) || [""])[0].length;

	// Calculate size in bytes
	const bytes = (cleanedBase64.length * 3) / 4 - padding;

	// Convert to kilobytes
	const kilobytes = bytes / 1024;

	// Convert to megabytes (optional)
	const megabytes = kilobytes / 1024;

	return {
		bytes: Math.round(bytes),
		kilobytes: parseFloat(kilobytes.toFixed(2)),
		megabytes: parseFloat(megabytes.toFixed(2)),
	};
}
