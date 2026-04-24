/** @format */

import { SimpleAlert } from "@/components/alerts/simple-alert";
import { AddEditCategoryDialog } from "@/components/dialogs/add-edit-category-dialog";
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { useCategory } from "@/hooks/useCategory";
import type { Category } from "@/types/category";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

export default function Categories() {
	const { user } = useAuth();
	const {
		categories,
		isLoading,
		error,
		setError,
		fetchCategories,
		addCategory,
		updateCategory,
		deleteCategory,
	} = useCategory();
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<
		Category | undefined
	>();
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
		null
	);

	const isAdmin = user?.role === "admin";
	const isManager = user?.role === "manager";
	const canManage = isAdmin || isManager;

	useEffect(() => {
		fetchCategories();
	}, []);

	const filteredCategories = categories.filter(
		(category) =>
			category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			category.description?.toLowerCase().includes(searchQuery.toLowerCase())
	);

	const handleAddCategory = async (
		category: Omit<Category, "id" | "created_at" | "updated_at">
	) => {
		await addCategory(category);
		setIsAddDialogOpen(false);
	};

	const handleEditCategory = async (
		category: Omit<Category, "id" | "created_at" | "updated_at">
	) => {
		if (selectedCategory) {
			await updateCategory(selectedCategory.id, category);
			setIsEditDialogOpen(false);
		}
	};

	const handleDeleteCategory = async () => {
		if (categoryToDelete) {
			await deleteCategory(categoryToDelete.id);
			setIsDeleteDialogOpen(false);
			setCategoryToDelete(null);
		}
	};

	return (
		<div className="h-full flex flex-col">
			{/* Page Header */}
			<div className="bg-white border-b px-8 py-6">
				<div className="flex justify-between items-center">
					<h1 className="text-3xl font-bold text-gray-900">Categories</h1>
					{canManage && (
						<Button
							onClick={() => setIsAddDialogOpen(true)}
							className="text-base"
						>
							{/* <Plus className="mr-2 h-5 w-5" /> */}
							Add Category
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

				<div className="mb-6">
					<Input
						placeholder="Search categories..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="max-w-sm text-base"
					/>
				</div>

				{isLoading ?
					<div className="flex items-center justify-center h-64">
						<p className="text-lg">Loading categories...</p>
					</div>
				:	<div className="border rounded-lg">
						<Table>
							<TableHeader className="bg-gray-50">
								<TableRow>
									<TableHead className="text-base font-semibold">
										Name
									</TableHead>
									<TableHead className="text-base font-semibold">
										Description
									</TableHead>
									<TableHead className="text-base font-semibold">
										Status
									</TableHead>
									{canManage && (
										<TableHead className="w-[100px] text-base font-semibold">
											Actions
										</TableHead>
									)}
								</TableRow>
							</TableHeader>
							<TableBody className="bg-white">
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
										{canManage && (
											<TableCell className="px-6 py-5 whitespace-nowrap text-right text-base font-medium">
												<Button
													variant="outline"
													size="default"
													onClick={() => {
														setSelectedCategory(category);
														setIsEditDialogOpen(true);
													}}
													className="mr-2 text-base"
												>
													Edit
												</Button>
												<Button
													variant="destructive"
													size="default"
													onClick={() => {
														setCategoryToDelete(category);
														setIsDeleteDialogOpen(true);
													}}
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

				<AddEditCategoryDialog
					open={isAddDialogOpen}
					onClose={() => setIsAddDialogOpen(false)}
					onSave={handleAddCategory}
				/>

				<AddEditCategoryDialog
					category={selectedCategory}
					open={isEditDialogOpen}
					onClose={() => {
						setIsEditDialogOpen(false);
						setSelectedCategory(undefined);
					}}
					onSave={handleEditCategory}
				/>

				<AlertDialog
					open={isDeleteDialogOpen}
					onOpenChange={setIsDeleteDialogOpen}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Are you sure?</AlertDialogTitle>
							<AlertDialogDescription>
								This action cannot be undone. This will permanently delete the
								category and remove it from our servers.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								onClick={handleDeleteCategory}
								className="bg-red-600 hover:bg-red-700"
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
