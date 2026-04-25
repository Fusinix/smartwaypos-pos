import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FilterBar } from "../components/dashboard/FilterBar";
import { RoleBasedDashboard } from "../components/dashboard/RoleBasedDashboard";
import { RoleWelcomeMessage } from "../components/dashboard/RoleWelcomeMessage";
import { SetupChecklist } from "../components/dashboard/SetupChecklist";
import { useDashboard } from "../hooks/useDashboard";
import { useAnalytics } from "../hooks/useAnalytics";
import { useAuth } from "../context/AuthContext";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { useRolePermissions } from "../hooks/useRolePermissions";

export const Dashboard: React.FC = () => {
	const { user } = useAuth();
	const navigate = useNavigate();

	// Redirect cashiers away from dashboard
	useEffect(() => {
		if (user?.role === "cashier") {
			navigate("/orders", { replace: true });
			return;
		}
	}, [user?.role, navigate]);

	// Don't render dashboard content for cashiers
	if (user?.role === "cashier") {
		return null;
	}
	const {
		stats,
		filters,
		isLoading,
		error,
		lastRefresh,
		updateFilters,
		refreshData,
	} = useDashboard();

	const {
		salesData,
		topProducts,
		categoryPerformance,
		peakHours,
		orderStatus,
		paymentMethods,
		inventoryInsights,
		isLoading: analyticsLoading,
		error: analyticsError,
		lastRefresh: analyticsLastRefresh,
	} = useAnalytics(filters);

	const permissions = useRolePermissions(user?.role || "cashier");

	// Fetch setup checklist counts
	const [setupCounts, setSetupCounts] = useState({
		products: 0,
		categories: 0,
		orders: 0,
		foodItems: 0,
		hasSettings: false,
	});

	useEffect(() => {
		const fetchSetupData = async () => {
			try {
				const [products, categories, orders, foodItems, settings] =
					await Promise.all([
						window.electron.invoke("get-products"),
						window.electron.invoke("get-categories"),
						window.electron.invoke("get-orders"),
						window.electron.invoke("get-food-items"),
						window.electron.invoke("get-settings"),
					]);
				const settingsObj = settings?.general ? JSON.parse(settings.general) : null;
				setSetupCounts({
					products: products?.length || 0,
					categories: categories?.length || 0,
					orders: orders?.length || 0,
					foodItems: foodItems?.length || 0,
					hasSettings: !!(settingsObj?.businessName || settingsObj?.currency),
				});
			} catch (e) {
				console.error("Setup checklist fetch error:", e);
			}
		};
		fetchSetupData();
	}, []);

	// Export handler
	const handleExport = async (format: "csv" | "excel" | "pdf") => {
		try {
			// Request export data from backend
			const result = await window.electron.invoke("export-data", {
				type: "dashboard",
				filters,
				format,
			});
			if (!result || !result.success)
				throw new Error(result?.message || "Export failed");
			const data = result.data;
			if (format === "csv" || format === "excel") {
				// Use XLSX to generate file
				const ws = XLSX.utils.json_to_sheet(data.rows);
				const wb = XLSX.utils.book_new();
				XLSX.utils.book_append_sheet(wb, ws, "Dashboard");
				const fileType = format === "csv" ? "csv" : "xlsx";
				const fileExt = format === "csv" ? ".csv" : ".xlsx";
				const wbout = XLSX.write(wb, { bookType: fileType, type: "array" });
				const blob = new Blob([wbout], {
					type:
						fileType === "csv" ? "text/csv" : (
							"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
						),
				});
				saveAs(blob, `dashboard_export${fileExt}`);
			} else if (format === "pdf") {
				// Use jsPDF to generate PDF
				const doc = new jsPDF();
				doc.text("Dashboard Export", 14, 16);
				// Use autoTable for tabular data
				(doc as any).autoTable({
					head: [data.columns],
					body: data.rows.map((row: any) =>
						data.columns.map((col: string) => row[col])
					),
					startY: 24,
				});
				doc.save("dashboard_export.pdf");
			}
		} catch (err: any) {
			window.alert("Export failed: " + (err?.message || err));
		}
	};

	return (
		<div className="h-full flex flex-col">
			{/* Page Header */}
			<div className="bg-white border-b px-8 py-6 space-y-4">
				<h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
				<RoleWelcomeMessage
					userRole={user?.role || "cashier"}
					username={user?.username || "User"}
				/>
			</div>

			{/* Filter Bar */}
			<div className="bg-white border-b">
				<FilterBar
					className="px-8"
					filters={filters}
					onFiltersChange={updateFilters}
					onRefresh={refreshData}
					isLoading={isLoading}
					lastRefresh={lastRefresh}
					onExport={permissions.canExportData ? handleExport : undefined}
					exportDisabled={
						isLoading || analyticsLoading || !permissions.canExportData
					}
				/>
			</div>

			{/* Analytics Last Updated */}
			<div className="px-8 py-3 text-sm text-gray-500 flex items-center gap-2 bg-gray-50 border-b">
				<span>Analytics last updated:</span>
				<span className="font-mono">
					{analyticsLastRefresh?.toLocaleTimeString([], {
						hour: "2-digit",
						minute: "2-digit",
						second: "2-digit",
					})}
				</span>
				<span className="animate-pulse text-green-500">●</span>
				<span className="ml-2 text-gray-400">(auto-refreshes every 1 min)</span>
			</div>

			{/* Main Content */}
			<div className="flex-1 px-8 py-6 space-y-6 overflow-y-auto">
				{/* Setup Checklist — shown until system is fully configured */}
				<SetupChecklist
					productCount={setupCounts.products}
					categoryCount={setupCounts.categories}
					hasSettings={setupCounts.hasSettings}
					orderCount={setupCounts.orders}
					foodItemCount={setupCounts.foodItems}
				/>

				{/* Error Display */}
				{(error || analyticsError) && (
					<div className="bg-red-50 border border-red-200 rounded-md p-4">
						<p className="text-red-800 text-base">{error || analyticsError}</p>
					</div>
				)}

				{/* Role-Based Dashboard Content */}
				<RoleBasedDashboard
					userRole={user?.role || "cashier"}
					stats={stats}
					salesData={salesData}
					topProducts={topProducts}
					categoryPerformance={categoryPerformance}
					peakHours={peakHours}
					orderStatus={orderStatus}
					paymentMethods={paymentMethods}
					inventoryInsights={inventoryInsights}
					isLoading={isLoading}
					analyticsLoading={analyticsLoading}
				/>
			</div>
		</div>
	);
};

export default Dashboard;
