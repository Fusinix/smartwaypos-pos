/** @format */

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
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
import { useCurrency } from "@/hooks/useCurrency";
import { cn, parseJSONString } from "@/lib/utils";
import type { Order, OrderItemDetail } from "@/types";
import {
	X,
	Eye,
	Salad,
	Beer,
	Search,
	Trash2,
	ShoppingBasket,
} from "lucide-react";
import { FoodItemSelectionDialog } from "./FoodItemSelectionDialog";
import { EditFoodItemDialog } from "./EditFoodItemDialog";
import { CategoryComponent } from "@/pages/CreateOrder";
import { ClassStyles } from "../classnames";
import EmptyState from "../alerts/empty-state";

interface EditOrderItemsDialogProps {
	open?: boolean;
	onClose: () => void;
	order: Order | null;
	onOrderUpdated: (order: Order) => void;
	pageMode?: boolean;
	onBack?: () => void;
}

export const EditOrderItemsDialog: React.FC<EditOrderItemsDialogProps> = ({
	open = false,
	onClose,
	order,
	onOrderUpdated,
	pageMode = false,
	onBack,
}) => {
	const { products, fetchProducts } = useProducts();
	const { categories, fetchCategories } = useCategory();
	const { foodItems, foodCategories, fetchFoodItems, fetchFoodCategories } =
		useFood();
	const { extras: foodExtras } = useFoodExtras();
	const { updateOrderItems } = useOrders();
	const { settings } = useSettings();
	const { format: formatCurrency } = useCurrency();

	const [activeTab, setActiveTab] = useState<"drinks" | "food">("drinks");
	const [search, setSearch] = useState("");
	const [category, setCategory] = useState<string>("all");
	const [foodCategory, setFoodCategory] = useState<string>("all");
	const [editingItems, setEditingItems] = useState<OrderItemDetail[]>([]);
	const [selectedFoodItem, setSelectedFoodItem] = useState<any>(null);
	const [editingFoodItem, setEditingFoodItem] = useState<{
		item: OrderItemDetail;
		index: number;
	} | null>(null);
	const [loading, setLoading] = useState(false);
	const [dataFetched, setDataFetched] = useState(false);

	const tax = parseJSONString(settings?.pos as any)?.defaultTaxRate ?? 10;

	useEffect(() => {
		if (open && !dataFetched) {
			fetchProducts();
			fetchCategories();
			fetchFoodItems();
			fetchFoodCategories();
			setDataFetched(true);
		}
	}, [open, dataFetched]);

	useEffect(() => {
		if (open && order?.items) {
			const items = order.items as OrderItemDetail[];
			setEditingItems(items);
		}
	}, [open, order?.items]);

	// Reset dataFetched when dialog closes
	useEffect(() => {
		if (!open) {
			setDataFetched(false);
			setEditingFoodItem(null);
			setSelectedFoodItem(null);
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
			foodCategory === "all" || item.category_id.toString() == foodCategory;
		return matchesSearch && matchesCategory && item.status === "active";
	});

	const addToOrder = (product: any) => {
		// Don't add if product is out of stock
		if (product.stock <= 0) return;

		// Check if product is already in order
		const existing = editingItems.find(
			(item) => item.item_type === "drink" && item.product_id === product.id,
		);
		if (existing) {
			// Increase quantity if in stock
			const availableStock = getAvailableStockForEditing(product.id);
			const newQuantity = Math.min(existing.quantity + 1, availableStock);
			setEditingItems((prev) =>
				prev.map((item) =>
					item.item_type === "drink" && item.product_id === product.id ?
						{ ...item, quantity: newQuantity }
					:	item,
				),
			);
		} else {
			// Add new item
			setEditingItems((prev) => [
				...prev,
				{
					id: 0, // Temporary ID for new items
					order_id: order?.id || 0,
					product_id: product.id,
					food_item_id: undefined,
					item_type: "drink",
					product_name: product.name,
					price: product.price,
					image: product.image,
					quantity: 1,
				},
			]);
		}
	};

	const addFoodToOrder = (
		foodItem: any,
		selectedExtras: number[],
		notes: string,
	) => {
		// For food items, we add each as a separate cart item (even if same food, different extras/notes)
		const newItem: OrderItemDetail = {
			id: 0, // Temporary ID
			order_id: order?.id || 0,
			food_item_id: foodItem.id,
			product_id: undefined,
			item_type: "food",
			food_item_name: foodItem.name,
			price: foodItem.price,
			image: foodItem.image,
			quantity: 1,
			notes: notes || undefined,
			extras: foodExtras
				.filter((e) => selectedExtras.includes(e.id))
				.map((e) => ({
					id: e.id,
					name: e.name,
					price: e.price,
				})),
		};
		setEditingItems((prev) => [...prev, newItem]);
	};

	// Helper function to calculate available stock for a product when editing an order
	const getAvailableStockForEditing = (productId: number) => {
		const product = products.find((p) => p.id === productId);
		if (!product) return 0;

		const currentItem = editingItems.find(
			(item) => item.item_type === "drink" && item.product_id === productId,
		);
		const currentOrderQuantity = currentItem?.quantity || 0;

		// Available stock = current stock + current order quantity
		// This allows us to "return" the current order quantity back to available stock
		// since we're editing this order, we can reallocate its quantity
		return product.stock + currentOrderQuantity;
	};

	const updateItemQuantity = (
		itemId: number | undefined,
		itemType: "drink" | "food",
		quantity: number,
	) => {
		setEditingItems((prev) =>
			prev.map((item, index) => {
				if (
					itemType === "drink" &&
					item.product_id === itemId &&
					itemId !== undefined
				) {
					const product = products.find((p) => p.id === itemId);
					if (!product) return item;
					const availableStock = getAvailableStockForEditing(itemId);
					const newQuantity = Math.max(1, Math.min(quantity, availableStock));
					return { ...item, quantity: newQuantity };
				} else if (itemType === "food" && index === itemId) {
					// For food, use index as ID
					return { ...item, quantity: Math.max(1, quantity) };
				}
				return item;
			}),
		);
	};

	const removeFromOrder = (
		itemId: number | undefined,
		itemType: "drink" | "food",
	) => {
		setEditingItems((prev) => {
			if (itemType === "drink") {
				return prev.filter(
					(item) => !(item.item_type === "drink" && item.product_id === itemId),
				);
			} else {
				// For food, use index
				return prev.filter((_, index) => index !== itemId);
			}
		});
	};

	const calculateTotals = () => {
		const subtotal = editingItems.reduce((sum, item) => {
			if (item.item_type === "drink") {
				return sum + item.price * item.quantity;
			} else {
				let itemTotal = item.price * item.quantity;
				// Add extras prices (accounting for quantities)
				if (item.extras && item.extras.length > 0) {
					const extrasTotal = item.extras.reduce(
						(sum, e) => sum + e.price * (e.quantity || 1),
						0,
					);
					itemTotal += extrasTotal * item.quantity;
				}
				return sum + itemTotal;
			}
		}, 0);
		const taxAmount = subtotal * (tax / 100);
		const total = subtotal + taxAmount;
		return { subtotal, taxAmount, total };
	};

	const handleSave = async () => {
		if (!order?.id) return;

		setLoading(true);
		try {
			// Convert editing items to the format expected by the backend
			const itemsForUpdate = editingItems.map((item) => {
				if (item.item_type === "drink") {
					return {
						itemType: "drink" as const,
						productId: item.product_id!,
						quantity: item.quantity,
					};
				} else {
					// Build extraIds array with quantities (repeat extra IDs based on quantity)
					const extraIds: number[] = [];
					if (item.extras && item.extras.length > 0) {
						item.extras.forEach((e) => {
							const quantity = e.quantity || 1;
							for (let i = 0; i < quantity; i++) {
								extraIds.push(e.id);
							}
						});
					}
					return {
						itemType: "food" as const,
						foodItemId: item.food_item_id!,
						quantity: item.quantity,
						extraIds: extraIds,
						notes: item.notes || undefined,
					};
				}
			});

			const result = await updateOrderItems(order.id, itemsForUpdate);
			onOrderUpdated(result);
			onClose();
		} catch (error) {
			console.error("Failed to update order items:", error);
		} finally {
			setLoading(false);
		}
	};

	const { subtotal, taxAmount, total } = calculateTotals();

	const CategoriesToUse = activeTab === "drinks" ? categories : foodCategories;

	return (
		<>
			<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
				<DialogContent className="max-w-[90vw] h-[86vh] w-full p-0 overflow-hidden">
					<div className="flex h-full min-h-0">
						{/* Left: Product/Food selection */}
						<div className="flex flex-1">
							<div className="w-[200px] border-r overflow-y-auto bg-white h-full">
								<div className="h-14 border-b flex items-center justify-between px-4">
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
								<div className="flex-1 h-full p-4 space-y-4">
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
							<div className="flex-1 border-r bg-muted/50 flex flex-col min-h-0">
								{/* Tabs */}
								<div className="flex border-b p-1 px-4 gap-4 bg-card h-14 items-center">
									<Button
										variant={activeTab === "drinks" ? "default" : "outline"}
										onClick={() => setActiveTab("drinks")}
										className={cn(ClassStyles.tabButton)}
									>
										<Salad />
										Drinks
									</Button>
									<Button
										variant={activeTab === "food" ? "default" : "outline"}
										onClick={() => setActiveTab("food")}
										className={cn(ClassStyles.tabButton)}
									>
										<Beer />
										Food
									</Button>
								</div>

								<div className="p-4 py-1 border-b flex space-x-2 h-14 items-center bg-card">
									<div className="flex items-center relative flex-1">
										<Search className="size-4 text-muted-foreground left-4 z-10 absolute " />
										<Input
											placeholder={
												activeTab === "drinks" ? "Search drinks..." : (
													"Search food items..."
												)
											}
											value={search}
											onChange={(e) => setSearch(e.target.value)}
											className="flex-1 h-10 pl-10 bg-muted/80"
										/>
									</div>
								</div>

								{/* Product/Food Grid */}
								<div className="flex-1 overflow-y-auto p-4">
									<div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
										{activeTab === "drinks" ?
											filteredProducts.length === 0 ?
												<div className="col-span-full text-center text-gray-400 py-20">
													No products found.
												</div>
											:	filteredProducts.map((product) => {
													const isOutOfStock = product.stock <= 0;
													const isInOrder = editingItems.some(
														(item) =>
															item.item_type === "drink" &&
															item.product_id === product.id,
													);

													return (
														<div
															onClick={() => {
																if (!isOutOfStock) {
																	addToOrder(product);
																}
															}}
															key={product.id}
															className={cn(
																"bg-white p-4 h-fit border rounded-xl cursor-pointer hover:bg-gray-50",
																isOutOfStock &&
																	"cursor-not-allowed bg-muted/50 opacity-50",
															)}
														>
															<div className="w-full h-32 bg-muted rounded-md overflow-hidden">
																{product.image && (
																	<img
																		src={product.image}
																		alt={product.name}
																		className="w-full h-full object-cover rounded"
																	/>
																)}
															</div>
															<div className="pt-2 flex flex-col gap-1 text-center">
																<div className="font-normal text-sm">
																	{product.name}
																</div>
																<div className="text-base font-semibold text-primary">
																	{formatCurrency(product.price)}
																</div>
																<div className="text-xs text-gray-500">
																	Stock: {product.stock}
																	{isOutOfStock && (
																		<span className="text-red-600 ml-1">
																			(Out of Stock)
																		</span>
																	)}
																	{isInOrder && (
																		<span className="text-blue-600 ml-1">
																			(In Cart)
																		</span>
																	)}
																</div>
															</div>
														</div>
													);
												})

										: filteredFoodItems.length === 0 ?
											<div className="col-span-full text-center text-gray-400 py-20">
												No food items found.
											</div>
										:	filteredFoodItems.map((foodItem) => {
												return (
													<div
														key={foodItem.id}
														className="p-1 bg-white rounded-lg overflow-hidden shadow-sm transition-all cursor-pointer hover:shadow-md hover:scale-[1.02]"
														onClick={() => setSelectedFoodItem(foodItem)}
													>
														<div className="w-full aspect-square bg-gray-100 overflow-hidden relative rounded-md">
															<div className="bg-muted/50 h-full w-full ">
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
														<div className="p-3 text-center">
															<div className="font-medium text-base text-gray-900 mb-1 line-clamp-2">
																{foodItem.name}
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

						{/* Right: Order items and totals */}
						<div
							className={
								"w-1/3 flex flex-col h-full min-h-0 overflow-y-auto overflow-x-hidden"
							}
						>
							<div className="flex items-center justify-between p-4 h-14 py-1 border-b">
								<h2 className="text-lg font-semibold py-0.5">
									Order Items ({editingItems.length})
								</h2>
							</div>
							{editingItems.length === 0 ?
								<EmptyState
									icon={ShoppingBasket}
									title="Your cart is empty"
									description="Select items from the left to add to the order."
								/>
							:	<ul className="divide-y p-4 pt-0">
									{editingItems.map((item, index) => {
										if (item.item_type === "drink") {
											return (
												<li
													key={`drink-${item.product_id}-${index}`}
													className="flex items-start justify-between py-6 gap-3"
												>
													<div className="size-14 rounded-xl overflow-hidden bg-muted flex-shrink-0 p-1">
														{item.image ?
															<img
																src={item.image}
																alt={item.product_name}
																className="w-full h-full object-cover rounded"
															/>
														:	<div className="w-full h-full flex items-center justify-center text-2xl">
																🍺
															</div>
														}
													</div>
													<div className="flex-1 min-w-0 flex-col">
														<div className="font-semibold text-base flex items-start gap-2 justify-between">
															{item.product_name}
															<div className="text-base font-semibold">
																{formatCurrency(item.price)}
															</div>
														</div>

														<div className="flex items-center justify-end space-x-2 flex-shrink-0 mt-4">
															<Button
																size="icon"
																variant="ghost"
																className="bg-muted rounded-md"
																onClick={() =>
																	updateItemQuantity(
																		item.product_id,
																		"drink",
																		item.quantity - 1,
																	)
																}
															>
																-
															</Button>
															<Input
																type="number"
																min={1}
																max={
																	item.product_id ?
																		getAvailableStockForEditing(item.product_id)
																	:	1
																}
																value={item.quantity}
																onChange={(e) =>
																	updateItemQuantity(
																		item.product_id,
																		"drink",
																		Number(e.target.value),
																	)
																}
																className="flex-1 h-11 max-w-[100px]"
															/>
															<Button
																size="icon"
																variant="ghost"
																className="bg-muted rounded-md"
																onClick={() =>
																	updateItemQuantity(
																		item.product_id,
																		"drink",
																		item.quantity + 1,
																	)
																}
																disabled={
																	!item.product_id ||
																	item.quantity >=
																		getAvailableStockForEditing(item.product_id)
																}
															>
																+
															</Button>
															{item.product_id &&
																item.quantity >=
																	getAvailableStockForEditing(
																		item.product_id,
																	) && (
																	<span className="text-xs text-red-600">
																		Max
																	</span>
																)}
															<Button
																size="icon"
																variant="ghost"
																className="bg-destructive/10 hover:bg-destructive/20 rounded-md !ml-12"
																onClick={() =>
																	removeFromOrder(item.product_id, "drink")
																}
															>
																<Trash2 className="text-destructive" />
															</Button>
														</div>
													</div>
												</li>
											);
										} else {
											const itemExtras = item.extras || [];
											const itemPrice =
												item.price +
												(itemExtras.reduce(
													(sum, e) => sum + e.price * (e.quantity || 1),
													0,
												) || 0);

											return (
												<li
													key={`food-${item.food_item_id}-${index}`}
													className="flex items-start justify-between py-6 gap-3"
												>
													<div className="size-14 rounded-xl overflow-hidden bg-muted flex-shrink-0">
														{item.image ?
															<img
																src={item.image}
																alt={item.food_item_name}
																className="w-full h-full object-cover rounded"
															/>
														:	<div className="w-full h-full flex items-center justify-center text-2xl">
																🍽️
															</div>
														}
													</div>
													<div className="flex-1 flex-col min-w-0">
														<div className="font-semibold text-base cursor-pointer flex justify-between">
															{item.food_item_name}
															<div className="text-base font-semibold mt-1">
																{formatCurrency(itemPrice)}
															</div>
														</div>
														{itemExtras.length > 0 && (
															<div className="text-xs text-gray-500 mt-1 space-y-0.5">
																<div className="font-semibold text-foreground">
																	Extras:
																</div>
																{itemExtras.map((e, extraIdx) => (
																	<div key={extraIdx} className="pl-2">
																		{e.name}
																		{e.quantity && e.quantity > 1 && (
																			<span className="text-gray-400">
																				{" "}
																				(×{e.quantity})
																			</span>
																		)}
																	</div>
																))}
															</div>
														)}
														{item.notes && (
															<div className="text-xs text-gray-500 mt-1">
																<span className="font-semibold text-foreground">
																	Note:{" "}
																</span>
																<div className="p-2 bg-muted/60 rounded-md ml-2 mt-1">
																	{item.notes}
																</div>
															</div>
														)}

														<div className="flex items-center space-x-2 flex-shrink-0 mt-4">
															<Button
																size="icon"
																variant="ghost"
																className="bg-muted rounded-md mr-auto"
																onClick={() =>
																	setEditingFoodItem({ item, index })
																}
															>
																<Eye />
															</Button>
															<Button
																size="icon"
																variant="ghost"
																className="bg-muted rounded-md"
																onClick={() =>
																	updateItemQuantity(
																		index,
																		"food",
																		item.quantity - 1,
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
																	updateItemQuantity(
																		index,
																		"food",
																		Math.max(1, Number(e.target.value)),
																	)
																}
																className="flex-1 h-11 max-w-[100px]"
															/>
															<Button
																size="icon"
																variant="ghost"
																className="bg-muted rounded-md"
																onClick={() =>
																	updateItemQuantity(
																		index,
																		"food",
																		item.quantity + 1,
																	)
																}
															>
																+
															</Button>
															<Button
																size="icon"
																variant="ghost"
																className="bg-destructive/10 hover:bg-destructive/20 rounded-md !ml-12"
																onClick={() => removeFromOrder(index, "food")}
															>
																<Trash2 className="text-destructive" />
															</Button>
														</div>
													</div>
												</li>
											);
										}
									})}
								</ul>
							}

							{/* Totals and actions */}
							<div className="p-4 space-y-4 border-t flex-shrink-0">
								<div className="space-y-3">
									<div className="flex justify-between text-sm">
										<span>Subtotal</span>
										<span>{formatCurrency(subtotal)}</span>
									</div>
									<div className="flex justify-between text-sm">
										<span>Tax ({tax}%)</span>
										<span>{formatCurrency(taxAmount)}</span>
									</div>
									<div className="flex justify-between font-semibold text-lg border-y py-3">
										<span>Total</span>
										<span>{formatCurrency(total)}</span>
									</div>
								</div>
								<DialogFooter>
									<Button
										type="button"
										variant="outline"
										onClick={onClose}
										disabled={loading}
									>
										Cancel
									</Button>
									<Button
										type="button"
										disabled={editingItems.length === 0 || loading}
										onClick={handleSave}
									>
										{loading ? "Saving..." : "Save Changes"}
									</Button>
								</DialogFooter>
							</div>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* Food Item Selection Dialog */}
			<FoodItemSelectionDialog
				open={!!selectedFoodItem}
				foodItem={selectedFoodItem}
				foodExtras={foodExtras}
				onClose={() => setSelectedFoodItem(null)}
				onAdd={addFoodToOrder}
			/>

			{/* Edit Food Item Dialog */}
			{editingFoodItem && (
				<EditFoodItemDialog
					open={!!editingFoodItem}
					foodItem={editingFoodItem.item}
					foodExtras={foodExtras}
					onClose={() => setEditingFoodItem(null)}
					onUpdate={(updatedItem) => {
						setEditingItems((prev) =>
							prev.map((item, index) =>
								index === editingFoodItem.index ? updatedItem : item,
							),
						);
						setEditingFoodItem(null);
					}}
				/>
			)}
		</>
	);
};
