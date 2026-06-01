/** @format */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Category, NewCategory } from "@/types/category";
import { useEffect, useState } from "react";

interface AddEditCategoryProps {
	category?: Category;
	onClose: () => void;
	onSave: (category: NewCategory) => Promise<void>;
}

export function AddEditCategory({
	category,
	onClose,
	onSave,
}: AddEditCategoryProps) {
	const [formData, setFormData] = useState<NewCategory>({
		name: "",
		description: "",
		status: "active",
	});
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		if (category) {
			setFormData({
				name: category.name,
				description: category.description || "",
				status: category.status,
			});
		} else {
			setFormData({
				name: "",
				description: "",
				status: "active",
			});
		}
	}, [category]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.name.trim()) {
			return;
		}

		setIsSubmitting(true);
		try {
			await onSave(formData);
			setFormData({
				name: "",
				description: "",
				status: "active",
			});
			onClose();
		} catch (error) {
			console.error("Error saving category:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="flex-1">
			<div className="p-4 py-1 h-14 border-b border-border flex items-center gap-4 sticky top-0 bg-white z-10">
				<h2 className="text-lg font-bold text-foreground">
					{category ? "Edit Product" : "Add New Product"}
				</h2>
			</div>
			<div className="p-4 px-6 pb-20">
				<form onSubmit={handleSubmit}>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="name">Name</Label>
							<Input
								id="name"
								value={formData.name}
								onChange={(e) =>
									setFormData({ ...formData, name: e.target.value })
								}
								required
								disabled={isSubmitting}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="description">Description</Label>
							<Textarea
								id="description"
								value={formData.description}
								onChange={(e) =>
									setFormData({ ...formData, description: e.target.value })
								}
								disabled={isSubmitting}
							/>
						</div>
						<div className="flex items-center space-x-2">
							<Switch
								id="status"
								checked={formData.status === "active"}
								onCheckedChange={(checked: boolean) =>
									setFormData({
										...formData,
										status: checked ? "active" : "inactive",
									})
								}
								disabled={isSubmitting}
							/>
							<Label htmlFor="status">Active</Label>
						</div>
					</div>
					<div className="pt-4 flex flex-wrap gap-4 items-center">
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							className="flex-1"
							disabled={isSubmitting || !formData.name.trim()}
						>
							{isSubmitting ?
								"Saving..."
							: category ?
								"Save Changes"
							:	"Add Category"}
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}
