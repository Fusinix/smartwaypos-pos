/** @format */

import { ClassStyles } from "@/components/classnames";
import { AddEditTableDialog } from "@/components/dialogs/add-edit-table-dialog";
import { ClearSelectiveDataDialog } from "@/components/dialogs/clear-selective-data-dialog";
import AddUserDialog from "@/components/dialogs/add-user-dialog";
import EditUserDialog from "@/components/dialogs/edit-user-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn, parseJSONString } from "@/lib/utils";
import type { User as UserType } from "@/types";
import {
	ArrowDown,
	ArrowRight,
	LayoutPanelTop,
	List,
	User as LucidUser,
	MonitorDot,
	UploadCloud,
	UserCog2,
	Users,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertWithActions } from "../components/alerts/alert-with-actions";
import { SimpleAlert } from "../components/alerts/simple-alert";
import { SectionCard } from "../components/settings/SectionCard";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../hooks/useSettings";
import { useTables } from "../hooks/useTables";
import type {
	GeneralSettings,
	NewUser,
	POSSettings,
	Table,
	User,
} from "../types/settings";

interface SystemLog {
	id: number;
	created_at: string;
	admin_id: number | null;
	admin_name: string | null;
	admin_role: string | null;
	action: string;
	page: string | null;
	context: string | null;
}

export const Settings: React.FC = () => {
	const { user } = useAuth();
	const {
		settings,
		users,
		loading,
		error,
		updateSettings,
		addUser,
		updateUser,
		deleteUser,
		exportDatabase,
		importDatabase,
		clearAllData,
		clearSelectiveData,
	} = useSettings();

	const {
		tables,
		loading: tablesLoading,
		// error: tablesError,
		getTables,
		addTable,
		updateTable,
		deleteTable,
	} = useTables();

	const [activeTab, setActiveTab] = useState("general");
	const [editingUser, setEditingUser] = useState<
		(User & { password?: string }) | null
	>(null);
	const [localError, setLocalError] = useState<string | null>(null);
	const [showErrorDialog, setShowErrorDialog] = useState(false);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [showClearDataDialog, setShowClearDataDialog] = useState(false);
	const [showClearSelectiveDataDialog, setShowClearSelectiveDataDialog] =
		useState(false);
	const [userToDelete, setUserToDelete] = useState<number | null>(null);
	const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
	const [isAddTableDialogOpen, setIsAddTableDialogOpen] = useState(false);
	const [editingTable, setEditingTable] = useState<Table | null>(null);
	const [logs, setLogs] = useState<SystemLog[]>([]);
	const [logsLoading, setLogsLoading] = useState(false);
	const [availablePorts, setAvailablePorts] = useState<any[]>([]);
	const [availablePrinters, setAvailablePrinters] = useState<any[]>([]);
	const [isTestingDrawer, setIsTestingDrawer] = useState(false);
	const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);

	const [logFilters, setLogFilters] = useState({
		mode: "today" as "today" | "yesterday" | "custom",
		type: "crud" as "all" | "crud",
		startDate: new Date().toISOString().split("T")[0],
		endDate: new Date().toISOString().split("T")[0],
	});

	// Local state for settings with default values
	const [localGeneralSettings, setLocalGeneralSettings] =
		useState<GeneralSettings>({
			businessName: "",
			businessLogo: "",
			businessBanner: "",
			defaultCurrency: "GHS",
			printReceipts: false,
			businessDayCutoffHour: 4,
			...settings?.general,
		});

	const [localPosSettings, setLocalPosSettings] = useState<POSSettings>({
		defaultTaxRate: 0,
		showTaxOnReceipt: false,
		autoLogoutTimeout: 30,
		receiptFooterNote: "",
		cashDrawerPort: "",
		cashDrawerKickCode: "0x07",
		receiptPrinter: "",
		customerDisplayPort: "",
		allowCashierInventoryManagement: false,
		...settings?.pos,
	});

	const userRole = user?.role;
	const isAdmin = userRole === "admin";
	const isManager = userRole === "manager" || userRole === "admin";

	useEffect(() => {
		if (settings) {
			setLocalGeneralSettings((prev) => ({ ...prev, ...settings.general }));
			setLocalPosSettings((prev) => ({ ...prev, ...settings.pos }));
		}
	}, [settings]);

	useEffect(() => {
		if (error) {
			console.error("Settings error:", error);
			setLocalError(error);
			setShowErrorDialog(true);
		}
	}, [error]);

	// Update local settings when settings prop changes
	useEffect(() => {
		if (settings?.general) {
			const newObj = parseJSONString(settings.general as any);
			setLocalGeneralSettings((prev) => ({
				...prev,
				...newObj,
			}));
		}
		if (settings?.pos) {
			const newObj = parseJSONString(settings.pos as any);
			setLocalPosSettings((prev) => ({
				...prev,
				...newObj,
			}));
		}
	}, [settings]);

	// Fetch logs when logs tab is active
	useEffect(() => {
		if (activeTab === "logs" && isAdmin) {
			fetchLogs();
		}
	}, [
		activeTab,
		isAdmin,
		logFilters.mode,
		logFilters.startDate,
		logFilters.endDate,
		logFilters.type,
	]);

	// Fetch tables when tables tab is active
	useEffect(() => {
		if (activeTab === "tables" && isManager) {
			getTables();
		}
	}, [activeTab, isManager, getTables]);

	useEffect(() => {
		if (activeTab === "pos" && isManager) {
			fetchSerialPorts();
			fetchPrinters();
		}
	}, [activeTab, isManager]);

	const fetchSerialPorts = async () => {
		try {
			const ports = await window.electron.invoke("list-serial-ports");
			setAvailablePorts(ports);
		} catch (error) {
			console.error("Error fetching serial ports:", error);
		}
	};

	const fetchPrinters = async () => {
		try {
			const printers = await window.electron.invoke("list-printers");
			setAvailablePrinters(printers);
		} catch (error) {
			console.error("Error fetching printers:", error);
		}
	};

	const handleTestDrawer = async () => {
		if (!localPosSettings.cashDrawerPort && !localPosSettings.receiptPrinter) {
			toast.error("Please select a COM port or a Printer first");
			return;
		}

		try {
			setIsTestingDrawer(true);
			// Save settings first to ensure main process has the latest config
			await updateSettings({ pos: localPosSettings });
			await window.electron.invoke("trigger-cash-drawer");
			toast.success("Test command sent to drawer");
		} catch (error: any) {
			toast.error(`Failed to trigger drawer: ${error.message}`);
		} finally {
			setIsTestingDrawer(false);
		}
	};

	const fetchLogs = async () => {
		try {
			setLogsLoading(true);
			const { mode, startDate, endDate, type } = logFilters;

			let filterParams: any = { type };
			if (mode === "today") {
				const today = new Date().toISOString().split("T")[0];
				filterParams.startDate = today;
				filterParams.endDate = today;
			} else if (mode === "yesterday") {
				const yesterday = new Date();
				yesterday.setDate(yesterday.getDate() - 1);
				const dateStr = yesterday.toISOString().split("T")[0];
				filterParams.startDate = dateStr;
				filterParams.endDate = dateStr;
			} else {
				filterParams.startDate = startDate;
				filterParams.endDate = endDate;
			}

			const logsData = await window.electron.invoke("get-logs", filterParams);
			setLogs(logsData);
		} catch (error) {
			console.error("Error fetching logs:", error);
			setLocalError("Failed to fetch system logs");
			setShowErrorDialog(true);
		} finally {
			setLogsLoading(false);
		}
	};

	const formatDateTime = (dateString: string) => {
		return new Date(dateString).toLocaleString();
	};

	const _formatContext = (context: string | null) => {
		if (!context) return "-";
		try {
			const parsed = JSON.parse(context);
			return JSON.stringify(parsed, null, 2);
		} catch {
			return context;
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-lg">Loading settings...</div>
			</div>
		);
	}

	const handleSaveGeneralSettings = async () => {
		try {
			setLocalError(null);
			await updateSettings({ general: localGeneralSettings });
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to update settings";
			setLocalError(errorMessage);
			setShowErrorDialog(true);
		}
	};

	const handleSavePosSettings = async () => {
		try {
			setLocalError(null);
			await updateSettings({ pos: localPosSettings });
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to update settings";
			setLocalError(errorMessage);
			setShowErrorDialog(true);
		}
	};

	const handleAddUser = async (user: NewUser) => {
		try {
			await addUser(user);
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to add user";
			setLocalError(errorMessage);
			setShowErrorDialog(true);
		}
	};

	const handleUpdateUser = async (
		updatedUser: UserType & { password?: string },
	) => {
		try {
			const { password, ...userData } = updatedUser;
			await updateUser(updatedUser.id, {
				...userData,
				...(password ? { password } : {}),
			});
			setEditingUser(null);
		} catch (error) {
			console.error("Error updating user:", error);
		}
	};

	const handleDeleteUser = async (id: number) => {
		setUserToDelete(id);
		setShowDeleteDialog(true);
	};

	const confirmDeleteUser = async () => {
		if (!userToDelete) return;

		try {
			setLocalError(null);
			await deleteUser(userToDelete);
			setShowDeleteDialog(false);
			setUserToDelete(null);
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to delete user";
			setLocalError(errorMessage);
			setShowErrorDialog(true);
		}
	};

	const handleAddTable = async (table: Omit<Table, "id">) => {
		try {
			setLocalError(null);
			await addTable(table, {
				id: user?.id || 0,
				name: user?.username || "",
				role: user?.role || "cashier",
			});
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to add table";
			setLocalError(errorMessage);
			setShowErrorDialog(true);
		}
	};

	const handleUpdateTable = async (table: Omit<Table, "id">) => {
		if (!editingTable) return;

		try {
			setLocalError(null);
			await updateTable(
				{ ...table, id: editingTable.id },
				{
					id: user?.id || 0,
					name: user?.username || "",
					role: user?.role || "cashier",
				},
			);
			setEditingTable(null);
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to update table";
			setLocalError(errorMessage);
			setShowErrorDialog(true);
		}
	};

	const handleDeleteTable = async (tableId: number) => {
		try {
			setLocalError(null);
			await deleteTable(tableId, {
				id: user?.id || 0,
				name: user?.username || "",
				role: user?.role || "cashier",
			});
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to delete table";
			setLocalError(errorMessage);
			setShowErrorDialog(true);
		}
	};

	return (
		<div className="h-full flex flex-col">
			{/* Page Header */}
			<div className="bg-white border-b px-4 h-16 flex items-center">
				<h1 className="text-3xl font-bold text-gray-900">Settings</h1>
			</div>

			{/* Tabs */}
			<div className="bg-white border-b px-4 h-14 py-1 flex items-center space-x-4">
				<Button
					onClick={() => setActiveTab("general")}
					variant={activeTab === "general" ? "default" : "outline"}
					className={cn("", ClassStyles.tabButton)}
				>
					<UserCog2 />
					General
				</Button>
				{isManager && (
					<Button
						onClick={() => setActiveTab("pos")}
						variant={activeTab === "pos" ? "default" : "outline"}
						className={cn("", ClassStyles.tabButton)}
					>
						<MonitorDot />
						POS Settings
					</Button>
				)}
				{isManager && (
					<Button
						onClick={() => setActiveTab("tables")}
						variant={activeTab === "tables" ? "default" : "outline"}
						className={cn("", ClassStyles.tabButton)}
					>
						<LayoutPanelTop />
						Tables
					</Button>
				)}
				{isAdmin && (
					<Button
						onClick={() => setActiveTab("users")}
						variant={activeTab === "users" ? "default" : "outline"}
						className={cn("", ClassStyles.tabButton)}
					>
						<Users />
						Users
					</Button>
				)}
				{isAdmin && (
					<Button
						onClick={() => setActiveTab("backup")}
						variant={activeTab === "backup" ? "default" : "outline"}
						className={cn("", ClassStyles.tabButton)}
					>
						<UploadCloud />
						Backup & Restore
					</Button>
				)}
				{isAdmin && (
					<Button
						onClick={() => setActiveTab("logs")}
						variant={activeTab === "logs" ? "default" : "outline"}
						className={cn("", ClassStyles.tabButton)}
					>
						<List />
						Logs
					</Button>
				)}
			</div>

			{/* Main Content */}
			<div className={cn("flex-1 p-4 py-6 overflow-y-auto space-y-8")}>
				<SimpleAlert
					open={showErrorDialog}
					onOpenChange={setShowErrorDialog}
					message={localError || error || ""}
				/>

				<AlertWithActions
					open={showDeleteDialog}
					onOpenChange={setShowDeleteDialog}
					title="Delete User"
					message="Are you sure you want to delete this user? This action cannot be undone."
					confirmText="Delete"
					onConfirm={confirmDeleteUser}
				/>

				<AlertWithActions
					open={showClearDataDialog}
					onOpenChange={setShowClearDataDialog}
					title="Clear All Data"
					message="⚠️ WARNING: This will permanently delete ALL data including orders, products, categories, tables, logs, and settings. All users will be deleted except the default admin user (username: admin). This action CANNOT be undone. Are you absolutely sure?"
					confirmText="Yes, Clear All Data"
					cancelText="Cancel"
					onConfirm={async () => {
						try {
							await clearAllData();
							setShowClearDataDialog(false);
							// Reload the page to reflect changes
							window.location.reload();
						} catch (error) {
							// Error is already handled in clearAllData
						}
					}}
					confirmClassName="bg-red-600 hover:bg-red-700"
				/>

				{activeTab === "general" && (
					<SectionCard title="General Settings">
						<div className="space-y-6 grid md:grid-cols-2 gap-8">
							<div className="space-y-2 p-6">
								<Label>Business Logo</Label>
								<div className="flex flex-col space-y-4">
									{localGeneralSettings.businessLogo && (
										<div className="h-32 w-32 border rounded bg-gray-50 flex items-center justify-center p-1">
											<img
												src={localGeneralSettings.businessLogo}
												alt="Logo"
												className="max-h-full max-w-full object-contain"
											/>
										</div>
									)}
									<Input
										type="file"
										accept="image/*"
										onChange={(e) => {
											const file = e.target.files?.[0];
											if (file) {
												const reader = new FileReader();
												reader.onloadend = () => {
													setLocalGeneralSettings({
														...localGeneralSettings,
														businessLogo: reader.result as string,
													});
												};
												reader.readAsDataURL(file);
											}
										}}
										className="cursor-pointer flex-1"
									/>
									<p className="text-xs text-gray-400">
										This logo will appear at the top of your printed receipts.
									</p>
									{localGeneralSettings.businessLogo && (
										<Button
											variant="ghost"
											size="sm"
											onClick={() =>
												setLocalGeneralSettings({
													...localGeneralSettings,
													businessLogo: "",
												})
											}
											className="text-red-500 hover:text-red-700 w-fit bg-destructive/10"
										>
											Clear
										</Button>
									)}
								</div>
							</div>
							<div className="space-y-2 p-6">
								<Label>Business Banner</Label>
								<div className="flex flex-col space-y-4">
									{localGeneralSettings.businessBanner ?
										<div className="h-32 w-full border rounded bg-gray-50 flex items-center justify-center p-1 overflow-hidden">
											<img
												src={localGeneralSettings.businessBanner}
												alt="Banner"
												className="h-full w-full object-cover rounded animate-pulse-once"
											/>
										</div>
									:	<div className="h-32 w-full border border-dashed rounded bg-gray-50 flex items-center justify-center text-xs text-muted-foreground">
											No Banner Configured
										</div>
									}
									<Input
										type="file"
										accept="image/*"
										onChange={(e) => {
											const file = e.target.files?.[0];
											if (file) {
												const reader = new FileReader();
												reader.onloadend = () => {
													setLocalGeneralSettings({
														...localGeneralSettings,
														businessBanner: reader.result as string,
													});
												};
												reader.readAsDataURL(file);
											}
										}}
										className="cursor-pointer flex-1"
									/>
									<p className="text-xs text-gray-400">
										This banner will appear on your login page. Recommended
										ratio: 16:9.
									</p>
									{localGeneralSettings.businessBanner && (
										<Button
											variant="ghost"
											size="sm"
											onClick={() =>
												setLocalGeneralSettings({
													...localGeneralSettings,
													businessBanner: "",
												})
											}
											className="text-red-500 hover:text-red-700 w-fit bg-destructive/10"
										>
											Clear
										</Button>
									)}
								</div>
							</div>
							<div className="space-y-6">
								<div>
									<Label className="block text-sm font-medium text-gray-700">
										Business Name
									</Label>
									<Input
										type="text"
										value={localGeneralSettings.businessName}
										onChange={(e) =>
											setLocalGeneralSettings({
												...localGeneralSettings,
												businessName: e.target.value,
											})
										}
										placeholder="Enter business name"
										className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary/90 focus:ring-primary/90 sm:text-sm"
									/>
								</div>

								<div>
									<Label className="block text-sm font-medium text-gray-700">
										Default Currency
									</Label>
									<select
										value={localGeneralSettings.defaultCurrency}
										onChange={(e) =>
											setLocalGeneralSettings({
												...localGeneralSettings,
												defaultCurrency: e.target.value,
											})
										}
										className="mt-1 block w-[100px] rounded-md border-gray-300 shadow-sm focus:border-primary/90 focus:ring-primary/90 sm:text-sm"
									>
										<option value="GHS">GHS</option>
									</select>
								</div>

								<div>
									<Label className="block text-sm font-medium text-gray-700">
										Business Day Cut-Off Hour
									</Label>
									<select
										value={localGeneralSettings.businessDayCutoffHour ?? 4}
										onChange={(e) =>
											setLocalGeneralSettings({
												...localGeneralSettings,
												businessDayCutoffHour: parseInt(e.target.value, 10),
											})
										}
										className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary/90 focus:ring-primary/90 sm:text-sm"
									>
										<option value={0}>12:00 AM (Midnight / Calendar Day)</option>
										<option value={1}>1:00 AM</option>
										<option value={2}>2:00 AM</option>
										<option value={3}>3:00 AM</option>
										<option value={4}>4:00 AM (Recommended for late-night venues)</option>
										<option value={5}>5:00 AM</option>
										<option value={6}>6:00 AM</option>
										<option value={7}>7:00 AM</option>
										<option value={8}>8:00 AM</option>
										<option value={9}>9:00 AM</option>
										<option value={10}>10:00 AM</option>
										<option value={11}>11:00 AM</option>
										<option value={12}>12:00 PM (Noon)</option>
									</select>
									<p className="text-xs text-gray-400 mt-1">
										Sales occurring past midnight before this hour will be attributed to the previous business day.
									</p>
								</div>
								<div className="flex items-center hidden">
									<Input
										type="checkbox"
										checked={localGeneralSettings.printReceipts}
										onChange={(e) =>
											setLocalGeneralSettings({
												...localGeneralSettings,
												printReceipts: e.target.checked,
											})
										}
										className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/90"
									/>
									<Label className="ml-2 block text-sm text-gray-900">
										Print Receipts
									</Label>
								</div>
								<Button
									onClick={handleSaveGeneralSettings}
									className="bg-primary text-white hover:bg-primary"
								>
									Save Changes
								</Button>
							</div>
						</div>
					</SectionCard>
				)}

				{activeTab === "pos" && (
					<>
						<SectionCard title="POS Settings">
							<div className="space-y-6">
								<div>
									<Label className="block text-sm font-medium text-gray-700">
										Default Tax Rate (%)
									</Label>
									<Input
										type="number"
										value={localPosSettings.defaultTaxRate}
										onChange={(e) =>
											setLocalPosSettings({
												...localPosSettings,
												defaultTaxRate: parseFloat(e.target.value) || 0,
											})
										}
										className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary/90 focus:ring-primary/90 sm:text-sm"
									/>
								</div>
								<div className="flex items-center hidden">
									<Input
										type="checkbox"
										checked={localPosSettings.showTaxOnReceipt}
										onChange={(e) =>
											setLocalPosSettings({
												...localPosSettings,
												showTaxOnReceipt: e.target.checked,
											})
										}
										className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/90"
									/>
									<Label className="ml-2 block text-sm text-gray-900">
										Show Tax on Receipt
									</Label>
								</div>
								<div>
									<Label className="block text-sm font-medium text-gray-700">
										Auto Logout Timeout (minutes)
									</Label>
									<Input
										type="number"
										value={localPosSettings.autoLogoutTimeout}
										onChange={(e) =>
											setLocalPosSettings({
												...localPosSettings,
												autoLogoutTimeout: parseInt(e.target.value) || 30,
											})
										}
										className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary/90 focus:ring-primary/90 sm:text-sm"
									/>
								</div>
								<div className="hidden">
									<Label className="block text-sm font-medium text-gray-700">
										Receipt Footer Note
									</Label>
									<Input
										type="text"
										value={localPosSettings.receiptFooterNote}
										onChange={(e) =>
											setLocalPosSettings({
												...localPosSettings,
												receiptFooterNote: e.target.value,
											})
										}
										className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary/90 focus:ring-primary/90 sm:text-sm"
									/>
								</div>
							</div>
						</SectionCard>
						<SectionCard title="Cash Drawer Settings">
							<div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100">
								<p className="text-sm text-blue-800">
									<strong>Note:</strong> If your drawer is connected{" "}
									<strong>to the printer</strong> (RJ11 cable), select your
									printer below. If it's <strong>directly USB</strong>, select a
									COM port.
								</p>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<Label className="block text-sm font-medium text-gray-700">
										Printer Connection (RJ11)
									</Label>
									<select
										value={localPosSettings.receiptPrinter || ""}
										onChange={(e) =>
											setLocalPosSettings({
												...localPosSettings,
												receiptPrinter: e.target.value,
												cashDrawerPort:
													e.target.value ? "" : localPosSettings.cashDrawerPort,
											})
										}
										className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary/90 focus:ring-primary/90 sm:text-sm h-10"
									>
										<option value="">Select printer...</option>
										{availablePrinters.map((printer) => (
											<option key={printer.name} value={printer.name}>
												{printer.name} {printer.isDefault ? "(Default)" : ""}
											</option>
										))}
									</select>
									<p className="mt-1 text-xs text-gray-500">
										For drawers plugged into the thermal printer.
									</p>
								</div>

								<div>
									<Label className="block text-sm font-medium text-gray-700">
										Direct COM Port (USB)
									</Label>
									<select
										value={localPosSettings.cashDrawerPort || ""}
										onChange={(e) =>
											setLocalPosSettings({
												...localPosSettings,
												cashDrawerPort: e.target.value,
												receiptPrinter:
													e.target.value ? "" : localPosSettings.receiptPrinter,
											})
										}
										className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary/90 focus:ring-primary/90 sm:text-sm h-10"
									>
										<option value="">Select port...</option>
										{availablePorts.map((port) => (
											<option key={port.path} value={port.path}>
												{port.path}{" "}
												{port.friendlyName ? `- ${port.friendlyName}` : ""}
											</option>
										))}
									</select>
									<p className="mt-1 text-xs text-gray-500">
										For drawers plugged directly into the PC.
									</p>
								</div>

								<div>
									<Label className="block text-sm font-medium text-gray-700">
										Kick Code
									</Label>
									<Input
										type="text"
										placeholder="e.g. 0x07"
										value={localPosSettings.cashDrawerKickCode || ""}
										onChange={(e) =>
											setLocalPosSettings({
												...localPosSettings,
												cashDrawerKickCode: e.target.value,
											})
										}
										className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary/90 focus:ring-primary/90 sm:text-sm"
									/>
								</div>
							</div>

							<div className="mt-6 flex items-center gap-3">
								<Button
									variant="outline"
									size="sm"
									onClick={handleTestDrawer}
									disabled={
										isTestingDrawer ||
										(!localPosSettings.cashDrawerPort &&
											!localPosSettings.receiptPrinter)
									}
									className="text-blue-600 border-blue-200 hover:bg-blue-50"
								>
									{isTestingDrawer ? "Testing..." : "Test Drawer Connection"}
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => {
										fetchSerialPorts();
										fetchPrinters();
									}}
									className="text-gray-500"
								>
									Refresh Devices
								</Button>
							</div>
						</SectionCard>

						<SectionCard title="Customer-facing Display Settings">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<Label className="block text-sm font-medium text-gray-700">
										Display Port (VFD)
									</Label>
									<select
										value={localPosSettings.customerDisplayPort || ""}
										onChange={(e) =>
											setLocalPosSettings({
												...localPosSettings,
												customerDisplayPort: e.target.value,
											})
										}
										className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary/90 focus:ring-primary/90 sm:text-sm h-10"
									>
										<option value="">Select port...</option>
										{availablePorts.map((port) => (
											<option key={port.path} value={port.path}>
												{port.path}{" "}
												{port.friendlyName ? `- ${port.friendlyName}` : ""}
											</option>
										))}
									</select>
									<p className="mt-1 text-xs text-gray-500">
										Connects to the monitor/pole at the back of the POS.
									</p>
								</div>
							</div>

							{/* Display Test Panel */}
							<div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
								<p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
									Test Display
								</p>

								{/* Amount test buttons */}
								<div>
									<p className="text-xs text-gray-500 mb-2">
										Send a test amount:
									</p>
									<div className="flex flex-wrap gap-2">
										{["10.00", "50.00", "99.99", "150.00"].map((amount) => (
											<Button
												key={amount}
												variant="outline"
												size="sm"
												disabled={!localPosSettings.customerDisplayPort}
												onClick={async () => {
													try {
														await window.electron.invoke(
															"update-customer-display",
															localPosSettings.customerDisplayPort,
															amount,
														);
														toast.success(`Sent ${amount} to display`);
													} catch (err: any) {
														toast.error(`Test failed: ${err.message}`);
													}
												}}
												className="text-blue-600 border-blue-200 hover:bg-blue-50 font-mono"
											>
												{amount}
											</Button>
										))}
									</div>
								</div>

								{/* Action buttons */}
								<div className="flex flex-wrap gap-2 pt-1 border-t border-gray-200">
									<Button
										variant="outline"
										size="sm"
										disabled={!localPosSettings.customerDisplayPort}
										onClick={async () => {
											try {
												await window.electron.invoke(
													"update-customer-display",
													localPosSettings.customerDisplayPort,
													"0.00",
												);
												toast.success("Display cleared to 0.00");
											} catch (err: any) {
												toast.error(`Clear failed: ${err.message}`);
											}
										}}
										className="text-orange-600 border-orange-200 hover:bg-orange-50"
									>
										Clear Display (0.00)
									</Button>

									<Button
										variant="outline"
										size="sm"
										disabled={!localPosSettings.customerDisplayPort}
										onClick={async () => {
											try {
												await window.electron.invoke(
													"update-customer-display",
													localPosSettings.customerDisplayPort,
													"0.00",
												);
												toast.success("Welcome message sent to display");
											} catch (err: any) {
												toast.error(`Test failed: ${err.message}`);
											}
										}}
										className="text-green-600 border-green-200 hover:bg-green-50"
									>
										Test Welcome Message
									</Button>
								</div>

								{!localPosSettings.customerDisplayPort && (
									<p className="text-xs text-amber-600">
										Select a display port above to enable test buttons.
									</p>
								)}
							</div>
						</SectionCard>

						<SectionCard title="Display settings">
							<div className="">
								<h4 className="text-sm font-semibold text-gray-900 mb-4">
									On-Screen Keyboard
								</h4>
								<div className="flex items-center justify-between mb-4">
									<div>
										<p className="text-sm font-medium text-gray-700">
											Auto-open Keyboard
										</p>
										<p className="text-xs text-gray-500">
											Automatically open Windows on-screen keyboard when
											clicking an input field.
										</p>
									</div>
									<Switch
										checked={localPosSettings.autoOpenKeyboard || false}
										onCheckedChange={(checked) =>
											setLocalPosSettings({
												...localPosSettings,
												autoOpenKeyboard: checked,
											})
										}
									/>
								</div>

								<div className="flex items-center justify-between hidden">
									<div>
										<p className="text-sm font-medium text-gray-700">
											Keyboard position
										</p>
										<p className="text-xs text-gray-500">
											How you prefer the on-screen keyboard to be positioned.
										</p>
									</div>
									<div className="flex items-center gap-2 p-1 bg-muted rounded-md">
										<Button
											variant={
												localPosSettings.keyboardPosition === "b" ?
													"default"
												:	"ghost"
											}
											size="sm"
											onClick={() =>
												setLocalPosSettings({
													...localPosSettings,
													keyboardPosition: "b",
												})
											}
											className={cn(ClassStyles.tabButton)}
										>
											<ArrowDown />
											Bottom
										</Button>
										<Button
											variant={
												(
													!localPosSettings.keyboardPosition ||
													localPosSettings.keyboardPosition === "r"
												) ?
													"default"
												:	"ghost"
											}
											size="sm"
											onClick={() =>
												setLocalPosSettings({
													...localPosSettings,
													keyboardPosition: "r",
												})
											}
											className={cn(ClassStyles.tabButton)}
										>
											<ArrowRight />
											Right
										</Button>
									</div>
								</div>
							</div>

							<div className="pt-4 border-t border-gray-100">
								<h4 className="text-sm font-semibold text-gray-900 mb-4">
									Window Appearance
								</h4>
								<div className="space-y-4">
									<div className="flex items-center justify-between">
										<div>
											<p className="text-sm font-medium text-gray-700">
												Hide Menu Bar
											</p>
											<p className="text-xs text-gray-500">
												Hide the system menu bar (File, Edit, View…). You can
												still access it by pressing{" "}
												<kbd className="px-1 py-0.5 text-xs font-mono bg-gray-100 border rounded">
													Alt
												</kbd>
												.
											</p>
										</div>
										<Switch
											checked={localPosSettings?.hideMenuBar !== false}
											onCheckedChange={(checked) => {
												setLocalPosSettings({
													...localPosSettings,
													hideMenuBar: checked,
												});
												window.electron.invoke(
													"set-menu-bar-visible",
													!checked,
												);
											}}
										/>
									</div>

									<div className="flex items-center justify-between">
										<div>
											<p className="text-sm font-medium text-gray-700">
												Fullscreen Mode
											</p>
											<p className="text-xs text-gray-500">
												Run the app in true fullscreen — hides the title bar,
												menu bar, and OS taskbar. Ideal for kiosk use.
											</p>
										</div>
										<Switch
											checked={localPosSettings.fullscreen === true}
											onCheckedChange={(checked) => {
												setLocalPosSettings({
													...localPosSettings,
													fullscreen: checked,
												});
												window.electron.invoke("set-fullscreen", checked);
											}}
										/>
									</div>
									<div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-100 rounded-lg mt-6">
										<div className="space-y-1">
											<p className="text-sm font-bold text-orange-900">
												Allow Cashiers to Manage Inventory
											</p>
											<p className="text-xs text-orange-800">
												When enabled, cashiers can add new products/food and
												update stock levels.
											</p>
											<p className="text-[10px] text-orange-700 italic mt-1">
												<strong>Note:</strong> This grants inventory access
												previously restricted to admins. For security, they will
												still be <strong>unable to delete</strong> items.
											</p>
										</div>
										<Switch
											checked={
												localPosSettings.allowCashierInventoryManagement ===
												true
											}
											onCheckedChange={(checked) =>
												setLocalPosSettings({
													...localPosSettings,
													allowCashierInventoryManagement: checked,
												})
											}
										/>
									</div>
								</div>
							</div>
						</SectionCard>
						<div className="p-4 flex justify-end items-center">
							<Button
								onClick={handleSavePosSettings}
								className="bg-primary text-white hover:bg-primary"
							>
								Save Changes
							</Button>
						</div>
					</>
				)}

				{activeTab === "tables" && isManager && (
					<SectionCard title="Table Management" className="relative">
						<div className="space-y-4">
							<Button
								className="absolute top-5 right-6 z-10"
								onClick={() => setIsAddTableDialogOpen(true)}
							>
								Add Table
							</Button>

							<div className="mt-4">
								{tablesLoading ?
									<div className="text-center py-8">
										<div className="text-lg">Loading tables...</div>
									</div>
								: tables.length === 0 ?
									<div className="text-center py-8">
										<div className="text-lg text-gray-500">No tables found</div>
										<div className="text-sm text-gray-400 mt-2">
											Add your first table to get started
										</div>
									</div>
								:	<div className="overflow-x-auto">
										<table className="min-w-full divide-y divide-gray-200">
											<thead className="bg-gray-50">
												<tr>
													<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
														Table Name
													</th>
													<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
														Capacity
													</th>
													<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
														Status
													</th>
													<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
														Actions
													</th>
												</tr>
											</thead>
											<tbody className="bg-white divide-y divide-gray-200">
												{tables.map((table) => (
													<tr key={table.id}>
														<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
															{table.name}
														</td>
														<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
															{table.capacity ?
																`${table.capacity} seats`
															:	"Not specified"}
														</td>
														<td className="px-6 py-4 whitespace-nowrap">
															<span
																className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
																	table.status === "active" ?
																		"bg-green-100 text-green-800"
																	:	"bg-gray-100 text-gray-800"
																}`}
															>
																{table.status}
															</span>
														</td>
														<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
															<Button
																variant="outline"
																size="sm"
																onClick={() => setEditingTable(table)}
																className="mr-2"
															>
																Edit
															</Button>
															<Button
																variant="destructive"
																size="sm"
																onClick={() => handleDeleteTable(table.id!)}
															>
																Delete
															</Button>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								}
							</div>
						</div>

						<AddEditTableDialog
							open={isAddTableDialogOpen}
							onOpenChange={setIsAddTableDialogOpen}
							onSave={handleAddTable}
							loading={tablesLoading}
						/>

						<AddEditTableDialog
							open={!!editingTable}
							onOpenChange={(open) => !open && setEditingTable(null)}
							table={editingTable}
							onSave={handleUpdateTable}
							loading={tablesLoading}
						/>
					</SectionCard>
				)}

				{activeTab === "users" && isAdmin && (
					<SectionCard title="Users" className="relative">
						<div className="space-y-4">
							<Button
								className="absolute top-5 right-6 z-10"
								onClick={() => setIsAddUserDialogOpen(true)}
							>
								Add User
							</Button>

							<div className="mt-4">
								<div className="overflow-x-auto">
									<table className="min-w-full divide-y divide-gray-200">
										<thead className="bg-gray-50">
											<tr>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Username
												</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Role
												</th>
												<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
													Actions
												</th>
											</tr>
										</thead>
										<tbody className="bg-white divide-y divide-gray-200">
											{users.map((u) => (
												<tr key={u.id}>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
														{u.username}
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
														{u.role}
													</td>

													<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
														<Button
															variant="outline"
															size="sm"
															onClick={() => setEditingUser(u)}
															className="mr-2"
														>
															Edit
														</Button>
														{isAdmin && user?.id != u.id && (
															<Button
																variant="destructive"
																size="sm"
																onClick={() => handleDeleteUser(u.id)}
															>
																Delete
															</Button>
														)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						</div>

						<AddUserDialog
							open={isAddUserDialogOpen}
							onClose={() => setIsAddUserDialogOpen(false)}
							onSave={handleAddUser}
						/>

						{editingUser && (
							<EditUserDialog
								user={editingUser}
								onClose={() => setEditingUser(null)}
								onSave={handleUpdateUser}
							/>
						)}
					</SectionCard>
				)}

				{activeTab === "logs" && isAdmin && (
					<SectionCard title="System Logs" className="relative">
						<div className="space-y-4">
							<Button
								className="absolute top-5 right-6 z-10"
								onClick={fetchLogs}
								disabled={logsLoading}
							>
								{logsLoading ? "Loading..." : "Refresh Logs"}
							</Button>

							<div className="flex flex-wrap items-center gap-4 p-0 rounded-lg border border-gray-100">
								<div className="flex gap-1 bg-muted border rounded-md p-1">
									{(["today", "yesterday", "custom"] as const).map((mode) => (
										<Button
											key={mode}
											variant="ghost"
											size="sm"
											className={cn(
												ClassStyles.tabButton,
												"capitalize h-8 px-4",
												logFilters.mode === mode &&
													"bg-white text-primary hover:bg-white",
											)}
											onClick={() => setLogFilters({ ...logFilters, mode })}
										>
											{mode}
										</Button>
									))}
								</div>

								{logFilters.mode === "custom" && (
									<div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
										<Input
											type="date"
											value={logFilters.startDate}
											onChange={(e) =>
												setLogFilters({
													...logFilters,
													startDate: e.target.value,
												})
											}
											className="h-9 w-40"
										/>
										<span className="text-gray-400">to</span>
										<Input
											type="date"
											value={logFilters.endDate}
											onChange={(e) =>
												setLogFilters({
													...logFilters,
													endDate: e.target.value,
												})
											}
											className="h-9 w-40"
										/>
									</div>
								)}

								<div className="flex gap-1 bg-muted border rounded-md p-1">
									{(["all", "crud"] as const).map((type) => (
										<Button
											key={type}
											variant="ghost"
											size="sm"
											className={cn(
												ClassStyles.tabButton,
												"capitalize h-8 px-4",
												logFilters.type === type &&
													"bg-white text-primary hover:bg-white",
											)}
											onClick={() => setLogFilters({ ...logFilters, type })}
										>
											{type === "crud" ? "CRUD Only" : "All Actions"}
										</Button>
									))}
								</div>

								<div className="text-xs text-gray-500 ml-auto">
									{logs.length} logs found
								</div>
							</div>

							<div className="mt-4">
								<div className="overflow-x-auto">
									<table className="min-w-full divide-y divide-gray-200">
										<thead className="bg-gray-50">
											<tr>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Date/Time
												</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Admin
												</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Role
												</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Action
												</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Page
												</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Context
												</th>
											</tr>
										</thead>
										<tbody className="bg-white divide-y divide-gray-200">
											{logs.map((log) => (
												<tr
													key={log.id}
													onClick={() => setSelectedLog(log)}
													className="hover:bg-gray-50 transition-colors cursor-pointer group"
												>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
														{formatDateTime(log.created_at)}
													</td>
													<td className="px-6 py-4 whitespace-nowrap">
														<div className="flex items-center gap-2">
															<div className="size-7 bg-primary/10 rounded-full flex items-center justify-center">
																<LucidUser className="size-3.5 text-primary" />
															</div>
															<span className="text-sm font-medium text-gray-900">
																{log.admin_name || "System"}
															</span>
														</div>
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
														<span className="capitalize">
															{log.admin_role || "-"}
														</span>
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
														<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
															{log.action}
														</span>
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
														<span className="bg-gray-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
															{log.page || "Global"}
														</span>
													</td>
													<td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
														<div className="truncate font-mono text-[11px] bg-gray-50 px-2 py-1 rounded border border-gray-100">
															{log.context || "-"}
														</div>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
								{logs.length === 0 && !logsLoading && (
									<div className="text-center py-8 text-gray-500">
										No system logs found
									</div>
								)}
							</div>
						</div>
					</SectionCard>
				)}

				{activeTab === "theme" && (
					<SectionCard title="Theme Settings">
						<div className="space-y-6">
							<div>
								<Label className="block text-sm font-medium text-gray-700">
									Theme Mode
								</Label>
								<select
									value={settings?.theme?.mode || "light"}
									onChange={(e) =>
										updateSettings({
											theme: {
												mode: e.target.value as "light" | "dark",
												primaryColor: settings?.theme?.primaryColor,
											},
										})
									}
									className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary/90 focus:ring-primary/90 sm:text-sm"
								>
									<option value="light">Light</option>
									<option value="dark">Dark</option>
								</select>
							</div>
							<div>
								<Label className="block text-sm font-medium text-gray-700">
									Primary Color
								</Label>
								<Input
									type="color"
									value={settings?.theme?.primaryColor || "#4F46E5"}
									onChange={(e) =>
										updateSettings({
											theme: {
												mode: settings?.theme?.mode || "light",
												primaryColor: e.target.value,
											},
										})
									}
									className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary/90 focus:ring-primary/90 sm:text-sm"
								/>
							</div>
						</div>
					</SectionCard>
				)}

				{activeTab === "backup" && (
					<SectionCard title="Backup & Restore">
						<div className="space-y-6">
							<div>
								<Button
									onClick={exportDatabase}
									className="bg-primary text-white hover:bg-primary"
								>
									Export Database
								</Button>
							</div>
							<div>
								<Label className="block text-sm font-medium text-gray-700">
									Import Database
								</Label>
								<Input
									type="file"
									accept=".json"
									onChange={(e) => {
										const file = e.target.files?.[0];
										if (file) {
											const reader = new FileReader();
											reader.onload = (event) => {
												const data = event.target?.result as string;
												importDatabase(data);
											};
											reader.readAsText(file);
										}
									}}
									className="mt-1 block w-full"
								/>
							</div>
							<div className="pt-4 border-t space-y-6">
								<div>
									<Label className="block text-sm font-medium text-gray-900 mb-2">
										Selective Data Cleanup
									</Label>
									<Button
										onClick={() => setShowClearSelectiveDataDialog(true)}
										variant="outline"
										className="border-amber-500 text-amber-700 hover:bg-amber-50"
									>
										Clear Selective Data...
									</Button>
									<p className="text-xs text-gray-500 mt-2">
										Selectively clear system logs, order transaction records, or reset stock quantities to 0 without deleting products or food items.
									</p>
								</div>
								<div className="pt-4 border-t">
									<Label className="block text-sm font-medium text-red-700 mb-2">
										Danger Zone
									</Label>
									<Button
										onClick={() => setShowClearDataDialog(true)}
										variant="destructive"
										className="bg-red-600 hover:bg-red-700"
									>
										Clear All Data
									</Button>
									<p className="text-xs text-gray-500 mt-2">
										This will permanently delete all orders, products, categories,
										tables, logs, and settings. All users will be deleted except
										the default admin user (username: admin).
									</p>
								</div>
							</div>
						</div>
					</SectionCard>
				)}

				<ClearSelectiveDataDialog
					open={showClearSelectiveDataDialog}
					onOpenChange={setShowClearSelectiveDataDialog}
					onConfirm={async (options) => {
						await clearSelectiveData(options);
						if (options.clearLogs) {
							setLogs([]);
							if (isAdmin) {
								fetchLogs();
							}
						}
					}}
				/>
			</div>

			{/* Log Details Drawer */}
			{selectedLog && (
				<div className="fixed inset-0 z-50 overflow-hidden">
					<div
						className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
						onClick={() => setSelectedLog(null)}
					/>
					<div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
						<div className="w-screen max-w-md animate-in slide-in-from-right duration-500">
							<div className="h-full flex flex-col bg-white shadow-2xl">
								<div className="px-6 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
									<div>
										<h2 className="text-lg font-bold text-gray-900">
											Log Details
										</h2>
										<p className="text-xs text-gray-500">
											Entry ID: #{selectedLog.id}
										</p>
									</div>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => setSelectedLog(null)}
										className="rounded-full hover:bg-white"
									>
										<span className="sr-only">Close</span>
										<svg
											className="h-6 w-6"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth="2"
												d="M6 18L18 6M6 6l12 12"
											/>
										</svg>
									</Button>
								</div>

								<div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
									<div className="grid grid-cols-2 gap-6">
										<div>
											<label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
												Date & Time
											</label>
											<p className="text-sm font-medium text-gray-900">
												{formatDateTime(selectedLog.created_at)}
											</p>
										</div>
										<div>
											<label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
												Action
											</label>
											<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
												{selectedLog.action}
											</span>
										</div>
									</div>

									<div className="grid grid-cols-2 gap-6">
										<div>
											<label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
												User
											</label>
											<div className="flex items-center gap-2">
												<div className="size-6 bg-primary/10 rounded-full flex items-center justify-center">
													<LucidUser className="size-3 text-primary" />
												</div>
												<span className="text-sm font-medium text-gray-900">
													{selectedLog.admin_name || "System"}
												</span>
											</div>
										</div>
										<div>
											<label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
												Module / Page
											</label>
											<p className="text-sm font-medium text-gray-900 capitalize">
												{selectedLog.page || "Global"}
											</p>
										</div>
									</div>

									<div>
										<label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
											Raw Context Data
										</label>
										<div className="bg-gray-900 rounded-xl p-4 overflow-x-auto shadow-inner">
											<pre className="text-xs font-mono text-emerald-400 leading-relaxed">
												{selectedLog.context ?
													JSON.stringify(
														JSON.parse(selectedLog.context),
														null,
														2,
													)
												:	"// No context available"}
											</pre>
										</div>
									</div>

									<div className="pt-6 border-t border-gray-100">
										<p className="text-xs text-gray-400 text-center italic">
											This log entry was recorded automatically by the system
											audit service.
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default Settings;
