/** @format */

import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
	BarChart3,
	Beer,
	ClipboardList,
	Clock,
	FolderKanban,
	LayoutDashboard,
	LogOut,
	Menu,
	Search,
	Settings,
	ShieldCheck,
	User,
	Bell,
	Globe,
	Package,
	AlertTriangle,
	MoreVertical,
	Minimize,
	Maximize,
} from "lucide-react";
import { defaultValues } from "@/data/lang";
import { Logo } from "../ui/logo";
import { cn } from "@/lib/utils";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useStock } from "../../hooks/useStock";
import { useOrders } from "../../hooks/useOrders";
import { useProducts } from "../../hooks/useProducts";
import { useSettings } from "@/hooks/useSettings";

export const Layout: React.FC = () => {
	const { isAuthenticated, user, logout } = useAuth();
	const location = useLocation();
	const navigate = useNavigate();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const {
		lowStockProducts,
		outOfStockProducts,
		getLowStockProducts,
		getOutOfStockProducts,
	} = useStock();
	const {
		settings,
	  } = useSettings();
	const { orders, fetchOrders } = useOrders();
	const { products, fetchProducts } = useProducts();
	const hasProducts = products.length > 0;
	const [language, setLanguage] = useState("en");
	const [isFullScreen, setIsFullScreen] = useState(false);

	useEffect(() => {
		if (!isAuthenticated) {
			navigate("/login", { state: { from: location }, replace: true });
		}
	}, [isAuthenticated, navigate, location]);

	// Fetch notifications data on mount and when authenticated
	useEffect(() => {
		if (isAuthenticated) {
			const loadNotifications = async () => {
				try {
					await Promise.all([
						getLowStockProducts(),
						getOutOfStockProducts(),
						fetchOrders(),
						fetchProducts(),
					]);
				} catch (error) {
					console.error("Error loading notifications:", error);
				}
			};
			loadNotifications();

			if(settings?.pos?.fullscreen){
				setIsFullScreen(true)
			}else{
				setIsFullScreen(false)
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isAuthenticated]);

	// Auto-refresh notifications every 30 seconds
	useEffect(() => {
		if (!isAuthenticated) return;

		const interval = setInterval(() => {
			getLowStockProducts();
			getOutOfStockProducts();
			fetchOrders();
		}, 30000); // 30 seconds

		return () => clearInterval(interval);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isAuthenticated]);

	// Calculate notification counts (memoized to prevent unnecessary recalculations)
	const activeOrdersCount = useMemo(
		() => orders.filter((order) => order.status === "open").length,
		[orders]
	);
	const notificationCount = useMemo(
		() =>
			lowStockProducts.length + outOfStockProducts.length + activeOrdersCount,
		[lowStockProducts.length, outOfStockProducts.length, activeOrdersCount]
	);

	const isAdmin = user?.role === "admin";

	// Digital clock state
	const [time, setTime] = useState(() => {
		const now = new Date();
		return now.toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
	});

	useEffect(() => {
		const interval = setInterval(() => {
			const now = new Date();
			setTime(
				now.toLocaleTimeString([], {
					hour: "2-digit",
					minute: "2-digit",
					second: "2-digit",
				})
			);
		}, 1000);
		return () => clearInterval(interval);
	}, []);

	if (!isAuthenticated) {
		return null;
	}

	const navItems = [
		...(isAdmin ?
			[{ path: "/", icon: LayoutDashboard, label: "Dashboard" }]
		:	[]),
		// Only show Orders if products exist
		...(hasProducts ?
			[{ path: "/orders", icon: ClipboardList, label: "Orders" }]
		:	[]),
		{ path: "/products", icon: Beer, label: "Drinks" },
		{ path: "/food", icon: Package, label: "Food" },
		...(isAdmin ?
			[{ path: "/categories", icon: FolderKanban, label: "Categories" }]
		:	[]),
		...(isAdmin ?
			[{ path: "/settings", icon: Settings, label: "Settings" }]
		:	[]),
	];

	return (
		<div className="h-screen bg-gray-50 flex w-full">
			{/* Left Sidebar */}
			<aside
				className={`${
					sidebarOpen ? "w-64" : "w-20"
				} bg-muted/50 border-r transition-all duration-300 flex flex-col h-screen sticky top-0`}
			>
				{/* Logo/Brand */}
				<div className="h-16 border-b flex items-center px-4 overflow-hidden">
					<Logo 
						size={sidebarOpen ? "sm" : "sm"} 
						showText={sidebarOpen} 
						className={cn("transition-all duration-300", !sidebarOpen && "ml-1")}
					/>
				</div>

				{/* Navigation Items */}
				<nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
					{navItems.map((item) => {
						const Icon = item.icon;
						const isActive = location.pathname === item.path;
						return (
							<Link
								key={item.path}
								to={item.path}
								className={`flex items-center gap-3 px-3 py-2.5 rounded-full text-base font-medium transition-colors hover:bg-white ${
									isActive ?
										"bg-primary/10 text-primary"
									:	"text-gray-700 hover:bg-gray-100"
								}`}
							>
								<Icon className="size-5 flex-shrink-0" />
								{sidebarOpen && <span>{item.label}</span>}
							</Link>
						);
					})}
				</nav>

				{/* User Section at Bottom */}
				<div className="border-t p-4">
					<div className="flex items-center gap-3 mb-3 border-b pb-4">
						<div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
							{user?.role === "admin" ?
								<ShieldCheck className="size-5 text-primary" />
							: user?.role === "manager" ?
								<BarChart3 className="size-5 text-primary" />
							:	<User className="size-5 text-primary" />}
						</div>
						{sidebarOpen && (
							<div className="flex-1 min-w-0">
								<div className="text-sm font-semibold text-gray-900 capitalize truncate">
									{user?.username}
								</div>
								<div className="text-xs text-gray-500 capitalize">
									{user?.role}
								</div>
							</div>
						)}
					</div>
					{sidebarOpen && (
						<Button
							onClick={logout}
							variant="ghost"
							size="sm"
							className="w-full text-base bg-destructive/10 text-destructive hover:bg-destructive/20"
						>
							<LogOut className="size-4 mr-2" />
							Log out
						</Button>
					)}
				</div>
			</aside>

			{/* Main Content Area */}
			<div className="flex-1 flex flex-col min-w-0 " >
				{/* Top Header Bar */}
				<header className="bg-white border-b h-16 flex items-center justify-between px-6 sticky top-0 z-10 gap-4">
					<div className="flex items-center gap-4 flex-1">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setSidebarOpen(!sidebarOpen)}
						>
							<Menu className="size-5" />
						</Button>
						<div className="relative flex-1 max-w-md">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
							<Input
								placeholder="Search here..."
								className="pl-10 h-9 text-base rounded-full bg-muted border-0"
							/>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<div className="font-mono font-medium text-gray-600 text-sm tabular-nums px-3 py-1.5 border rounded-md flex items-center gap-2">
							<Clock className="size-4" />
							<span>{time}</span>
						</div>

						{/* Notifications Dropdown */}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon" className="relative">
									<Bell className="size-5" />
									{notificationCount > 0 && (
										<span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
									)}
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-80">
								<DropdownMenuLabel className="flex items-center justify-between">
									<span>Notifications</span>
									{notificationCount > 0 && (
										<span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
											{notificationCount}
										</span>
									)}
								</DropdownMenuLabel>
								<DropdownMenuSeparator />
								{notificationCount === 0 ?
									<div className="px-2 py-4 text-center text-sm text-gray-500">
										No new notifications
									</div>
								:	<>
										{outOfStockProducts.length > 0 && (
											<>
												<DropdownMenuItem
													className="flex flex-col items-start gap-1 cursor-pointer"
													onClick={() => navigate("/products")}
												>
													<div className="flex items-center gap-2 w-full">
														<AlertTriangle className="size-4 text-red-500" />
														<span className="font-medium">Out of Stock</span>
														<span className="ml-auto bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full">
															{outOfStockProducts.length}
														</span>
													</div>
													<span className="text-xs text-gray-500 pl-6">
														{outOfStockProducts.length} product
														{outOfStockProducts.length !== 1 ? "s" : ""} out of
														stock
													</span>
												</DropdownMenuItem>
												<DropdownMenuSeparator />
											</>
										)}
										{lowStockProducts.length > 0 && (
											<>
												<DropdownMenuItem
													className="flex flex-col items-start gap-1 cursor-pointer"
													onClick={() => navigate("/products")}
												>
													<div className="flex items-center gap-2 w-full">
														<Package className="size-4 text-yellow-500" />
														<span className="font-medium">Low Stock</span>
														<span className="ml-auto bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">
															{lowStockProducts.length}
														</span>
													</div>
													<span className="text-xs text-gray-500 pl-6">
														{lowStockProducts.length} product
														{lowStockProducts.length !== 1 ? "s" : ""} running
														low
													</span>
												</DropdownMenuItem>
												<DropdownMenuSeparator />
											</>
										)}
										{activeOrdersCount > 0 && (
											<>
												<DropdownMenuItem
													className="flex flex-col items-start gap-1 cursor-pointer"
													onClick={() => navigate("/orders")}
												>
													<div className="flex items-center gap-2 w-full">
														<ClipboardList className="size-4 text-blue-500" />
														<span className="font-medium">Active Orders</span>
														<span className="ml-auto bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
															{activeOrdersCount}
														</span>
													</div>
													<span className="text-xs text-gray-500 pl-6">
														{activeOrdersCount} open order
														{activeOrdersCount !== 1 ? "s" : ""}
													</span>
												</DropdownMenuItem>
											</>
										)}
									</>
								}
							</DropdownMenuContent>
						</DropdownMenu>

						{/* Language Switcher */}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon">
									<Globe className="size-5" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuLabel>Language</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									onClick={() => setLanguage("en")}
									className={language === "en" ? "bg-primary/10" : ""}
								>
									English
								</DropdownMenuItem>
								{/* <DropdownMenuItem
									onClick={() => setLanguage("es")}
									className={language === "es" ? "bg-primary/10" : ""}
								>
									Español
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => setLanguage("fr")}
									className={language === "fr" ? "bg-primary/10" : ""}
								>
									Français
								</DropdownMenuItem> */}
							</DropdownMenuContent>
						</DropdownMenu>

						{/* Quick Actions Menu */}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon">
									<MoreVertical className="size-5" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={() => navigate("/orders")}>
									<ClipboardList className="size-4 mr-2" />
									New Order
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => navigate("/products")}>
									<Beer className="size-4 mr-2" />
									Manage Inventory
								</DropdownMenuItem>
								{isAdmin && (
									<>
										<DropdownMenuSeparator />
										<DropdownMenuItem onClick={() => navigate("/settings")}>
											<Settings className="size-4 mr-2" />
											Settings
										</DropdownMenuItem>
									</>
								)}
							</DropdownMenuContent>
						</DropdownMenu>

						{/* User Menu */}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center relative hover:bg-primary/20 transition-colors">
									{user?.role === "admin" ?
										<ShieldCheck className="size-5 text-primary" />
									: user?.role === "manager" ?
										<BarChart3 className="size-5 text-primary" />
									:	<User className="size-5 text-primary" />}
									{notificationCount > 0 && (
										<span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
											{notificationCount > 9 ? "9+" : notificationCount}
										</span>
									)}
								</button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-56">
								<DropdownMenuLabel>
									<div className="flex flex-col">
										<span className="font-semibold capitalize">
											{user?.username}
										</span>
										<span className="text-xs text-gray-500 capitalize">
											{user?.role}
										</span>
									</div>
								</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									onClick={() =>
										navigate(
											user?.role === "cashier" ? "/profile" : "/settings"
										)
									}
								>
									<User className="size-4 mr-2" />
									Profile
								</DropdownMenuItem>
								{isAdmin && (
									<DropdownMenuItem onClick={() => navigate("/settings")}>
										<Settings className="size-4 mr-2" />
										Settings
									</DropdownMenuItem>
								)}
								<DropdownMenuSeparator />
								<DropdownMenuItem
									onClick={logout}
									className="text-red-600 focus:text-red-600"
								>
									<LogOut className="size-4 mr-2" />
									Log out
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>

						{/* add minimize button that only shows when fullscreen mode is enabled */}

						<Button
							variant="ghost"
							size="icon"
							onClick={() =>{
								window.electron.invoke('set-fullscreen', !isFullScreen)
								setIsFullScreen(!isFullScreen)
							}}
						>
							{
								isFullScreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />
							}
						</Button>
					</div>
				</header>

				{/* Page Content */}
				<main className="flex-1 overflow-y-auto bg-white">
					<Outlet />
				</main>
			</div>
		</div>
	);
};
