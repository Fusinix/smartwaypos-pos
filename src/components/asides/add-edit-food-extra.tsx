/** @format */

import type { FoodExtra, NewFoodExtra } from "@/types/food";
import { useEffect, useState } from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { Button } from "../ui/button";

interface AddEditFoodExtraProps {
	extra: FoodExtra | null;
	onSave: (extra: NewFoodExtra) => Promise<void>;
	onCancel: () => void;
}

export function AddEditFoodExtra({
	extra,
	onSave,
	onCancel,
}: AddEditFoodExtraProps) {
	const [formData, setFormData] = useState<NewFoodExtra>({
		name: extra?.name || "",
		price: extra?.price || 0,
		status: extra?.status || "active",
	});

	useEffect(() => {
		if (extra) {
			setFormData({
				name: extra.name,
				price: extra.price,
				status: extra.status,
			});
		} else {
			setFormData({ name: "", price: 0, status: "active" });
		}
	}, [extra]);

	return (
		<div className="flex-1">
			<div className="p-4 py-1 h-14 border-b border-border flex items-center gap-4 sticky top-0 bg-white z-10">
				<h2 className="text-lg font-bold text-foreground">
					{extra ? "Edit Extra" : "Add New Extra"}
				</h2>
			</div>
			<div className="p-4 px-6 pb-20">
				<form
					onSubmit={async (e) => {
						e.preventDefault();
						await onSave(formData);
					}}
					className="space-y-4"
				>
					<div>
						<Label htmlFor="extra-name">Extra Name</Label>
						<Input
							id="extra-name"
							type="text"
							value={formData.name}
							onChange={(e) =>
								setFormData((p) => ({ ...p, name: e.target.value }))
							}
							required
						/>
					</div>
					<div>
						<Label htmlFor="extra-price">Price</Label>
						<Input
							id="extra-price"
							type="number"
							min="0"
							step="0.01"
							value={formData.price}
							onChange={(e) =>
								setFormData((p) => ({
									...p,
									price: parseFloat(e.target.value),
								}))
							}
							required
						/>
					</div>
					<div className="flex items-center space-x-2">
						<Switch
							id="extra-status"
							checked={formData.status === "active"}
							onCheckedChange={(checked) =>
								setFormData((p) => ({
									...p,
									status: checked ? "active" : "inactive",
								}))
							}
						/>
						<Label htmlFor="extra-status">Active</Label>
					</div>
					<div className="pt-4 flex flex-wrap gap-4 items-center">
						<Button type="button" variant="outline" onClick={onCancel}>
							Cancel
						</Button>
						<Button type="submit" className="flex-1">
							{extra ? "Save Changes" : "Add Extra"}
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}
