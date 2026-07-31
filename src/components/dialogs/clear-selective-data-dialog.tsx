import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";
import { AlertTriangle, Database, FileText, Receipt, PackageX } from "lucide-react";

interface ClearSelectiveDataDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: (options: {
		clearLogs: boolean;
		clearTransactions: boolean;
		clearStock: boolean;
	}) => Promise<void>;
	loading?: boolean;
}

export const ClearSelectiveDataDialog: React.FC<
	ClearSelectiveDataDialogProps
> = ({ open, onOpenChange, onConfirm, loading = false }) => {
	const [clearLogs, setClearLogs] = useState(false);
	const [clearTransactions, setClearTransactions] = useState(false);
	const [clearStock, setClearStock] = useState(false);

	const isAnythingSelected = clearLogs || clearTransactions || clearStock;

	const handleReset = () => {
		setClearLogs(false);
		setClearTransactions(false);
		setClearStock(false);
	};

	const handleOpenChange = (newOpen: boolean) => {
		if (!newOpen) {
			handleReset();
		}
		onOpenChange(newOpen);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!isAnythingSelected) return;

		try {
			await onConfirm({
				clearLogs,
				clearTransactions,
				clearStock,
			});
			handleReset();
			onOpenChange(false);
		} catch (error) {
			console.error("Error clearing selective data:", error);
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<div className="flex items-center gap-2 text-destructive">
						<Database className="h-5 w-5" />
						<DialogTitle className="text-xl">Clear Selective Data</DialogTitle>
					</div>
					<DialogDescription>
						Select the specific data categories you wish to clear from the database.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-5 py-2">
					<div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2.5">
						<AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
						<div>
							<span className="font-semibold block mb-0.5">Notice</span>
							Products, food items, and categories themselves will <strong>NOT</strong> be deleted. Only the selected data entries will be cleared.
						</div>
					</div>

					<div className="space-y-3">
						{/* Checkbox 1: Logs */}
						<label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50/80 transition-colors cursor-pointer group">
							<input
								type="checkbox"
								checked={clearLogs}
								onChange={(e) => setClearLogs(e.target.checked)}
								className="mt-1 h-4 w-4 rounded border-gray-300 text-destructive focus:ring-destructive cursor-pointer"
							/>
							<div className="flex-1 space-y-0.5">
								<div className="flex items-center gap-1.5 font-medium text-sm text-gray-900">
									<FileText className="h-4 w-4 text-gray-500 group-hover:text-primary transition-colors" />
									System & Inventory Logs
								</div>
								<p className="text-xs text-gray-500">
									Clears all system audit trail logs and inventory adjustment logs.
								</p>
							</div>
						</label>

						{/* Checkbox 2: Transactions */}
						<label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50/80 transition-colors cursor-pointer group">
							<input
								type="checkbox"
								checked={clearTransactions}
								onChange={(e) => setClearTransactions(e.target.checked)}
								className="mt-1 h-4 w-4 rounded border-gray-300 text-destructive focus:ring-destructive cursor-pointer"
							/>
							<div className="flex-1 space-y-0.5">
								<div className="flex items-center gap-1.5 font-medium text-sm text-gray-900">
									<Receipt className="h-4 w-4 text-gray-500 group-hover:text-primary transition-colors" />
									Transactions & Order History
								</div>
								<p className="text-xs text-gray-500">
									Clears all past sales orders, order items, and expense records.
								</p>
							</div>
						</label>

						{/* Checkbox 3: Stock Data */}
						<label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50/80 transition-colors cursor-pointer group">
							<input
								type="checkbox"
								checked={clearStock}
								onChange={(e) => setClearStock(e.target.checked)}
								className="mt-1 h-4 w-4 rounded border-gray-300 text-destructive focus:ring-destructive cursor-pointer"
							/>
							<div className="flex-1 space-y-0.5">
								<div className="flex items-center gap-1.5 font-medium text-sm text-gray-900">
									<PackageX className="h-4 w-4 text-gray-500 group-hover:text-primary transition-colors" />
									Stock Data
								</div>
								<p className="text-xs text-gray-500">
									Resets stock counts to 0 for all products (products themselves are retained).
								</p>
							</div>
						</label>
					</div>

					<DialogFooter className="pt-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => handleOpenChange(false)}
							disabled={loading}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							variant="destructive"
							disabled={loading || !isAnythingSelected}
							className="bg-red-600 hover:bg-red-700"
						>
							{loading ? "Clearing..." : "Clear Selected Data"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
};
