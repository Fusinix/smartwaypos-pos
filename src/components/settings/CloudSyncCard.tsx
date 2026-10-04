/** @format */

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "./SectionCard";
import {
	UploadCloud,
	CheckCircle2,
	AlertCircle,
	Loader2,
	Database,
	Clock,
} from "lucide-react";
import { toast } from "sonner";

interface SyncStatus {
	unsyncedOrders: number;
	unsyncedOrderItems: number;
	unsyncedInventoryLogs: number;
	unsyncedExpenses: number;
	lastSyncedAt: string | null;
}

interface ProgressData {
	status: "uploading" | "completed" | "error";
	currentBatch?: number;
	totalBatches?: number;
	processedRecords?: number;
	totalRecords?: number;
	percentage?: number;
	message?: string;
}

export const CloudSyncCard: React.FC = () => {
	const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
	const [isSyncing, setIsSyncing] = useState(false);
	const [showProgressModal, setShowProgressModal] = useState(false);
	const [progress, setProgress] = useState<ProgressData | null>(null);

	const fetchSyncStatus = async () => {
		try {
			const res = await window.electron.invoke("get-sync-status");
			if (res && res.success) {
				setSyncStatus(res);
			}
		} catch (err) {
			console.error("Failed to fetch sync status:", err);
		}
	};

	useEffect(() => {
		fetchSyncStatus();

		const unsubStatus = window.electron.onSyncStatusChanged?.(() => {
			fetchSyncStatus();
		});

		const unsubProgress = window.electron.onSyncProgress?.(
			(data: ProgressData) => {
				setProgress(data);
				if (data.status === "completed") {
					setIsSyncing(false);
					fetchSyncStatus();
					toast.success("Cloud sync completed successfully!");
				} else if (data.status === "error") {
					setIsSyncing(false);
					toast.error(data.message || "Cloud sync failed.");
				}
			},
		);

		return () => {
			unsubStatus?.();
			unsubProgress?.();
		};
	}, []);

	const handleStartSync = async () => {
		try {
			setIsSyncing(true);
			setShowProgressModal(true);
			setProgress({
				status: "uploading",
				percentage: 0,
				message: "Checking unsynced database records...",
			});

			const res = await window.electron.invoke("trigger-manual-sync");
			if (res && res.success) {
				if (res.skipped) {
					setIsSyncing(false);
					setProgress({
						status: "completed",
						percentage: 100,
						message: res.reason || "All records are already up to date.",
					});
					toast.info(res.reason || "Local database is already up to date.");
				}
			} else {
				setIsSyncing(false);
				setProgress({
					status: "error",
					message: res?.message || "Sync failed to complete.",
				});
				toast.error(res?.message || "Sync failed.");
			}
		} catch (err: any) {
			setIsSyncing(false);
			setProgress({
				status: "error",
				message: err.message || "An unexpected error occurred during sync.",
			});
			toast.error("Failed to trigger cloud sync.");
		} finally {
			fetchSyncStatus();
		}
	};

	const totalPendingCount =
		(syncStatus?.unsyncedOrders || 0) +
		(syncStatus?.unsyncedOrderItems || 0) +
		(syncStatus?.unsyncedInventoryLogs || 0) +
		(syncStatus?.unsyncedExpenses || 0);

	const formatLastSync = (isoStr: string | null | undefined) => {
		if (!isoStr) return "Never synced";
		try {
			const d = new Date(isoStr);
			if (isNaN(d.getTime())) return "Never synced";
			return d.toLocaleString(undefined, {
				dateStyle: "medium",
				timeStyle: "short",
			});
		} catch {
			return "Never synced";
		}
	};

	const isAllBackedUp = syncStatus !== null && totalPendingCount === 0;

	return (
		<SectionCard title="Cloud Server Backup & Sync">
			<div className="space-y-4">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 ">
					<div className="space-y-1">
						<div className="flex items-center gap-2">
							<Clock className="size-4 text-slate-500" />
							<span className="text-xs font-semibold text-slate-500">
								Last Successful Sync:
							</span>
							<span className="text-xs font-bold text-slate-900">
								{formatLastSync(syncStatus?.lastSyncedAt)}
							</span>
						</div>
						<div className="flex items-center gap-2 pt-1">
							<span className="text-xs font-semibold text-slate-500">
								Status:
							</span>
							{totalPendingCount > 0 ?
								<Badge
									variant="secondary"
									className="bg-amber-100 text-amber-800 border-amber-200 font-bold"
								>
									{totalPendingCount.toLocaleString()} records pending
								</Badge>
							:	<Badge
									variant="secondary"
									className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold"
								>
									All data backed up to cloud
								</Badge>
							}
						</div>
					</div>

					{!isAllBackedUp && (
						<Button
							onClick={handleStartSync}
							disabled={isSyncing || isAllBackedUp}
						>
							{isSyncing ?
								<>
									<Loader2 className="size-4 animate-spin" />
									Backing up...
								</>
							:	<>
									<UploadCloud className="size-4" />
									Back Up
								</>
							}
						</Button>
					)}
				</div>
			</div>

			{/* Real-time Progress Modal */}
			{showProgressModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
					<div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
									{progress?.status === "completed" ?
										<CheckCircle2 className="size-6 text-emerald-600" />
									: progress?.status === "error" ?
										<AlertCircle className="size-6 text-rose-600" />
									:	<UploadCloud className="size-6 animate-pulse" />}
								</div>
								<div>
									<h3 className="text-base font-bold text-slate-900">
										{progress?.status === "completed" ?
											"Sync Completed"
										: progress?.status === "error" ?
											"Sync Failed"
										:	"Syncing Data to Server"}
									</h3>
									<p className="text-xs text-slate-500">
										{progress?.status === "completed" ?
											"All records backed up to Supabase"
										: progress?.status === "error" ?
											"An error occurred during upload"
										:	"Streaming batches to cloud..."}
									</p>
								</div>
							</div>
						</div>

						{/* Progress Bar */}
						<div className="space-y-2">
							<div className="flex justify-between text-xs font-bold text-slate-700">
								<span>Progress</span>
								<span>{progress?.percentage || 0}%</span>
							</div>
							<div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
								<div
									className={`h-full rounded-full transition-all duration-300 ${
										progress?.status === "completed" ? "bg-emerald-500"
										: progress?.status === "error" ? "bg-rose-500"
										: "bg-primary"
									}`}
									style={{ width: `${progress?.percentage || 0}%` }}
								/>
							</div>
						</div>

						{/* Live Status Message */}
						<div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs font-mono text-slate-600 truncate">
							{progress?.message || "Preparing sync engine..."}
						</div>

						{/* Modal Actions */}
						<div className="flex justify-end gap-2 pt-2 border-t">
							<Button
								variant={
									progress?.status === "completed" ? "default" : "outline"
								}
								disabled={isSyncing}
								onClick={() => setShowProgressModal(false)}
								className="font-bold text-xs"
							>
								{isSyncing ? "Syncing in background..." : "Close"}
							</Button>
						</div>
					</div>
				</div>
			)}
		</SectionCard>
	);
};

export default CloudSyncCard;
