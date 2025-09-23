const TEXT_SIZE_KEY = "textSize";

class Settings {
	#textSize = $state(100);

	constructor() {
		const storedTextSize = localStorage.getItem(TEXT_SIZE_KEY);
		const parsed = storedTextSize ? parseInt(storedTextSize, 10) : null;
		this.textSize = parsed && !isNaN(parsed) ? parsed : 100;
	}

	get textSize() {
		return this.#textSize;
	}

	set textSize(size: number) {
		localStorage.setItem(TEXT_SIZE_KEY, JSON.stringify(size));
		this.#textSize = size;
	}

	// Reset to default
	resetTextSize = () => {
		this.textSize = 100;
	};
}

export const settings = new Settings();
