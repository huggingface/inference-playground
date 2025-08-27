/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Supported image formats for frame extraction
 */
type ImageFormat = "image/png" | "image/jpeg" | "image/webp";

/**
 * Options for frame extraction
 */
interface FrameExtractionOptions {
	/** Position in video as percentage (0-100) */
	percentage?: number;
	/** Output image format */
	format?: ImageFormat;
	/** JPEG quality (0-1, only applies to JPEG format) */
	quality?: number;
	/** Maximum width for output image (maintains aspect ratio) */
	maxWidth?: number;
	/** Maximum height for output image (maintains aspect ratio) */
	maxHeight?: number;
	/** Timeout in milliseconds (default: 15000) */
	timeout?: number;
	/** Enable debug logging */
	debug?: boolean;
}

/**
 * Result of frame extraction operation
 */
interface FrameExtractionResult {
	/** The extracted frame as a blob */
	blob: Blob;
	/** Original video dimensions */
	originalDimensions: {
		width: number;
		height: number;
	};
	/** Output image dimensions */
	outputDimensions: {
		width: number;
		height: number;
	};
	/** Actual timestamp where frame was extracted (in seconds) */
	timestamp: number;
}

/**
 * Custom error class for video frame extraction
 */
class VideoFrameExtractionError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly originalError?: Error
	) {
		super(message);
		this.name = "VideoFrameExtractionError";
	}
}

/**
 * Detects browser type for Firefox-specific handling
 */
function isFirefox(): boolean {
	return navigator.userAgent.toLowerCase().includes("firefox");
}

/**
 * Debug logger
 */
function debugLog(message: string, data?: any, enabled: boolean = false): void {
	if (enabled) {
		console.log(`[VideoFrameExtractor] ${message}`, data || "");
	}
}

/**
 * Calculates output dimensions while maintaining aspect ratio
 */
function calculateOutputDimensions(
	originalWidth: number,
	originalHeight: number,
	maxWidth?: number,
	maxHeight?: number
): { width: number; height: number } {
	let { width, height } = { width: originalWidth, height: originalHeight };

	if (maxWidth && width > maxWidth) {
		height = (height * maxWidth) / width;
		width = maxWidth;
	}

	if (maxHeight && height > maxHeight) {
		width = (width * maxHeight) / height;
		height = maxHeight;
	}

	return {
		width: Math.round(width),
		height: Math.round(height),
	};
}

/**
 * Aggressively waits for video frame to be drawable
 */
async function waitForDrawableFrame(
	video: HTMLVideoElement,
	canvas: HTMLCanvasElement,
	ctx: CanvasRenderingContext2D,
	maxAttempts: number = 20,
	debug: boolean = false
): Promise<void> {
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		debugLog(
			`Frame readiness check attempt ${attempt}/${maxAttempts}`,
			{
				readyState: video.readyState,
				currentTime: video.currentTime,
				videoWidth: video.videoWidth,
				videoHeight: video.videoHeight,
			},
			debug
		);

		// Wait for video to be in a drawable state
		if (video.readyState >= 2) {
			// Clear and try to draw
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

			// Check if we actually drew something
			const imageData = ctx.getImageData(0, 0, Math.min(50, canvas.width), Math.min(50, canvas.height));
			const pixels = imageData.data;

			// Check for non-transparent pixels
			let hasContent = false;
			for (let i = 0; i < pixels.length; i += 4) {
				const r = pixels[i]!;
				const g = pixels[i + 1]!;
				const b = pixels[i + 2]!;
				const a = pixels[i + 3]!;

				// If we have any non-black, non-transparent pixel, we have content
				if ((r > 0 || g > 0 || b > 0) && a > 0) {
					hasContent = true;
					break;
				}
			}

			debugLog(`Frame check result`, { hasContent, attempt }, debug);

			if (hasContent) {
				return; // Success!
			}
		}

		// Wait before next attempt, with increasing delays
		const delay = Math.min(100 + attempt * 50, 1000);
		await new Promise(resolve => setTimeout(resolve, delay));
	}

	throw new Error(`Failed to get drawable frame after ${maxAttempts} attempts`);
}

/**
 * AGGRESSIVE Firefox-compatible video frame extraction
 */
async function extractVideoFrame(
	videoBlob: Blob,
	options: FrameExtractionOptions = {}
): Promise<FrameExtractionResult> {
	const {
		percentage = 50,
		format = "image/png",
		quality = 0.92,
		maxWidth,
		maxHeight,
		timeout = 15000,
		debug = false,
	} = options;

	debugLog("Starting AGGRESSIVE frame extraction", { percentage, format, timeout }, debug);

	// Validate inputs
	if (percentage < 0 || percentage > 100) {
		throw new VideoFrameExtractionError("Percentage must be between 0 and 100", "INVALID_PERCENTAGE");
	}

	const video = document.createElement("video");
	const canvas = document.createElement("canvas");
	const videoUrl = URL.createObjectURL(videoBlob);

	// AGGRESSIVE video configuration for Firefox
	video.crossOrigin = "anonymous";
	video.muted = true;
	video.playsInline = true;
	video.preload = "auto"; // Changed to 'auto' for Firefox
	video.controls = false;
	video.autoplay = false;
	video.loop = false;

	// Make video visible but tiny (Firefox sometimes needs this)
	video.style.position = "fixed";
	video.style.top = "0px";
	video.style.left = "0px";
	video.style.width = "2px";
	video.style.height = "2px";
	video.style.opacity = "0.01"; // Barely visible but not hidden
	video.style.pointerEvents = "none";
	video.style.zIndex = "-9999";

	let cleanup: (() => void) | null = null;

	try {
		cleanup = () => {
			debugLog("Cleaning up resources", undefined, debug);
			URL.revokeObjectURL(videoUrl);
			if (video.parentNode) {
				video.parentNode.removeChild(video);
			}
			canvas.width = 0;
			canvas.height = 0;
		};

		// Add to DOM FIRST
		document.body.appendChild(video);

		// Set source and FORCE load
		video.src = videoUrl;
		video.load();

		debugLog("Video added to DOM and loading started", undefined, debug);

		// Wait for metadata with multiple fallbacks
		await new Promise<void>((resolve, reject) => {
			let resolved = false;

			const timeoutId = setTimeout(() => {
				if (!resolved) {
					resolved = true;
					reject(new Error("Metadata loading timed out"));
				}
			}, timeout / 2);

			const onSuccess = () => {
				if (!resolved) {
					resolved = true;
					clearTimeout(timeoutId);
					video.removeEventListener("loadedmetadata", onSuccess);
					video.removeEventListener("loadeddata", onSuccess);
					video.removeEventListener("canplay", onSuccess);
					video.removeEventListener("error", onError);
					resolve();
				}
			};

			const onError = (_e: Event) => {
				if (!resolved) {
					resolved = true;
					clearTimeout(timeoutId);
					video.removeEventListener("loadedmetadata", onSuccess);
					video.removeEventListener("loadeddata", onSuccess);
					video.removeEventListener("canplay", onSuccess);
					video.removeEventListener("error", onError);
					reject(new Error("Video loading failed"));
				}
			};

			video.addEventListener("loadedmetadata", onSuccess);
			video.addEventListener("loadeddata", onSuccess);
			video.addEventListener("canplay", onSuccess);
			video.addEventListener("error", onError);
		});

		debugLog(
			"Metadata loaded",
			{
				duration: video.duration,
				videoWidth: video.videoWidth,
				videoHeight: video.videoHeight,
				readyState: video.readyState,
			},
			debug
		);

		const { videoWidth, videoHeight, duration } = video;

		if (videoWidth === 0 || videoHeight === 0) {
			throw new VideoFrameExtractionError("Video has invalid dimensions", "INVALID_DIMENSIONS");
		}

		if (!isFinite(duration) || duration <= 0) {
			throw new VideoFrameExtractionError("Video has invalid duration", "INVALID_DURATION");
		}

		// Setup canvas
		const outputDimensions = calculateOutputDimensions(videoWidth, videoHeight, maxWidth, maxHeight);

		canvas.width = outputDimensions.width;
		canvas.height = outputDimensions.height;

		const ctx = canvas.getContext("2d", {
			willReadFrequently: false,
			alpha: format === "image/png",
		});

		if (!ctx) {
			throw new VideoFrameExtractionError("Failed to get 2D canvas context", "CANVAS_CONTEXT_ERROR");
		}

		// Calculate target time
		const targetTime = Math.min(duration - 0.1, Math.max(0, (duration * percentage) / 100));

		debugLog("Seeking to target time", { targetTime }, debug);

		// AGGRESSIVE seeking approach
		await new Promise<void>((resolve, reject) => {
			let resolved = false;

			const timeoutId = setTimeout(() => {
				if (!resolved) {
					resolved = true;
					reject(new Error("Seek timed out"));
				}
			}, timeout / 3);

			const onSeeked = () => {
				if (!resolved) {
					resolved = true;
					clearTimeout(timeoutId);
					video.removeEventListener("seeked", onSeeked);
					video.removeEventListener("error", onError);
					resolve();
				}
			};

			const onError = () => {
				if (!resolved) {
					resolved = true;
					clearTimeout(timeoutId);
					video.removeEventListener("seeked", onSeeked);
					video.removeEventListener("error", onError);
					reject(new Error("Seek failed"));
				}
			};

			video.addEventListener("seeked", onSeeked);
			video.addEventListener("error", onError);

			// Multiple seek attempts for Firefox
			video.currentTime = targetTime;

			// Force another seek after a delay if Firefox is being stubborn
			setTimeout(() => {
				if (!resolved && Math.abs(video.currentTime - targetTime) > 0.1) {
					debugLog("Forcing additional seek", { current: video.currentTime, target: targetTime }, debug);
					video.currentTime = targetTime;
				}
			}, 500);
		});

		debugLog("Seek completed", { currentTime: video.currentTime }, debug);

		// AGGRESSIVE frame drawing with multiple attempts
		await waitForDrawableFrame(video, canvas, ctx, 20, debug);

		debugLog("Frame successfully drawn to canvas", undefined, debug);

		// Convert to blob
		const blob = await new Promise<Blob>((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				reject(new Error("Blob conversion timed out"));
			}, timeout / 3);

			canvas.toBlob(
				result => {
					clearTimeout(timeoutId);
					if (result && result.size > 0) {
						resolve(result);
					} else {
						reject(new Error("Failed to create blob or blob is empty"));
					}
				},
				format,
				format === "image/jpeg" ? quality : undefined
			);
		});

		debugLog("Blob created successfully", { size: blob.size }, debug);

		const result: FrameExtractionResult = {
			blob,
			originalDimensions: {
				width: videoWidth,
				height: videoHeight,
			},
			outputDimensions: {
				width: canvas.width,
				height: canvas.height,
			},
			timestamp: video.currentTime,
		};

		return result;
	} catch (error) {
		debugLog("Error occurred", error, debug);

		if (error instanceof VideoFrameExtractionError) {
			throw error;
		}

		throw new VideoFrameExtractionError(
			error instanceof Error ? error.message : String(error),
			"EXTRACTION_ERROR",
			error instanceof Error ? error : undefined
		);
	} finally {
		if (cleanup) {
			cleanup();
		}
	}
}

/**
 * Retry wrapper with different strategies
 */
async function extractVideoFrameWithRetry(
	videoBlob: Blob,
	options: FrameExtractionOptions = {},
	maxRetries: number = 3
): Promise<FrameExtractionResult> {
	const strategies = [
		{ ...options, preload: "auto" },
		{ ...options, preload: "metadata", percentage: Math.max(1, (options.percentage || 50) - 5) },
		{ ...options, preload: "none", percentage: Math.min(95, (options.percentage || 50) + 5) },
	];

	let lastError: Error | null = null;

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			debugLog(`AGGRESSIVE attempt ${attempt}/${maxRetries}`, undefined, options.debug);

			if (attempt > 1) {
				const delay = 1000 * attempt;
				await new Promise(resolve => setTimeout(resolve, delay));
			}

			const strategyOptions = strategies[Math.min(attempt - 1, strategies.length - 1)];
			const result = await extractVideoFrame(videoBlob, strategyOptions);

			return result;
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));
			debugLog(`AGGRESSIVE attempt ${attempt} failed`, lastError.message, options.debug);

			if (attempt === maxRetries) {
				throw lastError;
			}
		}
	}

	throw lastError || new Error("All aggressive attempts failed");
}

// Export functions
export {
	extractVideoFrame,
	extractVideoFrameWithRetry,
	VideoFrameExtractionError,
	isFirefox,
	type FrameExtractionOptions,
	type FrameExtractionResult,
	type ImageFormat,
};

import chroma from "chroma-js";

interface AdjustBgColorOptions {
	/** The text color that will be displayed on the background */
	textColor: string | chroma.Color;
	/** The background color to adjust */
	backgroundColor: string | chroma.Color;
	/** Target APCA contrast ratio (positive for light text on dark bg, negative for dark text on light bg) */
	targetContrast: number;
	/** Maximum number of adjustment iterations */
	maxIterations?: number;
	/** Tolerance for contrast matching */
	tolerance?: number;
	/** Whether to adjust lightness (true) or saturation (false) */
	adjustLightness?: boolean;
}

/**
 * Adjusts a background color to meet APCA contrast requirements against a text color
 */
export function adjustBgColorForAPCAContrast(options: AdjustBgColorOptions): chroma.Color {
	const {
		textColor,
		backgroundColor,
		targetContrast,
		maxIterations = 50,
		tolerance = 1,
		adjustLightness = true,
	} = options;

	let adjustedBgColor = chroma(backgroundColor);
	const txtColor = chroma(textColor);

	let currentContrast = chroma.contrastAPCA(txtColor, adjustedBgColor);
	let iterations = 0;

	if (Math.abs(currentContrast - targetContrast) <= tolerance) {
		return adjustedBgColor;
	}

	while (Math.abs(currentContrast - targetContrast) > tolerance && iterations < maxIterations) {
		const [h, s, l] = adjustedBgColor.hsl();
		let newLightness: number;

		if (adjustLightness) {
			// For APCA: more negative = better contrast for light text
			// So if we want more negative contrast, make bg darker
			if (targetContrast < currentContrast) {
				// Want more negative (better contrast for light text) - make bg darker
				newLightness = Math.max(0, l - 0.05);
			} else {
				// Want less negative - make bg lighter
				newLightness = Math.min(1, l + 0.05);
			}

			adjustedBgColor = chroma.hsl(h, s, newLightness);
		}

		const newContrast = chroma.contrastAPCA(txtColor, adjustedBgColor);

		// Check if we're getting closer to target
		const oldDistance = Math.abs(currentContrast - targetContrast);
		const newDistance = Math.abs(newContrast - targetContrast);

		if (newDistance >= oldDistance) {
			break;
		}

		currentContrast = newContrast;
		iterations++;
	}

	return adjustedBgColor;
}
