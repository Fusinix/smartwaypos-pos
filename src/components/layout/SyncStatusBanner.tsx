/** @format */

import {
	AlertCircle,
	CheckCircle2,
	Cloud,
	Download,
	RefreshCw,
	WifiOff,
	X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { Button } from "../ui/button";

interface SyncStatus {
	unsyncedOrders: number;
	unsyncedOrderItems: number;
	unsyncedInventoryLogs: number;
	lastSyncedAt: string | null;
}

interface AppVersionInfo {
	updateAvailable: boolean;
	currentVersion: string;
	latestVersion: string;
	downloadUrl?: string;
	releaseNotes?: string;
}

export const SyncStatusBanner: React.FC = () => {
	const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
	const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
	const [versionInfo, setVersionInfo] = useState<AppVersionInfo | null>(null);
	const [isSyncing, setIsSyncing] = useState<boolean>(false);
	const [isUpdateDismissed, setIsUpdateDismissed] = useState<boolean>(false);
	const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	// Fetch status from Electron
	const fetchSyncAndVersionStatus = async () => {
		try {
			const status = await window.electron.invoke("get-sync-status");
			if (status && status.success) {
				setSyncStatus({
					unsyncedOrders: Number(status.unsyncedOrders ?? 0),
					unsyncedOrderItems: Number(status.unsyncedOrderItems ?? 0),
					unsyncedInventoryLogs: Number(status.unsyncedInventoryLogs ?? 0),
					lastSyncedAt: status.lastSyncedAt,
				});
			}

			const version = await window.electron.invoke("check-app-version");
			if (version && version.success) {
				setVersionInfo({
					updateAvailable: version.updateAvailable,
					currentVersion: version.currentVersion,
					latestVersion: version.latestVersion,
					downloadUrl: version.downloadUrl,
					releaseNotes: version.releaseNotes,
				});
			}
		} catch (error: any) {
			console.error("Failed to fetch sync status from main process:", error);
		}
	};

	// Listen to online/offline state
	useEffect(() => {
		const handleOnline = () => {
			setIsOnline(true);
			fetchSyncAndVersionStatus();
		};
		const handleOffline = () => {
			setIsOnline(false);
		};

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		// Initial load
		fetchSyncAndVersionStatus();

		// Refresh immediately when orders/inventory change in the main process
		// Cast to `any` because the renderer's TS server may not pick up the
		// ambient `Window.electron` declaration in all setups.
		const unsubscribeSync = (window as any).electron.onSyncStatusChanged?.(
			fetchSyncAndVersionStatus,
		);

		// Poll as a fallback every 15 seconds
		const interval = setInterval(fetchSyncAndVersionStatus, 15000);

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
			unsubscribeSync?.();
			clearInterval(interval);
		};
	}, []);

	// Handle Manual Sync
	const handleManualSync = async () => {
		if (!isOnline) {
			setErrorMessage("Cannot trigger sync while offline.");
			return;
		}

		if (isSyncing) return;

		setIsSyncing(true);
		setErrorMessage(null);

		try {
			const res = await window.electron.invoke("trigger-manual-sync");

			if (!res) {
				setErrorMessage("No response from sync process. Please try again.");
				return;
			}

			if (!res.success) {
				setErrorMessage(
					res.message ||
						"Sync failed — check your internet connection and try again.",
				);
				return;
			}

			// Skipped means no pending records (already in sync) OR a precondition wasn't met
			if (res.skipped) {
				const reason = res.reason || "";
				if (reason.toLowerCase().includes("license")) {
					setErrorMessage(
						"Sync skipped: No active license key found on this device.",
					);
				} else if (reason.toLowerCase().includes("database")) {
					setErrorMessage(
						"Sync skipped: Database is not ready yet. Please wait a moment and try again.",
					);
				} else {
					// Already fully synced — treat as success
					setShowSuccessToast(true);
					setTimeout(() => setShowSuccessToast(false), 5000);
				}
				return;
			}

			// Actual sync happened
			setShowSuccessToast(true);
			setTimeout(() => setShowSuccessToast(false), 5000);

			try {
				await fetchSyncAndVersionStatus();
			} catch (e) {
				console.error("Failed to refresh sync status", e);
			}
		} catch (err: unknown) {
			if (err instanceof Error) {
				setErrorMessage(err.message);
			} else {
				setErrorMessage("An unexpected error occurred during sync.");
			}
		} finally {
			setIsSyncing(false);
		}
	};

	// Determine total unsynced records
	const totalUnsynced =
		syncStatus ?
			syncStatus.unsyncedOrders +
			syncStatus.unsyncedOrderItems +
			syncStatus.unsyncedInventoryLogs
		:	0;

	// Only warn when there is data waiting to be backed up
	const isLagging = totalUnsynced > 0;

	// Human-readable last synced string
	const lastSyncedText = React.useMemo(() => {
		if (!syncStatus?.lastSyncedAt) return "Never";
		const date = new Date(syncStatus.lastSyncedAt);
		return date.toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
	}, [syncStatus?.lastSyncedAt]);

	// Check if last sync is at least 3 hours old
	const isSyncStale = React.useMemo(() => {
		if (!syncStatus?.lastSyncedAt) return false;
		const lastSync = new Date(syncStatus.lastSyncedAt).getTime();
		const now = Date.now();
		const threeHoursInMs = 3 * 60 * 60 * 1000;
		return now - lastSync >= threeHoursInMs;
	}, [syncStatus?.lastSyncedAt]);

	const updateAvailable = versionInfo?.updateAvailable && !isUpdateDismissed;
	// const hasSyncStatus = syncStatus !== null;
	// const showHealthyStatus =
	// 	hasSyncStatus &&
	// 	!isLagging &&
	// 	isOnline &&
	// 	!updateAvailable &&
	// 	!showSuccessToast &&
	// 	!errorMessage &&
	// 	!isSyncStale;

	return (
		<div className="w-full flex flex-col gap-2 border-b border-white/5 backdrop-blur-md transition-all duration-300">
			{/* 0. Stale Sync Warning (if last sync is 3+ hours old) */}
			{isSyncStale && isOnline && !errorMessage && (
				<div className="flex items-center justify-between p-4 py-1 bg-amber-500 backdrop-blur-lg text-white animate-in fade-in duration-300">
					<div className="flex items-center gap-3">
						<div className="p-2 rounded-lg bg-white/20">
							<AlertCircle className="size-5" />
						</div>
						<div>
							<p className="text-sm font-semibold">
								Last sync: {lastSyncedText}
							</p>
							<p className="text-[10px] leading-relaxed text-white/90">
								More than 3 hours since last backup. Consider syncing now.
							</p>
						</div>
					</div>
					<Button
						size="sm"
						variant="outline"
						disabled={isSyncing}
						className="!text-white hover:bg-white/20 shrink-0 flex items-center gap-1.5"
						onClick={handleManualSync}
					>
						<RefreshCw
							className={`size-3.5 ${isSyncing ? "animate-spin" : ""}`}
						/>
						{isSyncing ? "Syncing..." : "Sync Now"}
					</Button>
				</div>
			)}

			{/* 1. App Update available (Blue modern glass card, dismissible) */}
			{updateAvailable && versionInfo && (
				<div className="relative flex items-center justify-between gap-4 p-4 py-1 bg-blue-600 backdrop-blur-lg animate-in fade-in slide-in-from-top-4 duration-300 text-blue-100">
					<div className="flex items-center gap-3">
						<div className="p-2 rounded-lg bg-blue-500/20 text-white">
							<Cloud className="size-5 animate-pulse" />
						</div>
						<div>
							<h4 className="font-semibold text-sm leading-tight text-white flex items-center gap-2">
								POS Update Available (v{versionInfo?.latestVersion})
								<span className="text-xs font-normal text-white bg-white/20 px-2 py-0.5 rounded-full">
									Current: v{versionInfo?.currentVersion}
								</span>
							</h4>
							<p className="text-xs text-white max-w-2xl leading-relaxed">
								{versionInfo?.releaseNotes ||
									"A new update is available with performance improvements and bug fixes."}
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						{/* {console.log("Version Info:", versionInfo)} */}
						{versionInfo?.downloadUrl && (
							<Button
								size="sm"
								variant="default"
								className="bg-white hover:bg-white/90 text-blue-600 font-medium text-xs px-3.5 py-1.5 shadow-lg shadow-blue-500/20 flex items-center gap-1.5"
								onClick={() => {
									window.open(versionInfo?.downloadUrl, "_blank");
								}}
							>
								<Download className="size-3.5" />
								Download Update
							</Button>
						)}
						<Button
							size="icon"
							variant="ghost"
							className="size-8 text-white hover:text-blue-100 hover:bg-blue-500/10"
							onClick={() => setIsUpdateDismissed(true)}
						>
							<X className="size-4" />
						</Button>
					</div>
				</div>
			)}

			{/* 2. Critical/Warning backup lag or offline banner (Orange/Red card, non-dismissible) */}
			{isLagging && isSyncStale && (
				<div
					className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap p-4 py-1 ${!isOnline ? "bg-rose-500 text-white" : "bg-amber-600 text-amber-600"} backdrop-blur-lg duration-300`}
				>
					<div className="flex items-start sm:items-center gap-3">
						<div
							className={`p-2 rounded-lg ${!isOnline ? "bg-transparent text-white" : "bg-card/10 text-white"}`}
						>
							{!isOnline ?
								<WifiOff className="size-5 animate-bounce" />
							:	<AlertCircle className="size-5" />}
						</div>
						<div>
							<h4 className="font-semibold text-sm leading-tight text-white flex items-center gap-2">
								{!isOnline ? "You are Offline" : "Cloud Backup Required"}
							</h4>
							<p
								className={`text-xs leading-relaxed ${!isOnline ? "text-white" : "text-white"}`}
							>
								{!isOnline ?
									`Local transactions are safe, but cloud syncing is paused. ${totalUnsynced} pending records will sync automatically when connection returns.`
								:	`Unsynced records detected: ${totalUnsynced} items (Orders: ${syncStatus?.unsyncedOrders || 0}, Logs: ${syncStatus?.unsyncedInventoryLogs || 0}). Last synced: ${lastSyncedText}.`
								}
							</p>
						</div>
					</div>
					{isOnline && totalUnsynced > 0 && (
						<Button
							size="sm"
							variant="outline"
							disabled={isSyncing}
							className="!text-amber-600 hover:bg-white/90 shrink-0 self-end sm:self-center flex items-center gap-1.5"
							onClick={handleManualSync}
						>
							<RefreshCw
								className={`size-3.5 ${isSyncing ? "animate-spin" : ""}`}
							/>
							{isSyncing ? "Syncing..." : "Sync Now"}
						</Button>
					)}
				</div>
			)}

			{/* 3. Manual sync success message (Toast-style small banner, auto-dismissible) */}
			{showSuccessToast && !isLagging && isSyncStale && (
				<div className="flex items-center justify-between p-4 py-1 bg-primary backdrop-blur-lg text-emerald-100 animate-in fade-in duration-300">
					<div className="flex items-center gap-2.5">
						<div className="p-1.5 rounded-lg bg-white/20 text-white">
							<CheckCircle2 className="size-4" />
						</div>
						<div>
							<p className="text-xs font-medium text-white">
								Manual Sync Complete
							</p>
							<p className="text-[10px] text-white">
								All local transactions are fully synced to the secure cloud
								gateway.
							</p>
						</div>
					</div>
					<Button
						size="icon"
						variant="ghost"
						className="size-7 text-white hover:bg-emerald-500/10"
						onClick={() => setShowSuccessToast(false)}
					>
						<X className="size-3.5" />
					</Button>
				</div>
			)}

			{/* 4. Sync Error banner */}
			{errorMessage && (
				<div className="flex items-center justify-between p-4 py-1 bg-rose-600 backdrop-blur-lg text-rose-100 animate-in fade-in duration-300">
					<div className="flex items-center gap-2.5">
						<div className="p-1.5 rounded-lg bg-white/20 text-white">
							<AlertCircle className="size-4" />
						</div>
						<div>
							<p className="text-base font-medium text-white">Sync Failed</p>
							<p className="text-[10px] text-white">{errorMessage}</p>
						</div>
					</div>
					<Button
						size="icon"
						variant="ghost"
						className="size-7 text-white hover:bg-white/10"
						onClick={() => setErrorMessage(null)}
					>
						<X className="size-3.5" />
					</Button>
				</div>
			)}
		</div>
	);
};
