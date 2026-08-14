/** @format */

import { AlertWithActions } from "@/components/alerts/alert-with-actions";
import EmptyState from "@/components/alerts/empty-state";
import { ClassStyles } from "@/components/classnames";
import { DailyReportDialog } from "@/components/dialogs/daily-report-dialog";
import { ExpensesDialog } from "@/components/dialogs/expenses-dialog";
import { ReceiptShareDialog } from "@/components/dialogs/receipt-share-dialog";
import {
	OrderTypeIcons,
	PaymentModeIcons,
	type PaymentModes,
} from "@/components/Icons";
import { EditOrderItemsDialog } from "@/components/orders/EditOrderItemsDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useCategory } from "@/hooks/useCategory";
import { useCurrency } from "@/hooks/useCurrency";
import { paymentModes, useOrders } from "@/hooks/useOrders";
import { useReceipt } from "@/hooks/useReceipt";
import { useSettings } from "@/hooks/useSettings";
import { cn, parseJSONString } from "@/lib/utils";
import { useAlertStore } from "@/stores/useAlertStore";
import { useOrderStore } from "@/stores/useOrderStore";
import type { Order } from "@/types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
	CheckSquare,
	Clipboard,
	Clock,
	FileText,
	Lock,
	Plus,
	Search,
	Upload,
	User,
	X,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const TabColors = {
	active: ["bg-primary", "text-primary", "border-primary"],
	closed: ["bg-blue-500", "text-blue-500", "border-blue-500"],
	cancelled: ["bg-destructive", "text-destructive", "border-destructive"],
};

export const Orders: React.FC = () => {
	const {
		orders,
		loading,
		error,
		fetchOrders,
		getOrderById,
		updateOrder,
		activeTab,
		setActiveTab,
		search,
		setSearch,
		dateFilter,
		setDateFilter,
		customSingleDate,
		setCustomSingleDate,
		customDateStart,
		setCustomDateStart,
		customDateEnd,
		setCustomDateEnd,
		selectedOrder,
		setSelectedOrder,
	} = useOrders();
	const { setEditingOrder } = useOrderStore();
	const navigate = useNavigate();
	const { fetchCategories } = useCategory();
	const { settings } = useSettings();
	const { showConfirm } = useAlertStore();
	const [originalOrder, setOriginalOrder] = useState<Order | null>(null);

	const hasChanges = useMemo(() => {
		if (!selectedOrder || !originalOrder) return false;
		return (
			(selectedOrder.customer_name || "") !==
				(originalOrder.customer_name || "") ||
			(selectedOrder.notes || "") !== (originalOrder.notes || "")
		);
	}, [selectedOrder, originalOrder]);

	const handleSaveOrderDetails = async () => {
		if (!selectedOrder) return;
		try {
			const updated = await updateOrder(selectedOrder);
			setOriginalOrder(updated);
			setSelectedOrder(updated);
		} catch (error) {
			console.error("Failed to save order details:", error);
			toast.error("Failed to save order changes");
		}
	};
	const [selectedOrderLoading, setSelectedOrderLoading] = useState(false);
	const [editItemsDialogOpen, setEditItemsDialogOpen] = useState(false);
	const [shareDialogOpen, setShareDialogOpen] = useState(false);
	const [amountTendered, setAmountTendered] = useState<string>("");
	const { format: formatCurrency } = useCurrency();
	const { printReceipt, printKitchenOrder } = useReceipt();

	const [lastEnterPress, setLastEnterPress] = useState<number>(0);
	const [enterCount, setEnterCount] = useState<number>(0);
	const { user } = useAuth();
	const [isGeneratingReport, setIsGeneratingReport] = useState(false);
	const [reportDialogOpen, setReportDialogOpen] = useState(false);
	const [expensesDialogOpen, setExpensesDialogOpen] = useState(false);
	const [reportData, setReportData] = useState<any>(null);

	const [isBulkMode, setIsBulkMode] = useState(false);
	const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(
		new Set(),
	);

	const handleBulkUpdateStatus = (
		status: "closed" | "cancelled" | "deleted",
	) => {
		if (selectedOrderIds.size === 0) return;
		const actionWord =
			status === "closed" ? "close"
			: status === "cancelled" ? "cancel"
			: "delete (mark as deleted)";

		showConfirm({
			title: `Bulk ${status.charAt(0).toUpperCase() + status.slice(1)} Orders?`,
			description: `Are you sure you want to ${actionWord} the ${selectedOrderIds.size} selected orders? This action cannot be undone.`,
			confirmText: `Confirm Bulk ${status.charAt(0).toUpperCase() + status.slice(1)}`,
			variant: status === "deleted" ? "destructive" : "default",
			onConfirm: async () => {
				try {
					await window.electron.invoke("bulk-update-orders", {
						ids: Array.from(selectedOrderIds),
						status,
						author: user,
					});

					toast.success(`Successfully updated ${selectedOrderIds.size} orders`);
					setSelectedOrderIds(new Set());
					setIsBulkMode(false);
					await fetchOrders();
					if (selectedOrder && selectedOrderIds.has(selectedOrder.id!)) {
						setSelectedOrder(null);
						setOriginalOrder(null);
					}
				} catch (err) {
					console.error("Bulk update failed:", err);
					toast.error("Failed to perform bulk update");
				}
			},
		});
	};

	// Multi-enter shortcut for manual drawer trigger
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Only trigger if no search/input or dialog is focused to avoid accidents
			if (e.key === "Enter") {
				const now = Date.now();
				if (now - lastEnterPress < 500) {
					const newCount = enterCount + 1;
					if (newCount === 3) {
						window.electron.invoke("trigger-cash-drawer");
						setEnterCount(0);
					} else {
						setEnterCount(newCount);
					}
				} else {
					setEnterCount(1);
				}
				setLastEnterPress(now);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [enterCount, lastEnterPress]);

	useEffect(() => {
		const init = async () => {
			await fetchOrders();
			fetchCategories();
			if (selectedOrder?.id) {
				try {
					const orderWithItems = await getOrderById(selectedOrder.id);
					setSelectedOrder(orderWithItems);
					setOriginalOrder(orderWithItems);
				} catch (error) {
					console.error("Failed to refresh selected order details:", error);
				}
			}
		};
		init();
	}, []);

	const handleOrderSelect = async (order: Order) => {
		if (!order.id) return;

		setSelectedOrderLoading(true);
		setAmountTendered("");
		try {
			const orderWithItems = await getOrderById(order.id);
			setSelectedOrder(orderWithItems);
			setOriginalOrder(orderWithItems);
		} catch (error) {
			console.error("Failed to fetch order details:", error);
			// Fallback to basic order data
			setSelectedOrder(order);
			setOriginalOrder(order);
		} finally {
			setSelectedOrderLoading(false);
		}
	};

	const filteredOrders = useMemo(() => {
		return orders.filter((order) => {
			// Tab filter
			if (activeTab === "active" && order.status !== "open") return false;
			if (activeTab === "closed" && order.status !== "closed") return false;
			if (activeTab === "cancelled" && order.status !== "cancelled")
				return false;

			// Date filter
			if (dateFilter !== "all" && order.created_at) {
				const orderDate = new Date(order.created_at);
				const now = new Date();

				if (dateFilter === "today") {
					const todayStart = new Date(
						now.getFullYear(),
						now.getMonth(),
						now.getDate(),
					);
					const todayEnd = new Date(
						now.getFullYear(),
						now.getMonth(),
						now.getDate() + 1,
					);
					if (orderDate < todayStart || orderDate >= todayEnd) return false;
				} else if (dateFilter === "week") {
					const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
					if (orderDate < weekAgo) return false;
				} else if (dateFilter === "month") {
					const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
					if (orderDate < monthStart) return false;
				} else if (dateFilter === "custom_date" && customSingleDate) {
					const singleStart = new Date(customSingleDate);
					singleStart.setHours(0, 0, 0, 0);
					const singleEnd = new Date(customSingleDate);
					singleEnd.setHours(23, 59, 59, 999);
					if (orderDate < singleStart || orderDate > singleEnd) return false;
				} else if (dateFilter === "custom") {
					if (customDateStart && orderDate < new Date(customDateStart))
						return false;
					if (customDateEnd) {
						const endDate = new Date(customDateEnd);
						endDate.setHours(23, 59, 59, 999);
						if (orderDate > endDate) return false;
					}
				}
			}

			// Search filter
			const searchLower = search.toLowerCase();
			const matchesSearch =
				(order.customer_name &&
					order.customer_name.toLowerCase().includes(searchLower)) ||
				(order.id && order.id.toString().includes(searchLower)) ||
				(order.order_number &&
					order.order_number.toString().includes(searchLower)) ||
				(order.table_number !== null &&
					order.table_number !== undefined &&
					order.table_number.toString().toLowerCase().includes(searchLower)) ||
				(order.order_type === "takeout" && searchLower.includes("takeout")) ||
				(order.order_type === "takeout" && searchLower.includes("to-")) ||
				false;
			return matchesSearch;
		});
	}, [
		orders,
		activeTab,
		search,
		dateFilter,
		customSingleDate,
		customDateStart,
		customDateEnd,
	]);

	const periodStats = useMemo(() => {
		let totalSales = 0;
		let totalCash = 0;
		let totalMomo = 0;
		let closedCount = 0;
		let totalCancelledAmount = 0;
		let cancelledCount = 0;

		orders.forEach((order) => {
			if (dateFilter !== "all" && order.created_at) {
				const orderDate = new Date(order.created_at);
				const now = new Date();

				if (dateFilter === "today") {
					const todayStart = new Date(
						now.getFullYear(),
						now.getMonth(),
						now.getDate(),
					);
					const todayEnd = new Date(
						now.getFullYear(),
						now.getMonth(),
						now.getDate() + 1,
					);
					if (orderDate < todayStart || orderDate >= todayEnd) return;
				} else if (dateFilter === "week") {
					const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
					if (orderDate < weekAgo) return;
				} else if (dateFilter === "month") {
					const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
					if (orderDate < monthStart) return;
				} else if (dateFilter === "custom_date" && customSingleDate) {
					const singleStart = new Date(customSingleDate);
					singleStart.setHours(0, 0, 0, 0);
					const singleEnd = new Date(customSingleDate);
					singleEnd.setHours(23, 59, 59, 999);
					if (orderDate < singleStart || orderDate > singleEnd) return;
				} else if (dateFilter === "custom") {
					if (customDateStart && orderDate < new Date(customDateStart))
						return;
					if (customDateEnd) {
						const endDate = new Date(customDateEnd);
						endDate.setHours(23, 59, 59, 999);
						if (orderDate > endDate) return;
					}
				}
			}

			const amount = Number(order.amount || 0);

			if (order.status === "closed") {
				closedCount++;
				totalSales += amount;
				const pm = (order.payment_mode || "").toLowerCase();
				if (pm === "cash") {
					totalCash += amount;
				} else if (pm === "momo" || pm === "mobile money") {
					totalMomo += amount;
				}
			} else if (order.status === "cancelled") {
				cancelledCount++;
				totalCancelledAmount += amount;
			}
		});

		return {
			totalSales,
			totalCash,
			totalMomo,
			closedCount,
			totalCancelledAmount,
			cancelledCount,
		};
	}, [
		orders,
		dateFilter,
		customSingleDate,
		customDateStart,
		customDateEnd,
	]);

	const groupedOrders = useMemo(() => {
		const groups: { [key: string]: Order[] } = {};

		filteredOrders.forEach((order) => {
			if (!order.created_at) return;

			const date = new Date(order.created_at);
			const dateString = date.toLocaleDateString(undefined, {
				weekday: "long",
				month: "long",
				day: "numeric",
				year: "numeric",
			});

			if (!groups[dateString]) {
				groups[dateString] = [];
			}
			groups[dateString].push(order);
		});

		// Return entries sorted by date (newest date first)
		return Object.entries(groups).sort((a, b) => {
			const dateA = new Date(a[1][0].created_at!);
			const dateB = new Date(b[1][0].created_at!);
			return dateB.getTime() - dateA.getTime();
		});
	}, [filteredOrders]);

	const selectedOrderTotal = useMemo(() => {
		if (!selectedOrder || !selectedOrder.items) return 0;
		let subtotal = 0;
		selectedOrder.items.forEach((item: any) => {
			const itemPrice =
				item.item_type === "food" ?
					Number(item.food_price || item.price || 0)
				:	Number(item.price || 0);
			const quantity = parseInt(item.quantity || 1, 10);
			let itemTotal = itemPrice * quantity;
			if (item.item_type === "food" && item.extras && item.extras.length > 0) {
				const extrasTotal = item.extras.reduce(
					(sum: number, e: any) =>
						sum + parseFloat(e.price || 0) * parseInt(e.quantity || 1, 10),
					0,
				);
				itemTotal += extrasTotal * quantity;
			}
			subtotal += itemTotal;
		});
		const taxRate = Number(selectedOrder.tax || 0);
		return subtotal * (1 + taxRate / 100);
	}, [selectedOrder]);

	// Auto-update Customer Display (must be after selectedOrderTotal is defined)
	useEffect(() => {
		const port = parseJSONString(settings?.pos as any)?.customerDisplayPort;
		if (!port) return;

		const totalStr = selectedOrder ? selectedOrderTotal.toFixed(2) : "0.00";

		window.electron.invoke("update-customer-display", port, totalStr);
	}, [selectedOrderTotal, selectedOrder?.id, settings?.pos]);

	const [showPrintConfirm, setShowPrintConfirm] = useState(false);
	const [orderToPrint, setOrderToPrint] = useState<any>(null);

	const handleCloseOrder = async () => {
		if (!selectedOrder) return;
		try {
			// Trigger cash drawer if payment mode is cash
			if (selectedOrder.payment_mode?.toLowerCase() === "cash") {
				try {
					await window.electron.invoke("trigger-cash-drawer");
				} catch (drawerError) {
					console.error("Failed to trigger cash drawer:", drawerError);
				}
			}

			await updateOrder({
				...selectedOrder,
				status: "closed",
				amount_tendered:
					selectedOrder.payment_mode === "cash" ?
						parseFloat(amountTendered || "0")
					:	0,
			});
			// Refresh details
			if (selectedOrder.id) {
				const updated = await getOrderById(selectedOrder.id);
				setSelectedOrder(updated);
				setOriginalOrder(updated);
				// Refresh orders list to update UI
				await fetchOrders();

				// Show print confirmation instead of auto-printing
				setOrderToPrint(updated);
				setShowPrintConfirm(true);

				// Update Customer Display with Change amount only
				const posSettings = parseJSONString(settings?.pos as any);
				const port = posSettings?.customerDisplayPort;
				if (port) {
					const change = (updated.amount_tendered || 0) - (updated.amount || 0);
					const changeStr = change > 0 ? change.toFixed(2) : "0.00";
					window.electron.invoke("update-customer-display", port, changeStr);
				}
			}
		} catch (error) {
			console.error("Failed to close order:", error);
		}
	};

	const handleCancelOrder = () => {
		if (!selectedOrder) return;
		showConfirm({
			title: "Cancel Order?",
			description: `Are you sure you want to cancel Order #${selectedOrder.order_number ?? selectedOrder.id}? This action cannot be undone.`,
			confirmText: "Cancel Order",
			variant: "destructive",
			onConfirm: async () => {
				try {
					await updateOrder({
						...selectedOrder,
						status: "cancelled",
					});
					// Refresh details
					if (selectedOrder.id) {
						const updated = await getOrderById(selectedOrder.id);
						setSelectedOrder(updated);
						setOriginalOrder(updated);
						// Refresh orders list to update UI
						await fetchOrders();
					}
				} catch (error) {
					console.error("Failed to cancel order:", error);
					toast.error("Failed to cancel order");
				}
			},
		});
	};

	const handleEditItems = async () => {
		if (selectedOrder) {
			if (hasChanges) {
				try {
					const updated = await updateOrder(selectedOrder);
					setOriginalOrder(updated);
					setSelectedOrder(updated);
					setEditingOrder(updated);
				} catch (error) {
					console.error("Failed to save changes before editing:", error);
					toast.error("Failed to save changes before editing items");
					return;
				}
			} else {
				setEditingOrder(selectedOrder);
			}
			navigate("/orders/edit");
		}
	};

	const handleGenerateReport = async () => {
		setIsGeneratingReport(true);
		try {
			const data = await window.electron.invoke(
				"get-daily-inventory-report",
				undefined,
				user,
			);
			setReportData(data);
			setReportDialogOpen(true);
		} catch (error) {
			console.error("Failed to fetch report data:", error);
			toast.error("Failed to fetch report data");
		} finally {
			setIsGeneratingReport(false);
		}
	};

	const handleDownloadPDF = () => {
		if (!reportData) return;

		try {
			const doc = new jsPDF();
			const pageWidth = doc.internal.pageSize.getWidth();

			// 1. Header
			doc.setFontSize(22);
			doc.setTextColor(40, 40, 40);
			doc.text("Daily Sales & Inventory Report", pageWidth / 2, 20, {
				align: "center",
			});

			doc.setFontSize(12);
			doc.setTextColor(100, 100, 100);
			doc.text(
				`Generated on: ${new Date().toLocaleString()}`,
				pageWidth / 2,
				28,
				{ align: "center" },
			);
			doc.text(`Staff: ${user?.username || "Admin"}`, pageWidth / 2, 35, {
				align: "center",
			});

			// 2. Inventory Table (Drinks)
			doc.setFontSize(16);
			doc.setTextColor(0, 0, 0);
			doc.text("Drinks Inventory Reconciliation", 14, 50);

			const inventoryBody = reportData.inventory.map((item: any) => [
				item.name,
				item.openingStock,
				item.added,
				item.sold,
				item.damaged,
				item.adjusted,
				formatCurrency(item.totalSales),
				item.stockLeft,
			]);

			autoTable(doc, {
				startY: 55,
				head: [
					["Item", "Open", "Add", "Sold", "Wasted", "Adj", "Sales", "Left"],
				],
				body: inventoryBody,
				theme: "striped",
				headStyles: { fillColor: [41, 128, 185], textColor: 255 },
				styles: { fontSize: 8 },
			});

			// 3. Food Sales Table
			let currentY = (doc as any).lastAutoTable.finalY || 100;
			doc.setFontSize(14);
			doc.setTextColor(0, 0, 0);
			doc.text("Food Sales Summary", 14, currentY + 15);

			const foodBody = reportData.foodSales.map((item: any) => [
				item.name,
				item.quantity,
				formatCurrency(item.totalSales),
			]);

			autoTable(doc, {
				startY: currentY + 20,
				head: [["Item Name", "Qty Sold", "Total Revenue"]],
				body: foodBody,
				theme: "striped",
				headStyles: { fillColor: [39, 174, 96], textColor: 255 },
				styles: { fontSize: 9 },
			});

			// 4. Expenses Table
			currentY = (doc as any).lastAutoTable.finalY || 200;
			doc.setFontSize(14);
			doc.text("Daily Expenses", 14, currentY + 15);

			const expenseBody = reportData.expenses.map((e: any) => [
				e.description,
				formatCurrency(e.amount),
				e.staff,
			]);

			autoTable(doc, {
				startY: currentY + 20,
				head: [["Description", "Amount", "Staff"]],
				body: expenseBody,
				theme: "striped",
				headStyles: { fillColor: [192, 57, 43], textColor: 255 },
				styles: { fontSize: 9 },
			});

			// 5. Final Summary
			currentY = (doc as any).lastAutoTable.finalY || 250;
			const drinksTotal = reportData.inventory.reduce(
				(sum: number, item: any) => sum + item.totalSales,
				0,
			);
			const foodTotal = reportData.foodSales.reduce(
				(sum: number, item: any) => sum + item.totalSales,
				0,
			);
			const netRevenue =
				drinksTotal + foodTotal - (reportData.totalExpenses || 0);

			doc.setFontSize(12);
			doc.setFont("helvetica", "bold");
			doc.text(
				`Total Sales: ${formatCurrency(drinksTotal + foodTotal)}`,
				pageWidth - 14,
				currentY + 15,
				{ align: "right" },
			);
			doc.text(
				`Total Cash: ${formatCurrency(reportData.cashTotal || 0)}`,
				pageWidth - 14,
				currentY + 23,
				{ align: "right" },
			);
			doc.text(
				`Total MoMo: ${formatCurrency(reportData.momoTotal || 0)}`,
				pageWidth - 14,
				currentY + 31,
				{ align: "right" },
			);
			doc.text(
				`Total Expenses: -${formatCurrency(reportData.totalExpenses || 0)}`,
				pageWidth - 14,
				currentY + 39,
				{ align: "right" },
			);
			doc.text(
				`Pending Orders: ${formatCurrency(reportData.pendingOrders?.total || 0)} (${reportData.pendingOrders?.count})`,
				pageWidth - 14,
				currentY + 47,
				{ align: "right" },
			);

			doc.setFontSize(16);
			doc.setTextColor(39, 174, 96);
			doc.text(
				`NET REVENUE: ${formatCurrency(netRevenue)}`,
				pageWidth - 14,
				currentY + 61,
				{ align: "right" },
			);

			// Save the PDF
			const fileName = `DailyReport_${reportData.date}_${user?.username || "Admin"}.pdf`;
			doc.save(fileName);
			toast.success("Report downloaded successfully");
		} catch (error) {
			console.error("Failed to generate PDF:", error);
			toast.error("Failed to generate PDF");
		}
	};

	const OrderTypeIcon =
		selectedOrder ? OrderTypeIcons[selectedOrder.order_type] : null;
	const PaymentIcon =
		(
			selectedOrder &&
			selectedOrder.payment_mode &&
			selectedOrder.payment_mode in PaymentModeIcons
		) ?
			PaymentModeIcons[selectedOrder.payment_mode as PaymentModes]
		:	null;

	// const canDeleteProducts = user?.role === "admin" || user?.role === "manager";

	return (
		<div className="h-full flex flex-col">
			{/* Page Header */}
			<div className="bg-white border-b px-4 py-2">
				<div className="flex justify-between items-center">
					<h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
					<div className="flex gap-3">
						<Button
							variant="ghost"
							size="icon"
							// className="text-base flex items-center gap-2"
							onClick={() => window.electron.invoke("trigger-cash-drawer")}
						>
							<Upload className="h-5 w-5" />
						</Button>
						<Button
							variant="outline"
							size="default"
							className="text-base flex items-center gap-2 shadow-none"
							onClick={handleGenerateReport}
							disabled={isGeneratingReport}
						>
							<FileText className="h-5 w-5" />
							{isGeneratingReport ? "Generating..." : "Report"}
						</Button>
						<Button
							variant="outline"
							size="default"
							className="text-base flex items-center gap-2 bg-red-50 border-red-100 text-red-700 hover:bg-red-50 hover:border-red-100 hover:text-red-500 shadow-none"
							onClick={() => setExpensesDialogOpen(true)}
						>
							<Plus className="h-5 w-5" />
							Expenses
						</Button>

						<Button
							size="default"
							className="text-base"
							onClick={() => {
								navigate("/create-order");
							}}
						>
							<Plus />
							Create Order
						</Button>
					</div>
				</div>
			</div>

			{/* Main Content */}
			<div className="flex-1 flex h-[calc(100%-62px)]">
				{/* Left Panel */}
				<div className="flex-1 h-full border-r bg-white flex flex-col">
					{/* Filter Header */}
					<div className="flex items-center gap-4 px-4 py-2 border-b !h-14">
						<Button
							variant={activeTab === "active" ? "default" : "outline"}
							size="default"
							className={cn(
								ClassStyles.tabButton,
								"text-base shadow-none",
								activeTab === "active" ?
									`!${TabColors["active"][0]}`
								:	" hover:bg-muted/20 text-muted-foreground",
							)}
							onClick={() => setActiveTab("active")}
						>
							<FileText className="!size-4" />
							Opened
						</Button>
						<Button
							variant={activeTab === "closed" ? "default" : "outline"}
							size="default"
							className={cn(
								ClassStyles.tabButton,
								"text-base shadow-none",
								activeTab === "closed" ?
									`${TabColors["closed"][0]} hover:${TabColors["closed"][0]}`
								:	" hover:bg-muted/20 text-muted-foreground",
							)}
							onClick={() => setActiveTab("closed")}
						>
							<Lock className="!size-4" />
							Closed
						</Button>
						<Button
							variant={activeTab === "cancelled" ? "default" : "outline"}
							size="default"
							className={cn(
								ClassStyles.tabButton,
								"text-base  shadow-none",
								activeTab === "cancelled" ?
									`${TabColors["cancelled"][0]} hover:${TabColors["cancelled"][0]}`
								:	" hover:bg-muted/20 text-muted-foreground",
							)}
							onClick={() => setActiveTab("cancelled")}
						>
							<X className="!size-4" />
							Cancelled
						</Button>
						<div className="w-px h-10 bg-border" />
						<div className="flex-1 flex items-center relative w-full max-w-lg">
							<Search className="absolute size-5 left-4 text-muted-foreground z-10" />
							<Input
								className="w-full flex-1 text-base rounded-md pl-11 h-10 bg-muted/80"
								placeholder="Search by Name, Order # or Table #"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
							/>
						</div>
						{/* Date Filter */}
						<div
							className={cn(
								"flex items-center space-x-2",
								selectedOrder ? "hidden" : "",
							)}
						>
							<Select value={dateFilter} onValueChange={setDateFilter}>
								<SelectTrigger className="w-40 text-base">
									<SelectValue placeholder="Filter by Date" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Dates</SelectItem>
									<SelectItem value="today">Today</SelectItem>
									<SelectItem value="week">Last 7 Days</SelectItem>
									<SelectItem value="month">This Month</SelectItem>
									<SelectItem value="custom_date">Custom Date</SelectItem>
									<SelectItem value="custom">Custom Range</SelectItem>
								</SelectContent>
							</Select>
							{dateFilter === "custom_date" && (
								<Input
									type="date"
									className="h-9 w-40 text-base"
									placeholder="Select Date"
									value={customSingleDate}
									onChange={(e) => setCustomSingleDate(e.target.value)}
								/>
							)}
							{dateFilter === "custom" && (
								<>
									<Input
										type="date"
										className="h-9 w-40 text-base"
										placeholder="Start Date"
										value={customDateStart}
										onChange={(e) => setCustomDateStart(e.target.value)}
									/>
									<Input
										type="date"
										className="h-9 w-40 text-base"
										placeholder="End Date"
										value={customDateEnd}
										onChange={(e) => setCustomDateEnd(e.target.value)}
									/>
								</>
							)}
							{user?.role === "admin" && groupedOrders?.length > 0 && (
								<Button
									variant={isBulkMode ? "default" : "outline"}
									size="default"
									className={cn(
										ClassStyles.tabButton,
										"text-base  shadow-none",
										isBulkMode ? "" : (
											" hover:bg-muted/20 text-muted-foreground"
										),
									)}
									onClick={() => {
										setIsBulkMode(!isBulkMode);
										setSelectedOrderIds(new Set());
									}}
								>
									<CheckSquare className="!size-4" />
									{isBulkMode ? "Exit Bulk" : "Bulk Edit"}
								</Button>
							)}
						</div>
					</div>

					{/* Period Stats Summary Bar - Admin Only */}
					{user?.role === "admin" && (
						<div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 py-3 bg-gray-50 border-b">
							<div className="bg-white p-3 rounded-lg border shadow-sm flex flex-col justify-center">
								<span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
									Total Sales
								</span>
								<span className="text-xl font-bold text-emerald-600 mt-1">
									{formatCurrency(periodStats.totalSales)}
								</span>
								<span className="text-[11px] text-gray-500 mt-0.5">
									{periodStats.closedCount} closed order{periodStats.closedCount !== 1 ? "s" : ""}
								</span>
							</div>

							<div className="bg-white p-3 rounded-lg border shadow-sm flex flex-col justify-center">
								<span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
									Total Cash
								</span>
								<span className="text-xl font-bold text-blue-600 mt-1">
									{formatCurrency(periodStats.totalCash)}
								</span>
								<span className="text-[11px] text-gray-500 mt-0.5">Cash payments</span>
							</div>

							<div className="bg-white p-3 rounded-lg border shadow-sm flex flex-col justify-center">
								<span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
									Total MoMo
								</span>
								<span className="text-xl font-bold text-purple-600 mt-1">
									{formatCurrency(periodStats.totalMomo)}
								</span>
								<span className="text-[11px] text-gray-500 mt-0.5">Mobile Money</span>
							</div>

							<div className="bg-white p-3 rounded-lg border shadow-sm flex flex-col justify-center">
								<span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
									Cancelled Orders
								</span>
								<span className="text-xl font-bold text-rose-600 mt-1">
									{formatCurrency(periodStats.totalCancelledAmount)}
								</span>
								<span className="text-[11px] text-gray-500 mt-0.5">
									{periodStats.cancelledCount} cancelled order{periodStats.cancelledCount !== 1 ? "s" : ""}
								</span>
							</div>
						</div>
					)}

					{/* Order List - Responsive Grid */}
					<div
						className={cn(
							"flex-1 overflow-y-auto p-4 pb-20 bg-muted relative",
							// keyboardBottom ? "pb-[40dvh]" : "",
						)}
					>
						{loading && groupedOrders.length > 0 && (
							<div className="absolute top-0 left-0 right-0 z-20">
								<div className="h-1 bg-primary/20 w-full overflow-hidden">
									<div className="h-full bg-primary animate-progress w-1/3" />
								</div>
							</div>
						)}
						{loading && groupedOrders.length === 0 ?
							<div className="p-4 text-center text-gray-500 text-lg">
								Loading...
							</div>
						: error ?
							<div className="p-4 text-center text-red-500 text-lg">
								{error}
							</div>
						: groupedOrders.length === 0 ?
							<EmptyState
								icon={Clipboard}
								title="No orders yet"
								description="Orders will appear here once customers start placing them."
							/>
						:	<div className="space-y-8">
								{groupedOrders.map(([dateString, ordersInGroup]) => (
									<div key={dateString} className="space-y-4">
										<div className="sticky -top-5 z-10 py-2 bg-muted/95 backdrop-blur-sm">
											<h3 className="text-lg font-bold text-gray-900 border-l-4 border-primary pl-3">
												{dateString}
											</h3>
										</div>
										<div
											className={cn(
												"grid gap-4 px-0",
												selectedOrder?.id ?
													"grid-cols-1 md:grid-cols-2 lg:grid-cols-3 "
												:	"grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 ",
											)}
										>
											{ordersInGroup.map((order) => {
												const isOpen = order.status === "open";
												const PaymentIcon =
													(
														order.payment_mode &&
														order.payment_mode in PaymentModeIcons
													) ?
														PaymentModeIcons[order.payment_mode as PaymentModes]
													:	PaymentModeIcons["cash"];

												return (
													<div
														key={order.id}
														className={cn(
															"bg-card rounded-lg p-4 cursor-pointer transition-all relative",
															TabColors[activeTab][2],
															(
																isBulkMode &&
																	order.id &&
																	selectedOrderIds.has(order.id)
															) ?
																`border-2 bg-primary/5`
															: selectedOrder?.id === order.id ? `border-2`
															: "hover:shadow-md hover:border-primary/50",
														)}
														onClick={() => {
															if (isBulkMode) {
																if (!order.id) return;
																const newSelected = new Set(selectedOrderIds);
																if (newSelected.has(order.id)) {
																	newSelected.delete(order.id);
																} else {
																	newSelected.add(order.id);
																}
																setSelectedOrderIds(newSelected);
															} else {
																handleOrderSelect(order);
															}
														}}
													>
														{isBulkMode && order.id && (
															<div className="absolute top-3 left-3 z-10">
																<input
																	type="checkbox"
																	checked={selectedOrderIds.has(order.id)}
																	onChange={(e) => {
																		e.stopPropagation();
																		const newSelected = new Set(
																			selectedOrderIds,
																		);
																		if (newSelected.has(order.id!)) {
																			newSelected.delete(order.id!);
																		} else {
																			newSelected.add(order.id!);
																		}
																		setSelectedOrderIds(newSelected);
																	}}
																	className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer accent-primary"
																/>
															</div>
														)}
														{isOpen ?
															<div className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full animate-blink" />
														: order.status === "cancelled" ?
															<div className="absolute top-3 right-3 text-red-500">
																<X className="h-5 w-5" strokeWidth={3} />
															</div>
														:	<div className="absolute top-3 right-3 text-muted-foreground/60">
																<Lock strokeWidth={3} />
															</div>
														}
														<div className="space-y-3">
															<div className="">
																<div className="flex-1 pb-2 space-y-1">
																	<div
																		className={cn(
																			"font-bold text-2xl text-gray-900 truncate",
																			isBulkMode ? "pl-7" : "",
																		)}
																	>
																		Order #{order.order_number ?? order.id}
																		{order.customer_name && (
																			<span className="text-base font-normal text-muted-foreground ml-2">
																				({order.customer_name})
																			</span>
																		)}
																	</div>
																	<p className="text-sm text-gray-900 line-clamp-2">
																		{order.notes}
																	</p>
																	<div className="mt-1 flex items-center gap-2 flex-wrap">
																		<div
																			className={cn(
																				"inline-flex items-center px-2 py-1 rounded-md text-xs font-medium uppercase",
																				isOpen ? "bg-primary/10 text-primary"
																				: order.status === "cancelled" ?
																					"bg-red-100 text-red-800"
																				:	"bg-muted text-muted-foreground",
																			)}
																		>
																			{isOpen && (
																				<div
																					className={cn(
																						"w-2 h-2 mr-2 bg-primary rounded-full animate-blink",
																					)}
																				/>
																			)}
																			{order.status}
																		</div>
																		{order.order_type === "table" &&
																			order.table_number && (
																				<span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
																					Table {order.table_number}
																				</span>
																			)}
																		{order.order_type === "takeout" &&
																			order.table_number && (
																				<span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800">
																					{order.table_number}
																				</span>
																			)}
																	</div>
																</div>
															</div>

															<div className="py-3 border-y border-gray-200">
																<div className="flex items-center justify-between flex-wrap gap-2">
																	<PaymentIcon className="text-muted-foreground/60 size-4" />
																	<p className="text-sm text-gray-500 mr-auto">
																		Total
																	</p>
																	<p
																		className={cn(
																			"font-bold text-xl",
																			TabColors[activeTab][1],
																		)}
																	>
																		{formatCurrency(order.amount ?? 0)}
																	</p>
																</div>
															</div>

															<div className="text-xs pt-1 text-gray-500 flex items-center gap-2">
																<Clock className="size-4 text-muted-foreground/60" />
																{order.created_at ?
																	new Date(order.created_at).toLocaleString()
																:	"N/A"}
															</div>
														</div>
													</div>
												);
											})}
										</div>
									</div>
								))}
							</div>
						}
					</div>
					{isBulkMode && selectedOrderIds.size > 0 && (
						<div className="bg-card px-6 py-4 flex items-center justify-between animate-in slide-in-from-bottom duration-300">
							<div className="flex items-center gap-2">
								<span className="text-sm">
									{selectedOrderIds.size}{" "}
									{selectedOrderIds.size === 1 ? "order" : "orders"} selected
								</span>
							</div>
							<div className="flex gap-3">
								{activeTab === "active" && (
									<Button
										variant="default"
										size="default"
										onClick={() => handleBulkUpdateStatus("closed")}
										className="bg-green-600 hover:bg-green-700 text-white shadow-none text-base"
									>
										Mark Closed
									</Button>
								)}
								{activeTab !== "cancelled" && (
									<Button
										variant="default"
										size="default"
										onClick={() => handleBulkUpdateStatus("cancelled")}
										className="bg-orange-500 hover:bg-orange-600 text-white shadow-none text-base"
									>
										Mark Cancelled
									</Button>
								)}
								<Button
									variant="destructive"
									size="default"
									onClick={() => handleBulkUpdateStatus("deleted")}
									className="bg-red-600 hover:bg-red-700 text-white shadow-none text-base"
								>
									Mark Deleted
								</Button>
								<Button
									variant="outline"
									size="default"
									onClick={() => setSelectedOrderIds(new Set())}
									className="text-base"
								>
									Clear Selection
								</Button>
							</div>
						</div>
					)}
				</div>
				{/* Right Panel: Order Details */}
				<div
					className={cn(
						"bg-white flex flex-col !h-full overflow-y-auto overflow-x-hidden w-1/3",
						!selectedOrder && "hidden",
					)}
				>
					<div className="flex items-center justify-between p-4 py-2 !h-14 border-b sticky top-0 z-10 bg-card">
						<h2 className="text-2xl font-semibold">Order Details</h2>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => {
								setSelectedOrder(null);
								setOriginalOrder(null);
							}}
						>
							<X />
						</Button>
					</div>
					{!selectedOrder ?
						<EmptyState
							icon={Clipboard}
							title="No Order Selected"
							description="Select an order from the list or create a new one to view its details here."
						/>
					:	<div className="flex-1 flex flex-col pt-1 space-y-6">
							{/* Cart Section */}
							<div className="border-b p-6 pt-0 pb-12 max-h-[60%] overflow-y-auto">
								{selectedOrderLoading ?
									<div className="py-2 text-base text-gray-400">
										Loading order details...
									</div>
								:	<ul className="divide-y space-y-2">
										{selectedOrder.items && selectedOrder.items.length > 0 ?
											selectedOrder.items.map((item: any, index: number) => {
												const itemName =
													item.item_type === "food" ?
														item.food_item_name
													:	item.product_name;
												const itemImage =
													item.item_type === "food" ?
														item.food_image
													:	item.image;
												const basePrice =
													item.item_type === "food" ?
														item.food_price || item.price || 0
													:	item.price || 0;
												const quantity = item.quantity || 1;

												// Calculate total price including extras (multiplied by quantity)
												let itemTotal = basePrice * quantity;
												if (
													item.item_type === "food" &&
													item.extras &&
													item.extras.length > 0
												) {
													const extrasTotal = item.extras.reduce(
														(sum: number, e: any) =>
															sum + (e.price || 0) * (e.quantity || 1),
														0,
													);
													// Extras total should be multiplied by item quantity
													itemTotal += extrasTotal * quantity;
												}
												// Price per unit for display
												const itemPricePerUnit = itemTotal / quantity;
												const itemKey =
													item.item_type === "food" ?
														`food-${item.food_item_id}-${index}`
													:	`drink-${item.product_id}`;

												return (
													<li
														key={itemKey}
														className="flex items-start justify-between py-3 pt-4 text-base"
													>
														<div className="flex items-start gap-4 flex-1 min-w-0">
															{itemImage ?
																<img
																	src={itemImage}
																	alt={itemName}
																	className="w-14 h-14 object-cover rounded-xl border flex-shrink-0"
																/>
															:	<div className="w-14 h-14 flex items-center justify-center text-3xl bg-gray-100 rounded-xl border flex-shrink-0">
																	{item.item_type === "food" ? "🍽️" : "🍺"}
																</div>
															}
															<div className="flex-1 min-w-0">
																<span className="font-medium block">
																	{itemName || "Unknown Item"}
																</span>
																<div className="text-xs text-gray-600 mt-1">
																	Base: {formatCurrency(basePrice)} × {quantity}
																</div>
																{item.item_type === "food" &&
																	item.extras &&
																	item.extras.length > 0 && (
																		<div className="text-xs text-gray-500 mt-1 space-y-1">
																			<div className="font-semibold text-foreground">
																				Extras:
																			</div>
																			{item.extras.map(
																				(e: any, extraIndex: number) => {
																					const extraQty = e.quantity || 1;
																					const extraTotal =
																						(e.price || 0) *
																						extraQty *
																						quantity;
																					return (
																						<div
																							key={extraIndex}
																							className="pl-2"
																						>
																							{e.name}
																							{extraQty > 1 &&
																								` (×${extraQty})`}
																							: {formatCurrency(extraTotal)}
																						</div>
																					);
																				},
																			)}
																			<div className="pl-2 font-medium text-gray-700">
																				Extras Total:{" "}
																				{formatCurrency(
																					item.extras.reduce(
																						(sum: number, e: any) =>
																							sum +
																							(e.price || 0) *
																								(e.quantity || 1) *
																								quantity,
																						0,
																					),
																				)}
																			</div>
																		</div>
																	)}

																{item.notes && (
																	<div className="text-xs text-gray-500 mt-1">
																		<span className="font-semibold text-foreground">
																			Note:{" "}
																		</span>
																		<div className="black p-2 bg-muted/50 rounded-xl">
																			{item.notes}
																		</div>
																	</div>
																)}
															</div>
														</div>
														<span className="font-semibold ml-3 flex-shrink-0">
															{formatCurrency(itemTotal)}
														</span>
													</li>
												);
											})
										:	<li className="py-3 text-base text-gray-400">
												No items in cart
											</li>
										}
									</ul>
								}
							</div>
							{/* Order Info Section */}
							<div className="space-y-4 p-6 py-0">
								<div className="text-base font-semibold">Order Info</div>
								{/* {selectedOrder.customer_name && (
									<div className="flex items-center justify-between gap-x-2">
										<span className="text-base text-gray-500">Order Name:</span>
										<span className="text-base font-medium">
											{selectedOrder.customer_name}
										</span>
									</div>
								)} */}
								<div className="flex items-center justify-between gap-x-2">
									<span className="text-base text-gray-500">Type:</span>

									<span className="capitalize text-base font-medium flex items-center gap-2">
										{OrderTypeIcon ?
											<OrderTypeIcon className="text-muted-foreground/80 size-4" />
										:	null}
										{selectedOrder.order_type === "takeout" ?
											"Take-Out"
										: selectedOrder.order_type === "table" ?
											"Table"
										:	"Cushier"}{" "}
										{selectedOrder.order_type === "table" &&
											selectedOrder.table_number && (
												<span className="ml-2 text-gray-500">
													(#{selectedOrder.table_number})
												</span>
											)}
										{selectedOrder.order_type === "takeout" &&
											selectedOrder.table_number && (
												<span className="ml-2 text-gray-500">
													({selectedOrder.table_number})
												</span>
											)}
									</span>
								</div>
								<div className={cn("flex justify-between items-center gap-1")}>
									<p className="text-sm font-medium text-gray-500">Name:</p>
									{selectedOrder.status === "open" ?
										<Input
											id="customer-name"
											name="customer-name"
											value={selectedOrder.customer_name || ""}
											onChange={(e) => {
												setSelectedOrder({
													...selectedOrder,
													customer_name: e.target.value,
												});
											}}
											placeholder="Customer / Order name..."
											className="max-w-[250px] h-11 text-base rounded-xl bg-muted/60"
										/>
									:	<span className="text-base font-medium flex items-center gap-2">
											<User className="size-4 text-muted-foreground/80" />
											{selectedOrder.customer_name ?? "No name"}
										</span>
									}
								</div>
								<div className="flex flex-col gap-1">
									<div className="text-base text-gray-500 mb-1">Notes:</div>
									{selectedOrder.status === "open" ?
										<Textarea
											className="bg-muted/60 resize-none min-h-20 rounded-xl px-3 py-2 text-base flex-1"
											value={selectedOrder.notes || ""}
											placeholder="Order notes..."
											onChange={(e) => {
												setSelectedOrder({
													...selectedOrder,
													notes: e.target.value,
												});
											}}
										/>
									:	<div className="text-base">
											{selectedOrder.notes || "---"}
										</div>
									}
								</div>
								<div
									className={cn(
										"",
										selectedOrder.status === "closed" ?
											"flex items-center justify-between"
										:	"",
									)}
								>
									<div className="text-base text-gray-500 mb-2">
										Payment info:
									</div>
									{selectedOrder.status === "closed" ?
										<div className="capitalize text-base font-medium flex items-center gap-2 ">
											{PaymentIcon ?
												<PaymentIcon className="text-muted-foreground/80 size-4" />
											:	null}
											<span className="capitalize">
												{selectedOrder.payment_mode}
											</span>
										</div>
									: selectedOrder.status === "open" ?
										<div className="flex items-center justify-between gap-x-2">
											{paymentModes.map(({ value, label }) => {
												const Icon = PaymentModeIcons[value as PaymentModes];
												return (
													<Button
														key={value}
														className="flex-1 h-11 text-base gap-2 flex-col h-auto items-start rounded-xl"
														variant={
															selectedOrder?.payment_mode === value ?
																"default"
															:	"outline"
														}
														onClick={() =>
															setSelectedOrder({
																...selectedOrder,
																payment_mode: value as PaymentModes,
															})
														}
													>
														<Icon className="!size-4" />
														{label}
													</Button>
												);
											})}
										</div>
									:	null}
								</div>
							</div>
							{/* Totals Section */}
							<div className="space-y-2 border-y py-6 px-6">
								{(() => {
									// Calculate subtotal from items to ensure accuracy
									let calculatedSubtotal = 0;
									if (selectedOrder.items && selectedOrder.items.length > 0) {
										selectedOrder.items.forEach((item: any) => {
											const itemPrice =
												item.item_type === "food" ?
													item.food_price || item.price || 0
												:	item.price || 0;
											const quantity = item.quantity || 1;
											let itemTotal = itemPrice * quantity;

											// Add extras for food items
											if (
												item.item_type === "food" &&
												item.extras &&
												item.extras.length > 0
											) {
												const extrasTotal = item.extras.reduce(
													(sum: number, e: any) =>
														sum + (e.price || 0) * (e.quantity || 1),
													0,
												);
												itemTotal += extrasTotal * quantity;
											}

											calculatedSubtotal += itemTotal;
										});
									}

									const subtotal =
										calculatedSubtotal > 0 ? calculatedSubtotal : (
											(selectedOrder.amount_bt ?? 0)
										);
									const taxRate = selectedOrder.tax || 0;
									const taxAmount = subtotal * (taxRate / 100);
									const total = subtotal + taxAmount;
									const changeDue = Math.max(
										0,
										parseFloat(amountTendered || "0") - total,
									);

									return (
										<div className="space-y-4 p-4 rounded-2xl bg-muted">
											<div className="space-y-2">
												<div className="flex justify-between text-base">
													<span>Subtotal</span>
													<span className="font-medium">
														{formatCurrency(subtotal)}
													</span>
												</div>
												<div className="flex justify-between text-base">
													<span>Tax ({selectedOrder.tax}%)</span>
													<span className="font-medium">
														{formatCurrency(taxAmount)}
													</span>
												</div>
												<div className="flex justify-between text-xl font-bold pt-2 border-t">
													<span>Total</span>
													<span>{formatCurrency(total)}</span>
												</div>
											</div>

											{selectedOrder.status === "open" &&
												selectedOrder.payment_mode === "cash" && (
													<div className="space-y-4 pt-4 border-t">
														<div className="space-y-2">
															<Label className="text-sm font-semibold text-gray-700">
																Cash Received
															</Label>
															<div className="relative">
																<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
																	GHS
																</span>
																<Input
																	type="number"
																	placeholder="0.00"
																	className="pl-14 text-xl font-bold h-12 focus:ring-green-500 bg-background"
																	value={amountTendered}
																	onChange={(e) =>
																		setAmountTendered(e.target.value)
																	}
																/>
															</div>
														</div>

														{parseFloat(amountTendered) > 0 && (
															<div
																className={cn(
																	"p-4 rounded-lg shadow-lg animate-in fade-in zoom-in duration-300",
																	parseFloat(amountTendered) - total < 0 ?
																		"bg-red-500"
																	:	"bg-blue-600",
																	"text-white",
																)}
															>
																<div className="text-xs uppercase tracking-wider font-semibold opacity-80">
																	{parseFloat(amountTendered) - total < 0 ?
																		"Amount Remaining"
																	:	"Change Due"}
																</div>
																<div className="text-4xl font-black">
																	{formatCurrency(
																		Math.abs(
																			parseFloat(amountTendered) - total,
																		),
																	)}
																</div>
															</div>
														)}
													</div>
												)}
										</div>
									);
								})()}
							</div>
							{/* Actions Section */}
							<div className="flex flex-col gap-4 px-6 pb-6">
								{/* Save Changes Button */}
								{selectedOrder.status === "open" && hasChanges && (
									<Button
										variant="default"
										onClick={handleSaveOrderDetails}
										className="text-base w-full bg-green-600 hover:bg-green-700 text-white shadow-none mb-2 font-semibold"
									>
										Save Changes
									</Button>
								)}
								<div
									className={cn(
										"grid items-center gap-3",
										(
											selectedOrder.status === "open" &&
												selectedOrder.items?.some(
													(item: any) => item.item_type === "food",
												)
										) ?
											"grid-cols-2 "
										:	"grid-cols-1",
									)}
								>
									{/* show this button only if there are food items in the order */}
									{selectedOrder.status === "open" &&
										(selectedOrder.items?.filter(
											(item: any) => item.item_type === "food",
										)?.length ?? 0) > 0 && (
											<Button
												variant="outline"
												onClick={() => printKitchenOrder(selectedOrder)}
												className="rounded-md"
											>
												Print Kitchen Order
											</Button>
										)}
									{/* Print Bill (Receipt preview for open orders) */}
									{selectedOrder.status === "open" && (
										<Button
											variant="outline"
											onClick={() => printReceipt(selectedOrder, false)}
											className="rounded-md"
										>
											Print Bill
										</Button>
									)}
								</div>

								{selectedOrder?.status === "open" ?
									<Button
										variant="outline"
										onClick={handleEditItems}
										className="rounded-md"
									>
										Edit Items
									</Button>
								:	null}

								<div className="flex space-x-3">
									{selectedOrder?.status === "open" ?
										<>
											{selectedOrder.status === "open" &&
												(selectedOrder.order_type === "table" ||
													selectedOrder.order_type === "takeout") && (
													<Button
														variant="destructive"
														size="lg"
														onClick={handleCancelOrder}
														className="flex-1"
														// className="text-base bg-red-50 hover:bg-red-100 border-red-200 text-red-700 hover:text-red-800 shadow-none mb-2"
													>
														Cancel Order
													</Button>
												)}
											<Button
												onClick={handleCloseOrder}
												className="flex-1"
												size="lg"
												disabled={
													!selectedOrder?.payment_mode ||
													(selectedOrder.payment_mode === "cash" &&
														parseFloat(amountTendered || "0") <
															(selectedOrderTotal || 0))
												}
											>
												Close Order
											</Button>
										</>
									: selectedOrder.status !== "cancelled" ?
										<div className="space-y-4 w-full flex flex-col">
											<Button
												variant="outline"
												onClick={() => setShareDialogOpen(true)}
												className="rounded-md"
											>
												Share Receipt
											</Button>
											<Button
												onClick={() => printReceipt(selectedOrder, false)}
												className=""
											>
												Print Receipt
											</Button>
										</div>
									:	null}
								</div>
							</div>
						</div>
					}
				</div>
			</div>
			{/* Edit Items Dialog */}
			<EditOrderItemsDialog
				open={editItemsDialogOpen}
				onClose={() => setEditItemsDialogOpen(false)}
				order={selectedOrder}
				onOrderUpdated={async (updatedOrder) => {
					setSelectedOrder(updatedOrder);
					setEditItemsDialogOpen(false);
					await fetchOrders();
				}}
			/>

			{/* Receipt Share Dialog */}
			<ReceiptShareDialog
				order={selectedOrder}
				open={shareDialogOpen}
				onClose={() => setShareDialogOpen(false)}
				onPrint={() => selectedOrder && printReceipt(selectedOrder, false)}
			/>
			<DailyReportDialog
				open={reportDialogOpen}
				onClose={() => setReportDialogOpen(false)}
				reportData={reportData}
				onDownload={handleDownloadPDF}
				user={user}
			/>
			<ExpensesDialog
				open={expensesDialogOpen}
				onClose={() => setExpensesDialogOpen(false)}
				user={user}
			/>
			<AlertWithActions
				open={showPrintConfirm}
				onOpenChange={setShowPrintConfirm}
				title="Print Receipt?"
				message="Would you like to print a receipt for this order?"
				confirmText="Print Receipt"
				cancelText="Skip"
				onConfirm={async () => {
					if (orderToPrint) {
						await printReceipt(orderToPrint);
					}
					setShowPrintConfirm(false);
					setOrderToPrint(null);
				}}
			/>
		</div>
	);
};

export default Orders;
