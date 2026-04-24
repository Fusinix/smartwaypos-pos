/** @format */

import { SimpleAlert } from "@/components/alerts/simple-alert";
import AddEditProductDialog from "@/components/dialogs/add-edit-product-dialog";
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
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { useAuth } from "@/context/AuthContext";
import { useCategory } from "@/hooks/useCategory";
import { useProducts } from "@/hooks/useProducts";
import { useStock } from "@/hooks/useStock";
import { useCurrency } from "@/hooks/useCurrency";
import { getCategoryName } from "@/lib/utils";
import type { Product } from "@/types/product";
import { useEffect, useMemo, useState } from "react";
import { Package, DollarSign, TrendingUp, AlertTriangle } from "lucide-react";

export default function Products() {
	const { user } = useAuth();
	const {
		products,
		loading,
		error,
		setError,
		filters,
		setFilters,
		fetchProducts,
		addProduct,
		updateProduct,
		deleteProduct,
	} = useProducts();
	const { categories, fetchCategories } = useCategory();
	const { getStockStatus } = useStock();
	const { format: formatCurrency, currency } = useCurrency();

	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [editingProduct, setEditingProduct] = useState<Product | null>(null);
	const [productToDelete, setProductToDelete] = useState<Product | null>(null);

	const canManageProducts = user?.role === "admin" || user?.role === "manager";

	useEffect(() => {
		fetchProducts();
	}, []);

	useEffect(() => {
		fetchCategories();
	}, []);

	const handleSort = (field: "name" | "price" | "stock") => {
		setFilters({
			sortBy: filters.sortBy === field ? null : field,
			sortOrder:
				filters.sortBy === field && filters.sortOrder === "asc" ?
					"desc"
				:	"asc",
		});
	};

	const filteredProducts = products
		.filter((product) => {
			const name = product.name?.toLowerCase() || "";
			const search = filters.search.toLowerCase();

			const matchesSearch = name.includes(search);

			const matchesCategory =
				filters.category === "all" || product.category == filters.category;

			const matchesStatus =
				filters.status === "all" || product.status === filters.status;

			// Stock level filtering
			const stockStatus = getStockStatus(product);
			const matchesStockLevel =
				filters.stockLevel === "all" ||
				(filters.stockLevel === "out-of-stock" &&
					stockStatus.status === "out-of-stock") ||
				(filters.stockLevel === "low-stock" &&
					stockStatus.status === "low-stock") ||
				(filters.stockLevel === "in-stock" &&
					stockStatus.status === "in-stock");

			return (
				matchesSearch && matchesCategory && matchesStatus && matchesStockLevel
			);
		})
		.sort((a, b) => {
			if (!filters.sortBy) return 0;
			const order = filters.sortOrder === "asc" ? 1 : -1;

			if (filters.sortBy === "name") {
				return order * a.name.localeCompare(b.name);
			}

			// For numeric sorting fields like price or stock
			return order * ((a[filters.sortBy] || 0) - (b[filters.sortBy] || 0));
		});

	// Calculate stock summary metrics
	const stockSummary = useMemo(() => {
		const activeProducts = products.filter((p) => p.status === "active");
		const totalProducts = activeProducts.length;

		let totalCostValue = 0;
		let totalSellingValue = 0;
		let totalProfitPotential = 0;
		let productsWithCostPrice = 0;
		let lowStockCount = 0;
		let outOfStockCount = 0;

		activeProducts.forEach((product) => {
			const costPrice = product.cost_price || 0;
			const sellingPrice = product.price || 0;
			const stock = product.stock || 0;

			// Calculate values
			const costValue = costPrice * stock;
			const sellingValue = sellingPrice * stock;
			const profit = sellingValue - costValue;

			totalCostValue += costValue;
			totalSellingValue += sellingValue;
			totalProfitPotential += profit;

			if (costPrice > 0) {
				productsWithCostPrice++;
			}

			// Count stock alerts
			if (stock === 0) {
				outOfStockCount++;
			} else if (stock <= (product.low_stock_threshold || 10)) {
				lowStockCount++;
			}
		});

		const averageProfitMargin =
			productsWithCostPrice > 0 ?
				(totalProfitPotential / totalSellingValue) * 100
			:	0;

		return {
			totalProducts,
			totalCostValue,
			totalSellingValue,
			totalProfitPotential,
			averageProfitMargin,
			lowStockCount,
			outOfStockCount,
			productsWithCostPrice,
		};
	}, [products]);

	return (
		<div className="h-full flex flex-col">
			{/* Page Header */}
			<div className="bg-white border-b px-8 py-6">
				<div className="flex justify-between items-center">
					<h1 className="text-3xl font-bold text-gray-900">Products</h1>
					{canManageProducts && (
						<Button
							onClick={() => setIsAddDialogOpen(true)}
							className="text-base"
						>
							Add Product
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

				{/* Stock Summary Section - Admin Only */}
				{user?.role === "admin" && (
					<>
						<div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
							<Card className="bg-muted/50">
								<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
									<CardTitle className="text-sm font-medium">
										Total Products
									</CardTitle>
									<Package className="h-4 w-4 text-muted-foreground" />
								</CardHeader>
								<CardContent>
									<div className="text-2xl font-bold">
										{stockSummary.totalProducts?.toLocaleString()}
									</div>
									<p className="text-xs text-muted-foreground">
										Active products in inventory
									</p>
								</CardContent>
							</Card>

							<Card className="bg-muted/50">
								<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
									<CardTitle className="text-sm font-medium">
										Total Cost Value
									</CardTitle>
									<DollarSign className="h-4 w-4 text-muted-foreground" />
								</CardHeader>
								<CardContent>
									<div className="text-2xl font-bold">
										{formatCurrency(stockSummary.totalCostValue)}
									</div>
									<p className="text-xs text-muted-foreground">
										Investment in inventory
									</p>
								</CardContent>
							</Card>

							<Card className="bg-muted/50">
								<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
									<CardTitle className="text-sm font-medium">
										Potential Revenue
									</CardTitle>
									<TrendingUp className="h-4 w-4 text-muted-foreground" />
								</CardHeader>
								<CardContent>
									<div className="text-2xl font-bold">
										{formatCurrency(stockSummary.totalSellingValue)}
									</div>
									<p className="text-xs text-muted-foreground">
										If all stock sold
									</p>
								</CardContent>
							</Card>

							<Card className="bg-muted/50">
								<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
									<CardTitle className="text-sm font-medium">
										Profit Potential
									</CardTitle>
									<TrendingUp className="h-4 w-4 text-green-600" />
								</CardHeader>
								<CardContent>
									<div className="text-2xl font-bold text-green-600">
										{formatCurrency(stockSummary.totalProfitPotential)}
									</div>
									<p className="text-xs text-muted-foreground">
										{stockSummary.averageProfitMargin > 0 ?
											`Avg margin: ${stockSummary.averageProfitMargin.toFixed(1)}%`
										:	"Set cost prices to see margins"}
									</p>
								</CardContent>
							</Card>
						</div>

						{/* Stock Alerts Summary */}
						{(stockSummary.lowStockCount > 0 ||
							stockSummary.outOfStockCount > 0) && (
							<div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
								{stockSummary.outOfStockCount > 0 && (
									<Card className="border-red-200 bg-red-50">
										<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
											<CardTitle className="text-sm font-medium text-red-800">
												Out of Stock
											</CardTitle>
											<AlertTriangle className="h-4 w-4 text-red-600" />
										</CardHeader>
										<CardContent>
											<div className="text-2xl font-bold text-red-600">
												{stockSummary.outOfStockCount}
											</div>
											<p className="text-xs text-red-700">
												Products need restocking
											</p>
										</CardContent>
									</Card>
								)}

								{stockSummary.lowStockCount > 0 && (
									<Card className="border-yellow-200 bg-yellow-50">
										<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
											<CardTitle className="text-sm font-medium text-yellow-800">
												Low Stock
											</CardTitle>
											<AlertTriangle className="h-4 w-4 text-yellow-600" />
										</CardHeader>
										<CardContent>
											<div className="text-2xl font-bold text-yellow-600">
												{stockSummary.lowStockCount}
											</div>
											<p className="text-xs text-yellow-700">
												Products below threshold
											</p>
										</CardContent>
									</Card>
								)}
							</div>
						)}
					</>
				)}

				<div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
					<Input
						placeholder="Search products..."
						value={filters.search}
						onChange={(e) => setFilters({ search: e.target.value })}
					/>
					{categories?.length ?
						<Select
							value={filters.category || "all"}
							onValueChange={(value) =>
								setFilters({ category: value === "All" ? null : value })
							}
						>
							<SelectTrigger className="capitalize">
								<SelectValue placeholder="Select category" />
							</SelectTrigger>
							<SelectContent>
								{[{ id: "all", name: "all" }, ...categories].map(
									(category: any, index) => (
										<SelectItem
											key={index}
											value={category?.id}
											className="capitalize"
										>
											{category?.name}
										</SelectItem>
									)
								)}
							</SelectContent>
						</Select>
					:	null}
					{/* <Select
						value={filters.status}
						onValueChange={(value: "all" | "active" | "inactive") =>
							setFilters({ status: value })
						}
					>
						<SelectTrigger>
							<SelectValue placeholder="Filter by status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All</SelectItem>
							<SelectItem value="active">Active</SelectItem>
							<SelectItem value="inactive">Inactive</SelectItem>
						</SelectContent>
					</Select> */}
					<Select
						value={filters.stockLevel || "all"}
						onValueChange={(
							value: "all" | "out-of-stock" | "low-stock" | "in-stock"
						) => setFilters({ stockLevel: value })}
					>
						<SelectTrigger>
							<SelectValue placeholder="Filter by stock level" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Stock Levels</SelectItem>
							<SelectItem value="out-of-stock">Out of Stock</SelectItem>
							<SelectItem value="low-stock">Low Stock</SelectItem>
							<SelectItem value="in-stock">In Stock</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{loading ?
					<div className="text-center py-4 text-lg">Loading...</div>
				: filteredProducts.length === 0 ?
					<div className="text-center py-12 text-gray-400 text-lg">
						No products found.
					</div>
				:	<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
						{filteredProducts.map((product) => {
							const stockStatus = getStockStatus(product);
							const profit =
								(
									product.cost_price &&
									product.cost_price > 0 &&
									product.price > 0
								) ?
									product.price - product.cost_price
								:	0;
							const margin =
								profit > 0 && product.price > 0 ?
									(profit / product.price) * 100
								:	0;
							const profitValue = profit * product.stock;

							return (
								<div
									key={product.id}
									className="bg-white border rounded-lg overflow-hidden hover:shadow-lg transition-all h-fit"
								>
									{/* Product Image */}
									<div className="w-full aspect-square bg-gray-100 relative overflow-hidden">
										{product.image ?
											<img
												src={product.image}
												alt={product.name}
												className="w-full h-full object-cover"
											/>
										:	<div className="w-full h-full flex items-center justify-center text-gray-400 text-6xl">
												📦
											</div>
										}
										{/* Status Badge - Top Right */}
										<div className="absolute top-2 right-2 hidden">
											<span
												className={cn(
													"px-2 py-1 inline-flex text-xs font-semibold rounded-full",
													product.status === "active" ?
														"bg-green-100 text-green-800"
													:	"bg-red-100 text-red-800"
												)}
											>
												{product.status}
											</span>
										</div>
										{/* Stock Status Badge - Top Left */}
										<div className="absolute top-2 left-2">
											<span
												className={cn(
													"px-2 py-1 inline-flex text-xs font-semibold rounded-full",
													stockStatus.status === "out-of-stock" ?
														"bg-red-100 text-red-800"
													: stockStatus.status === "low-stock" ?
														"bg-yellow-100 text-yellow-800"
													:	"bg-green-100 text-green-800"
												)}
											>
												{stockStatus.label}
											</span>
										</div>
									</div>

									{/* Product Info */}
									<div className="p-4 space-y-3">
										{/* Product Name */}
										<div>
											<h3 className="font-bold text-lg text-gray-900 line-clamp-2">
												{product.name} -
												<span className="font-bold text-sm text-gray-900">
													({formatCurrency(Number(product?.price) || 0)})
												</span>
											</h3>
											<p className="text-sm text-gray-500 capitalize mt-1">
												{product.category ?
													getCategoryName(product.category as any, categories)
												:	"Uncategorized"}
											</p>
										</div>

										{/* Pricing, Stock & Profit Details - Accordion */}
										{canManageProducts && (
											<Accordion type="single" collapsible className="w-full">
												<AccordionItem value="details" className="border-0">
													<AccordionTrigger className="py-2 text-sm font-medium text-gray-700 hover:no-underline">
														View Details
													</AccordionTrigger>
													<AccordionContent className="space-y-3 pt-2">
														{/* Pricing Section */}
														<div className="space-y-2 pt-2 border-t border-gray-200">
															<div className="flex items-center justify-between">
																<span className="text-sm text-gray-500">
																	Selling Price
																</span>
																<span className="font-bold text-lg text-gray-900">
																	{formatCurrency(Number(product?.price) || 0)}
																</span>
															</div>

															{product.cost_price && product.cost_price > 0 ?
																<>
																	<div className="flex items-center justify-between">
																		<span className="text-sm text-gray-500">
																			Cost Price
																		</span>
																		<span className="text-base text-gray-700">
																			{formatCurrency(
																				Number(product.cost_price)
																			)}
																		</span>
																	</div>
																	{margin > 0 && (
																		<div className="flex items-center justify-between pt-1 border-t border-gray-100">
																			<span className="text-sm text-gray-500">
																				Profit Margin
																			</span>
																			<span
																				className={cn(
																					"font-semibold text-base",
																					margin >= 50 ? "text-green-600"
																					: margin >= 30 ? "text-blue-600"
																					: margin >= 10 ? "text-yellow-600"
																					: "text-red-600"
																				)}
																			>
																				{margin.toFixed(1)}%
																			</span>
																		</div>
																	)}
																</>
															:	<div className="text-xs text-gray-400 italic">
																	Cost price not set
																</div>
															}
														</div>

														{/* Stock Section */}
														<div className="flex items-center justify-between pt-2 border-t border-gray-200">
															<span className="text-sm text-gray-500">
																Stock
															</span>
															<span className="font-semibold text-base text-gray-900">
																{product.stock} units
															</span>
														</div>

														{/* Profit Value (if cost price set) */}
														{profitValue > 0 && (
															<div className="pt-2 border-t border-gray-200">
																<div className="flex items-center justify-between">
																	<span className="text-xs text-gray-500">
																		Total Profit Value
																	</span>
																	<span className="font-semibold text-sm text-green-600">
																		{formatCurrency(profitValue)}
																	</span>
																</div>
															</div>
														)}
													</AccordionContent>
												</AccordionItem>
											</Accordion>
										)}

										{/* Actions */}
										{canManageProducts && (
											<div className="flex gap-2 pt-3 border-t border-gray-200">
												<Button
													variant="outline"
													size="sm"
													onClick={() => setEditingProduct(product)}
													className="flex-1 text-base"
												>
													Edit
												</Button>
												<Button
													variant="destructive"
													size="sm"
													onClick={() => setProductToDelete(product)}
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

				<AddEditProductDialog
					open={isAddDialogOpen}
					categories={categories}
					onClose={() => setIsAddDialogOpen(false)}
					onSave={addProduct}
				/>

				{editingProduct && (
					<AddEditProductDialog
						product={editingProduct}
						open={!!editingProduct}
						categories={categories}
						onClose={() => setEditingProduct(null)}
						onSave={(product) => updateProduct(editingProduct.id, product)}
					/>
				)}

				<AlertDialog
					open={!!productToDelete}
					onOpenChange={(open) => !open && setProductToDelete(null)}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Are you sure?</AlertDialogTitle>
							<AlertDialogDescription>
								This action cannot be undone. This will permanently delete the
								product "{productToDelete?.name}".
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								onClick={() => {
									if (productToDelete) {
										deleteProduct(productToDelete.id);
										setProductToDelete(null);
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
