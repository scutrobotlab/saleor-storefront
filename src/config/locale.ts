/**
 * Locale settings for display formatting. Currency comes from Saleor channels, not here.
 */

export const localeConfig = {
	/** Locale for Intl APIs (number/date formatting) - BCP 47 format */
	default: "zh-CN",

	/** Language code for Saleor API - controls translated content */
	graphqlLanguageCode: "ZH_HANS" as const,

	/** HTML lang attribute */
	htmlLang: "zh",

	/** Open Graph locale */
	ogLocale: "zh_CN",

	/** Available locales (for future i18n) */
	available: ["zh-CN"] as const,

	/**
	 * Fallback currency - ONLY used when API returns null (shouldn't happen).
	 * Real currency comes from the channel via Saleor API.
	 */
	fallbackCurrency: "USD",
} as const;

/**
 * Format a price with the configured locale.
 */
export function formatPrice(amount: number, currency: string): string {
	return new Intl.NumberFormat(localeConfig.default, {
		style: "currency",
		currency: currency,
	}).format(amount);
}

/**
 * Format a date with the configured locale.
 */
export function formatDate(date: Date | number, options?: Intl.DateTimeFormatOptions): string {
	return new Intl.DateTimeFormat(localeConfig.default, {
		dateStyle: "medium",
		...options,
	}).format(date);
}

/**
 * Format a number with the configured locale.
 */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
	return new Intl.NumberFormat(localeConfig.default, options).format(value);
}
