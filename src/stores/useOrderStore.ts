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

	// Persistent states for Orders Page
	activeTab: "active" | "closed" | "cancelled";
	search: string;
	dateFilter: string;
	customSingleDate: string;
	customDateStart: string;
	customDateEnd: string;
	selectedOrder: Order | null;

	setActiveTab: (tab: "active" | "closed" | "cancelled") => void;
	setSearch: (search: string) => void;
	setDateFilter: (filter: string) => void;
	setCustomSingleDate: (date: string) => void;
	setCustomDateStart: (date: string) => void;
	setCustomDateEnd: (date: string) => void;
	setSelectedOrder: (order: Order | null) => void;
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

	// Init persistent states
	activeTab: "active",
	search: "",
	dateFilter: "today",
	customSingleDate: "",
	customDateStart: "",
	customDateEnd: "",
	selectedOrder: null,

	setActiveTab: (activeTab) => set({ activeTab }),
	setSearch: (search) => set({ search }),
	setDateFilter: (dateFilter) => set({ dateFilter }),
	setCustomSingleDate: (customSingleDate) => set({ customSingleDate }),
	setCustomDateStart: (customDateStart) => set({ customDateStart }),
	setCustomDateEnd: (customDateEnd) => set({ customDateEnd }),
	setSelectedOrder: (selectedOrder) => set({ selectedOrder }),
}));
