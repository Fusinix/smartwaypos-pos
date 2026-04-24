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
				<h2 className="text-lg font-medium text-gray-900">Stock Alerts</h2>
				<StockAlerts />
			</div>

			{/* Sales Performance - Strategic trend analysis */}
			<SalesPerformanceChart data={salesData} isLoading={analyticsLoading} />

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
			<div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-6">
				<h3 className="text-lg font-medium text-red-900 mb-4 flex items-center">
					<Shield className="w-5 h-5 mr-2" />
					Administrative Controls
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-red-800">
					<div className="flex items-start space-x-2">
						<Users className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
						<div>
							<p className="font-medium">User Management</p>
							<p className="text-red-600">
								Manage staff accounts and permissions
							</p>
						</div>
					</div>
					<div className="flex items-start space-x-2">
						<Database className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
						<div>
							<p className="font-medium">System Settings</p>
							<p className="text-red-600">
								Configure POS and business settings
							</p>
						</div>
					</div>
					<div className="flex items-start space-x-2">
						<Activity className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
						<div>
							<p className="font-medium">Activity Logs</p>
							<p className="text-red-600">
								Monitor system activity and security
							</p>
						</div>
					</div>
					<div className="flex items-start space-x-2">
						<BarChart3 className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
						<div>
							<p className="font-medium">Business Intelligence</p>
							<p className="text-red-600">Access comprehensive analytics</p>
						</div>
					</div>
					<div className="flex items-start space-x-2">
						<Settings className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
						<div>
							<p className="font-medium">System Configuration</p>
							<p className="text-red-600">
								Advanced system settings and maintenance
							</p>
						</div>
					</div>
					<div className="flex items-start space-x-2">
						<AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
						<div>
							<p className="font-medium">Security Monitoring</p>
							<p className="text-red-600">Track security events and access</p>
						</div>
					</div>
				</div>
			</div>

			{/* Strategic Insights Section */}
			<div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
				<h3 className="text-lg font-medium text-indigo-900 mb-4 flex items-center">
					<Target className="w-5 h-5 mr-2" />
					Strategic Business Insights
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-indigo-800">
					<div className="flex items-start space-x-2">
						<TrendingUp className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
						<div>
							<p className="font-medium">Revenue Growth</p>
							<p className="text-indigo-600">
								Analyze trends and growth opportunities
							</p>
						</div>
					</div>
					<div className="flex items-start space-x-2">
						<ShoppingCart className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
						<div>
							<p className="font-medium">Inventory Optimization</p>
							<p className="text-indigo-600">
								Optimize stock levels and turnover
							</p>
						</div>
					</div>
					<div className="flex items-start space-x-2">
						<Clock className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
						<div>
							<p className="font-medium">Operational Efficiency</p>
							<p className="text-indigo-600">
								Streamline processes and workflows
							</p>
						</div>
					</div>
					<div className="flex items-start space-x-2">
						<DollarSign className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
						<div>
							<p className="font-medium">Financial Performance</p>
							<p className="text-indigo-600">
								Monitor profitability and cash flow
							</p>
						</div>
					</div>
					<div className="flex items-start space-x-2">
						<Users className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
						<div>
							<p className="font-medium">Team Performance</p>
							<p className="text-indigo-600">
								Track staff productivity and efficiency
							</p>
						</div>
					</div>
					<div className="flex items-start space-x-2">
						<BarChart3 className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
						<div>
							<p className="font-medium">Market Analysis</p>
							<p className="text-indigo-600">
								Understand customer behavior and preferences
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
