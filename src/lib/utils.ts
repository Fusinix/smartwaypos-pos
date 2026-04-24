/** @format */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function parseJSONString(
	jsonString: string
): Record<string, any> | null {
	try {
		// Parse and return the object
		return typeof jsonString === "string" ? JSON.parse(jsonString) : jsonString;
	} catch (error) {
		console.error("Invalid JSON string:", error);
		return null;
	}
}

export function getCategoryId(categoryName: string, categories: any[]) {
	return categories?.find((cat) => cat.name === categoryName)?.id;
}

export function getCategoryName(id: number, categories: any[]) {
	return categories?.find((cat) => cat.id === Number(id))?.name;
}

/**
 * Format currency value with the specified currency code
 * @param value - The numeric value to format
 * @param currency - The currency code (e.g., 'GHS', 'USD', 'EUR'). Defaults to 'GHS'
 * @returns Formatted currency string (e.g., "GHS 100.00")
 */
export function formatCurrency(
	value: number,
	currency: string = "GHS"
): string {
	return `${currency} ${Number(value.toFixed(2)).toLocaleString()}`;
}

/**
 * Get currency symbol for a currency code
 * @param currency - The currency code (e.g., 'GHS', 'USD', 'EUR')
 * @returns Currency symbol or code
 */
export function getCurrencySymbol(currency: string = "GHS"): string {
	const currencyMap: Record<string, string> = {
		GHS: "GHS",
		USD: "$",
		EUR: "€",
		GBP: "£",
		NGN: "₦",
		KES: "KSh",
		ZAR: "R",
	};
	return currencyMap[currency.toUpperCase()] || currency.toUpperCase();
}
