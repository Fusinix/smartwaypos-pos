/** @format */

import { SimpleAlert } from "@/components/alerts/simple-alert";
import AddEditFoodItemDialog from "@/components/dialogs/add-edit-food-item-dialog";
import { AddEditFoodCategoryDialog } from "@/components/dialogs/add-edit-food-category-dialog";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useFood } from "@/hooks/useFood";
import { useFoodExtras } from "@/hooks/useFoodExtras";
import { useCurrency } from "@/hooks/useCurrency";
import type { FoodItem, FoodCategory } from "@/types/food";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Utensils, Plus } from "lucide-react";

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
	const { extras: foodExtras } = useFoodExtras();
	const { format: formatCurrency } = useCurrency();

	const [activeTab, setActiveTab] = useState<"items" | "categories">("items");
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [editingFoodItem, setEditingFoodItem] = useState<FoodItem | null>(null);
	const [foodItemToDelete, setFoodItemToDelete] = useState<FoodItem | null>(
		null
	);
	const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
	const [editingCategory, setEditingCategory] = useState<FoodCategory | null>(
		null
	);
	const [categoryToDelete, setCategoryToDelete] = useState<FoodCategory | null>(
		null
	);
	const [search, setSearch] = useState("");
	const [categoryFilter, setCategoryFilter] = useState<string>("all");
	const [categorySearch, setCategorySearch] = useState("");
	const [searchParams, setSearchParams] = useSearchParams();
	const [foodStats, setFoodStats] = useState<{
		totalFoodSales: number;
		totalExtrasSales: number;
	}>({ totalFoodSales: 0, totalExtrasSales: 0 });
	const [statsLoading, setStatsLoading] = useState(false);

	const canManageFood = user?.role === "admin";

	// Handle tab switching from URL params
	useEffect(() => {
		const tab = searchParams.get("tab");
		if (tab === "categories") {
			setActiveTab("categories");
		}
	}, [searchParams]);

	useEffect(() => {
		fetchFoodItems();
		fetchFoodCategories();
		fetchFoodStats();
	}, [fetchFoodItems, fetchFoodCategories]);

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

	const filteredFoodItems = foodItems.filter((item) => {
		const matchesSearch = item.name
			.toLowerCase()
			.includes(search.toLowerCase());
		const matchesCategory =
			categoryFilter === "all" ||
			item.category_id.toString() === categoryFilter;
		return matchesSearch && matchesCategory;
	});

	const filteredCategories = foodCategories.filter((cat) => {
		return (
			cat.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
			cat.description?.toLowerCase().includes(categorySearch.toLowerCase())
		);
	});

	const activeFoodItems = foodItems.filter((item) => item.status === "active");

	return (
		<div className="h-full flex flex-col">
			{/* Page Header */}
			<div className="bg-white border-b px-8 py-6">
				<div className="flex justify-between items-center">
					<h1 className="text-3xl font-bold text-gray-900">Food Management</h1>
					<div className="flex gap-2">
						{canManageFood && activeTab === "items" && (
							<Button
								onClick={() => setIsAddDialogOpen(true)}
								className="text-base"
							>
								<Plus className="mr-2 h-4 w-4" />
								Add Food Item
							</Button>
						)}
						{canManageFood && activeTab === "categories" && (
							<Button
								onClick={() => setIsAddCategoryDialogOpen(true)}
								className="text-base"
							>
								<Plus className="mr-2 h-4 w-4" />
								Add Category
							</Button>
						)}
					</div>
				</div>
				{/* Tabs */}
				<div className="mt-4 flex gap-2">
					<Button
						variant={activeTab === "items" ? "default" : "ghost"}
						onClick={() => setActiveTab("items")}
					>
						Food Items
					</Button>
					{canManageFood && (
						<Button
							variant={activeTab === "categories" ? "default" : "ghost"}
							onClick={() => setActiveTab("categories")}
						>
							Categories
						</Button>
					)}
				</div>
			</div>

			{/* Main Content */}
			<div className="flex-1 px-8 py-6 overflow-y-auto">
				<SimpleAlert
					open={error ? true : false}
					onOpenChange={() => setError(null)}
					message={error || ""}
				/>

				{activeTab === "items" ?
					<>
						{/* Summary Section - Admin Only */}
						{user?.role === "admin" && (
							<div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
								<Card className="bg-muted/50">
									<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
										<CardTitle className="text-sm font-medium">
											Total Food Items
										</CardTitle>
										<Utensils className="h-4 w-4 text-muted-foreground" />
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
								<Card className="bg-muted/50">
									<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
										<CardTitle className="text-sm font-medium">
											Total Food Sales
										</CardTitle>
										<Utensils className="h-4 w-4 text-muted-foreground" />
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
								<Card className="bg-muted/50">
									<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
										<CardTitle className="text-sm font-medium">
											Total Extras Sales
										</CardTitle>
										<Utensils className="h-4 w-4 text-muted-foreground" />
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

						<div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
							<Input
								placeholder="Search food items..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
							/>
							{foodCategories?.length ?
								<Select
									value={categoryFilter}
									onValueChange={(value) => setCategoryFilter(value)}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select category" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Categories</SelectItem>
										{foodCategories.map((category: any) => (
											<SelectItem
												key={category.id}
												value={category.id.toString()}
											>
												{category.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							:	null}
						</div>

						{loading ?
							<div className="text-center py-4 text-lg">Loading...</div>
						: filteredFoodItems.length === 0 ?
							<div className="text-center py-12 text-gray-400 text-lg">
								No food items found.
							</div>
						:	<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
								{filteredFoodItems.map((item) => {
									const category = foodCategories.find(
										(c) => c.id === item.category_id
									);
									const itemExtras = foodExtras.filter((e) =>
										item.extras?.some((ie) => ie.id === e.id)
									);

									return (
										<div
											key={item.id}
											className="bg-white border rounded-lg overflow-hidden hover:shadow-lg transition-all h-fit"
										>
											{/* Food Item Image */}
											<div className="w-full aspect-square bg-gray-100 relative overflow-hidden">
												{item.image ?
													<img
														src={item.image}
														alt={item.name}
														className="w-full h-full object-cover"
													/>
												:	<div className="w-full h-full flex items-center justify-center text-gray-400 text-6xl">
														🍽️
													</div>
												}
												{/* Status Badge */}
												<div className="absolute top-2 right-2">
													<span
														className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full ${
															item.status === "active" ?
																"bg-green-100 text-green-800"
															:	"bg-red-100 text-red-800"
														}`}
													>
														{item.status}
													</span>
												</div>
											</div>

											{/* Food Item Info */}
											<div className="p-4 space-y-3">
												{/* Food Item Name */}
												<div>
													<h3 className="font-bold text-lg text-gray-900 line-clamp-2">
														{item.name} -
														<span className="font-bold text-sm text-gray-900">
															({formatCurrency(Number(item?.price) || 0)})
														</span>
													</h3>
													<p className="text-sm text-gray-500 capitalize mt-1">
														{category?.name || "Uncategorized"}
													</p>
												</div>

												{/* Extras List */}
												{itemExtras.length > 0 && (
													<div className="pt-2 border-t border-gray-200">
														<p className="text-xs text-gray-500 mb-1">
															Available Extras:
														</p>
														<div className="flex flex-wrap gap-1">
															{itemExtras.map((extra) => (
																<span
																	key={extra.id}
																	className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
																>
																	{extra.name}
																</span>
															))}
														</div>
													</div>
												)}

												{/* Actions */}
												{canManageFood && (
													<div className="flex gap-2 pt-3 border-t border-gray-200">
														<Button
															variant="outline"
															size="sm"
															onClick={() => setEditingFoodItem(item)}
															className="flex-1 text-base"
														>
															Edit
														</Button>
														<Button
															variant="destructive"
															size="sm"
															onClick={() => setFoodItemToDelete(item)}
															className="flex-1 text-base"
														>
															Delete
														</Button>
													</div>
												)}
											</div>
										</div>
									);
								})}
							</div>
						}
					</>
				:	<>
						<div className="mb-6">
							<Input
								placeholder="Search categories..."
								value={categorySearch}
								onChange={(e) => setCategorySearch(e.target.value)}
							/>
						</div>

						{loading ?
							<div className="text-center py-4 text-lg">Loading...</div>
						: filteredCategories.length === 0 ?
							<div className="text-center py-12 text-gray-400 text-lg">
								No categories found.
							</div>
						:	<div className="bg-white border rounded-lg overflow-hidden">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="text-base">Name</TableHead>
											<TableHead className="text-base">Description</TableHead>
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
											<TableRow key={category.id}>
												<TableCell className="font-medium text-base">
													{category.name}
												</TableCell>
												<TableCell className="text-base">
													{category.description || "-"}
												</TableCell>
												<TableCell>
													<span
														className={`px-3 py-1 rounded-full text-sm ${
															category.status === "active" ?
																"bg-green-100 text-green-800"
															:	"bg-red-100 text-red-800"
														}`}
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
														<Button
															variant="destructive"
															size="default"
															onClick={() => setCategoryToDelete(category)}
															className="text-base"
														>
															Delete
														</Button>
													</TableCell>
												)}
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						}
					</>
				}

				<AddEditFoodItemDialog
					open={isAddDialogOpen}
					foodCategories={foodCategories}
					foodExtras={foodExtras}
					onClose={() => setIsAddDialogOpen(false)}
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
				)}

				<AlertDialog
					open={!!foodItemToDelete}
					onOpenChange={(open) => !open && setFoodItemToDelete(null)}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Are you sure?</AlertDialogTitle>
							<AlertDialogDescription>
								This action cannot be undone. This will permanently delete the
								food item "{foodItemToDelete?.name}".
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								onClick={() => {
									if (foodItemToDelete) {
										deleteFoodItem(foodItemToDelete.id);
										setFoodItemToDelete(null);
									}
								}}
							>
								Delete
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

				{/* Food Category Dialogs */}
				<AddEditFoodCategoryDialog
					open={isAddCategoryDialogOpen}
					onClose={() => setIsAddCategoryDialogOpen(false)}
					onSave={async (category) => {
						await addFoodCategory(category);
						setIsAddCategoryDialogOpen(false);
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
				)}

				<AlertDialog
					open={!!categoryToDelete}
					onOpenChange={(open) => !open && setCategoryToDelete(null)}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Are you sure?</AlertDialogTitle>
							<AlertDialogDescription>
								This action cannot be undone. This will permanently delete the
								category "{categoryToDelete?.name}".
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								onClick={() => {
									if (categoryToDelete) {
										deleteFoodCategory(categoryToDelete.id);
										setCategoryToDelete(null);
									}
								}}
							>
								Delete
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		</div>
	);
}
