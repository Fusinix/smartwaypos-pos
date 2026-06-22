/** @format */

import {
	Banknote,
	CircleUser,
	CreditCard,
	ShoppingBag,
	Smartphone,
	UtensilsCrossed,
} from "lucide-react";

export type PaymentModes = "momo" | "card" | "cash";
export type OrderTypes = "customer" | "table" | "takeout";

export const PaymentModeIcons = {
	card: CreditCard,
	cash: Banknote,
	momo: Smartphone,
};

export const OrderTypeIcons = {
	customer: CircleUser,
	table: UtensilsCrossed,
	takeout: ShoppingBag,
};
