export function last<T>(arr: T[]): T | undefined {
	return arr[arr.length - 1];
}

export function randomPick<T>(arr: T[]): T | undefined {
	return arr[Math.floor(Math.random() * arr.length)];
}

/** Return an array with an edited element at the given index. */
export function edit<T>(arr: T[], index: number, newValue: T): T[] {
	return arr.map((value, i) => (i === index ? newValue : value));
}

type IterateReturn<T> = [
	T,
	{
		isFirst: boolean;
		isLast: boolean;
		array: T[];
		index: number;
		length: number;
	},
];

/**
 * Returns an an iterator that iterates over the given array.
 * Each returned item contains helpful properties, such as
 * `isFirst`, `isLast`, `array`, `index`, and `length`
 *
 * @param array The array to iterate over.
 * @returns An iterator that iterates over the given array.
 */
export function* iterate<T>(array: T[]): Generator<IterateReturn<T>> {
	for (let i = 0; i < array.length; i++) {
		yield [
			array[i]!,
			{
				isFirst: i === 0,
				isLast: i === array.length - 1,
				array,
				index: i,
				length: array.length,
			},
		];
	}
}
