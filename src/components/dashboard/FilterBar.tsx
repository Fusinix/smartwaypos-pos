/** @format */

import { ChevronDown, Download, RefreshCw } from "lucide-react";
import React, { useState } from "react";
import type { DashboardFilters, TimePeriod } from "../../hooks/useDashboard";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../ui/select";
import { cn } from "@/lib/utils";

export interface ExportOption {
	label: string;
	value: "csv" | "excel" | "pdf";
}

interface FilterBarProps {
	filters: DashboardFilters;
	onFiltersChange: (filters: Partial<DashboardFilters>) => void;
	onRefresh: () => void;
	isLoading?: boolean;
	lastRefresh?: Date;
	onExport?: (format: "csv" | "excel" | "pdf") => void;
	exportDisabled?: boolean;
	className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
	filters,
	onFiltersChange,
	onRefresh,
	isLoading = false,
	lastRefresh,
	onExport,
	exportDisabled,
	className,
}) => {
	const [exportType, setExportType] = useState<"csv" | "excel" | "pdf">("csv");
	const [exportData, setExportData] = useState<
		"sales" | "orders" | "products" | "categories"
	>("sales");

	const handleTimePeriodChange = (period: string) => {
		onFiltersChange({ timePeriod: period as TimePeriod });
	};

	const handleStartDateChange = (date: string) => {
		onFiltersChange({ startDate: new Date(date) });
	};

	const handleEndDateChange = (date: string) => {
		onFiltersChange({ endDate: new Date(date) });
	};

	const handleExport = async () => {
		onExport?.(exportType);
		// try {
		//   const result = await window.electron.invoke('export-data', {
		//     type: exportData,
		//     format: exportType,
		//     filters
		//   });
		//   // console.log('Export result:', result);
		//   // TODO: Add toast notification for success/error
		// //   onExport?.()
		// toast.success("Export successful")
		// } catch (error) {
		//   console.error('Export failed:', error);
		//   // TODO: Add toast notification for error
		// }
	};

	const formatLastRefresh = (date: Date) => {
		return date.toLocaleTimeString();
	};

	return (
		<div
			className={cn(
				"flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b bg-white px-6 py-3",
				className
			)}
		>
			<div className="flex items-center justify-between gap-3">
				<div className="flex items-center space-x-4">
					{/* Time Period Selector */}
					<div className="flex items-center space-x-2">
						<Select
							value={filters.timePeriod}
							onValueChange={handleTimePeriodChange}
						>
							<SelectTrigger className="w-32 h-10">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="day">Today</SelectItem>
								<SelectItem value="week">This Week</SelectItem>
								<SelectItem value="month">This Month</SelectItem>
								<SelectItem value="custom">Custom</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Date Range Picker (shown when custom is selected) */}
					{filters.timePeriod === "custom" && (
						<div className="flex items-center space-x-2">
							<span className="text-sm font-medium text-gray-700">From:</span>
							<Input
								type="date"
								value={filters.startDate?.toISOString().split("T")[0] || ""}
								onChange={(e) => handleStartDateChange(e.target.value)}
								className="w-40 h-10"
							/>
							<span className="text-sm font-medium text-gray-700">To:</span>
							<Input
								type="date"
								value={filters.endDate?.toISOString().split("T")[0] || ""}
								onChange={(e) => handleEndDateChange(e.target.value)}
								className="w-40 h-10"
							/>
						</div>
					)}
				</div>

				<div className="flex items-center space-x-4">
					{/* Export Section */}
					<Popover>
						<PopoverTrigger
							disabled={exportDisabled}
							className="h-10 flex items-center gap-2 px-2.5 border rounded-md"
						>
							<span className="text-base">Export</span>
							<ChevronDown className="size-4 text-muted-foreground/80" />
						</PopoverTrigger>
						<PopoverContent className="space-y-4">
							<div className="flex flex-col gap-1">
								<span className="text-sm font-medium text-gray-700">
									Choose export data:
								</span>
								<Select
									value={exportData}
									onValueChange={(value: any) => setExportData(value)}
								>
									<SelectTrigger className="h-10 w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="sales">Sales</SelectItem>
										<SelectItem value="orders">Orders</SelectItem>
										<SelectItem value="products">Products</SelectItem>
										<SelectItem value="categories">Categories</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="flex flex-col gap-1">
								<span className="text-sm font-medium text-gray-700">
									Export as:
								</span>
								<Select
									value={exportType}
									onValueChange={(value: any) => setExportType(value)}
								>
									<SelectTrigger className="h-10 w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="csv">CSV</SelectItem>
										<SelectItem value="excel">Excel</SelectItem>
										<SelectItem value="pdf">PDF</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<Button
								size="sm"
								onClick={handleExport}
								className="flex items-center space-x-1"
							>
								<Download className="w-4 h-4" />
								<span>Export</span>
							</Button>
						</PopoverContent>
					</Popover>

					{/* Refresh Section */}
					<div className="flex items-center space-x-2 ml-auto">
						<Button
							size="sm"
							variant="outline"
							onClick={onRefresh}
							disabled={isLoading}
							className="flex items-center space-x-1"
						>
							<RefreshCw
								className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
							/>
							<span>Refresh</span>
						</Button>
						{lastRefresh && (
							<span className="text-xs text-gray-500">
								Last updated: {formatLastRefresh(lastRefresh)}
							</span>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
