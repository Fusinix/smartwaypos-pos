/** @format */

import { SimpleAlert } from "@/components/alerts/simple-alert";
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
import { Label } from "@/components/ui/label";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useFoodExtras } from "@/hooks/useFoodExtras";
import { useCurrency } from "@/hooks/useCurrency";
import type { FoodExtra, NewFoodExtra } from "@/types/food";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

export default function FoodExtras() {
	const { user } = useAuth();
	const {
		extras,
		loading,
		error,
		setError,
		fetchExtras,
		addExtra,
		updateExtra,
		deleteExtra,
	} = useFoodExtras();
	const { format: formatCurrency } = useCurrency();

	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [editingExtra, setEditingExtra] = useState<FoodExtra | null>(null);
	const [extraToDelete, setExtraToDelete] = useState<FoodExtra | null>(null);
	const [search, setSearch] = useState("");

	const canManageExtras = user?.role === "admin";

	useEffect(() => {
		fetchExtras();
	}, [fetchExtras]);

	const filteredExtras = extras.filter((extra) => {
		return extra.name.toLowerCase().includes(search.toLowerCase());
	});

	const activeExtras = extras.filter((extra) => extra.status === "active");

	const handleSave = async (extra: NewFoodExtra) => {
		if (editingExtra) {
			await updateExtra(editingExtra.id, extra);
			setEditingExtra(null);
		} else {
			await addExtra(extra);
			setIsAddDialogOpen(false);
		}
	};

	return (
		<div className="h-full flex flex-col">
			{/* Page Header */}
			<div className="bg-white border-b px-8 py-6">
				<div className="flex justify-between items-center">
					<h1 className="text-3xl font-bold text-gray-900">Food Extras</h1>
					{canManageExtras && (
						<Button
							onClick={() => setIsAddDialogOpen(true)}
							className="text-base"
						>
							<Plus className="mr-2 h-4 w-4" />
							Add Extra
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

				{/* Summary Section - Admin Only */}
				{user?.role === "admin" && (
					<div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
						<Card className="bg-muted/50">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">
									Total Extras
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									{activeExtras.length?.toLocaleString()}
								</div>
								<p className="text-xs text-muted-foreground">
									Active extras available
								</p>
							</CardContent>
						</Card>
					</div>
				)}

				<div className="mb-6">
					<Input
						placeholder="Search extras..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
				</div>

				{loading ?
					<div className="text-center py-4 text-lg">Loading...</div>
				: filteredExtras.length === 0 ?
					<div className="text-center py-12 text-gray-400 text-lg">
						No extras found.
					</div>
				:	<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
						{filteredExtras.map((extra) => {
							return (
								<div
									key={extra.id}
									className="bg-white border rounded-lg overflow-hidden hover:shadow-lg transition-all p-4"
								>
									<div className="space-y-3">
										<div>
											<h3 className="font-bold text-lg text-gray-900">
												{extra.name}
											</h3>
											<p className="text-sm text-gray-500">
												Price: {formatCurrency(Number(extra.price) || 0)}
											</p>
										</div>

										<div className="flex items-center space-x-2">
											<span
												className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full ${
													extra.status === "active" ?
														"bg-green-100 text-green-800"
													:	"bg-red-100 text-red-800"
												}`}
											>
												{extra.status}
											</span>
										</div>

										{/* Actions */}
										{canManageExtras && (
											<div className="flex gap-2 pt-3 border-t border-gray-200">
												<Button
													variant="outline"
													size="sm"
													onClick={() => setEditingExtra(extra)}
													className="flex-1 text-base"
												>
													Edit
												</Button>
												<Button
													variant="destructive"
													size="sm"
													onClick={() => setExtraToDelete(extra)}
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

				{/* Add/Edit Dialog */}
				<Dialog
					open={isAddDialogOpen || !!editingExtra}
					onOpenChange={(open) => {
						if (!open) {
							setIsAddDialogOpen(false);
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
							onSave={handleSave}
							onCancel={() => {
								setIsAddDialogOpen(false);
								setEditingExtra(null);
							}}
						/>
					</DialogContent>
				</Dialog>

				<AlertDialog
					open={!!extraToDelete}
					onOpenChange={(open) => !open && setExtraToDelete(null)}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Are you sure?</AlertDialogTitle>
							<AlertDialogDescription>
								This action cannot be undone. This will permanently delete the
								extra "{extraToDelete?.name}".
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								onClick={() => {
									if (extraToDelete) {
										deleteExtra(extraToDelete.id);
										setExtraToDelete(null);
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

function ExtraForm({
	extra,
	onSave,
	onCancel,
}: {
	extra: FoodExtra | null;
	onSave: (extra: NewFoodExtra) => Promise<void>;
	onCancel: () => void;
}) {
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
			setFormData({
				name: "",
				price: 0,
				status: "active",
			});
		}
	}, [extra]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		await onSave(formData);
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div>
				<Label htmlFor="name">Extra Name</Label>
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

			<DialogFooter>
				<Button type="button" variant="outline" onClick={onCancel}>
					Cancel
				</Button>
				<Button type="submit">
					{extra ? "Save Changes" : "Add Extra"}
				</Button>
			</DialogFooter>
		</form>
	);
}

