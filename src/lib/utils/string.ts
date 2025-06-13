export function pluralize(word: string, count: number): string {
	if (count === 1) {
		return word;
	}
	return word + "s";
}

export function capitalize(word: string): string {
	return word.charAt(0).toUpperCase() + word.slice(1);
}
