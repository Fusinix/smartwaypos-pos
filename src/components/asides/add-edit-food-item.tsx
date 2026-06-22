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
import { useCurrency } from "@/hooks/useCurrency";
import type { Category } from "@/types/category";
import type {
	FoodCategory,
	FoodExtra,
	FoodItem,
	NewFoodItem,
} from "@/types/food";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface AddEditFoodItemProps {
	foodItem?: FoodItem | null;
	foodCategories: FoodCategory[];
	foodExtras: FoodExtra[];
	onClose: () => void;
	onSave: (item: NewFoodItem) => Promise<FoodItem>;
}

export default function AddEditFoodItem({
	foodItem,
	foodCategories,
	foodExtras,
	onClose,
	onSave,
}: AddEditFoodItemProps) {
	const { format: formatCurrency } = useCurrency();
	const defaultItem: NewFoodItem = {
		name: "",
		description: "",
		category_id: foodCategories?.[0]?.id || 0,
		price: 0,
		status: "active",
		image: "",
		extra_ids: [],
	};

	const [formData, setFormData] = useState<NewFoodItem>(
		foodItem ?
			{
				name: foodItem.name,
				description: foodItem.description || "",
				category_id: foodItem.category_id,
				price: Number(foodItem.price),
				status: foodItem.status,
				image: foodItem.image || "",
				extra_ids: foodItem.extras?.map((e) => e.id) || [],
			}
		:	defaultItem,
	);
	const [imagePreview, setImagePreview] = useState<string | null>(
		foodItem?.image || null,
	);

	useEffect(() => {
		if (foodItem) {
			setFormData({
				name: foodItem.name,
				description: foodItem.description || "",
				category_id: foodItem.category_id,
				price: Number(foodItem.price),
				status: foodItem.status,
				image: foodItem.image || "",
				extra_ids: foodItem.extras?.map((e) => e.id) || [],
			});
			setImagePreview(foodItem.image || null);
		} else {
			setFormData(defaultItem);
			setImagePreview(null);
		}
	}, [foodItem]);

	const navigate = useNavigate();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			console.log("Submitting food item with extras:", {
				name: formData.name,
				extra_ids: formData.extra_ids,
				extra_ids_count: formData.extra_ids?.length || 0,
				extra_ids_type: typeof formData.extra_ids,
				isArray: Array.isArray(formData.extra_ids),
			});
			await onSave(formData);
			setFormData(defaultItem);
			setImagePreview(null);
			toast.success("Food item saved successfully");
			onClose();
		} catch (error) {
			console.error("Error saving food item:", error);
			toast.error("Error saving food item");
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

	const handleExtraToggle = (extraId: number) => {
		setFormData((prev) => {
			const currentIds = prev.extra_ids || [];
			const newIds =
				currentIds.includes(extraId) ?
					currentIds.filter((id) => id !== extraId)
				:	[...currentIds, extraId];
			console.log("Toggling extra:", extraId, "New extra_ids:", newIds);
			return { ...prev, extra_ids: newIds };
		});
	};

	return (
		<div className="flex-1">
			<div className="p-4 py-1 h-14 border-b border-border flex items-center gap-4 sticky top-0 bg-white z-10">
				<h2 className="text-lg font-bold text-foreground">
					{foodItem ? "Edit Product" : "Add New Product"}
				</h2>
			</div>
			<div className="p-4 px-6 pb-20">
				{foodCategories && foodCategories.length > 0 ?
					<form onSubmit={handleSubmit} className="space-y-4">
						<div>
							<Label htmlFor="name">Food Item Name</Label>
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
							{foodCategories?.length ?
								<Select
									value={formData.category_id.toString()}
									onValueChange={(value) =>
										setFormData((prev) => ({
											...prev,
											category_id: parseInt(value, 10),
										}))
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select category" />
									</SelectTrigger>
									<SelectContent>
										{foodCategories.map((category: Category) => (
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

						<div>
							<Label htmlFor="price">Price</Label>
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
							<Label htmlFor="image">Food Item Image</Label>
							<Input
								id="image"
								type="file"
								accept="image/*"
								onChange={handleImageChange}
							/>
							{imagePreview && (
								<img
									src={imagePreview}
									alt="Food Preview"
									className="mt-2 w-24 h-24 object-cover rounded"
								/>
							)}
						</div>

						<div>
							<Label>Available Extras (Side Dishes)</Label>
							<div className="mt-2 space-y-2 max-h-48 overflow-y-auto border rounded-md p-4">
								{foodExtras && foodExtras.length > 0 ?
									foodExtras
										.filter((extra) => extra.status === "active")
										.map((extra) => {
											const isChecked =
												formData.extra_ids?.includes(extra.id) || false;
											return (
												<div
													key={extra.id}
													className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50"
												>
													<Switch
														id={`extra-${extra.id}`}
														checked={isChecked}
														onCheckedChange={(checked) => {
															console.log(
																`Switch toggled for extra ${extra.id}:`,
																checked,
															);
															handleExtraToggle(extra.id);
														}}
													/>
													<Label
														htmlFor={`extra-${extra.id}`}
														className="flex-1 cursor-pointer"
														onClick={() => handleExtraToggle(extra.id)}
													>
														{extra.name} - {formatCurrency(extra.price)}
													</Label>
												</div>
											);
										})
								:	<p className="text-sm text-gray-500">
										No extras available. Create extras first.
									</p>
								}
							</div>
						</div>

						<div className="pt-4 flex flex-wrap gap-4 items-center">
							<Button
								type="button"
								variant="destructive"
								size="lg"
								onClick={onClose}
							>
								Cancel
							</Button>
							<Button
								disabled={
									foodCategories.length == 0 ||
									formData.name == "" ||
									formData.price == 0 ||
									!formData.category_id
								}
								type="submit"
								className="flex-1"
								size="lg"
							>
								{foodItem ? "Save Changes" : "Add Food Item"}
							</Button>
						</div>
					</form>
				:	<div className="text-gray-500">
						<div>You must create a food category before adding food items.</div>
						<Button
							className="mt-4 "
							onClick={() => {
								onClose();
								navigate("/food?tab=categories");
							}}
						>
							Go to Food Categories
						</Button>
					</div>
				}
			</div>
		</div>
	);
}
