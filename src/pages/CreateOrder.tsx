/** @format */

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog as ViewDialog,
	DialogContent as ViewDialogContent,
	DialogFooter as ViewDialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCategory } from "@/hooks/useCategory";
import { orderTypes, paymentModes, useOrders } from "@/hooks/useOrders";
import { useProducts } from "@/hooks/useProducts";
import { useFood } from "@/hooks/useFood";
import { useFoodExtras } from "@/hooks/useFoodExtras";
import { useSettings } from "@/hooks/useSettings";
import { useCurrency } from "@/hooks/useCurrency";
import { cn, parseJSONString } from "@/lib/utils";
import {
	Eye,
	ChevronLeft,
	Search,
	Salad,
	Wine,
	Trash2,
	ShoppingBasket,
	Beer,
	X,
} from "lucide-react";
import { FoodItemSelectionDialog } from "@/components/orders/FoodItemSelectionDialog";
import { useReceipt } from "@/hooks/useReceipt";
import type { Order } from "@/types";
import { useNavigate } from "react-router-dom";
import { useKeyboard } from "@/context/KeyboardContext";
import { Textarea } from "@/components/ui/textarea";
import { History, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
	OrderTypeIcons,
	PaymentModeIcons,
	type OrderTypes,
	type PaymentModes,
} from "@/components/Icons";
import { ClassStyles } from "@/components/classnames";
import { useAlertStore } from "@/stores/useAlertStore";
import EmptyState from "@/components/alerts/empty-state";

export const CategoryComponent = ({
	cat,
	activeCategory,
	setActiveCategory,
}: {
	cat: any;
	activeCategory: any;
	setActiveCategory: (val: any) => void;
}) => {
	return (
		<div
			key={cat.id}
			className={cn(
				"p-4 h-18 border rounded-xl flex items-center gap-4 hover:bg-primary/10 hover:text-primary cursor-pointer group",
				cat.id == activeCategory ?
					"bg-primary border-primary text-primary-foreground "
				:	"",
			)}
			onClick={() => setActiveCategory(cat?.id as any)}
		>
			<ShoppingBasket
				className={cn(
					"size-6 text-muted-foreground/60",
					(cat.id as any) == activeCategory ? "text-primary-foreground" : "",
					"group-hover:text-primary",
				)}
			/>
			{cat.name}
		</div>
	);
};

export const CreateOrder: React.FC = () => {
	const { products, loading: productsLoading, fetchProducts } = useProducts();
	const navigate = useNavigate();
	const { foodItems, foodCategories, fetchFoodItems, fetchFoodCategories } =
		useFood();
	const { extras: foodExtras, fetchExtras } = useFoodExtras();
	const { settings, keyboardBottom } = useSettings();
	const { categories, fetchCategories } = useCategory();
	const { format: formatCurrency } = useCurrency();
	const { createOrder, orders, fetchOrders, loading } = useOrders();
	const { printReceipt } = useReceipt();
	const { isOpen: isKeyboardOpen } = useKeyboard();

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
	const [editingCartIndex, setEditingCartIndex] = useState<number | null>(null);
	const [orderType, setOrderType] = useState<"customer" | "table" | "takeout">(
		"customer",
	);
	const [tableNumber, setTableNumber] = useState("");
	const [paymentMode, setPaymentMode] = useState<"cash" | "momo" | "card">(
		"cash",
	);
	const tax = parseJSONString(settings?.pos as any)?.defaultTaxRate ?? 10;
	const [notes, setNotes] = useState("");
	const [customerName, setCustomerName] = useState("");
	const [amountTendered, setAmountTendered] = useState("");
	const [orderToPrint, setOrderToPrint] = useState<any>(null);
	const { showConfirm } = useAlertStore();
	const [drafts, setDrafts] = useState<any[]>([]);
	const [showDraftsDialog, setShowDraftsDialog] = useState(false);

	// Load drafts on mount
	useEffect(() => {
		const savedDrafts = localStorage.getItem("pos_drafts");
		if (savedDrafts) {
			try {
				setDrafts(JSON.parse(savedDrafts));
			} catch (e) {
				console.error("Failed to parse drafts", e);
			}
		}
	}, []);

	// Load persisted cart on mount
	useEffect(() => {
		const savedCart = localStorage.getItem("pos_current_cart");
		if (savedCart) {
			try {
				const data = JSON.parse(savedCart);
				if (data.cart) setCart(data.cart);
				if (data.orderType) setOrderType(data.orderType);
				if (data.tableNumber) setTableNumber(data.tableNumber);
				if (data.paymentMode) setPaymentMode(data.paymentMode);
				if (data.notes) setNotes(data.notes);
				if (data.amountTendered) setAmountTendered(data.amountTendered);
				if (data.customerName) setCustomerName(data.customerName);
			} catch (e) {
				console.error("Failed to load cart from localStorage", e);
			}
		}
	}, []);

	// Save cart to localStorage whenever it changes
	useEffect(() => {
		const data = {
			cart,
			orderType,
			tableNumber,
			paymentMode,
			notes,
			amountTendered,
			customerName,
		};
		localStorage.setItem("pos_current_cart", JSON.stringify(data));
	}, [cart, orderType, tableNumber, paymentMode, notes, amountTendered, customerName]);

	const saveDraft = () => {
		if (cart.length === 0) {
			toast.error("Cart is empty");
			return;
		}
		const newDraft = {
			id: Date.now(),
			timestamp: new Date().toISOString(),
			cart,
			orderType,
			tableNumber,
			paymentMode,
			notes,
			customerName,
			subtotal,
		};
		const updatedDrafts = [newDraft, ...drafts];
		setDrafts(updatedDrafts);
		localStorage.setItem("pos_drafts", JSON.stringify(updatedDrafts));
		toast.success("Order saved to drafts");
	};

	const loadDraft = (draft: any) => {
		setCart(draft.cart);
		setOrderType(draft.orderType);
		setTableNumber(draft.tableNumber || "");
		setPaymentMode(draft.paymentMode || "cash");
		setNotes(draft.notes || "");
		setCustomerName(draft.customerName || "");
		setShowDraftsDialog(false);
		toast.success("Draft restored");
	};

	const deleteDraft = (id: number) => {
		showConfirm({
			title: "Delete Draft?",
			description: "Are you sure you want to delete this draft?",
			confirmText: "Delete",
			variant: "destructive",
			onConfirm: () => {
				const updatedDrafts = drafts.filter((d) => d.id !== id);
				setDrafts(updatedDrafts);
				localStorage.setItem("pos_drafts", JSON.stringify(updatedDrafts));
				toast.success("Draft deleted");
			},
		});
	};

	const clearCart = () => {
		showConfirm({
			title: "Clear Cart?",
			description:
				"Are you sure you want to remove all items from the cart? This action cannot be undone.",
			confirmText: "Clear Cart",
			variant: "destructive",
			onConfirm: () => {
				resetState();
				localStorage.removeItem("pos_current_cart");
				toast.success("Cart cleared");
			},
		});
	};

	useEffect(() => {
		fetchProducts();
		fetchCategories();
		fetchFoodItems();
		fetchFoodCategories();
		fetchExtras();
		fetchOrders();
	}, []);

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
			foodCategory === "all" || item.category_id.toString() == foodCategory;
		return matchesSearch && matchesCategory && item.status === "active";
	});

	const addToCart = (product: any) => {
		// Don't add if product is out of stock
		if (product.stock <= 0) return;

		setCart((prev) => {
			const existing = prev.find(
				(item: any) =>
					item.itemType === "drink" && item.product?.id === product.id,
			);
			if (existing) {
				// Don't exceed available stock
				const newQuantity = Math.min(existing.quantity + 1, product.stock);
				return prev.map((item: any) =>
					item.itemType === "drink" && item.product?.id === product.id ?
						{ ...item, quantity: newQuantity }
					:	item,
				);
			}
			return [...prev, { product, quantity: 1, itemType: "drink" }];
		});
	};

	const addFoodToCart = (
		foodItem: any,
		selectedExtras: number[],
		notes: string,
	) => {
		setCart((prev) => {
			if (editingCartIndex !== null) {
				// Update existing item
				const newCart = [...prev];
				newCart[editingCartIndex] = {
					...prev[editingCartIndex],
					extraIds: selectedExtras || [],
					notes: notes || undefined,
				};
				setEditingCartIndex(null);
				return newCart;
			}
			// For food items, we add each as a separate cart item (even if same food, different extras/notes)
			const newCartItem = {
				foodItem,
				quantity: 1,
				itemType: "food" as const,
				extraIds: selectedExtras || [],
				notes: notes || undefined,
			};
			return [...prev, newCartItem];
		});
	};

	const updateCartQty = (
		itemId: number,
		itemType: "drink" | "food",
		qty: number,
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
			}),
		);
	};

	const removeFromCart = (
		itemId: number,
		itemType: "drink" | "food",
		name: string,
	) => {
		showConfirm({
			title: "Remove Item?",
			description: `Remove "${name}" from your cart?`,
			confirmText: "Remove",
			variant: "destructive",
			onConfirm: () => {
				setCart((prev) => {
					if (itemType === "drink") {
						return prev.filter(
							(item) =>
								!(item.itemType === "drink" && item.product?.id === itemId),
						);
					} else {
						// For food, use index
						return prev.filter((_, index) => index !== itemId);
					}
				});
				toast.success(
					`${itemType === "drink" ? "Drink" : "Food"} removed from cart`,
				);
			},
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
			(item) => item.itemType === "drink" && item.product?.id === productId,
		);
	};

	// Update Customer Display in real-time
	// Update Customer Display in real-time
	useEffect(() => {
		const port = parseJSONString(settings?.pos as any)?.customerDisplayPort;
		if (!port || !open) return;

		const totalStr = cart.length > 0 ? total.toFixed(2) : "0.00";
		window.electron.invoke("update-customer-display", port, totalStr);
	}, [total, cart, open, settings?.pos]);

	// Reset table number when switching order types
	useEffect(() => {
		if (orderType !== "table" && orderType !== "takeout") {
			setTableNumber("");
		}
	}, [orderType]);

	const resetState = () => {
		setCart([]);
		setOrderType("customer");
		setTableNumber("");
		setPaymentMode("cash");
		setAmountTendered("");
		setNotes("");
		setCustomerName("");
		setSearch("");
		setActiveTab("drinks");
		setSelectedFoodItem(null);
		localStorage.removeItem("pos_current_cart");
	};

	const onOrderCreated = (newOrder: Order) => {
		resetState();

		if (newOrder.order_type === "customer") {
			setTimeout(() => {
				showConfirm({
					title: "Print Receipt?",
					description: "Would you like to print a receipt for this order?",
					confirmText: "Print Receipt",
					cancelText: "Skip",
					onConfirm: async () => {
						await printReceipt(newOrder);
					},
				});
			}, 500);
		}
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
					return foodPayload;
				}
			}),
			order_type: orderType,
			table_number: orderType === "table" ? tableNumber : undefined,
			payment_mode: orderType === "customer" ? paymentMode : null,
			amount_tendered:
				paymentMode === "cash" ? parseFloat(amountTendered || "0") : 0,
			tax,
			notes,
			customer_name: customerName || undefined,
			status: orderType === "customer" ? "closed" : "open",
		};
		try {
			// Trigger cash drawer ONLY for in-house orders being paid with cash immediately
			if (orderType === "customer" && paymentMode.toLowerCase() === "cash") {
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
			resetState();
		} catch (error) {
			console.error("Error placing order:", error);
			// Error is already handled by createOrder hook with toast
			toast.error("Failed to place order");
		}
	};

	const CategoriesToUse = activeTab === "drinks" ? categories : foodCategories;

	return (
		<>
			<div className="h-full flex-1">
				<div className="flex h-full">
					{/* Left: Product/Food selection */}
					<div className="flex-1 border-r flex flex-col h-full">
						<div className="p-2 pr-8 py-2 bg-white flex gap-4 items-center justify-start border-b">
							<Button
								variant={"ghost"}
								size="icon"
								onClick={() => navigate(-1)}
							>
								<ChevronLeft />
							</Button>
							<h2 className="font-bold text-2xl capitalize">
								Create {activeTab} Order
							</h2>
						</div>

						{/* Product/Food Grid */}
						<div className="flex-1 flex flex-row h-[calc(100%-62px)]">
							<div
								className={cn(
									"w-[250px] border-r overflow-y-auto bg-white h-auto",
								)}
							>
								<div className="h-14 border-b bg-card sticky top-0 z-10 flex items-center justify-between px-4">
									<h2 className="font-semibold text-md">Categories</h2>
									{(category != "all" || foodCategory != "all") && (
										<Button
											variant="ghost"
											className="h-9 gap-1 px-2.5 rounded-lg text-xs bg-muted"
											onClick={() =>
												(activeTab === "drinks" ? setCategory : (
													setFoodCategory
												))?.("all")
											}
										>
											<X className="!size-3" /> Clear
										</Button>
									)}
								</div>
								<div className="flex-1 p-4 space-y-4">
									{CategoriesToUse.map((cat) => (
										<CategoryComponent
											key={cat.id}
											cat={cat}
											activeCategory={
												activeTab === "drinks" ? category : foodCategory
											}
											setActiveCategory={
												activeTab === "drinks" ? setCategory : setFoodCategory
											}
										/>
									))}
								</div>
							</div>
							<div className="flex-1 h-full overflow-y-auto">
								<div className="px-4 py-2 border-b flex items-center gap-4 bg-card h-14 sticky top-0 z-10">
									<Button
										variant={activeTab === "drinks" ? "default" : "outline"}
										className={cn(
											ClassStyles.tabButton,
											"hover:bg-primary/10 text-primary shadow-none",
											activeTab === "drinks" ?
												"text-primary-foreground hover:bg-primary"
											:	"text-muted-foreground",
										)}
										onClick={() => setActiveTab("drinks")}
									>
										<Beer />
										Drinks
									</Button>
									<Button
										variant={activeTab === "food" ? "default" : "outline"}
										className={cn(
											ClassStyles.tabButton,
											"hover:bg-primary/10 text-primary shadow-none",
											activeTab === "food" ?
												"text-primary-foreground hover:bg-primary"
											:	"text-muted-foreground",
										)}
										onClick={() => setActiveTab("food")}
									>
										<Salad />
										Food
									</Button>
									<div className="w-px h-10 bg-border" />
									<div className="flex-1 flex items-center relative max-w-lg">
										<Search className="absolute size-5 left-4 text-muted-foreground z-10" />
										<Input
											className="flex-1 text-base rounded-md pl-11 bg-muted/80 h-10"
											id="order-search"
											name="order-search"
											placeholder={
												activeTab === "drinks" ? "Search drinks..." : (
													"Search food items..."
												)
											}
											value={search}
											onChange={(e) => setSearch(e.target.value)}
										/>
									</div>
								</div>
								<div
									className={cn(
										"grid gap-4 p-4",
										cart.length > 0 ?
											"grid-cols-1 md:grid-cols-1 lg:grid-cols-3 xl:grid-cols-4"
										:	"grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5",
									)}
								>
									{activeTab === "drinks" ?
										productsLoading ?
											<div className="col-span-full text-center text-gray-400 py-20 text-lg">
												Loading products...
											</div>
										: filteredProducts.length === 0 ?
											<div className="col-span-full">
												<EmptyState
													icon={activeTab === "drinks" ? Beer : Salad}
													title={`No ${activeTab} yet`}
													description={`No ${activeTab} will appear here once you start adding them.`}
												/>
											</div>
										:	filteredProducts.map((product) => {
												const isOutOfStock = product.stock <= 0;
												const isInCart = alreadyInCart(product?.id);
												const isDisabled = isOutOfStock || isInCart;

												return (
													<div
														key={product.id}
														className={cn(
															"bg-white rounded-lg overflow-hidden shadow-sm transition-all p-1",
															isDisabled ?
																"opacity-50 cursor-not-allowed"
															:	"cursor-pointer hover:shadow-md hover:scale-[1.02]",
														)}
														onClick={() => {
															if (!isDisabled) {
																addToCart(product);
															}
														}}
													>
														{/* Product Image */}
														<div className="w-full h-[200px] bg-gray-100 overflow-hidden relative">
															<div className="bg-muted/50 h-full w-full">
																{product.image ?
																	<img
																		src={product.image}
																		alt={product.name}
																		className="w-full h-full object-cover"
																	/>
																:	<div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">
																		<Beer className="!size-12" />
																	</div>
																}
															</div>
															{isOutOfStock && (
																<div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
																	Out of Stock
																</div>
															)}
															{isInCart && !isOutOfStock && (
																<div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
																	In Cart
																</div>
															)}
														</div>
														{/* Product Info */}
														<div className="p-3 text-center">
															<div className="font-semibold text-base text-gray-900 mb-1 line-clamp-2">
																{product.name}
															</div>
															<div className="text-lg font-bold text-primary">
																{formatCurrency(product.price)}
															</div>
														</div>
													</div>
												);
											})

									: filteredFoodItems.length === 0 ?
										<div className="col-span-full flex flex-col items-center justify-center py-12 px-4 text-center">
											<h3 className="text-lg font-semibold text-gray-700">
												No food items found
												{foodCategory ?
													` under ${foodCategories?.find((c) => (c.id as any) == foodCategory)?.name} category`
												:	""}
												.
											</h3>
											<p className="mt-1 max-w-sm text-sm text-gray-400 capitalize">
												{activeTab} will appear here once you start adding them.
											</p>
										</div>
									:	filteredFoodItems.map((foodItem) => {
											return (
												<div
													key={foodItem.id}
													className="bg-white rounded-xl overflow-hidden shadow-sm transition-all cursor-pointer hover:shadow-md hover:scale-[1.02] p-1"
													onClick={() => setSelectedFoodItem(foodItem)}
												>
													{/* Food Item Image */}
													<div className="w-full aspect-square bg-gray-100 overflow-hidden relative  rounded-lg">
														<div className="bg-muted/50 h-full w-full rounded-xl">
															{foodItem.image ?
																<img
																	src={foodItem.image}
																	alt={foodItem.name}
																	className="w-full h-full object-cover rounded-xl"
																/>
															:	<div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl rounded-xl">
																	<Salad className="!size-12" />
																</div>
															}
														</div>
													</div>
													{/* Food Item Info */}
													<div className="p-3 text-center">
														<div className="font-semibold text-base mb-1 line-clamp-2">
															{foodItem.name}
														</div>
														<div className="text-sm text-muted-foreground mb-1 line-clamp-2">
															{foodItem.description}
														</div>
														<div className="text-lg font-bold text-primary">
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
					</div>
					{/* Right: Cart and finalization */}
					<div
						className={cn(
							"w-1/3 xl:w-1/4 bg-white flex flex-col h-full",
							cart.length === 0 && "hidden",
						)}
					>
						{/* Cart Header */}
						<div className="px-6 py-2 border-b flex-shrink-0 flex justify-between items-center">
							<div>
								<h2 className="text-lg font-bold text-gray-900">
									Current Order
								</h2>
								<p className="text-gray-500 text-xs">
									Total items: {cart.length}
								</p>
							</div>
							<div className="flex gap-2">
								<Button
									variant="ghost"
									size="icon"
									className="size-9 rounded-full hover:bg-primary/10"
									onClick={() => setShowDraftsDialog(true)}
									title="Draft History"
								>
									<History className="size-5" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									className="size-9 rounded-full hover:bg-primary/10"
									onClick={saveDraft}
									disabled={cart.length === 0}
									title="Save as Draft"
								>
									<Save className="size-5" />
								</Button>
							</div>
						</div>

						{/* Cart Items - Scrollable */}
						<div
							className="flex-1 overflow-y-auto overflow-x-hidden min-h-0"
							style={{ WebkitOverflowScrolling: "touch" }}
						>
							{cart.length === 0 ?
								<EmptyState
									icon={ShoppingBasket}
									title="Cart is empty"
									description="Add products to get started"
								/>
							:	<ul className="divide-y divide-gray-100 px-6 py-4  max-h-[60%] overflow-y-auto">
									{cart.map((item, index) => {
										const isDrink = item.itemType === "drink";

										const product = isDrink ? item.product : item.foodItem;
										const image = product?.image;
										const name = product?.name;

										const itemExtras =
											!isDrink ?
												foodExtras.filter((e) => item.extraIds?.includes(e.id))
											:	[];

										const itemPrice =
											isDrink ?
												product.price
											:	product.price +
												(itemExtras.reduce((sum, e) => sum + e.price, 0) || 0);

										const itemKey =
											isDrink ? `drink-${product.id}` : `food-${index}`;

										const currentQty = item.quantity;

										return (
											<li
												key={itemKey}
												className={cn(
													"flex items-start gap-4 py-4",
													!isDrink && "border-b",
												)}
											>
												<div
													className={cn(
														"w-16 h-16 rounded-lg overflow-hidden flex-shrink-0",
														isDrink ? "bg-muted p-0.5" : "bg-gray-100",
													)}
												>
													{image ?
														<img
															src={image}
															alt={name}
															className={cn(
																"w-full h-full object-cover",
																isDrink && "rounded-md",
															)}
														/>
													:	<div className="w-full h-full flex items-center justify-center text-2xl">
															{isDrink ? "🍺" : "🍽️"}
														</div>
													}
												</div>

												<div className="flex-1 min-w-0">
													<div
														className={cn(
															"font-semibold text-base text-gray-900 mb-1",
															!isDrink &&
																"cursor-pointer hover:text-primary transition-colors flex items-center gap-2",
														)}
														onClick={() => {
															if (!isDrink) {
																setViewingCartFoodItem({ item, index });
															}
														}}
													>
														{name}

														{!isDrink && (
															<Eye className="h-4 w-4 text-gray-400" />
														)}
													</div>

													{!isDrink && itemExtras.length > 0 && (
														<div className="text-xs text-gray-500 mb-1">
															Extras: {itemExtras.map((e) => e.name).join(", ")}
														</div>
													)}

													{!isDrink && item.notes && (
														<div className="text-xs text-gray-500 mb-1">
															Note: {item.notes}
														</div>
													)}

													<div className="text-base font-bold text-gray-900">
														{formatCurrency(itemPrice)}
														{!isDrink && ` × ${currentQty}`}
													</div>

													<div className="flex items-center gap-2 mt-3">
														<Button
															size="icon"
															variant={isDrink ? "ghost" : "outline"}
															className={cn("size-12 rounded-lg bg-muted")}
															onClick={() =>
																updateCartQty(
																	isDrink ? product.id : index,
																	isDrink ? "drink" : "food",
																	Math.max(1, currentQty - 1),
																)
															}
														>
															-
														</Button>

														<Input
															type="number"
															min={1}
															max={isDrink ? product.stock : undefined}
															value={currentQty}
															onChange={(e) =>
																updateCartQty(
																	isDrink ? product.id : index,
																	isDrink ? "drink" : "food",
																	Math.max(1, Number(e.target.value)),
																)
															}
															className="w-20 h-12 text-center flex-1"
														/>

														<Button
															size="icon"
															variant={isDrink ? "ghost" : "outline"}
															className={cn("size-12 rounded-lg bg-muted")}
															onClick={() =>
																updateCartQty(
																	isDrink ? product.id : index,
																	isDrink ? "drink" : "food",
																	currentQty + 1,
																)
															}
															disabled={isDrink && currentQty >= product.stock}
														>
															+
														</Button>

														<Button
															size="icon"
															variant="ghost"
															className="bg-destructive/10 size-12 rounded-lg ml-4 text-destructive hover:bg-destructive/20 hover:text-destructive"
															onClick={() =>
																removeFromCart(
																	isDrink ? product.id : index,
																	isDrink ? "drink" : "food",
																	name,
																)
															}
														>
															<Trash2 />
														</Button>

														{isDrink && currentQty >= product.stock && (
															<span className="text-xs text-red-600">Max</span>
														)}
													</div>
												</div>
											</li>
										);
									})}
								</ul>
							}
							{/* Order finalization */}
							<div
								className={cn(
									"px-6 py-5 space-y-4 border-t-[0.5px] flex-shrink-0",
									cart.length === 0 ? "hidden" : "block",
								)}
							>
								<div className="space-y-2">
									<span className="text-sm font-medium text-gray-700">
										Order Type:
									</span>
									<div className="flex gap-2 overflow-x-auto">
										{orderTypes.map(({ value, label }) => {
											const Icon = OrderTypeIcons[value as OrderTypes];
											return (
												<Button
													key={value}
													className="flex-1 h-11 text-base gap-2 flex-col h-auto items-start rounded-xl"
													variant={orderType === value ? "default" : "outline"}
													onClick={() => setOrderType(value as any)}
												>
													<Icon className="!size-4" />
													{label}
												</Button>
											);
										})}
									</div>
								</div>
								{orderType === "table" && (
									<div className="space-y-2">
										<span className="text-sm font-medium text-gray-700">
											Table:
										</span>
										<div className="w-full h-11 text-base px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 flex items-center">
											Will be auto-assigned (DINE-XXX)
										</div>
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
									<p className="text-sm font-medium text-gray-700">
										Order Name:
									</p>
									<Input
										id="customer-name"
										name="customer-name"
										value={customerName}
										onChange={(e) => setCustomerName(e.target.value)}
										placeholder="Customer / Order name..."
										className="h-11 text-base rounded-xl bg-muted border-0"
									/>
								</div>

								<div className="space-y-2">
									<p className="text-sm font-medium text-gray-700">
										Order Notes:
									</p>
									<Textarea
										id="order-notes"
										name="order-notes"
										value={notes}
										onChange={(e) => setNotes(e.target.value)}
										placeholder="Order notes..."
										className="w-full h-20 text-base resize-none rounded-xl bg-muted"
									/>
								</div>

								<div className="space-y-2">
									<p className="text-sm font-medium text-gray-700">Payment:</p>
									<div className="flex gap-2 overflow-x-auto">
										{paymentModes.map(({ value, label }) => {
											const Icon = PaymentModeIcons[value as PaymentModes];
											return (
												<Button
													key={value}
													className="flex-1 h-11 text-base gap-2 flex-col h-auto items-start rounded-xl"
													variant={
														paymentMode === value ? "default" : "outline"
													}
													onClick={() => setPaymentMode(value as any)}
												>
													<Icon className="!size-4" />
													{label}
												</Button>
											);
										})}
									</div>
								</div>

								{paymentMode === "cash" && orderType === "customer" && (
									<div className="space-y-3">
										<p className="text-sm font-medium text-gray-700">
											Cash Received
										</p>
										<div className="space-y-2">
											<Input
												id="amount-tendered"
												name="amount-tendered"
												type="number"
												placeholder="0.00"
												value={amountTendered}
												onChange={(e) => setAmountTendered(e.target.value)}
												className="h-11 text-lg font-bold border-primary/20 focus:border-primary shadow-sm"
												autoFocus
											/>
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
														Math.abs(parseFloat(amountTendered) - total),
													)}
												</div>
											</div>
										)}
									</div>
								)}

								<div className="space-y-3 pt-3 border-t border-gray-200">
									<p className="text-md font-semibold">Payment Summary:</p>
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
										onClick={clearCart}
										className="flex-1 h-12 text-base border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
									>
										Clear Cart
									</Button>
									<Button
										type="button"
										disabled={
											cart.length === 0 ||
											loading ||
											(paymentMode === "cash" &&
												orderType === "customer" &&
												(!amountTendered ||
													parseFloat(amountTendered) <= 0 ||
													parseFloat(amountTendered) < total))
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
				<FoodItemSelectionDialog
					open={!!selectedFoodItem}
					foodItem={selectedFoodItem}
					foodExtras={foodExtras}
					initialExtras={
						editingCartIndex !== null ? cart[editingCartIndex]?.extraIds : []
					}
					initialNotes={
						editingCartIndex !== null ? cart[editingCartIndex]?.notes : ""
					}
					onClose={() => {
						setSelectedFoodItem(null);
						setEditingCartIndex(null);
					}}
					onAdd={addFoodToCart}
				/>
			</div>

			{/* View Cart Food Item Details Dialog */}
			<ViewDialog open={showDraftsDialog} onOpenChange={setShowDraftsDialog}>
				<ViewDialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
					<DialogHeader>
						<DialogTitle className="text-2xl font-bold flex items-center gap-2">
							Draft Orders
						</DialogTitle>
					</DialogHeader>
					<div className="flex-1 overflow-y-auto py-4">
						{drafts.length === 0 ?
							<div className="text-center py-12 text-gray-500">
								<History className="size-12 mx-auto mb-4 opacity-20" />
								<p className="text-lg font-medium">No saved drafts</p>
								<p className="text-sm">Drafts you save will appear here.</p>
							</div>
						:	<div className="space-y-4">
								{drafts.map((draft) => (
									<div
										key={draft.id}
										className="border rounded-xl p-4 hover:border-primary/50 transition-colors bg-white shadow-sm"
									>
										<div className="flex justify-between items-start mb-3">
											<div>
												<p className="font-bold text-lg">
													{new Date(draft.timestamp).toLocaleString()}
												</p>
												<p className="text-sm text-gray-500">
													{draft.cart.length} items • {draft.orderType}
												</p>
											</div>
											<div className="text-right">
												<p className="font-bold text-xl text-primary">
													{formatCurrency(draft.subtotal || 0)}
												</p>
											</div>
										</div>
										<div className="flex gap-2">
											<Button
												variant="default"
												size="sm"
												className="flex-1 gap-2"
												onClick={() => loadDraft(draft)}
											>
												<RotateCcw className="size-4" />
												Restore Draft
											</Button>
											<Button
												variant="ghost"
												size="sm"
												className="text-red-600 hover:bg-red-50 hover:text-red-700"
												onClick={() => deleteDraft(draft.id)}
											>
												<Trash2 className="size-4" />
											</Button>
										</div>
									</div>
								))}
							</div>
						}
					</div>
					<ViewDialogFooter>
						<Button
							variant="outline"
							onClick={() => setShowDraftsDialog(false)}
						>
							Close
						</Button>
					</ViewDialogFooter>
				</ViewDialogContent>
			</ViewDialog>

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
												},
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
												},
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
													},
												);
												const extrasTotal = Array.from(
													extraCounts.entries(),
												).reduce((sum, [id, quantity]) => {
													const extra = foodExtras.find((e) => e.id === id);
													return sum + (extra?.price || 0) * quantity;
												}, 0);
												return (
													(basePrice + extrasTotal) *
													viewingCartFoodItem.item.quantity
												);
											})(),
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

						<ViewDialogFooter className="gap-2">
							<Button
								variant="outline"
								onClick={() => setViewingCartFoodItem(null)}
								className="flex-1"
							>
								Close
							</Button>
							<Button
								onClick={() => {
									const itemToEdit = viewingCartFoodItem.item;
									const index = viewingCartFoodItem.index;

									// Re-find the full food item from our master list to ensure we have the extras mapping
									const fullFoodItem = foodItems.find(
										(fi) => fi.id === itemToEdit.foodItem.id,
									);

									setViewingCartFoodItem(null);
									setEditingCartIndex(index);
									setSelectedFoodItem(fullFoodItem || itemToEdit.foodItem);
								}}
								className="flex-1"
							>
								Edit Item
							</Button>
						</ViewDialogFooter>
					</ViewDialogContent>
				</ViewDialog>
			)}
		</>
	);
};

export default CreateOrder;
