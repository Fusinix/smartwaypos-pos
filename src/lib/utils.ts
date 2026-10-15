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

/**
 * Format an order audit timestamp like "@12pm on 12 August, 2026" or "@13:20 on 2 October, 2026"
 */
export function formatOrderAuditDate(
	dateInput: Date | string | undefined | null,
): string {
	if (!dateInput) return "";
	let str = String(dateInput).trim();
	if (str.includes(" ") && !str.includes("T")) {
		str = str.replace(" ", "T");
	}
	const d = new Date(str);
	if (isNaN(d.getTime())) return "";

	const hours = d.getHours();
	const minutes = d.getMinutes();
	const minStr = String(minutes).padStart(2, "0");
	const ampm = hours >= 12 ? "pm" : "am";
	const hour12 = hours % 12 || 12;

	// E.g. @12pm when minutes === 0, otherwise 24-hr time like @13:20
	const timeStr = minutes === 0 ? `${hour12}${ampm}` : `${hours}:${minStr}`;

	const monthNames = [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December",
	];
	const day = d.getDate();
	const month = monthNames[d.getMonth()];
	const year = d.getFullYear();

	return `@${timeStr} on ${day} ${month}, ${year}`;
}

export interface OrderAuditDetails {
	creatorName: string;
	createdDateStr: string;
	createdText: string;
	editorName: string;
	editedDateStr: string;
	editedText: string;
	shouldShowEditedBy: boolean;
}

export function getOrderAuditInfo(
	order?: {
		creator_name?: string;
		editor_name?: string;
		admin_id?: number;
		edited_by?: number;
		created_at?: string;
		updated_at?: string;
		closed_at?: string;
	} | null,
	fallbackCashierName?: string,
): OrderAuditDetails {
	if (!order) {
		const defaultDateStr = formatOrderAuditDate(new Date());
		const defaultName = fallbackCashierName || "Cashier";
		return {
			creatorName: defaultName,
			createdDateStr: defaultDateStr,
			createdText: `Created by: ${defaultName} , ${defaultDateStr}`,
			editorName: "",
			editedDateStr: "",
			editedText: "",
			shouldShowEditedBy: false,
		};
	}

	const creatorName = order.creator_name || fallbackCashierName || "Cashier";
	const createdDateStr = formatOrderAuditDate(order.created_at || new Date());
	const createdText = `Created by: ${creatorName} , ${createdDateStr}`;

	const editorName =
		order.editor_name || (order.edited_by ? fallbackCashierName || "Cashier" : "");
	const editedDate = order.updated_at || order.closed_at || order.created_at;
	const editedDateStr = formatOrderAuditDate(editedDate);
	const editedText = editorName ? `Edited by: ${editorName} , ${editedDateStr}` : "";

	// Condition: only show the edited by when there is an edited by info or when the edited by cashier is not the same as the created by cashier name.
	const hasEditorInfo = Boolean(order.editor_name || (order.edited_by && order.edited_by > 0));
	const isDifferentCashier = Boolean(
		(order.editor_name &&
			order.creator_name &&
			order.editor_name.trim().toLowerCase() !==
				order.creator_name.trim().toLowerCase()) ||
			(order.edited_by &&
				order.admin_id &&
				order.edited_by !== order.admin_id),
	);

	const shouldShowEditedBy =
		hasEditorInfo &&
		(isDifferentCashier ||
			Boolean(order.edited_by) ||
			Boolean(
				order.updated_at &&
					order.created_at &&
					order.updated_at !== order.created_at,
			));

	return {
		creatorName,
		createdDateStr,
		createdText,
		editorName,
		editedDateStr,
		editedText,
		shouldShowEditedBy,
	};
}

/**
 * Computes logical Business Date string (YYYY-MM-DD) for a given date,
 * shifting by the cut-off hour (e.g. 4:00 AM closing time).
 */
export function toBusinessDateStr(
	dateInput: Date | string | undefined | null,
	cutoff: number = 4,
): string {
	if (!dateInput) return "";
	let d: Date;
	if (typeof dateInput === "string") {
		let str = dateInput.trim();
		if (str.includes(" ") && !str.includes("T")) {
			str = str.replace(" ", "T");
		}
		if (!str.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(str)) {
			const parsedAsUtc = new Date(str + "Z");
			if (!isNaN(parsedAsUtc.getTime())) {
				d = parsedAsUtc;
			} else {
				d = new Date(str);
			}
		} else {
			d = new Date(str);
		}
	} else {
		d = dateInput;
	}
	if (isNaN(d.getTime())) return "";

	const busDate = new Date(d.getTime() - cutoff * 60 * 60 * 1000);
	const year = busDate.getFullYear();
	const month = String(busDate.getMonth() + 1).padStart(2, "0");
	const day = String(busDate.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/**
 * Safely extracts the businessDayCutoffHour from general settings.
 */
export function getCutoffHour(settings?: any): number {
	if (settings?.general) {
		const gen =
			typeof settings.general === "string" ?
				parseJSONString(settings.general)
			:	settings.general;
		if (
			typeof gen?.businessDayCutoffHour === "number" &&
			!isNaN(gen.businessDayCutoffHour)
		) {
			return gen.businessDayCutoffHour;
		}
	}
	return 4;
}

/**
 * Determines whether order items are editable based on:
 * 1. Order status is 'open'.
 * 2. Order created_at business date matches the current business date (respecting closing cut-off hour).
 */
export function canEditOrderItems(
	order: { created_at?: string; status?: string } | null | undefined,
	cutoffHour: number = 4,
	currentDate: Date = new Date(),
): boolean {
	if (!order || order.status !== "open" || !order.created_at) {
		return false;
	}
	const orderBusinessDate = toBusinessDateStr(order.created_at, cutoffHour);
	const currentBusinessDate = toBusinessDateStr(currentDate, cutoffHour);
	return Boolean(orderBusinessDate && orderBusinessDate === currentBusinessDate);
}

