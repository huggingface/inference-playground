/**
 * Formats a Date object into a human-readable string.
 * @param date The Date object to format.
 * @param locale The locale to use for formatting (e.g., 'en-US', 'fr-FR'). Defaults to the system's locale.
 * @param options Optional formatting options for toLocaleDateString.
 * @returns The formatted date string.
 */
export function formatDate(date: Date, locale?: string, options?: Intl.DateTimeFormatOptions): string {
	// Provide a default locale and options if not provided
	const effectiveLocale = locale || undefined; // Using undefined will use the system's locale
	const effectiveOptions: Intl.DateTimeFormatOptions = options || {
		year: "numeric",
		month: "long",
		day: "numeric",
	};

	try {
		return date.toLocaleDateString(effectiveLocale, effectiveOptions);
	} catch (error) {
		console.error("Error formatting date:", error);
		// Fallback to a simple format if toLocaleDateString fails
		return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
	}
}
/**
 * Formats a Date object into a human-readable string including both date and time.
 * @param date The Date object to format.
 * @param locale The locale to use for formatting (e.g., 'en-US', 'fr-FR'). Defaults to the system's locale.
 * @param options Optional formatting options for toLocaleString.
 * @returns The formatted date and time string.
 */
export function formatDateTime(date: Date, locale?: string, options?: Intl.DateTimeFormatOptions): string {
	// Provide a default locale and options if not provided
	const effectiveLocale = locale || undefined; // Using undefined will use the system's locale
	const effectiveOptions: Intl.DateTimeFormatOptions = options || {
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "numeric",
		minute: "numeric",
		second: "numeric",
		// timeZoneName: "short", // Optionally include the time zone name
	};

	try {
		return date.toLocaleString(effectiveLocale, effectiveOptions);
	} catch (error) {
		console.error("Error formatting date and time:", error);
		// Fallback to a simple format if toLocaleString fails
		return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`;
	}
}
