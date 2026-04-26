/** @format */

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCurrency } from "@/hooks/useCurrency";

interface FoodItemSelectionDialogProps {
	open: boolean;
	foodItem: any;
	foodExtras: any[];
	initialExtras?: number[];
	initialNotes?: string;
	onClose: () => void;
	onAdd: (foodItem: any, selectedExtras: number[], notes: string) => void;
}

export const FoodItemSelectionDialog: React.FC<FoodItemSelectionDialogProps> = ({
	open,
	foodItem,
	foodExtras,
	initialExtras,
	initialNotes,
	onClose,
	onAdd,
}) => {
	const { format: formatCurrency } = useCurrency();
	const [extraQuantities, setExtraQuantities] = useState<Map<number, number>>(
		new Map()
	);
	const [notes, setNotes] = useState("");

	useEffect(() => {
		if (open) {
			console.log("FoodItemSelectionDialog: Opening with", { initialExtras, initialNotes });
			// Initialize state with provided values or reset if none
			if (initialExtras && initialExtras.length > 0) {
				const counts = new Map<number, number>();
				initialExtras.forEach(id => {
					// Ensure ID is a number for Map matching
					const numericId = Number(id);
					counts.set(numericId, (counts.get(numericId) || 0) + 1);
				});
				console.log("FoodItemSelectionDialog: Calculated extraQuantities", Array.from(counts.entries()));
				setExtraQuantities(counts);
			} else {
				setExtraQuantities(new Map());
			}
			setNotes(initialNotes || "");
		}
	}, [open, foodItem?.id, initialExtras, initialNotes]);

	const handleToggleExtra = (extraId: number) => {
		setExtraQuantities((prev) => {
			const newMap = new Map(prev);
			if (newMap.has(extraId)) {
				newMap.delete(extraId);
			} else {
				newMap.set(extraId, 1);
			}
			return newMap;
		});
	};

	const handleExtraQuantityChange = (extraId: number, quantity: number) => {
		setExtraQuantities((prev) => {
			const newMap = new Map(prev);
			if (quantity <= 0) {
				newMap.delete(extraId);
			} else {
				newMap.set(extraId, Math.max(1, quantity));
			}
			return newMap;
		});
	};

	const handleAdd = () => {
		// Convert quantities map to array of IDs (repeat IDs based on quantity for backend)
		const selectedExtras: number[] = [];
		extraQuantities.forEach((quantity, extraId) => {
			for (let i = 0; i < quantity; i++) {
				selectedExtras.push(extraId);
			}
		});
		console.log("Adding food item to cart:", {
			foodItem: foodItem.name,
			selectedExtras,
			extraQuantities: Array.from(extraQuantities.entries()),
			notes,
		});
		onAdd(foodItem, selectedExtras, notes);
		onClose();
	};

	if (!foodItem) return null;

	console.log("FoodItemSelectionDialog Debug:", {
		foodItemName: foodItem.name,
		foodItemExtras: foodItem.extras,
		globalFoodExtrasCount: foodExtras?.length
	});

	const availableExtras = foodExtras.filter((e) => {
		if (!foodItem.extras || !Array.isArray(foodItem.extras)) return false;
		return foodItem.extras.some((fe: any) => {
			const feId = fe.id || fe.extra_id || fe;
			return String(feId) === String(e.id);
		});
	});

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="w-[95%] sm:max-w-[900px] max-h-[95vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="text-xl">{foodItem.name}</DialogTitle>
				</DialogHeader>
				<div className="space-y-6 py-4">
					{/* Food Item Details */}
					<div className="space-y-2">
						{foodItem.description && (
							<p className="text-sm text-gray-600">{foodItem.description}</p>
						)}
						<div className="flex items-center justify-between pt-2 border-t">
							<span className="text-sm font-medium text-gray-700">
								Base Price:
							</span>
							<span className="text-lg font-bold text-gray-900">
								{formatCurrency(foodItem.price)}
							</span>
						</div>
					</div>

					{/* Extras Section */}
					{availableExtras.length > 0 ?
						<div className="space-y-3">
							<label className="text-sm font-semibold text-gray-900 block">
								Select Extras (Optional)
							</label>
							<div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3 bg-gray-50">
								{availableExtras.map((extra) => {
									const isSelected = extraQuantities.has(extra.id);
									const quantity = extraQuantities.get(extra.id) || 1;
									return (
										<div
											key={extra.id}
											className={`flex items-center justify-between p-3 border rounded-lg transition-all ${
												isSelected ?
													"bg-primary/10 border-primary"
												:	"bg-white border-gray-200 hover:border-gray-300"
											}`}
										>
											<div className="flex items-center space-x-3 flex-1">
												<input
													type="checkbox"
													id={`extra-${extra.id}`}
													checked={isSelected}
													onChange={(e) => {
														e.stopPropagation();
														handleToggleExtra(extra.id);
													}}
													className="w-4 h-4 cursor-pointer"
												/>
												<label
													htmlFor={`extra-${extra.id}`}
													className="text-sm font-medium text-gray-900 cursor-pointer flex-1"
													onClick={() => handleToggleExtra(extra.id)}
												>
													{extra.name}
												</label>
											</div>
											{isSelected && (
												<div
													className="flex items-center gap-2 mr-2"
													onClick={(e) => e.stopPropagation()}
												>
													<Button
														size="icon"
														variant="outline"
														className="size-6"
														onClick={() =>
															handleExtraQuantityChange(extra.id, quantity - 1)
														}
													>
														-
													</Button>
													<Input
														id={`extra-qty-${extra.id}`}
														name={`extra-qty-${extra.id}`}
														type="number"
														min={1}
														value={quantity}
														onChange={(e) =>
															handleExtraQuantityChange(
																extra.id,
																Number(e.target.value)
															)
														}
														className="!w-20 h-6 text-xs !px-1"
													/>
													<Button
														size="icon"
														variant="outline"
														className="size-6"
														onClick={() =>
															handleExtraQuantityChange(extra.id, quantity + 1)
														}
													>
														+
													</Button>
												</div>
											)}
											<span className="text-sm font-semibold text-gray-700">
												+{formatCurrency(extra.price)}
											</span>
										</div>
									);
								})}
							</div>
							{extraQuantities.size > 0 && (
								<div className="text-xs text-gray-500">
									{extraQuantities.size} extra
									{extraQuantities.size > 1 ? "s" : ""} selected
								</div>
							)}
						</div>
					:	<div className="text-sm text-gray-500 italic text-center py-4 border rounded-lg bg-gray-50">
							No extras available for this item
						</div>
					}

					{/* Notes/Message Section */}
					<div className="space-y-2">
						<label className="text-sm font-semibold text-gray-900 block">
							Special Instructions / Notes (Optional)
						</label>
						<Textarea
							id="food-item-notes"
							name="food-item-notes"
							placeholder="e.g., No pepper, Extra spicy, Less salt, Well done..."
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							rows={3}
							className="resize-none"
						/>
						<p className="text-xs text-gray-500">
							Add any special requests or notes for this food item
						</p>
					</div>

					{/* Total Price Preview */}
					{extraQuantities.size > 0 && (
						<div className="pt-3 border-t space-y-1">
							<div className="flex justify-between text-sm text-gray-600">
								<span>Base Price:</span>
								<span>{formatCurrency(foodItem.price)}</span>
							</div>
							{Array.from(extraQuantities.entries()).map(
								([extraId, quantity]) => {
									const extra = availableExtras.find((e) => e.id === extraId);
									return extra ?
											<div
												key={extraId}
												className="flex justify-between text-sm text-gray-600"
											>
												<span className="text-gray-500">
													+ {extra.name} {quantity > 1 ? `(×${quantity})` : ""}:
												</span>
												<span>{formatCurrency(extra.price * quantity)}</span>
											</div>
										:	null;
								}
							)}
							<div className="flex justify-between font-semibold text-base text-gray-900 pt-2 border-t">
								<span>Total:</span>
								<span>
									{formatCurrency(
										foodItem.price +
											Array.from(extraQuantities.entries()).reduce(
												(sum, [id, quantity]) => {
													const extra = availableExtras.find(
														(e) => e.id === id
													);
													return sum + (extra?.price || 0) * quantity;
												},
												0
											)
									)}
								</span>
							</div>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<Button onClick={handleAdd} className="min-w-[120px]">
						Add to Cart
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

