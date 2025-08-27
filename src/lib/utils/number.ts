export function clamp(min: number, value: number, max: number): number {
	return Math.max(min, Math.min(value, max));
}

export function atLeastNDecimals(num: number, minDecimals: number): string {
	return num.toFixed(Math.max(minDecimals, getDecimalPlaces(num)));
}

function getDecimalPlaces(num: number): number {
	const str = num.toString();
	const decimalIndex = str.indexOf(".");
	return decimalIndex === -1 ? 0 : str.length - decimalIndex - 1;
}
