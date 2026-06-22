/** @format */

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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getCategoryId } from "@/lib/utils";
import type { Category } from "@/types/category";
import type { NewProduct, Product } from "@/types/product";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const STOCK_REASONS = [
	{ value: "adjustment", label: "Correction (Fixing Count)" },
	{ value: "restock", label: "Restock (Added New Inventory)" },
	{ value: "wastage", label: "Damage / Spoilage" },
];

interface AddEditProductProps {
	product?: Product;
	categories: Category[];
	onClose: () => void;
	onSave: (product: NewProduct, reason?: string) => Promise<Product>;
}

export default function AddEditProduct({
	product,
	onClose,
	categories,
	onSave,
}: AddEditProductProps) {
	const defaultProd: NewProduct = {
		name: "",
		description: "",
		category: categories ? categories[0]?.id : "",
		category_name: categories ? categories[0]?.name : "",
		price: 0,
		cost_price: 0,
		stock: 0,
		low_stock_threshold: 10,
		status: "active",
		image: "",
	};
	const [formData, setFormData] = useState<NewProduct>(defaultProd);
	const [imagePreview, setImagePreview] = useState<string | null>(
		product?.image || null,
	);
	const [reason, setReason] = useState<string>("adjustment");
	const [adjustmentValue, setAdjustmentValue] = useState<number>(0);
	const navigate = useNavigate();

	const stockChanged = product && Number(product.stock) !== formData.stock;

	useEffect(() => {
		if (product) {
			console.log("Initializing form with product:", product);
			setFormData(product);
		}
	}, [product]);

	const handleReasonChange = (newReason: string) => {
		setReason(newReason);
		setAdjustmentValue(0);
		if (!product) return;
		const oldStock = Number(product.stock);
		setFormData((prev) => ({
			...prev,
			stock: oldStock,
		}));
	};

	const handleAdjustmentValueChange = (val: number) => {
		setAdjustmentValue(val);
		if (!product) return;
		const oldStock = Number(product.stock);

		let newStock = oldStock;
		if (reason === "restock") {
			newStock = oldStock + val;
		} else if (reason === "wastage") {
			newStock = oldStock - val;
		} else {
			newStock = val;
		}

		setFormData((prev) => ({
			...prev,
			stock: Math.max(0, newStock),
		}));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await onSave(
				{
					...formData,
					category: getCategoryId(formData.category_name as any, categories),
				},
				stockChanged ? reason : undefined,
			);
			setFormData(defaultProd);
			setAdjustmentValue(0);
			setReason("adjustment");
			onClose();
		} catch (error) {
			console.error("Error saving product:", error);
		}
	};

	const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onloadend = () => {
				setImagePreview(reader.result as string);
				setFormData((prev) => ({
					...prev,
					image: reader.result as string,
				}));
			};
			reader.readAsDataURL(file);
		}
	};

	return (
		<div className="flex-1">
			<div className="p-4 py-1 h-14 border-b border-border flex items-center gap-4 sticky top-0 bg-white z-10">
				<h2 className="text-lg font-bold text-foreground">
					{product ? "Edit Product" : "Add New Product"}
				</h2>
			</div>
			<div className="p-4 px-6 pb-20">
				{categories && categories.length > 0 ?
					<form onSubmit={handleSubmit} className="space-y-4">
						<div>
							<Label htmlFor="name">Product Name</Label>
							<Input
								id="name"
								type="text"
								value={formData.name}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										name: e.target.value,
									}))
								}
								required
							/>
						</div>

						<div>
							<Label htmlFor="description">Description (Optional)</Label>
							<Textarea
								id="description"
								value={formData.description}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										description: e.target.value,
									}))
								}
							/>
						</div>

						<div>
							<Label htmlFor="category">Category</Label>
							{/* {console.log(
								"Categories in form:",
								Number(formData.category)?.toFixed(0),
								categories,
							)} */}
							{categories?.length ?
								<Select
									value={formData.category_name as string}
									onValueChange={(value) =>
										setFormData((prev) => ({
											...prev,
											category: value as string,
										}))
									}
								>
									<SelectTrigger className="capitalize">
										<SelectValue placeholder="Select category" />
									</SelectTrigger>
									<SelectContent>
										{categories.map((category: any, index: number) => (
											<SelectItem
												key={index}
												value={category?.name}
												className="capitalize"
											>
												{category?.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							:	null}
						</div>

						<div>
							<Label htmlFor="price">Selling Price</Label>
							<Input
								id="price"
								type="number"
								min="0"
								step="0.01"
								value={formData.price}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										price: parseFloat(e.target.value),
									}))
								}
								required
							/>
						</div>

						<div>
							<Label htmlFor="cost_price">Cost Price</Label>
							<Input
								id="cost_price"
								type="number"
								min="0"
								step="0.01"
								value={formData.cost_price}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										cost_price: parseFloat(e.target.value),
									}))
								}
								required
							/>
						</div>

						{product ?
							<>
								<div className="space-y-2 mt-4 p-4 border rounded-md bg-orange-50/50 border-orange-200">
									<Label
										htmlFor="reason"
										className="text-orange-800 font-semibold flex items-center gap-2"
									>
										Reason for Stock Change
									</Label>
									<Select value={reason} onValueChange={handleReasonChange}>
										<SelectTrigger id="reason" className="bg-white">
											<SelectValue placeholder="Select reason" />
										</SelectTrigger>
										<SelectContent>
											{STOCK_REASONS.map((item) => (
												<SelectItem key={item.value} value={item.value}>
													{item.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div>
									<Label htmlFor="old-stock">Old Stock Quantity</Label>
									<Input
										id="old-stock"
										type="number"
										value={product.stock}
										disabled
										className="bg-gray-100 cursor-not-allowed"
									/>
								</div>

								<div>
									<Label htmlFor="stock">
										{reason === "restock" && "Quantity to Add"}
										{reason === "wastage" &&
											"Quantity to Remove (Damage/Spoil)"}
										{reason === "adjustment" && "New Corrected Stock Quantity"}
									</Label>
									<Input
										id="stock"
										type="number"
										min="0"
										value={
											reason === "adjustment" ? formData.stock : adjustmentValue
										}
										onChange={(e) => {
											const val = parseInt(e.target.value, 10) || 0;
											if (reason === "adjustment") {
												setFormData((prev) => ({ ...prev, stock: val }));
											} else {
												handleAdjustmentValueChange(val);
											}
										}}
										required
									/>
								</div>

								{stockChanged && (
									<div className="text-xs font-semibold text-orange-700 bg-orange-50 p-2 border border-orange-200 rounded">
										Calculated New Stock: {formData.stock}
									</div>
								)}
							</>
						:	<div>
								<Label htmlFor="stock">Stock Quantity</Label>
								<Input
									id="stock"
									type="number"
									min="0"
									value={formData.stock}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											stock: parseInt(e.target.value, 10) || 0,
										}))
									}
									required
								/>
							</div>
						}

						<div>
							<Label htmlFor="low_stock_threshold">Low Stock Threshold</Label>
							<Input
								id="low_stock_threshold"
								type="number"
								min="0"
								value={formData.low_stock_threshold}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										low_stock_threshold: parseInt(e.target.value, 10),
									}))
								}
								required
							/>
						</div>

						<div className="flex items-center space-x-2">
							<Switch
								id="status"
								checked={formData.status === "active"}
								onCheckedChange={(checked: boolean) =>
									setFormData((prev) => ({
										...prev,
										status: checked ? "active" : "inactive",
									}))
								}
							/>
							<Label htmlFor="status">Active</Label>
						</div>

						<div>
							<Label htmlFor="image">Product Image</Label>
							<Input
								id="image"
								type="file"
								accept="image/*"
								onChange={handleImageChange}
							/>
							{imagePreview && (
								<img
									src={imagePreview}
									alt="Product Preview"
									className="mt-2 w-24 h-24 object-cover rounded"
								/>
							)}
						</div>

						<div className="pt-4 flex flex-wrap gap-4 items-center">
							<Button type="button" variant="destructive" onClick={onClose}>
								Cancel
							</Button>
							<Button
								disabled={
									!categories ||
									categories.length == 0 ||
									formData.name == "" ||
									formData.price == 0 ||
									formData.low_stock_threshold == 0 ||
									!formData.category_name
								}
								type="submit"
								className="flex-1"
							>
								{product ? "Save Changes" : "Add Product"}
							</Button>
						</div>
					</form>
				:	<div className="text-gray-500">
						<div>You must create a category before adding products.</div>
						<Button className="mt-4" onClick={() => navigate("/categories")}>
							Go to Categories
						</Button>
					</div>
				}
			</div>
		</div>
	);
}
