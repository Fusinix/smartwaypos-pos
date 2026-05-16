/** @format */

import React, { useState } from "react";
import {
	Download,
	FileText,
	TrendingUp,
	DollarSign,
	Users,
	CreditCard,
	Percent,
	BarChart2,
	X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import OverviewTab from "@/components/accounting/OverviewTab";
import IncomeTab from "@/components/accounting/IncomeTab";
import ExpensesTab from "@/components/accounting/ExpensesTab";
import PayrollTab from "@/components/accounting/PayrollTab";
import CashReconciliationTab from "@/components/accounting/CashReconciliationTab";
import TaxTab from "@/components/accounting/TaxTab";
import ReportsTab from "@/components/accounting/ReportsTab";

import { useDashboard, type TimePeriod } from "@/hooks/useDashboard";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useExpenses } from "@/hooks/useExpenses";
import { useUsers } from "@/hooks/useUsers";
import { ClassStyles } from "@/components/classnames";
import { Input } from "@/components/ui/input";

const tabs = [
	{ id: "overview", label: "Overview", icon: BarChart2 },
	{ id: "income", label: "Income", icon: DollarSign },
	{ id: "expenses", label: "Expenses", icon: TrendingUp },
	{ id: "payroll", label: "Payroll", icon: Users },
	{ id: "cash", label: "Cash & Reconciliation", icon: CreditCard },
	{ id: "tax", label: "Tax", icon: Percent },
	{ id: "reports", label: "Reports", icon: FileText },
];

const periodOptions: { label: string; value: TimePeriod }[] = [
	{ label: "Day", value: "day" },
	{ label: "Yesterday", value: "yesterday" },
	{ label: "Week", value: "week" },
	{ label: "Month", value: "month" },
	{ label: "Custom", value: "custom" },
];

const Accounting: React.FC = () => {
	const [activeTab, setActiveTab] = useState("overview");
	const { filters, stats, updateFilters } = useDashboard();
	const analytics = useAnalytics(filters);
	const { expenses } = useExpenses(filters);
	const { users } = useUsers();

	const renderTabContent = () => {
		const props = { filters, stats, analytics, expenses, users };
		switch (activeTab) {
			case "overview":
				return <OverviewTab {...props} />;
			case "income":
				return <IncomeTab {...props} />;
			case "expenses":
				return <ExpensesTab {...props} />;
			case "payroll":
				return <PayrollTab {...props} />;
			case "cash":
				return <CashReconciliationTab {...props} />;
			case "tax":
				return <TaxTab {...props} />;
			case "reports":
				return <ReportsTab {...props} />;
			default:
				return <OverviewTab {...props} />;
		}
	};

	return (
		<div className="flex flex-col h-full bg-white text-gray-900 overflow-hidden">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-2 border-b border-border">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Accounting</h1>
					<p className="text-gray-500 text-sm mt-1">
						{filters.timePeriod === "custom" ?
							`${filters.startDate?.toLocaleDateString()} - ${filters.endDate?.toLocaleDateString()}`
						: filters.timePeriod === "yesterday" ?
							new Date(Date.now() - 86400000).toLocaleDateString(undefined, {
								month: "long",
								day: "numeric",
								year: "numeric",
							})
						:	new Date().toLocaleDateString(undefined, {
								month: "long",
								day: "numeric",
								year: "numeric",
							})
						}
					</p>
				</div>

				<div className="flex items-center gap-3">
					<div
						className={cn(
							"bg-gray-100 p-1 rounded-lg flex gap-1",
							filters.timePeriod === "custom" && "hidden",
						)}
					>
						{periodOptions.map((opt) => (
							<button
								key={opt.label}
								onClick={() => {
									const updates: any = { timePeriod: opt.value };
									if (opt.value === "custom" && !filters.startDate) {
										updates.startDate = new Date();
										updates.endDate = new Date();
									}
									updateFilters(updates);
								}}
								className={cn(
									"px-4 py-1.5 rounded-md text-sm font-medium transition-all",
									filters.timePeriod === opt.value ?
										"bg-white text-gray-900 shadow-sm"
									:	"text-gray-500 hover:text-gray-900",
								)}
							>
								{opt.label}
							</button>
						))}
					</div>

					{filters.timePeriod === "custom" && (
						<div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
							<Input
								type="date"
								className="bg-transparent border-none text-sm px-2 h-8 focus:ring-0"
								value={filters.startDate?.toISOString().split("T")[0] || ""}
								onChange={(e) =>
									updateFilters({
										startDate:
											e.target.value ? new Date(e.target.value) : undefined,
									})
								}
							/>
							<span className="text-gray-400">-</span>
							<Input
								type="date"
								className="bg-transparent border-none text-sm px-2 h-8 focus:ring-0"
								value={filters.endDate?.toISOString().split("T")[0] || ""}
								onChange={(e) =>
									updateFilters({
										endDate:
											e.target.value ? new Date(e.target.value) : undefined,
									})
								}
							/>
							<Button
								size="icon"
								variant="ghost"
								className="rounded-md h-8"
								onClick={() => updateFilters({ timePeriod: "day" })}
							>
								<X />
							</Button>
						</div>
					)}

					<Button
						variant="outline"
						onClick={() =>
							window.electron.invoke("export-data", {
								type: "dashboard",
								format: "csv",
								filters,
							})
						}
						className="bg-white border-gray-200 text-gray-700 hover:bg-gray-50 h-10 px-4 rounded-lg flex items-center gap-2"
					>
						<Download className="size-4" />
						Export
					</Button>
				</div>
			</div>

			{/* Sub-navigation */}
			<div className="px-4 border-b border-gray-100 bg-white">
				<div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2">
					{tabs.map((tab) => (
						<Button
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							variant={activeTab === tab.id ? "default" : "outline"}
							className={cn(ClassStyles.tabButton, "shadow-none text-sm")}
						>
							<tab.icon className="!size-4" />
							{tab.label}
						</Button>
					))}
				</div>
			</div>

			{/* Content Area */}
			<div className="flex-1 overflow-y-auto p-4 no-scrollbar bg-muted">
				{renderTabContent()}
			</div>
		</div>
	);
};

export default Accounting;
