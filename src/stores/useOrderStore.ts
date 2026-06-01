/** @format */

import { create } from "zustand";
import type { Order } from "@/types";

interface OrderState {
	orders: Order[];
	loading: boolean;
	error: string | null;
	editingOrder: Order | null;
	setOrders: (orders: Order[]) => void;
	setLoading: (loading: boolean) => void;
	setError: (error: string | null) => void;
	setEditingOrder: (order: Order | null) => void;
	updateEditingOrder: (order: Order) => void;
}

export const useOrderStore = create<OrderState>((set) => ({
	orders: [],
	loading: false,
	error: null,
	editingOrder: null,
	setOrders: (orders) => set({ orders }),
	setLoading: (loading) => set({ loading }),
	setError: (error) => set({ error }),
	setEditingOrder: (order) => set({ editingOrder: order }),
	updateEditingOrder: (order) => set({ editingOrder: order }),
}));
