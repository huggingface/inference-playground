export function isMac() {
	return navigator.platform.toUpperCase().indexOf("MAC") >= 0;
}

export const cmdOrCtrl = isMac() ? "⌘" : "Ctrl";
export const optOrAlt = isMac() ? "⌥" : "Alt";
