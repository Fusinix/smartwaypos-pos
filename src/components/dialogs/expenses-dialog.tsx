/** @format */

import React, { useState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Receipt, AlertCircle } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { toast } from "sonner";

interface ExpensesDialogProps {
	open: boolean;
	onClose: () => void;
	user: any;
}

export const ExpensesDialog: React.FC<ExpensesDialogProps> = ({
	open,
	onClose,
	user,
}) => {
	const { format: formatCurrency } = useCurrency();
	const [expenses, setExpenses] = useState<any[]>([]);
	const [description, setDescription] = useState("");
	const [amount, setAmount] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const fetchExpenses = async () => {
		try {
			const data = await (window as any).electron.invoke("get-expenses");
			setExpenses(data);
		} catch (error) {
			console.error("Failed to fetch expenses:", error);
			toast.error("Failed to load expenses");
		}
	};

	useEffect(() => {
		if (open) {
			fetchExpenses();
			setDescription("");
			setAmount("");
		}
	}, [open]);

	const handleAddExpense = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!description || !amount) return;

		setIsLoading(true);
		try {
			await (window as any).electron.invoke("add-expense", {
				description,
				amount: parseFloat(amount),
				admin_name: user?.username || "Admin",
				admin_id: user?.id,
			});
			toast.success("Expense added successfully");
			setDescription("");
			setAmount("");
			fetchExpenses();
		} catch (error) {
			console.error("Failed to add expense:", error);
			toast.error("Failed to add expense");
		} finally {
			setIsLoading(false);
		}
	};

	const handleDeleteExpense = async (id: number) => {
		try {
			await (window as any).electron.invoke("delete-expense", id);
			toast.success("Expense deleted");
			fetchExpenses();
		} catch (error) {
			console.error("Failed to delete expense:", error);
			toast.error("Failed to delete expense");
		}
	};

	const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<div className="flex items-center gap-2">
						<div className="p-2 bg-red-100 text-red-600 rounded-lg">
							<Receipt className="h-5 w-5" />
						</div>
						<DialogTitle className="text-xl font-bold">Daily Expenses</DialogTitle>
					</div>
				</DialogHeader>

				<div className="space-y-6 py-4">
					<form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
						<div className="md:col-span-2 space-y-2">
							<Label htmlFor="desc">What for?</Label>
							<Input
								id="desc"
								placeholder="e.g. Electricity, Transport, etc."
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="amt">Amount</Label>
							<Input
								id="amt"
								type="number"
								step="0.01"
								placeholder="0.00"
								value={amount}
								onChange={(e) => setAmount(e.target.value)}
								required
							/>
						</div>
						<div className="flex items-end">
							<Button type="submit" disabled={isLoading} className="w-full bg-red-600 hover:bg-red-700 gap-2">
								<Plus className="h-4 w-4" />
								Add
							</Button>
						</div>
					</form>

					<div className="border rounded-xl overflow-hidden bg-white shadow-sm">
						<Table>
							<TableHeader className="bg-gray-50">
								<TableRow>
									<TableHead className="font-bold">Description</TableHead>
									<TableHead className="text-right">Amount</TableHead>
									<TableHead className="text-right">By</TableHead>
									<TableHead className="w-[50px]"></TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{expenses.length === 0 ? (
									<TableRow>
										<TableCell colSpan={4} className="text-center py-8 text-gray-500 italic">
											<div className="flex flex-col items-center gap-2">
												<AlertCircle className="h-8 w-8 text-gray-300" />
												<p>No expenses logged today.</p>
											</div>
										</TableCell>
									</TableRow>
								) : (
									expenses.map((expense) => (
										<TableRow key={expense.id} className="hover:bg-gray-50/50 transition-colors">
											<TableCell className="font-medium">{expense.description}</TableCell>
											<TableCell className="text-right font-bold text-red-600">{formatCurrency(expense.amount)}</TableCell>
											<TableCell className="text-right text-xs text-gray-500">{expense.admin_name}</TableCell>
											<TableCell className="text-right">
												<Button
													variant="ghost"
													size="icon"
													onClick={() => handleDeleteExpense(expense.id)}
													className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
						{expenses.length > 0 && (
							<div className="p-4 bg-gray-50 border-t flex justify-between items-center">
								<span className="font-bold text-gray-700">Total Today</span>
								<span className="text-xl font-black text-red-600">{formatCurrency(totalExpenses)}</span>
							</div>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};
