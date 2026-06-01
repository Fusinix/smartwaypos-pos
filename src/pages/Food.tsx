/** @format */

import { SimpleAlert } from "@/components/alerts/simple-alert";
import AddEditFoodItemDialog from "@/components/dialogs/add-edit-food-item-dialog";
import { AddEditFoodCategoryDialog } from "@/components/dialogs/add-edit-food-category-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/AuthContext";
import { useFood } from "@/hooks/useFood";
import { useFoodExtras } from "@/hooks/useFoodExtras";
import { useCurrency } from "@/hooks/useCurrency";
import { useSettings } from "@/hooks/useSettings";
import type {
	FoodItem,
	FoodCategory,
	FoodExtra,
	NewFoodExtra,
} from "@/types/food";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Search, ShoppingBasket, Salad, Dessert, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useKeyboard } from "@/context/KeyboardContext";
import { CategoryComponent } from "./CreateOrder";
import { ClassStyles } from "@/components/classnames";
import { useAlertStore } from "@/stores/useAlertStore";
import { toast } from "sonner";
import EmptyState from "@/components/alerts/empty-state";
import AddEditFoodItem from "@/components/asides/add-edit-food-item";
import { AddEditFoodCategory } from "@/components/asides/add-edit-food-category";
import { AddEditFoodExtra } from "@/components/asides/add-edit-food-extra";

export default function Food() {
	const { user } = useAuth();
	const {
		foodItems,
		foodCategories,
		loading,
		error,
		setError,
		fetchFoodItems,
		fetchFoodCategories,
		addFoodItem,
		updateFoodItem,
		deleteFoodItem,
		addFoodCategory,
		updateFoodCategory,
		deleteFoodCategory,
	} = useFood();

	const { format: formatCurrency } = useCurrency();
	const { showConfirm } = useAlertStore();
	const { settings } = useSettings();

	// Tab state
	const [activeTab, setActiveTab] = useState<"items" | "categories" | "extras">(
		"items",
	);
	const [searchParams] = useSearchParams();

	// Items state
	const [isAddingFoodItem, setIsAddingFoodItem] = useState(false);
	const [editingFoodItem, setEditingFoodItem] = useState<FoodItem | null>(null);
	const [search, setSearch] = useState("");
	const [categoryFilter, setCategoryFilter] = useState<string>("all");

	// Categories state
	const [isAddingCategory, setIsAddingCategory] = useState(false);
	const [editingCategory, setEditingCategory] = useState<FoodCategory | null>(
		null,
	);
	const [categorySearch, setCategorySearch] = useState("");

	// Extras state
	const {
		extras: foodExtras,
		loading: extrasLoading,
		setError: setExtrasError,
		fetchExtras,
		addExtra,
		updateExtra,
		deleteExtra,
	} = useFoodExtras();

	const [isAddingExtra, setIsAddingExtra] = useState(false);
	const [editingExtra, setEditingExtra] = useState<FoodExtra | null>(null);
	const [extrasSearch, setExtrasSearch] = useState("");

	// Stats
	const [foodStats, setFoodStats] = useState<{
		totalFoodSales: number;
		totalExtrasSales: number;
	}>({ totalFoodSales: 0, totalExtrasSales: 0 });
	const [statsLoading, setStatsLoading] = useState(false);

	const canManageFood =
		user?.role === "admin" ||
		user?.role === "manager" ||
		(user?.role === "cashier" &&
			settings?.pos?.allowCashierInventoryManagement);
	const canDeleteFood = user?.role === "admin" || user?.role === "manager";

	const handleDeleteItem = (item: FoodItem) => {
		showConfirm({
			title: "Delete Food Item?",
			description: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
			confirmText: "Delete",
			variant: "destructive",
			onConfirm: async () => {
				await deleteFoodItem(item.id);
				toast.success("Food item deleted successfully");
			},
		});
	};

	const handleDeleteCategory = (category: FoodCategory) => {
		showConfirm({
			title: "Delete Category?",
			description: `Are you sure you want to delete "${category.name}"? This will also affect items in this category.`,
			confirmText: "Delete",
			variant: "destructive",
			onConfirm: async () => {
				await deleteFoodCategory(category.id);
				toast.success("Category deleted successfully");
			},
		});
	};

	const handleDeleteExtra = (extra: FoodExtra) => {
		showConfirm({
			title: "Delete Extra?",
			description: `Are you sure you want to delete "${extra.name}"? This action cannot be undone.`,
			confirmText: "Delete",
			variant: "destructive",
			onConfirm: async () => {
				await deleteExtra(extra.id);
				toast.success("Extra deleted successfully");
			},
		});
	};

	useEffect(() => {
		const tab = searchParams.get("tab");
		if (tab === "categories") setActiveTab("categories");
		else if (tab === "extras") setActiveTab("extras");
		else setActiveTab("items");

		// Refresh everything when the tab or search params change
		fetchFoodItems();
		fetchFoodCategories();
		fetchExtras();
		fetchFoodStats();
	}, [searchParams]);

	const fetchFoodStats = async () => {
		try {
			setStatsLoading(true);
			const stats = await window.electron.invoke("get-food-stats");
			setFoodStats(stats);
		} catch (error) {
			console.error("Error fetching food stats:", error);
		} finally {
			setStatsLoading(false);
		}
	};

	// Filtered data
	const filteredFoodItems = foodItems.filter((item) => {
		const matchesSearch = item.name
			.toLowerCase()
			.includes(search.toLowerCase());
		const matchesCategory =
			categoryFilter === "all" || item.category_id.toString() == categoryFilter;
		return matchesSearch && matchesCategory;
	});

	const filteredCategories = foodCategories.filter(
		(cat) =>
			cat.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
			cat.description?.toLowerCase().includes(categorySearch.toLowerCase()),
	);

	const activeFoodItems = foodItems.filter((item) => item.status === "active");
	const filteredExtras = foodExtras.filter((e) =>
		e.name.toLowerCase().includes(extrasSearch.toLowerCase()),
	);
	const activeExtras = foodExtras.filter((e) => e.status === "active");

	const handleExtraSave = async (extra: NewFoodExtra) => {
		if (editingExtra) {
			await updateExtra(editingExtra.id, extra);
			setEditingExtra(null);
		} else {
			await addExtra(extra);
			setIsAddingExtra(false);
		}
	};

	const hasAside =
		isAddingFoodItem ||
		editingFoodItem ||
		isAddingCategory ||
		editingCategory ||
		isAddingExtra ||
		editingExtra;

	const resetForms = () => {
		setIsAddingFoodItem(false);
		setIsAddingCategory(false);
		setIsAddingExtra(false);

		setEditingFoodItem(null);
		setEditingCategory(null);
		setEditingExtra(null);
	};

	const handleTabSwitchAction = (type: "food-item" | "category" | "extra") => {
		resetForms();

		switch (type) {
			case "food-item":
				setIsAddingFoodItem(true);
				break;

			case "category":
				setIsAddingCategory(true);
				break;

			case "extra":
				setIsAddingExtra(true);
				break;
		}
	};

	const tabSwitchActions = {
		items: {
			label: "Add Food Item",
			action: () => handleTabSwitchAction("food-item"),
		},
		categories: {
			label: "Add Category",
			action: () => handleTabSwitchAction("category"),
		},
		extras: {
			label: "Add Extra",
			action: () => handleTabSwitchAction("extra"),
		},
	};

	return (
		<div className="h-full flex flex-col overflow-hidden">
			{/* Page Header */}
			<div className="bg-white">
				<div className="flex justify-between items-center border-b px-4 py-2">
					<h1 className="text-3xl font-bold text-gray-900">Food Inventory</h1>
					<div className="flex gap-2">
						{canManageFood && tabSwitchActions[activeTab] && (
							<Button
								onClick={tabSwitchActions[activeTab].action}
								className="text-base"
							>
								<Plus className="mr-2 h-4 w-4" />
								{tabSwitchActions[activeTab].label}
							</Button>
						)}
					</div>
				</div>
			</div>

			{/* Main Content */}
			<div className="flex flex-1 h-[calc(100%-62px)]">
				{/* Left */}
				<div className="flex-1 h-full border-r flex">
					<div
						className={cn(
							"w-[200px] border-r overflow-y-auto bg-white h-full",
							activeTab !== "items" ? "hidden" : "",
						)}
					>
						<div className="h-14 border-b flex items-center justify-between px-4 sticky top-0 z-10 bg-card">
							<h2 className="font-semibold text-md">Categories</h2>
							{categoryFilter !== "all" && (
								<Button
									variant="ghost"
									className="h-9 gap-1 px-2.5 rounded-lg text-xs bg-muted"
									onClick={() => setCategoryFilter("all")}
								>
									<X className="!size-3" /> Clear
								</Button>
							)}
						</div>
						<div className="flex-1 h-[calc(100dvh-290px)] overflow-y-auto p-4 space-y-4">
							{foodCategories.map((cat) => (
								<CategoryComponent
									key={cat.id}
									cat={cat}
									activeCategory={categoryFilter}
									setActiveCategory={setCategoryFilter}
								/>
							))}
							<div className="!h-[100px]" />
						</div>
					</div>
					<div className="flex-1 overflow-y-auto h-full">
						{/* Tabs */}
						<div className="bg-white flex gap-4 py-2 px-4 sticky top-0 z-10 border-b h-14">
							<Button
								variant={activeTab === "items" ? "default" : "outline"}
								onClick={() => {
									resetForms();
									setActiveTab("items");
									setSearch("");
								}}
								className={ClassStyles.tabButton}
							>
								<Salad /> Food Items
							</Button>
							{canManageFood && (
								<Button
									variant={activeTab === "categories" ? "default" : "outline"}
									onClick={() => {
										resetForms();
										setActiveTab("categories");
										setCategorySearch("");
									}}
									className={ClassStyles.tabButton}
								>
									<ShoppingBasket />
									Categories
								</Button>
							)}
							{canManageFood && (
								<Button
									variant={activeTab === "extras" ? "default" : "outline"}
									onClick={() => {
										resetForms();
										setActiveTab("extras");
										setExtrasSearch("");
									}}
									className={ClassStyles.tabButton}
								>
									<Dessert />
									Extras
								</Button>
							)}

							<div className="w-px h-10 bg-border" />

							<div
								className={cn(
									"flex-1 w-full max-w-lg flex items-center relative",
									hasAside ? "hidden" : "",
								)}
							>
								<Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
								<Input
									className="pl-8 rounded-md h-10 bg-muted/80"
									placeholder={`Search ${activeTab === "items" ? "food items" : activeTab}...`}
									value={
										activeTab === "items" ? search
										: activeTab === "categories" ?
											categorySearch
										:	extrasSearch
									}
									onChange={(e) =>
										(activeTab === "items" ? setSearch
										: activeTab === "categories" ? setCategorySearch
										: setExtrasSearch)(e.target.value)
									}
								/>
							</div>
						</div>
						<div className="h-full p-4 flex-1">
							<SimpleAlert
								open={!!error}
								onOpenChange={() => setError(null)}
								message={error || ""}
							/>

							{/* ── ITEMS TAB ── */}
							{activeTab === "items" && (
								<>
									{user?.role === "admin" && (
										<div
											className={cn(
												"mb-6 grid gap-4",
												hasAside ?
													"grid-cols-1 md:grid-cols-1 lg:grid-cols-3"
												:	"grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5",
											)}
										>
											<Card className="bg-white">
												<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
													<CardTitle className="text-sm font-medium">
														Total Food Items
													</CardTitle>
													<Salad className="h-4 w-4 text-muted-foreground" />
												</CardHeader>
												<CardContent>
													<div className="text-2xl font-bold">
														{activeFoodItems.length?.toLocaleString()}
													</div>
													<p className="text-xs text-muted-foreground">
														Active food items
													</p>
												</CardContent>
											</Card>
											<Card className="bg-white">
												<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
													<CardTitle className="text-sm font-medium">
														Total Food Sales
													</CardTitle>
													<Salad className="h-4 w-4 text-muted-foreground" />
												</CardHeader>
												<CardContent>
													<div className="text-2xl font-bold">
														{statsLoading ?
															"Loading..."
														:	formatCurrency(foodStats.totalFoodSales)}
													</div>
													<p className="text-xs text-muted-foreground">
														Total revenue from food items
													</p>
												</CardContent>
											</Card>
											<Card className="bg-white">
												<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
													<CardTitle className="text-sm font-medium">
														Total Extras Sales
													</CardTitle>
													<Salad className="h-4 w-4 text-muted-foreground" />
												</CardHeader>
												<CardContent>
													<div className="text-2xl font-bold">
														{statsLoading ?
															"Loading..."
														:	formatCurrency(foodStats.totalExtrasSales)}
													</div>
													<p className="text-xs text-muted-foreground">
														Total revenue from extras
													</p>
												</CardContent>
											</Card>
										</div>
									)}

									{loading ?
										<div className="text-center py-4 text-lg">Loading...</div>
									: filteredFoodItems.length === 0 ?
										<EmptyState
											icon={Salad}
											title="No food items found."
											description="Add food items to get started."
										/>
									:	<div
											className={cn(
												"grid gap-4",
												hasAside ?
													"grid-cols-1 md:grid-cols-1 lg:grid-cols-3"
												:	"grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5",
											)}
										>
											{/* Add some dummy items */}
											{/* eslint-disable */}
											{filteredFoodItems.map((item) => {
												const category = foodCategories.find(
													(c) => c.id === item.category_id,
												);
												const itemExtras = foodExtras.filter((e) =>
													item.extras?.some((ie) => ie.id === e.id),
												);
												return (
													<div
														key={item.id}
														className={cn(
															"bg-white border rounded-xl overflow-hidden hover:shadow-lg transition-all h-fit p-1",
															editingFoodItem?.id === item.id ?
																"border-2 border-primary"
															:	"",
														)}
													>
														<div
															className="w-full aspect-square bg-gray-100 rounded-md relative overflow-hidden cursor-pointer"
															onClick={() =>
																canManageFood ? setEditingFoodItem(item) : null
															}
														>
															{item.image ?
																<img
																	src={item.image}
																	alt={item.name}
																	className="w-full h-full object-cover"
																/>
															:	<div className="w-full h-full flex items-center justify-center text-gray-400 text-6xl">
																	<Salad className="!size-12" />
																</div>
															}
															<div className="absolute top-2 right-2">
																<span
																	className={`px-2 py-1 inline-flex text-xs font-semibold capitalize rounded-full ${item.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
																>
																	{item.status}
																</span>
															</div>
														</div>
														<div className="">
															<div
																className="p-3 cursor-pointer"
																onClick={() =>
																	canManageFood ?
																		setEditingFoodItem(item)
																	:	null
																}
															>
																<h3 className="font-bold text-lg text-gray-900 line-clamp-2">
																	{item.name} -{" "}
																	<span className="font-bold text-sm text-gray-900">
																		({formatCurrency(Number(item?.price) || 0)})
																	</span>
																</h3>
																<p className="text-sm text-gray-500 capitalize mt-1 flex items-center gap-2 bg-primary/10 p-1 px-2 rounded-full w-fit">
																	<ShoppingBasket className="size-4" />{" "}
																	{category?.name || "Uncategorized"}
																</p>
															</div>
															<div
																className="p-3 border-t border-gray-200 cursor-pointer"
																onClick={() =>
																	canManageFood ?
																		setEditingFoodItem(item)
																	:	null
																}
															>
																<p className="text-xs text-gray-500 mb-1">
																	Available Extras:
																</p>
																<div className="flex flex-wrap gap-1">
																	{itemExtras.length > 0 ?
																		itemExtras.map((extra) => (
																			<span
																				key={extra.id}
																				className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
																			>
																				{extra.name}
																			</span>
																		))
																	:	<span className="text-xs text-muted-foreground/80 italic">
																			No extras added
																		</span>
																	}
																</div>
															</div>

															{(canManageFood || canDeleteFood) && (
																<div className="flex gap-2 p-3 border-t border-gray-200 flex-wrap">
																	{canManageFood && (
																		<Button
																			variant="outline"
																			size="sm"
																			onClick={() => setEditingFoodItem(item)}
																			className="flex-1 text-base"
																		>
																			Edit
																		</Button>
																	)}
																	{canDeleteFood && (
																		<Button
																			variant="destructive"
																			size="sm"
																			onClick={() => handleDeleteItem(item)}
																			className="flex-1 text-base"
																		>
																			Delete
																		</Button>
																	)}
																</div>
															)}
														</div>
													</div>
												);
											})}
										</div>
									}
								</>
							)}

							{/* ── CATEGORIES TAB ── */}
							{activeTab === "categories" && (
								<>
									{loading ?
										<div className="text-center py-4 text-lg">Loading...</div>
									: filteredCategories.length === 0 ?
										<div className="text-center py-12 text-gray-400 text-lg">
											No categories found.
										</div>
									:	<div className="bg-white border rounded-lg">
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead className="text-base">Name</TableHead>
														<TableHead className="text-base">
															Description
														</TableHead>
														<TableHead className="text-base">Status</TableHead>
														{canManageFood && (
															<TableHead className="text-right text-base">
																Actions
															</TableHead>
														)}
													</TableRow>
												</TableHeader>
												<TableBody>
													{filteredCategories.map((category) => (
														<TableRow
															key={category.id}
															className={cn(
																"",
																editingCategory?.id === category.id ?
																	"!bg-primary/10"
																:	"",
															)}
														>
															<TableCell className="font-medium text-base">
																{category.name}
															</TableCell>
															<TableCell className="text-base">
																{category.description || "-"}
															</TableCell>
															<TableCell>
																<span
																	className={`px-3 py-1 rounded-full text-sm ${category.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
																>
																	{category.status}
																</span>
															</TableCell>
															{canManageFood && (
																<TableCell className="px-6 py-5 whitespace-nowrap text-right text-base font-medium">
																	<Button
																		variant="outline"
																		size="default"
																		onClick={() => setEditingCategory(category)}
																		className="mr-2 text-base"
																	>
																		Edit
																	</Button>
																	{canDeleteFood && (
																		<Button
																			variant="destructive"
																			size="default"
																			onClick={() =>
																				handleDeleteCategory(category)
																			}
																			className="text-base"
																		>
																			Delete
																		</Button>
																	)}
																</TableCell>
															)}
														</TableRow>
													))}
												</TableBody>
											</Table>
										</div>
									}
								</>
							)}

							{/* ── EXTRAS TAB ── */}
							{activeTab === "extras" && (
								<>
									{user?.role === "admin" && (
										<div
											className={cn(
												"mb-6 grid  gap-4",
												hasAside ?
													"grid-cols-1 md:grid-cols-1 lg:grid-cols-3"
												:	"grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5",
											)}
										>
											<Card className="bg-white">
												<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
													<CardTitle className="text-sm font-medium">
														Total Extras
													</CardTitle>
												</CardHeader>
												<CardContent>
													<div className="text-2xl font-bold">
														{activeExtras.length}
													</div>
													<p className="text-xs text-muted-foreground">
														Active extras available
													</p>
												</CardContent>
											</Card>
										</div>
									)}
									{extrasLoading ?
										<div className="text-center py-4 text-lg">Loading...</div>
									: filteredExtras.length === 0 ?
										<div className="text-center py-12 text-gray-400 text-lg">
											No extras found.
										</div>
									:	<div
											className={cn(
												"grid gap-4",
												hasAside ?
													"grid-cols-1 md:grid-cols-1 lg:grid-cols-3"
												:	"grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5",
											)}
										>
											{filteredExtras.map((extra) => (
												<div
													key={extra.id}
													className="bg-white border rounded-lg p-4 hover:shadow-lg transition-all"
												>
													<h3 className="font-bold text-lg text-gray-900">
														{extra.name}
													</h3>
													<p className="text-sm text-gray-500">
														Price: {formatCurrency(Number(extra.price) || 0)}
													</p>
													<span
														className={`mt-2 inline-block px-2 py-1 text-xs font-semibold rounded-full ${extra.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
													>
														{extra.status}
													</span>
													{canManageFood && (
														<div className="flex gap-2 pt-3 mt-3 border-t border-gray-200 flex-wrap">
															<Button
																variant="outline"
																size="sm"
																className="flex-1"
																onClick={() => setEditingExtra(extra)}
															>
																Edit
															</Button>
															{canDeleteFood && (
																<Button
																	variant="destructive"
																	size="sm"
																	className="flex-1"
																	onClick={() => handleDeleteExtra(extra)}
																>
																	Delete
																</Button>
															)}
														</div>
													)}
												</div>
											))}
										</div>
									}

									{/* Extra Dialogs */}
									{/* <Dialog
										open={isAddingExtra || !!editingExtra}
										onOpenChange={(open) => {
											if (!open) {
												setIsAddingExtra(false);
												setEditingExtra(null);
											}
										}}
									>
										<DialogContent>
											<DialogHeader>
												<DialogTitle>
													{editingExtra ? "Edit Extra" : "Add New Extra"}
												</DialogTitle>
											</DialogHeader>
											<ExtraForm
												extra={editingExtra}
												onSave={handleExtraSave}
												onCancel={() => {
													setIsAddingExtra(false);
													setEditingExtra(null);
												}}
											/>
										</DialogContent>
									</Dialog> */}
								</>
							)}
						</div>
					</div>
				</div>

				{/* Right */}
				<div
					className={cn(
						"bg-white flex flex-col !h-full overflow-y-auto overflow-x-hidden w-1/3",
						!hasAside && "hidden",
					)}
				>
					{isAddingFoodItem || editingFoodItem ?
						<AddEditFoodItem
							foodItem={editingFoodItem}
							foodCategories={foodCategories}
							foodExtras={foodExtras}
							onClose={() =>
								editingFoodItem ?
									setEditingFoodItem(null)
								:	setIsAddingFoodItem(false)
							}
							onSave={(item) =>
								editingFoodItem ?
									updateFoodItem(editingFoodItem.id, item)
								:	addFoodItem(item)
							}
						/>
					:	null}

					{isAddingCategory || editingCategory ?
						<AddEditFoodCategory
							category={editingCategory}
							onClose={() =>
								editingCategory ?
									setEditingCategory(null)
								:	setIsAddingCategory(false)
							}
							onSave={
								editingCategory ?
									async (category) => {
										await addFoodCategory(category);
										setIsAddingCategory(false);
									}
								:	async (category) => {
										await updateFoodCategory(editingCategory?.id, category);
										setEditingCategory(null);
									}
							}
						/>
					:	null}

					{isAddingExtra || !!editingExtra ?
						<AddEditFoodExtra
							extra={editingExtra}
							onSave={handleExtraSave}
							onCancel={() => {
								setIsAddingExtra(false);
								setEditingExtra(null);
							}}
						/>
					:	null}
				</div>
			</div>

			{/* Item Dialogs */}
			{/* <AddEditFoodItemDialog
				open={isAddingFoodItem}
				foodCategories={foodCategories}
				foodExtras={foodExtras}
				onClose={() => setIsAddingFoodItem(false)}
				onSave={addFoodItem}
			/>
			{editingFoodItem && (
				<AddEditFoodItemDialog
					foodItem={editingFoodItem}
					open={!!editingFoodItem}
					foodCategories={foodCategories}
					foodExtras={foodExtras}
					onClose={() => setEditingFoodItem(null)}
					onSave={(item) => updateFoodItem(editingFoodItem.id, item)}
				/>
			)} */}

			{/* Category Dialogs */}
			{/* <AddEditFoodCategoryDialog
				open={isAddingCategory}
				onClose={() => setIsAddingCategory(false)}
				onSave={async (category) => {
					await addFoodCategory(category);
					setIsAddingCategory(false);
				}}
			/>
			{editingCategory && (
				<AddEditFoodCategoryDialog
					category={editingCategory}
					open={!!editingCategory}
					onClose={() => setEditingCategory(null)}
					onSave={async (category) => {
						await updateFoodCategory(editingCategory.id, category);
						setEditingCategory(null);
					}}
				/>
			)} */}
		</div>
	);
}
