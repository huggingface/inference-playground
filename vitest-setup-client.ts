/// <reference types="@vitest/browser/matchers" />
/// <reference types="@vitest/browser/providers/playwright" />

// import "@testing-library/jest-dom/vitest";
// import { vi } from "vitest";
// import fakeIndexedDB from "fake-indexeddb";
//
// // required for svelte5 + jsdom as jsdom does not support matchMedia
// Object.defineProperty(window, "matchMedia", {
// 	writable: true,
// 	enumerable: true,
// 	value: vi.fn().mockImplementation(query => ({
// 		matches: false,
// 		media: query,
// 		onchange: null,
// 		addEventListener: vi.fn(),
// 		removeEventListener: vi.fn(),
// 		dispatchEvent: vi.fn(),
// 	})),
// });
//
// globalThis.indexedDB = fakeIndexedDB;
