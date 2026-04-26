/** @format */

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
} from "@/components/ui/dialog";
import {
	Dialog as ViewDialog,
	DialogContent as ViewDialogContent,
	DialogFooter as ViewDialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useCategory } from "@/hooks/useCategory";
import { useOrders } from "@/hooks/useOrders";
import { useProducts } from "@/hooks/useProducts";
import { useFood } from "@/hooks/useFood";
import { useFoodExtras } from "@/hooks/useFoodExtras";
import { useSettings } from "@/hooks/useSettings";
import { useTables } from "@/hooks/useTables";
import { useCurrency } from "@/hooks/useCurrency";
import { cn, parseJSONString } from "@/lib/utils";
import { X, Eye } from "lucide-react";
import { FoodItemSelectionDialog } from "./FoodItemSelectionDialog";

import type { Order } from "@/types";
import { Label } from "../ui/label";

interface CreateOrderDialogProps {
	open: boolean;
	onClose: () => void;
	onOrderCreated?: (order: Order) => void;
}

export const CreateOrderDialog: React.FC<CreateOrderDialogProps> = ({
	open,
	onClose,
	onOrderCreated,
}) => {
	const { products, loading: productsLoading, fetchProducts } = useProducts();
	const { foodItems, foodCategories, fetchFoodItems, fetchFoodCategories } =
		useFood();
	const { extras: foodExtras, fetchExtras } = useFoodExtras();
	const { settings } = useSettings();
	const { categories, fetchCategories } = useCategory();
	const { format: formatCurrency } = useCurrency();
	const { tables, getTables } = useTables();
	const { createOrder, orders, fetchOrders, loading } = useOrders();
	const [activeTab, setActiveTab] = useState<"drinks" | "food">("drinks");
	const [search, setSearch] = useState("");
	const [category, setCategory] = useState<string>("all");
	const [foodCategory, setFoodCategory] = useState<string>("all");
	const [cart, setCart] = useState<any[]>([]); // [{product/foodItem, quantity, itemType, extraIds?, notes?}]
	const [selectedFoodItem, setSelectedFoodItem] = useState<any>(null);
	const [viewingCartFoodItem, setViewingCartFoodItem] = useState<{
		item: any;
		index: number;
	} | null>(null);
	const [orderType, setOrderType] = useState<"customer" | "table" | "takeout">("customer");
	const [tableNumber, setTableNumber] = useState("");
	const [paymentMode, setPaymentMode] = useState<"cash" | "momo" | "bank">(
		"cash"
	);
	const tax = parseJSONString(settings?.pos as any)?.defaultTaxRate ?? 10;
	const [notes, setNotes] = useState("");
	const [amountTendered, setAmountTendered] = useState("");

	useEffect(() => {
		if (open) {
			fetchProducts();
			fetchCategories();
			fetchFoodItems();
			fetchFoodCategories();
			getTables();
			fetchExtras();
			fetchOrders();
		}
	}, [open]);

	const filteredProducts = products.filter((p) => {
		const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
		const matchesCategory = category === "all" || p.category == category;
		return matchesSearch && matchesCategory;
	});

	const filteredFoodItems = foodItems.filter((item) => {
		const matchesSearch = item.name
			.toLowerCase()
			.includes(search.toLowerCase());
		const matchesCategory =
			foodCategory === "all" || item.category_id.toString() === foodCategory;
		return matchesSearch && matchesCategory && item.status === "active";
	});

	const addToCart = (product: any) => {
		// Don't add if product is out of stock
		if (product.stock <= 0) return;

		setCart((prev) => {
			const existing = prev.find(
				(item: any) =>
					item.itemType === "drink" && item.product?.id === product.id
			);
			if (existing) {
				// Don't exceed available stock
				const newQuantity = Math.min(existing.quantity + 1, product.stock);
				return prev.map((item: any) =>
					item.itemType === "drink" && item.product?.id === product.id ?
						{ ...item, quantity: newQuantity }
					:	item
				);
			}
			return [...prev, { product, quantity: 1, itemType: "drink" }];
		});
	};

	const addFoodToCart = (
		foodItem: any,
		selectedExtras: number[],
		notes: string
	) => {
		console.log("addFoodToCart called with:", {
			foodItem: foodItem.name,
			selectedExtras,
			notes,
			extrasCount: selectedExtras.length,
		});
		setCart((prev) => {
			// For food items, we add each as a separate cart item (even if same food, different extras/notes)
			const newCartItem = {
				foodItem,
				quantity: 1,
				itemType: "food" as const,
				extraIds: selectedExtras || [],
				notes: notes || undefined,
			};
			console.log("New cart item:", newCartItem);
			return [...prev, newCartItem];
		});
	};

	const updateCartQty = (
		itemId: number,
		itemType: "drink" | "food",
		qty: number
	) => {
		setCart((prev) =>
			prev.map((item, index) => {
				if (item.itemType === itemType) {
					if (itemType === "drink" && item.product?.id === itemId) {
						const maxQuantity = item.product.stock;
						const newQuantity = Math.max(1, Math.min(qty, maxQuantity));
						return { ...item, quantity: newQuantity };
					} else if (itemType === "food" && index === itemId) {
						// For food, use index as ID since we allow duplicates
						return { ...item, quantity: Math.max(1, qty) };
					}
				}
				return item;
			})
		);
	};

	const removeFromCart = (itemId: number, itemType: "drink" | "food") => {
		setCart((prev) => {
			if (itemType === "drink") {
				return prev.filter(
					(item) => !(item.itemType === "drink" && item.product?.id === itemId)
				);
			} else {
				// For food, use index
				return prev.filter((_, index) => index !== itemId);
			}
		});
	};

	const subtotal = cart.reduce((sum, item) => {
		if (item.itemType === "drink") {
			return sum + item.product.price * item.quantity;
		} else {
			let itemTotal = item.foodItem.price * item.quantity;
			// Add extras prices (accounting for quantities)
			if (item.extraIds && item.extraIds.length > 0) {
				// Count occurrences of each extra ID to get quantities
				const extraCounts = new Map<number, number>();
				item.extraIds.forEach((id: number) => {
					extraCounts.set(id, (extraCounts.get(id) || 0) + 1);
				});
				extraCounts.forEach((quantity, extraId) => {
					const extra = foodExtras.find((e) => e.id === extraId);
					if (extra) {
						itemTotal += extra.price * quantity * item.quantity;
					}
				});
			}
			return sum + itemTotal;
		}
	}, 0);

	const taxAmount = subtotal * (tax / 100);
	const total = subtotal + taxAmount;

	const alreadyInCart = (productId: string | number): boolean => {
		return cart.some(
			(item) => item.itemType === "drink" && item.product?.id === productId
		);
	};

	// Update Customer Display in real-time
	useEffect(() => {
		const port = parseJSONString(settings?.pos as any)?.customerDisplayPort;
		if (!port || !open) return;

		if (cart.length > 0) {
			const totalStr = total.toFixed(2);
			window.electron.invoke("update-customer-display", port, totalStr);
		} else {
			window.electron.invoke("update-customer-display", port, "0.00");
		}
	}, [total, cart.length, open, settings?.pos, settings?.general?.defaultCurrency]);

	// Add a ref to clear cart and close dialog
	useEffect(() => {
		if (!open) {
			setCart([]);
			setOrderType("customer");
			setTableNumber("");
			setPaymentMode("cash");
			setNotes("");
			setAmountTendered("");
			setActiveTab("drinks");
			setSelectedFoodItem(null);
		}
	}, [open]);

	// Reset table number when switching order types
	useEffect(() => {
		if (orderType !== "table" && orderType !== "takeout") {
			setTableNumber("");
		}
	}, [orderType]);

	const handleCancel = () => {
		onClose();
	};

	const handlePlaceOrder = async () => {
		// Build order payload
		const orderPayload = {
			items: cart.map((item) => {
				if (item.itemType === "drink") {
					return {
						itemType: "drink" as const,
						productId: item.product.id,
						quantity: item.quantity,
					};
				} else {
					const foodPayload = {
						itemType: "food" as const,
						foodItemId: item.foodItem.id,
						quantity: item.quantity,
						extraIds: Array.isArray(item.extraIds) ? item.extraIds : [],
						notes: item.notes || undefined,
					};
					console.log(
						"Food item payload:",
						foodPayload,
						"extraIds type:",
						typeof item.extraIds,
						"isArray:",
						Array.isArray(item.extraIds)
					);
					return foodPayload;
				}
			}),
			order_type: orderType,
			table_number: orderType === "table" ? tableNumber : undefined,
			payment_mode: paymentMode,
			amount_tendered: paymentMode === "cash" ? parseFloat(amountTendered || "0") : 0,
			tax,
			notes,
			status: orderType === "customer" ? "closed" : "open",
		};
		try {
			// Trigger cash drawer ONLY for in-house orders being paid with cash immediately
			if (orderType === "customer" && paymentMode.toLowerCase() === "cash") {
				console.log("Triggering cash drawer for in-house order...");
				try {
					await window.electron.invoke("trigger-cash-drawer");
				} catch (drawerError) {
					console.error("Failed to trigger cash drawer:", drawerError);
				}
			}

			const result = await createOrder(orderPayload);

			// fetchOrders is already called in createOrder hook
			// Notify parent component about the order so it can switch tabs and potentially print
			if (onOrderCreated) {
				onOrderCreated(result);
			}
			onClose();
			setCart([]);
		} catch (error) {
			console.error("Error placing order:", error);
			// Error is already handled by createOrder hook with toast
			throw error;
		}
	};

	return (
		<>
			<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
				<DialogContent className="max-w-[90vw] h-[90vh] w-full p-0 overflow-hidden">
					<div className="flex h-full min-h-0">
						{/* Left: Product/Food selection */}
						<div className="flex-1 border-r bg-muted/50 flex flex-col min-h-0">
							{/* Tabs */}
							<div className="flex border-b p-4">
								<Button
									variant={activeTab === "drinks" ? "default" : "ghost"}
									onClick={() => setActiveTab("drinks")}
								>
									Drinks
								</Button>
								<Button
									variant={activeTab === "food" ? "default" : "ghost"}
									onClick={() => setActiveTab("food")}
								>
									Food
								</Button>
							</div>

							<div className="p-4 border-b flex space-x-2">
								<Input
									placeholder={
										activeTab === "drinks" ? "Search drinks..." : (
											"Search food items..."
										)
									}
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className="flex-1"
								/>
								{activeTab === "drinks" ?
									<Select value={category} onValueChange={setCategory}>
										<SelectTrigger className="w-36">
											<SelectValue placeholder="All Categories" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All</SelectItem>
											{categories.map((cat) => (
												<SelectItem key={cat.id} value={String(cat.id)}>
													{cat.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								:	<Select value={foodCategory} onValueChange={setFoodCategory}>
										<SelectTrigger className="w-36">
											<SelectValue placeholder="All Categories" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All</SelectItem>
											{foodCategories.map((cat) => (
												<SelectItem key={cat.id} value={String(cat.id)}>
													{cat.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								}
							</div>

							{/* Product/Food Grid */}
							<div className="flex-1 overflow-y-auto px-6 py-6">
								<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
									{activeTab === "drinks" ?
										productsLoading ?
											<div className="col-span-full text-center text-gray-400 py-20 text-lg">
												Loading products...
											</div>
										: filteredProducts.length === 0 ?
											<div className="col-span-full text-center text-gray-400 py-20 text-lg">
												No products found.
											</div>
										:	filteredProducts.map((product) => {
												const isOutOfStock = product.stock <= 0;
												const isInCart = alreadyInCart(product?.id);
												const isDisabled = isOutOfStock || isInCart;

												return (
													<div
														key={product.id}
														className={cn(
															"bg-white rounded-lg overflow-hidden shadow-sm transition-all",
															isDisabled ?
																"opacity-50 cursor-not-allowed"
															:	"cursor-pointer hover:shadow-md hover:scale-[1.02]"
														)}
														onClick={() => {
															if (!isDisabled) {
																addToCart(product);
															}
														}}
													>
														{/* Product Image */}
														<div className="w-full aspect-square bg-gray-100 overflow-hidden relative">
															<div className="bg-muted/50 h-full w-full">
																{product.image ?
																	<img
																		src={product.image}
																		alt={product.name}
																		className="w-full h-full object-cover"
																	/>
																:	<div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">
																		🍺
																	</div>
																}
															</div>
															{isOutOfStock && (
																<div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
																	Out of Stock
																</div>
															)}
															{isInCart && !isOutOfStock && (
																<div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
																	In Cart
																</div>
															)}
														</div>
														{/* Product Info */}
														<div className="p-3">
															<div className="font-semibold text-base text-gray-900 mb-1 line-clamp-2">
																{product.name}
															</div>
															<div className="text-lg font-bold text-gray-900">
																{formatCurrency(product.price)}
															</div>
														</div>
													</div>
												);
											})

									: filteredFoodItems.length === 0 ?
										<div className="col-span-full text-center text-gray-400 py-20 text-lg">
											No food items found.
										</div>
									:	filteredFoodItems.map((foodItem) => {
											return (
												<div
													key={foodItem.id}
													className="bg-white rounded-lg overflow-hidden shadow-sm transition-all cursor-pointer hover:shadow-md hover:scale-[1.02]"
													onClick={() => setSelectedFoodItem(foodItem)}
												>
													{/* Food Item Image */}
													<div className="w-full aspect-square bg-gray-100 overflow-hidden relative">
														<div className="bg-muted/50 h-full w-full">
															{foodItem.image ?
																<img
																	src={foodItem.image}
																	alt={foodItem.name}
																	className="w-full h-full object-cover"
																/>
															:	<div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">
																	🍽️
																</div>
															}
														</div>
													</div>
													{/* Food Item Info */}
													<div className="p-3">
														<div className="font-semibold text-base text-gray-900 mb-1 line-clamp-2">
															{foodItem.name}
														</div>
														<div className="text-lg font-bold text-gray-900">
															{formatCurrency(foodItem.price)}
														</div>
													</div>
												</div>
											);
										})
									}
								</div>
							</div>
						</div>
						{/* Right: Cart and finalization */}
						<div className="w-1/3 bg-white flex flex-col border-l border-gray-100 h-full min-h-0">
							{/* Cart Header */}
							<div className="px-6 py-5 border-b border-gray-100 flex-shrink-0">
								<h2 className="text-xl font-bold text-gray-900">
									Cart ({cart.length})
								</h2>
							</div>

							{/* Cart Items - Scrollable */}
							<div
								className="flex-1 overflow-y-auto overflow-x-hidden min-h-0"
								style={{ WebkitOverflowScrolling: "touch" }}
							>
								{cart.length === 0 ?
									<div className="flex flex-col items-center justify-center text-center text-gray-400 px-6 py-20">
										<div className="w-20 h-20 mb-4 flex items-center justify-center text-6xl">
											🛒
										</div>
										<div className="text-lg font-semibold mb-2 text-gray-600">
											Cart is Empty
										</div>
										<div className="text-base text-gray-500">
											Add products to get started
										</div>
									</div>
								:	<ul className="divide-y divide-gray-100 px-6 py-4">
										{cart.map((item, index) => {
											if (item.itemType === "drink") {
												return (
													<li
														key={`drink-${item.product.id}`}
														className="flex items-center gap-4 py-4"
													>
														<div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
															{item?.product.image ?
																<img
																	src={item?.product.image}
																	alt={item?.product.name}
																	className="w-full h-full object-cover"
																/>
															:	<div className="w-full h-full flex items-center justify-center text-2xl">
																	🍺
																</div>
															}
														</div>
														<div className="flex-1 min-w-0">
															<div className="font-semibold text-base text-gray-900 mb-1">
																{item.product.name}
															</div>
															<div className="text-base font-bold text-gray-900">
																{formatCurrency(item.product.price)}
															</div>
															<div className="flex items-center gap-2 mt-3">
																<Button
																	size="icon"
																	variant="outline"
																	className="size-12 rounded-lg border-primary"
																	onClick={() =>
																		updateCartQty(
																			item.product.id,
																			"drink",
																			Math.max(1, item.quantity - 1)
																		)
																	}
																>
																	-
																</Button>
																<Input
																	type="number"
																	min={1}
																	max={item.product.stock}
																	value={item.quantity}
																	onChange={(e) =>
																		updateCartQty(
																			item.product.id,
																			"drink",
																			Math.max(1, Number(e.target.value))
																		)
																	}
																	className="w-20 h-12 text-center flex-1"
																/>
																<Button
																	size="icon"
																	variant="outline"
																	className="size-12 rounded-lg border-primary"
																	onClick={() =>
																		updateCartQty(
																			item.product.id,
																			"drink",
																			item.quantity + 1
																		)
																	}
																	disabled={item.quantity >= item.product.stock}
																>
																	+
																</Button>
																<Button
																	size="icon"
																	variant="ghost"
																	className="size-12 rounded-lg border-primary"
																	onClick={() =>
																		removeFromCart(item.product.id, "drink")
																	}
																>
																	<X />
																</Button>
																{item.quantity >= item.product.stock && (
																	<span className="text-xs text-red-600">
																		Max
																	</span>
																)}
															</div>
														</div>
													</li>
												);
											} else {
												const itemExtras = foodExtras.filter((e) =>
													item.extraIds?.includes(e.id)
												);
												const itemPrice =
													item.foodItem.price +
													(itemExtras.reduce((sum, e) => sum + e.price, 0) ||
														0);

												return (
													<li
														key={`food-${index}`}
														className="flex items-start gap-4 py-4 border-b"
													>
														<div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
															{item?.foodItem.image ?
																<img
																	src={item?.foodItem.image}
																	alt={item?.foodItem.name}
																	className="w-full h-full object-cover"
																/>
															:	<div className="w-full h-full flex items-center justify-center text-2xl">
																	🍽️
																</div>
															}
														</div>
														<div className="flex-1 min-w-0">
															<div
																className="font-semibold text-base text-gray-900 mb-1 cursor-pointer hover:text-primary transition-colors flex items-center gap-2"
																onClick={() =>
																	setViewingCartFoodItem({ item, index })
																}
															>
																{item.foodItem.name}
																<Eye className="h-4 w-4 text-gray-400" />
															</div>
															{itemExtras.length > 0 && (
																<div className="text-xs text-gray-500 mb-1">
																	Extras:{" "}
																	{itemExtras.map((e) => e.name).join(", ")}
																</div>
															)}
															{item.notes && (
																<div className="text-xs text-gray-500 mb-1">
																	Note: {item.notes}
																</div>
															)}
															<div className="text-base font-bold text-gray-900">
																{formatCurrency(itemPrice)} × {item.quantity}
															</div>
															<div className="flex items-center gap-2 mt-3">
																<Button
																	size="icon"
																	variant="outline"
																	className="size-12 rounded-lg border-primary"
																	onClick={() =>
																		updateCartQty(
																			index,
																			"food",
																			Math.max(1, item.quantity - 1)
																		)
																	}
																>
																	-
																</Button>
																<Input
																	type="number"
																	min={1}
																	value={item.quantity}
																	onChange={(e) =>
																		updateCartQty(
																			index,
																			"food",
																			Math.max(1, Number(e.target.value))
																		)
																	}
																	className="w-20 h-12 text-center flex-1"
																/>
																<Button
																	size="icon"
																	variant="outline"
																	className="size-12 rounded-lg border-primary"
																	onClick={() =>
																		updateCartQty(
																			index,
																			"food",
																			item.quantity + 1
																		)
																	}
																>
																	+
																</Button>
																<Button
																	size="icon"
																	variant="ghost"
																	className="size-12 rounded-lg border-primary"
																	onClick={() => removeFromCart(index, "food")}
																>
																	<X />
																</Button>
															</div>
														</div>
													</li>
												);
											}
										})}
									</ul>
								}
							{/* Order finalization */}
							<div className={cn("px-6 py-5 space-y-4 border-t border-gray-100 bg-gray-50 flex-shrink-0", cart.length === 0 ? "hidden" : "block")}>
								<div className="space-y-2">
									<span className="text-sm font-medium text-gray-700">
										Order Type:
									</span>
									<div className="flex gap-2">
										<Button
											className="flex-1 h-11 text-base"
											variant={orderType === "customer" ? "default" : "outline"}
											onClick={() => setOrderType("customer")}
										>
											In-House
										</Button>
										<Button
											className="flex-1 h-11 text-base"
											variant={orderType === "table" ? "default" : "outline"}
											onClick={() => setOrderType("table")}
										>
											Table
										</Button>
										<Button
											className="flex-1 h-11 text-base"
											variant={orderType === "takeout" ? "default" : "outline"}
											onClick={() => setOrderType("takeout")}
										>
											Take-Out
										</Button>
									</div>
								</div>
								{orderType === "table" && (
									<div className="space-y-2">
										<span className="text-sm font-medium text-gray-700">
											Table:
										</span>
										{(() => {
											// Get tables with active orders
											const tablesWithActiveOrders = new Set(
												orders
													.filter(
														(order) =>
															order.status === "open" && order.table_number
													)
													.map((order) => order.table_number?.toString())
											);

											// Filter available tables (active and not assigned to an active order)
											const availableTables = tables.filter(
												(table) =>
													table.status === "active" &&
													!tablesWithActiveOrders.has(table.name)
											);

											if (availableTables.length === 0) {
												return (
													<div className="w-full h-11 text-base px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 flex items-center">
														No available tables
													</div>
												);
											}

											return (
												<Select
													value={tableNumber}
													onValueChange={setTableNumber}
												>
													<SelectTrigger className="w-full h-11 text-base">
														<SelectValue placeholder="Select Table" />
													</SelectTrigger>
													<SelectContent>
														{availableTables.map((table) => (
															<SelectItem key={table.id} value={table.name}>
																{table.name}
																{table.capacity && ` (${table.capacity} seats)`}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											);
										})()}
									</div>
								)}
								{orderType === "takeout" && (
									<div className="space-y-2">
										<span className="text-sm font-medium text-gray-700">
											Take-Out Table:
										</span>
										<div className="w-full h-11 text-base px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 flex items-center">
											Will be auto-assigned (TO-XXX)
										</div>
									</div>
								)}
								<div className="space-y-2">
									<span className="text-sm font-medium text-gray-700">
										Payment:
									</span>
									<Select
										value={paymentMode}
										onValueChange={(v) => setPaymentMode(v as any)}
									>
										<SelectTrigger className="w-full h-11 text-base">
											<SelectValue placeholder="Payment Mode" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="cash">Cash</SelectItem>
											<SelectItem value="momo">Momo</SelectItem>
											<SelectItem value="bank">Bank</SelectItem>
										</SelectContent>
									</Select>
								</div>

								{paymentMode === "cash" && orderType === "customer" && (
									<div className="space-y-3 p-4 bg-primary/5 rounded-lg border border-primary/10">
										<div className="space-y-2">
											<Label className="text-primary font-semibold">Cash Received</Label>
											<Input
												type="number"
												placeholder="0.00"
												value={amountTendered}
												onChange={(e) => setAmountTendered(e.target.value)}
												className="h-11 text-lg font-bold border-primary/20 focus:border-primary shadow-sm"
												autoFocus
											/>
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

								<div className="space-y-2">
									<span className="text-sm font-medium text-gray-700">
										Notes:
									</span>
									<Input
										value={notes}
										onChange={(e) => setNotes(e.target.value)}
										placeholder="Order notes..."
										className="w-full h-11 text-base"
									/>
								</div>

								<div className="space-y-3 pt-3 border-t border-gray-200">
									<div className="flex justify-between text-base text-gray-600">
										<span>Subtotal</span>
										<span className="font-medium">
											{formatCurrency(subtotal)}
										</span>
									</div>
									<div className="flex justify-between text-base text-gray-600">
										<span>Tax ({tax}%)</span>
										<span className="font-medium">
											{formatCurrency(taxAmount)}
										</span>
									</div>
									<div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-200">
										<span>Total</span>
										<span>{formatCurrency(total)}</span>
									</div>
								</div>
								<div className="flex gap-3 pt-2">
									<Button
										type="button"
										variant="outline"
										onClick={handleCancel}
										className="flex-1 h-12 text-base"
									>
										Cancel
									</Button>
									<Button
										type="button"
										disabled={
											cart.length === 0 || 
											loading ||
											(orderType === "table" && !tableNumber) ||
											(paymentMode === "cash" && orderType === "customer" && (!amountTendered || parseFloat(amountTendered) <= 0))
										}
										onClick={handlePlaceOrder}
										className="flex-1 h-12 text-base font-bold bg-green-600 hover:bg-green-700 text-white shadow-md transition-all active:scale-95"
									>
										{loading ? "Processing..." : "Place Order"}
									</Button>
								</div>
							</div>
							</div>

						</div>
					</div>
				</DialogContent>
			</Dialog>

			<FoodItemSelectionDialog
				open={!!selectedFoodItem}
				foodItem={selectedFoodItem}
				foodExtras={foodExtras}
				onClose={() => setSelectedFoodItem(null)}
				onAdd={addFoodToCart}
			/>

			{/* View Cart Food Item Details Dialog */}
			{viewingCartFoodItem && (
				<ViewDialog
					open={!!viewingCartFoodItem}
					onOpenChange={(open) => !open && setViewingCartFoodItem(null)}
				>
					<ViewDialogContent className="max-w-md">
						<DialogHeader>
							<DialogTitle>Food Item Details</DialogTitle>
						</DialogHeader>
						<div className="space-y-4 py-4">
							{/* Food Item Image */}
							<div className="w-full aspect-square bg-gray-100 rounded-lg overflow-hidden">
								{viewingCartFoodItem.item?.foodItem.image ?
									<img
										src={viewingCartFoodItem.item.foodItem.image}
										alt={viewingCartFoodItem.item.foodItem.name}
										className="w-full h-full object-cover"
									/>
								:	<div className="w-full h-full flex items-center justify-center text-6xl">
										🍽️
									</div>
								}
							</div>

							{/* Food Item Info */}
							<div className="space-y-2">
								<h3 className="text-xl font-semibold">
									{viewingCartFoodItem.item.foodItem.name}
								</h3>
								{viewingCartFoodItem.item.foodItem.description && (
									<p className="text-sm text-gray-600">
										{viewingCartFoodItem.item.foodItem.description}
									</p>
								)}
							</div>

							{/* Quantity */}
							<div className="flex items-center justify-between pt-2 border-t">
								<span className="text-sm font-medium text-gray-700">
									Quantity:
								</span>
								<span className="text-base font-semibold">
									{viewingCartFoodItem.item.quantity}
								</span>
							</div>

							{/* Price Breakdown */}
							<div className="space-y-2 pt-2 border-t">
								<div className="flex justify-between text-sm text-gray-600">
									<span>Base Price:</span>
									<span>
										{formatCurrency(viewingCartFoodItem.item.foodItem.price)} ×{" "}
										{viewingCartFoodItem.item.quantity}
									</span>
								</div>
								{(
									viewingCartFoodItem.item.extraIds &&
									viewingCartFoodItem.item.extraIds.length > 0
								) ?
									<>
										<div className="text-xs font-medium text-gray-700 mt-2">
											Selected Extras:
										</div>
										{(() => {
											// Count occurrences of each extra ID to get quantities
											const extraCounts = new Map<number, number>();
											viewingCartFoodItem.item.extraIds?.forEach(
												(id: number) => {
													extraCounts.set(id, (extraCounts.get(id) || 0) + 1);
												}
											);
											return Array.from(extraCounts.entries()).map(
												([id, quantity]) => {
													const extra = foodExtras.find((e) => e.id === id);
													return extra ?
															<div
																key={id}
																className="flex justify-between text-sm text-gray-600 pl-4"
															>
																<span className="text-gray-500">
																	+ {extra.name}
																	{quantity > 1 && (
																		<span className="text-gray-400">
																			{" "}
																			(×{quantity})
																		</span>
																	)}
																	:
																</span>
																<span>
																	{formatCurrency(extra.price * quantity)} ×{" "}
																	{viewingCartFoodItem.item.quantity}
																</span>
															</div>
														:	null;
												}
											);
										})()}
									</>
								:	null}
								<div className="flex justify-between font-semibold text-base text-gray-900 pt-2 border-t">
									<span>Item Total:</span>
									<span>
										{formatCurrency(
											(() => {
												const basePrice =
													viewingCartFoodItem.item.foodItem.price;
												// Count occurrences of each extra ID to get quantities
												const extraCounts = new Map<number, number>();
												viewingCartFoodItem.item.extraIds?.forEach(
													(id: number) => {
														extraCounts.set(id, (extraCounts.get(id) || 0) + 1);
													}
												);
												const extrasTotal = Array.from(
													extraCounts.entries()
												).reduce((sum, [id, quantity]) => {
													const extra = foodExtras.find((e) => e.id === id);
													return sum + (extra?.price || 0) * quantity;
												}, 0);
												return (
													(basePrice + extrasTotal) *
													viewingCartFoodItem.item.quantity
												);
											})()
										)}
									</span>
								</div>
							</div>

							{/* Notes */}
							{viewingCartFoodItem.item.notes && (
								<div className="pt-2 border-t">
									<div className="text-sm font-medium text-gray-700 mb-1">
										Special Instructions:
									</div>
									<p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
										{viewingCartFoodItem.item.notes}
									</p>
								</div>
							)}
						</div>

						<ViewDialogFooter>
							<Button
								variant="outline"
								onClick={() => setViewingCartFoodItem(null)}
							>
								Close
							</Button>
						</ViewDialogFooter>
					</ViewDialogContent>
				</ViewDialog>
			)}
		</>
	);
};

