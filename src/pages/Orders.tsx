/** @format */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCategory } from "@/hooks/useCategory";
import { paymentModes, useOrders } from "@/hooks/useOrders";
import { useSettings } from "@/hooks/useSettings";
import { useCurrency } from "@/hooks/useCurrency";
import { cn, parseJSONString } from "@/lib/utils";
import type { Order } from "@/types";
import { Clock, Lock, Plus, Search, Share2, Upload, X } from "lucide-react";
import React, { useMemo, useState, useEffect } from "react";
import { ReceiptShareDialog } from "@/components/dialogs/receipt-share-dialog";
import { EditOrderItemsDialog } from "@/components/orders/EditOrderItemsDialog";
import { Label } from "@/components/ui/label";
import { AlertWithActions } from "@/components/alerts/alert-with-actions";
import { useReceipt } from "@/hooks/useReceipt";
import { useNavigate } from "react-router-dom";
import { useKeyboard } from "@/context/KeyboardContext";
import { useAuth } from "@/context/AuthContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { FileText, Receipt } from "lucide-react";
import { DailyReportDialog } from "@/components/dialogs/daily-report-dialog";
import { ExpensesDialog } from "@/components/dialogs/expenses-dialog";
import { OrderTypeIcons, PaymentModeIcons, type PaymentModes } from "@/components/Icons";

export const Orders: React.FC = () => {
	const { orders, loading, error, fetchOrders, getOrderById, updateOrder } =
		useOrders();
		const navigate = useNavigate();
	const { fetchCategories } = useCategory();
	const { settings } = useSettings();
	const [activeTab, setActiveTab] = useState<"active" | "closed">("active");
	const [search, setSearch] = useState("");
	const [dateFilter, setDateFilter] = useState<string>("today"); // "all", "today", "week", "month", "custom"
	const [customDateStart, setCustomDateStart] = useState<string>("");
	const [customDateEnd, setCustomDateEnd] = useState<string>("");
	const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
	const [selectedOrderLoading, setSelectedOrderLoading] = useState(false);
	const [editItemsDialogOpen, setEditItemsDialogOpen] = useState(false);
	const [shareDialogOpen, setShareDialogOpen] = useState(false);
	const [amountTendered, setAmountTendered] = useState<string>("");
	const { format: formatCurrency } = useCurrency();
	const {printReceipt, printKitchenOrder} = useReceipt();
	const { isOpen:isKeyboardOpen } = useKeyboard();

	const [lastEnterPress, setLastEnterPress] = useState<number>(0);
	const [enterCount, setEnterCount] = useState<number>(0);
	const { user } = useAuth();
	const [isGeneratingReport, setIsGeneratingReport] = useState(false);
	const [reportDialogOpen, setReportDialogOpen] = useState(false);
	const [expensesDialogOpen, setExpensesDialogOpen] = useState(false);
	const [reportData, setReportData] = useState<any>(null);

	// Multi-enter shortcut for manual drawer trigger
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Only trigger if no search/input or dialog is focused to avoid accidents
			if (e.key === 'Enter') {
				const now = Date.now();
				if (now - lastEnterPress < 500) {
					const newCount = enterCount + 1;
					if (newCount === 3) {
						console.log("Triple-Enter detected! Triggering manual drawer kick...");
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

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [enterCount, lastEnterPress]);

	useEffect(() => {
		fetchOrders();
		fetchCategories();
	}, []);


	const handleOrderSelect = async (order: Order) => {
		if (!order.id) return;

		setSelectedOrderLoading(true);
		setAmountTendered("");
		try {
			const orderWithItems = await getOrderById(order.id);
			setSelectedOrder(orderWithItems);
		} catch (error) {
			console.error("Failed to fetch order details:", error);
			// Fallback to basic order data
			setSelectedOrder(order);
		} finally {
			setSelectedOrderLoading(false);
		}
	};

	const filteredOrders = useMemo(() => {
		return orders.filter((order) => {
			// Tab filter
			if (activeTab === "active" && order.status !== "open") return false;
			if (activeTab === "closed" && order.status !== "closed") return false;

			// Date filter
			if (dateFilter !== "all" && order.created_at) {
				const orderDate = new Date(order.created_at);
				const now = new Date();

				if (dateFilter === "today") {
					const todayStart = new Date(
						now.getFullYear(),
						now.getMonth(),
						now.getDate()
					);
					const todayEnd = new Date(
						now.getFullYear(),
						now.getMonth(),
						now.getDate() + 1
					);
					if (orderDate < todayStart || orderDate >= todayEnd) return false;
				} else if (dateFilter === "week") {
					const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
					if (orderDate < weekAgo) return false;
				} else if (dateFilter === "month") {
					const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
					if (orderDate < monthStart) return false;
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
				(order.id && order.id.toString().includes(searchLower)) ||
				(order.order_number &&
					order.order_number.toString().includes(searchLower)) ||
				(order.table_number !== null &&
					order.table_number !== undefined &&
					order.table_number.toString().toLowerCase().includes(searchLower)) ||
				(order.order_type === "takeout" && searchLower.includes("takeout")) ||
				(order.order_type === "takeout" && searchLower.includes("to-")) ||
				false;
			// Category filter (optional, can be expanded to check order items)
			// For now, skip category filter logic
			return matchesSearch;
		});
	}, [orders, activeTab, search, dateFilter, customDateStart, customDateEnd]);

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
					(sum: number, e: any) => sum + parseFloat(e.price || 0) * parseInt(e.quantity || 1, 10),
					0
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

    const totalStr = selectedOrder 
        ? selectedOrderTotal.toFixed(2) 
        : "0.00";
        
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

	const handleEditItems = () => {
		setEditItemsDialogOpen(true);
	};

	const handleGenerateReport = async () => {
		setIsGeneratingReport(true);
		try {
			const data = await window.electron.invoke("get-daily-inventory-report");
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
			doc.text("Daily Sales & Inventory Report", pageWidth / 2, 20, { align: "center" });
			
			doc.setFontSize(12);
			doc.setTextColor(100, 100, 100);
			doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: "center" });
			doc.text(`Staff: ${user?.username || "Admin"}`, pageWidth / 2, 35, { align: "center" });
			
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
				item.stockLeft
			]);
			
			autoTable(doc, {
				startY: 55,
				head: [["Item", "Open", "Add", "Sold", "Dmg", "Adj", "Sales", "Left"]],
				body: inventoryBody,
				theme: 'striped',
				headStyles: { fillColor: [41, 128, 185], textColor: 255 },
				styles: { fontSize: 8 }
			});
			
			// 3. Food Sales Table
			let currentY = (doc as any).lastAutoTable.finalY || 100;
			doc.setFontSize(14);
			doc.setTextColor(0, 0, 0);
			doc.text("Food Sales Summary", 14, currentY + 15);
			
			const foodBody = reportData.foodSales.map((item: any) => [
				item.name,
				item.quantity,
				formatCurrency(item.totalSales)
			]);
			
			autoTable(doc, {
				startY: currentY + 20,
				head: [["Item Name", "Qty Sold", "Total Revenue"]],
				body: foodBody,
				theme: 'striped',
				headStyles: { fillColor: [39, 174, 96], textColor: 255 },
				styles: { fontSize: 9 }
			});

			// 4. Expenses Table
			currentY = (doc as any).lastAutoTable.finalY || 200;
			doc.setFontSize(14);
			doc.text("Daily Expenses", 14, currentY + 15);
			
			const expenseBody = reportData.expenses.map((e: any) => [
				e.description,
				formatCurrency(e.amount),
				e.staff
			]);
			
			autoTable(doc, {
				startY: currentY + 20,
				head: [["Description", "Amount", "Staff"]],
				body: expenseBody,
				theme: 'striped',
				headStyles: { fillColor: [192, 57, 43], textColor: 255 },
				styles: { fontSize: 9 }
			});
			
			// 5. Final Summary
			currentY = (doc as any).lastAutoTable.finalY || 250;
			const drinksTotal = reportData.inventory.reduce((sum: number, item: any) => sum + item.totalSales, 0);
			const foodTotal = reportData.foodSales.reduce((sum: number, item: any) => sum + item.totalSales, 0);
			const netRevenue = (drinksTotal + foodTotal) - (reportData.totalExpenses || 0);
			
			doc.setFontSize(12);
			doc.setFont("helvetica", "bold");
			doc.text(`Total Sales: ${formatCurrency(drinksTotal + foodTotal)}`, pageWidth - 14, currentY + 15, { align: "right" });
			doc.text(`Total Expenses: -${formatCurrency(reportData.totalExpenses || 0)}`, pageWidth - 14, currentY + 23, { align: "right" });
			doc.text(`Pending Orders: ${formatCurrency(reportData.pendingOrders?.total || 0)} (${reportData.pendingOrders?.count})`, pageWidth - 14, currentY + 31, { align: "right" });
			
			doc.setFontSize(16);
			doc.setTextColor(39, 174, 96);
			doc.text(`NET REVENUE: ${formatCurrency(netRevenue)}`, pageWidth - 14, currentY + 45, { align: "right" });
			
			// Save the PDF
			const fileName = `DailyReport_${reportData.date}_${user?.username || "Admin"}.pdf`;
			doc.save(fileName);
			toast.success("Report downloaded successfully");
		} catch (error) {
			console.error("Failed to generate PDF:", error);
			toast.error("Failed to generate PDF");
		}
	};

	const OrderTypeIcon = selectedOrder?  OrderTypeIcons[selectedOrder.order_type] : null;
	const PaymentIcon = selectedOrder?  PaymentModeIcons[selectedOrder.payment_mode] : null;

	return (
		<div className="h-full flex flex-col flex-1">
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
							<Receipt className="h-5 w-5" />
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
			<div className="flex-1 flex overflow-hidden">
				{/* Left Panel */}
				<div className="flex-1 h-full border-r bg-white flex flex-col">
					{/* Filter Header */}
					<div className="flex items-center gap-3 px-4 py-2 border-b">
						<div className="flex mr-auto gap-2">
						<Button
							variant={activeTab === "active" ? "default" : "outline"}
							size="default"
							className={cn("text-base w-full shadow-none -mb-[0.5px]", activeTab === "active" ? "":" hover:bg-muted/20 text-muted-foreground")}
							onClick={() => setActiveTab("active")}
						>
							<FileText className="!size-4" />
							Open 
						</Button>
						<Button
							variant={activeTab === "closed" ? "default" : "outline"}
							size="default"
							className={cn("text-base w-full shadow-none -mb-[0.5px]", activeTab === "closed" ? "":" hover:bg-muted/20 text-muted-foreground")}
							onClick={() => setActiveTab("closed")}
						>
							<Lock className="!size-4" />
							Closed
						</Button>
					</div>
						<div className="flex items-center justify-end space-x-2 flex-1">
							<div className="flex-1 flex items-center relative w-full max-w-lg">
								<Search className="absolute size-5 left-4 text-muted-foreground z-10" />
							<Input
								className="w-full flex-1 text-base rounded-md pl-11 h-10 bg-muted/80"
								placeholder="Search by Order # or Table #"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
							/>
							</div>
							{/* Date Filter */}
							<div className="flex items-center space-x-2">
								<Select value={dateFilter} onValueChange={setDateFilter}>
									<SelectTrigger className="w-40 text-base">
										<SelectValue placeholder="Filter by Date" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Dates</SelectItem>
										<SelectItem value="today">Today</SelectItem>
										<SelectItem value="week">Last 7 Days</SelectItem>
										<SelectItem value="month">This Month</SelectItem>
										<SelectItem value="custom">Custom Range</SelectItem>
									</SelectContent>
								</Select>
								{dateFilter === "custom" && (
									<>
										<Input
											type="date"
											className="w-40 text-base"
											placeholder="Start Date"
											value={customDateStart}
											onChange={(e) => setCustomDateStart(e.target.value)}
										/>
										<Input
											type="date"
											className="w-40 text-base"
											placeholder="End Date"
											value={customDateEnd}
											onChange={(e) => setCustomDateEnd(e.target.value)}
										/>
									</>
								)}
							</div>
						</div>
					</div>
					
					{/* Order List - Responsive Grid */}
					<div className="flex-1 overflow-y-auto p-4 bg-muted">
						{loading ?
							<div className="p-4 text-center text-gray-500 text-lg">
								Loading...
							</div>
						: error ?
							<div className="p-4 text-center text-red-500 text-lg">
								{error}
							</div>
						: filteredOrders.length === 0 ?
							<div className="flex flex-col items-center justify-center py-12 px-4 text-center">

	<h3 className="text-lg font-semibold text-gray-700">
		No orders yet
	</h3>

	<p className="mt-1 max-w-sm text-sm text-gray-400">
		Orders will appear here once customers start placing them.
	</p>
</div>
						:	<div className={cn("grid gap-4 px-0", isKeyboardOpen ? "grid-cols-1 md:grid-cols-1 lg:grid-cols-3" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 ")}>
								{filteredOrders.map((order) => {
									const isOpen = order.status === "open";
									const PaymentIcon = PaymentModeIcons[order.payment_mode]
									return (
										<div
											key={order.id}
											className={cn(
												"bg-card rounded-lg p-4 cursor-pointer transition-all relative",
												selectedOrder?.id === order.id ?
													"ring-2 ring-primary"
												:	"hover:shadow-md hover:border-primary/50",
												// isOpen ?
												// 	"bg-card"
												// :	"border-transparent"
											)}
											onClick={() => handleOrderSelect(order)}
										>
											{isOpen ? 
												<div className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full animate-blink" />
												:
												<div className="absolute top-3 right-3 text-muted-foreground/60">
<Lock strokeWidth={3} />
												</div>
											}
											<div className="space-y-3">
												<div className="">
													<div className="flex-1 pb-2 space-y-1">
														<div className="font-bold text-2xl text-gray-900">
															Order #{order.order_number ?? order.id}
														</div>
														<p className="text-sm text-gray-900 line-clamp-2">
															{order.notes}
														</p>
														<div className="mt-1 flex items-center gap-2 flex-wrap">
															<div
																className={cn(
																	"inline-flex items-center px-2 py-1 rounded-full text-xs font-medium uppercase",
																	isOpen ?
																		"bg-primary/10 text-primary"
																	:	"bg-muted text-muted-foreground"
																)}
															>
																{isOpen && (
												<div className={cn("w-2 h-2 mr-2 bg-primary rounded-full animate-blink")} />
											)}
																{order.status}
															</div>
															{order.order_type === "table" &&
																order.table_number && (
																	<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
																		Table {order.table_number}
																	</span>
																)}
															{order.order_type === "takeout" &&
																order.table_number && (
																	<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
																		{order.table_number}
																	</span>
																)}
														</div>
													</div>
												</div>

												<div className="py-3 border-y border-gray-200">
													<div className="flex items-center justify-between flex-wrap gap-2">
														<PaymentIcon className="text-muted-foreground/60 size-4" />
														<p className="text-sm text-gray-500 mr-auto">Total</p>
														<p className="font-bold text-sm text-gray-900">
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
						}
					</div>
				</div>
				{/* Right Panel: Order Details */}
				<div className={cn("min-w-[200px] max-w-[450px] w-full bg-white flex flex-col h-full overflow-y-auto", !selectedOrder && "hidden")}>
					<div className="flex items-center justify-between p-6 py-3 border-b">
						<h2 className="text-2xl font-semibold">Order Details</h2>
						<Button variant="ghost" size="icon" onClick={()=>setSelectedOrder(null)}>
							<X />
						</Button>
					</div>
					{!selectedOrder ?
						<div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 px-6 py-20">
							<div className="w-20 h-20 mb-4 flex items-center justify-center text-6xl">
								🛒
							</div>
							<div className="text-xl font-semibold mb-2 text-foreground">
								No Order Selected
							</div>
							<div className="text-lg">
								Select an order from the list or create a new one to view its
								details here.
							</div>
						</div>
					:	<div className="flex-1 flex flex-col pt-1 space-y-6">
							{/* Cart Section */}
							<div className="border-b p-6 pt-0 pb-12 h-[40%] overflow-y-auto">
								{selectedOrderLoading ?
									<div className="py-2 text-base text-gray-400">
										Loading order details...
									</div>
								:	
								<ul className="divide-y space-y-2">
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
														(item.food_price || item.price || 0)
													:	(item.price || 0);
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
														0
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
														<div className="flex items-start gap-3 flex-1 min-w-0">
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
																			<div className="font-semibold text-foreground">Extras:</div>
																			{item.extras.map(
																				(e: any, extraIndex: number) => {
																					const extraQty = e.quantity || 1;
																					const extraTotal = (e.price || 0) * extraQty * quantity;
																					return (
																						<div
																							key={extraIndex}
																							className="pl-2"
																						>
																							{e.name}
																							{extraQty > 1 && ` (×${extraQty})`}
																							: {formatCurrency(extraTotal)}
																						</div>
																					);
																				}
																			)}
																			<div className="pl-2 font-medium text-gray-700">
																				Extras Total: {formatCurrency(
																					item.extras.reduce(
																						(sum: number, e: any) =>
																							sum + (e.price || 0) * (e.quantity || 1) * quantity,
																						0
																					)
																				)}
																			</div>
																		</div>
																	)}
																
																{item.notes && (
																	<div className="text-xs text-gray-500 mt-1">
																		<span className="font-semibold text-foreground">Note: </span>
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
								<div className="text-base font-semibold">Payment Info</div>
								<div className="flex items-center justify-between gap-x-2">
									<span className="text-base text-gray-500">Order Type:</span>
									
									<span className="capitalize text-base font-medium flex items-center gap-2">
										{OrderTypeIcon ? <OrderTypeIcon className="text-muted-foreground/80 size-4" />:null}
										{selectedOrder.order_type === "takeout" ? "Take-Out" : selectedOrder.order_type === "table" ? "Table" : "Cushier"}{" "}
										{selectedOrder.order_type === "table" && selectedOrder.table_number && (
											<span className="ml-2 text-gray-500">
												(#{selectedOrder.table_number})
											</span>
										)}
										{selectedOrder.order_type === "takeout" && selectedOrder.table_number && (
											<span className="ml-2 text-gray-500">
												({selectedOrder.table_number})
											</span>
										)}
									</span>
								</div>
								<div className={cn("",selectedOrder.status === "closed" ? "flex items-center justify-between":"")}>
									<div className="text-base text-gray-500">Payment:</div>
									{
										selectedOrder.status === "closed" ? 
										<div className="capitalize text-base font-medium flex items-center gap-2 ">
										{PaymentIcon ? <PaymentIcon className="text-muted-foreground/80 size-4" />:null}
										<span className="capitalize">
												{selectedOrder.payment_mode}
											</span>
									</div>
										:
									<div className="flex items-center justify-between gap-x-2">
									{paymentModes.map(({ value, label }) => {
											const Icon = PaymentModeIcons[value as PaymentModes]
											return(
											<Button
												key={value}
												className="flex-1 h-11 text-base gap-2 flex-col h-auto items-start rounded-xl"
												variant={selectedOrder?.payment_mode === value ? "default" : "outline"}
												onClick={() => setSelectedOrder({
											...selectedOrder,
											payment_mode: value as PaymentModes,
										})}
											>
												<Icon className="!size-4" />
												{label}
											</Button>
										)})}
										</div>
									}
								</div>
								<div className={cn("",selectedOrder.status === "closed" && !selectedOrder.notes ? "flex items-center justify-between":"")}>
									<div className="text-base text-gray-500">Notes:</div>
									{selectedOrder.status === "open" ?
										<Textarea
											className="bg-muted/60 border-0 resize-none min-h-20 rounded-xl px-3 py-2 text-base flex-1"
											defaultValue={selectedOrder.notes || ""}
											placeholder="Order notes..."
										/>
									:	<div className="text-base">
											{selectedOrder.notes || "---"}
										</div>
									}
								</div>
							</div>
							{/* Totals Section */}
							<div className="space-y-2 border-y py-6">
								{(() => {
									// Calculate subtotal from items to ensure accuracy
									let calculatedSubtotal = 0;
									if (selectedOrder.items && selectedOrder.items.length > 0) {
										selectedOrder.items.forEach((item: any) => {
											const itemPrice = item.item_type === "food" ? (item.food_price || item.price || 0) : (item.price || 0);
											const quantity = item.quantity || 1;
											let itemTotal = itemPrice * quantity;
											
											// Add extras for food items
											if (item.item_type === "food" && item.extras && item.extras.length > 0) {
												const extrasTotal = item.extras.reduce(
													(sum: number, e: any) => sum + (e.price || 0) * (e.quantity || 1),
													0
												);
												itemTotal += extrasTotal * quantity;
											}
											
											calculatedSubtotal += itemTotal;
										});
									}
									
									const subtotal = calculatedSubtotal > 0 ? calculatedSubtotal : (selectedOrder.amount_bt ?? 0);
									const taxRate = selectedOrder.tax || 0;
									const taxAmount = subtotal * (taxRate / 100);
									const total = subtotal + taxAmount;
									const changeDue = Math.max(0, parseFloat(amountTendered || "0") - total);
									
									return (
										<div className="space-y-4 px-6">
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

											{selectedOrder.status === "open" && selectedOrder.payment_mode === "cash" && (
												<div className="space-y-4 pt-4 border-t">
													<div className="space-y-2">
														<Label className="text-sm font-semibold text-gray-700">Cash Received</Label>
														<div className="relative">
															<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">GHS</span>
															<Input
																type="number"
																placeholder="0.00"
																className="pl-14 text-xl font-bold h-12  focus:ring-green-500"
																value={amountTendered}
																onChange={(e) => setAmountTendered(e.target.value)}
															/>
														</div>
													</div>
													
													{parseFloat(amountTendered) > 0 && (
																<div className={cn(
																									"p-4 rounded-lg shadow-lg animate-in fade-in zoom-in duration-300",
																									parseFloat(amountTendered) - total < 0 ? "bg-red-500" : "bg-blue-600",
																									"text-white"
																								)}>
																									<div className="text-xs uppercase tracking-wider font-semibold opacity-80">
																										{parseFloat(amountTendered) - total < 0 ? "Amount Remaining" : "Change Due"}
																									</div>
																									<div className="text-4xl font-black">
																										{formatCurrency(Math.abs(parseFloat(amountTendered) - total))}
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
							<div className="flex flex-col gap-2 px-6 pb-6">
								{/* show this button only if there are food items in the order */}
								{selectedOrder.status === "open" && (selectedOrder.items?.filter((item: any) => item.item_type === "food")?.length ?? 0) > 0 && (
									<Button
										variant="outline"
										onClick={() => printKitchenOrder(selectedOrder)}
										className="text-base w-full bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
									>
										Print Kitchen Order
									</Button>
								)}
								<div className="flex space-x-4">
									{selectedOrder?.status === "open" ?
										<>
											<Button
											variant="default"
											onClick={handleCloseOrder}
											className="text-base flex-1"
											disabled={selectedOrder?.payment_mode === 'cash' && (parseFloat(amountTendered || "0") < (selectedOrderTotal || 0))}
										>
											Close Order
										</Button>
											<Button
												variant="outline"
												onClick={handleEditItems}
												className="text-base flex-1"
											>
												Edit Items
											</Button>
										</>
									:	<>
											<Button
												variant="outline"
												onClick={() => setShareDialogOpen(true)}
												className="text-base flex-1"
											>
												<Share2 className="h-4 w-4" />
												Share Receipt
											</Button>
											<Button
												variant="default"
												onClick={() => printReceipt(selectedOrder, false)}
												className="text-base flex-1"
											>
												Print Receipt
											</Button>
										</>
									}
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
