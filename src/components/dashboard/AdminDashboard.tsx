/** @format */

import React from "react";
import {
	DollarSign,
	ShoppingCart,
	Clock,
	TrendingUp,
	Users,
	BarChart3,
	Target,
	Shield,
	Settings,
	Database,
	Activity,
	AlertTriangle,
	Info,
} from "lucide-react";
import { StatsCard } from "./StatsCard";
import { StockAlerts } from "../StockAlerts";
import { SalesPerformanceChart } from "./SalesPerformanceChart";
import { TopProductsChart } from "./TopProductsChart";
import { CategoryPerformanceChart } from "./CategoryPerformanceChart";
import { PeakHoursChart } from "./PeakHoursChart";
import { OrderAnalytics } from "./OrderAnalytics";
import { InventoryInsights } from "./InventoryInsights";
import type { DashboardStats } from "../../hooks/useDashboard";
import type {
	SalesData,
	TopProduct,
	CategoryPerformance,
	PeakHoursData,
	OrderStatusData,
	PaymentMethodData,
	InventoryInsight,
} from "../../hooks/useAnalytics";

interface AdminDashboardProps {
	stats: DashboardStats;
	salesData: SalesData[];
	topProducts: TopProduct[];
	categoryPerformance: CategoryPerformance[];
	peakHours: PeakHoursData[];
	orderStatus: OrderStatusData[];
	paymentMethods: PaymentMethodData[];
	inventoryInsights: InventoryInsight[];
	isLoading: boolean;
	analyticsLoading: boolean;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
	stats,
	salesData,
	topProducts,
	categoryPerformance,
	peakHours,
	orderStatus,
	paymentMethods,
	inventoryInsights,
	isLoading,
	analyticsLoading,
}) => {
	return (
		<div className="space-y-6">
			{/* Comprehensive Stats - Full business overview */}
			<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
				<StatsCard
					title="Today's Revenue"
					value={stats.revenue}
					change={stats.revenueChange}
					isLoading={isLoading}
					icon={<DollarSign className="size-6 text-primary" />}
				/>
				<StatsCard
					title="Orders Today"
					value={stats.ordersCount}
					change={stats.ordersChange}
					isLoading={isLoading}
					icon={<ShoppingCart className="size-6 text-primary" />}
				/>
				<StatsCard
					title="Active Orders"
					value={stats.activeOrders}
					isLoading={isLoading}
					icon={<Clock className="size-6 text-primary" />}
				/>
				<StatsCard
					title="Average Order Value"
					value={stats.averageOrderValue}
					change={stats.averageOrderChange}
					isLoading={isLoading}
					icon={<TrendingUp className="size-6 text-primary" />}
				/>
			</div>

			{/* Stock Alerts - Critical inventory management */}
			<div className="space-y-4">
				<h2 className="text-xl font-medium text-gray-900">Stock Alerts</h2>
				<StockAlerts />
			</div>

			{/* Sales Performance - Strategic trend analysis */}
			<div className="space-y-4">
				<h2 className="text-xl font-medium text-gray-900">
			Sales Performance
				</h2>
			<SalesPerformanceChart data={salesData} isLoading={analyticsLoading} />
			</div>

			{/* Product & Category Performance - Strategic insights */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<TopProductsChart data={topProducts} isLoading={analyticsLoading} />
				<CategoryPerformanceChart
					data={categoryPerformance}
					isLoading={analyticsLoading}
				/>
			</div>

			{/* Peak Hours - Strategic staffing and operations */}
			<PeakHoursChart data={peakHours} isLoading={analyticsLoading} />

			{/* Order Analytics - Operational excellence */}
			<OrderAnalytics
				orderStatus={orderStatus}
				paymentMethods={paymentMethods}
				isLoading={analyticsLoading}
			/>

			{/* Inventory Insights - Strategic inventory management */}
			<InventoryInsights
				data={inventoryInsights}
				isLoading={analyticsLoading}
			/>

			{/* Admin Control Panel */}
			<div className=" bg-background rounded-lg p-6 py-8">
				<h3 className="text-lg font-semibold mb-4 flex items-center">
					Administrative Controls
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
					<div className="flex items-start space-x-4">
						<Users className="w-4 h-4  mt-0.5 flex-shrink-0" />
						<div>
							<p className="font-semibold">User Management</p>
							<p className="text-muted-foreground/80">
								Manage staff accounts and permissions
							</p>
						</div>
					</div>
					<div className="flex items-start space-x-4">
						<Database className="w-4 h-4  mt-0.5 flex-shrink-0" />
						<div>
							<p className="font-semibold">System Settings</p>
							<p className="text-muted-foreground/80">
								Configure POS and business settings
							</p>
						</div>
					</div>
					<div className="flex items-start space-x-4">
						<Activity className="w-4 h-4  mt-0.5 flex-shrink-0" />
						<div>
							<p className="font-semibold">Activity Logs</p>
							<p className="text-muted-foreground/80">
								Monitor system activity and security
							</p>
						</div>
					</div>
					<div className="flex items-start space-x-4">
						<BarChart3 className="w-4 h-4  mt-0.5 flex-shrink-0" />
						<div>
							<p className="font-semibold">Business Intelligence</p>
							<p className="text-muted-foreground/80">Access comprehensive analytics</p>
						</div>
					</div>
					<div className="flex items-start space-x-4">
						<Settings className="w-4 h-4  mt-0.5 flex-shrink-0" />
						<div>
							<p className="font-semibold">System Configuration</p>
							<p className="text-muted-foreground/80">
								Advanced system settings and maintenance
							</p>
						</div>
					</div>
					<div className="flex items-start space-x-4">
						<AlertTriangle className="w-4 h-4  mt-0.5 flex-shrink-0" />
						<div>
							<p className="font-semibold">Security Monitoring</p>
							<p className="text-muted-foreground/80">Track security events and access</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
