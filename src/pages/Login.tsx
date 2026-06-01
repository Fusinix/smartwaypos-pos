/** @format */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSettingsStore } from "../stores/useSettingsStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowRight, X } from "lucide-react";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Login: React.FC = () => {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const { login, isLoading, user, isAuthenticated } = useAuth();
	const navigate = useNavigate();

	const { settings, setSettings } = useSettingsStore();

	// Load settings on mount to hydrate custom branding
	useEffect(() => {
		const loadSettings = async () => {
			try {
				const settingsData = await window.electron.invoke("get-settings");
				setSettings(settingsData);
			} catch (err) {
				console.error("Error loading settings in login page:", err);
			}
		};
		if (!settings) {
			loadSettings();
		}
	}, [settings, setSettings]);

	const businessName = settings?.general?.businessName || "Smartway POS";
	const businessLogo = settings?.general?.businessLogo;
	const businessBanner = settings?.general?.businessBanner;

	// Recovery state
	const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
	const [recoveryStep, setRecoveryStep] = useState<1 | 2 | 3>(1); // 1: Verify Key, 2: Waiting for Auth, 3: New Password
	const [licenseKey, setLicenseKey] = useState("");
	const [verificationNumber, setVerificationNumber] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [recoveryError, setRecoveryError] = useState("");
	const [isProcessing, setIsProcessing] = useState(false);

	// Reset recovery state when dialog opens/closes
	useEffect(() => {
		if (!isRecoveryOpen) {
			setRecoveryStep(1);
			setLicenseKey("");
			setVerificationNumber("");
			setNewPassword("");
			setConfirmPassword("");
			setRecoveryError("");
		}
	}, [isRecoveryOpen]);

	// Polling for Authorization
	useEffect(() => {
		let pollInterval: NodeJS.Timeout;

		if (isRecoveryOpen && recoveryStep === 2) {
			pollInterval = setInterval(async () => {
				try {
					const result = await window.electron.invoke(
						"check-reset-status",
						licenseKey,
					);
					if (result.status === "approved") {
						setRecoveryStep(3);
						toast.success("Identity verified! Please set your new password.");
					} else if (result.status === "rejected") {
						setRecoveryStep(1);
						setRecoveryError("Authorization rejected by admin.");
					}
				} catch (err) {
					console.error("Polling error:", err);
				}
			}, 2500); // Poll every 2.5 seconds
		}

		return () => {
			if (pollInterval) clearInterval(pollInterval);
		};
	}, [isRecoveryOpen, recoveryStep, licenseKey]);

	// Redirect after successful login based on user role
	useEffect(() => {
		if (isAuthenticated && user) {
			if (user.role === "cashier") {
				navigate("/orders", { replace: true });
			} else {
				navigate("/", { replace: true });
			}
		}
	}, [isAuthenticated, user, navigate]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		try {
			await login(username, password);
		} catch (err: any) {
			setError("Invalid username or password");
		}
	};

	const handleVerifyKey = async (e: React.FormEvent) => {
		e.preventDefault();
		setRecoveryError("");

		try {
			setIsProcessing(true);
			const result = await window.electron.invoke(
				"request-password-reset",
				licenseKey,
			);
			if (result.success) {
				setVerificationNumber(result.verificationNumber);
				setRecoveryStep(2);
			} else {
				setRecoveryError(result.message || "Invalid license key.");
			}
		} catch (err: any) {
			setRecoveryError("Communication error. Please try again.");
		} finally {
			setIsProcessing(false);
		}
	};

	const handleResetPassword = async (e: React.FormEvent) => {
		e.preventDefault();
		setRecoveryError("");

		if (newPassword !== confirmPassword) {
			setRecoveryError("Passwords do not match");
			return;
		}

		if (newPassword.length < 6) {
			setRecoveryError("Password must be at least 6 characters long");
			return;
		}

		try {
			setIsProcessing(true);
			const result = await window.electron.invoke(
				"complete-password-reset",
				licenseKey,
				newPassword,
			);
			toast.success(
				`Password for admin "${result.username}" reset successfully!`,
			);
			setIsRecoveryOpen(false);
			setUsername(result.username);
		} catch (err: any) {
			setRecoveryError(err.message || "Failed to reset password.");
		} finally {
			setIsProcessing(false);
		}
	};

	return (
		<div className="h-screen w-full flex bg-slate-50 overflow-hidden font-sans select-none relative">
			{/* Left Branding Pane (visible only on lg screens and larger) */}
			<div className="hidden lg:flex lg:w-1/2 relative bg-emerald-950 text-white overflow-hidden items-center justify-center p-12 h-full">
				{/* Background layer */}
				{businessBanner ?
					<>
						<img
							src={businessBanner}
							alt="Business Banner"
							className="absolute inset-0 w-full h-full object-cover opacity-60"
						/>
						<div className="absolute inset-0 bg-gradient-to-tr from-emerald-950 via-emerald-900/90 to-emerald-950/80 backdrop-blur-[2px]" />
					</>
				:	<>
						{/* Sleek abstract modern grid background */}
						<div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950" />
						<div
							className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.15),transparent_60%)] animate-pulse"
							style={{ animationDuration: "6s" }}
						/>
						<div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
						<div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-teal-500/10 blur-[120px] pointer-events-none" />
					</>
				}

				{/* Floating elegant glassmorphic brand container */}
				<div className="relative z-10 max-w-lg w-full bg-black/35 backdrop-blur-xl rounded-2xl p-10 shadow-2xl flex flex-col items-center text-center space-y-6">
					{businessLogo ?
						<div className="h-28 w-28 rounded-2xl bg-white border border-white/20 p-2 shadow-2xl flex items-center justify-center overflow-hidden">
							<img
								src={businessLogo}
								alt="Business Logo"
								className="max-h-full max-w-full object-contain rounded"
							/>
						</div>
					:	<div className="h-28 w-28 rounded-2xl bg-white border border-white/20 p-2 shadow-2xl flex items-center justify-center overflow-hidden">
							<img
								src="images/logo.png"
								alt="Default Logo"
								className="max-h-full max-w-full object-contain"
							/>
						</div>
					}

					<div className="space-y-3">
						<h1 className="text-4xl font-extrabold capitalize text-white drop-shadow-md leading-tight">
							{businessName}
						</h1>
					</div>

					<p className="text-xs text-white/70 max-w-xs leading-relaxed">
						Welcome to your point of sale terminal. <br />
						Please authenticate to start or resume your shift.
					</p>
				</div>
			</div>

			{/* Right Login Pane */}
			<div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 md:p-16 bg-white overflow-y-auto relative h-full">
				<div className="w-full max-w-md mx-auto space-y-8 flex flex-col justify-center h-full">
					{/* Logo & custom banner header for mobile/tablet screens */}
					<div className="block lg:hidden w-full relative rounded-2xl overflow-hidden mb-6 bg-emerald-950 text-white shadow-xl shadow-emerald-950/10 shrink-0">
						{businessBanner ?
							<>
								<img
									src={businessBanner}
									alt="Mobile Banner"
									className="absolute inset-0 w-full h-full object-cover opacity-40"
								/>
								<div className="absolute inset-0 bg-gradient-to-tr from-emerald-950 via-emerald-900/80 to-emerald-950/60" />
							</>
						:	<div className="absolute inset-0 bg-gradient-to-tr from-emerald-950 via-emerald-900 to-teal-900" />
						}
						<div className="relative z-10 p-6 flex items-center space-x-4">
							{businessLogo ?
								<div className="h-16 w-16 bg-white rounded-xl flex items-center justify-center p-1 shadow-md shrink-0">
									<img
										src={businessLogo}
										alt="Business Logo"
										className="max-h-full max-w-full object-contain"
									/>
								</div>
							:	<div className="h-16 w-16 bg-white rounded-xl flex items-center justify-center p-1 shadow-md shrink-0">
									<img
										src="images/logo.png"
										alt="Default Logo"
										className="max-h-full max-w-full object-contain"
									/>
								</div>
							}
							<div className="min-w-0">
								<h1 className="text-xl font-bold uppercase truncate text-white">
									{businessName}
								</h1>
								<p className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">
									Point of Sale Terminal
								</p>
							</div>
						</div>
					</div>

					{/* Desktop small branding header */}
					<div className="hidden items-center space-x-4 mb-4">
						{businessLogo ?
							<div className="h-14 w-14 bg-white rounded-xl border border-slate-200 flex items-center justify-center p-1 shadow-sm shrink-0">
								<img
									src={businessLogo}
									alt="Business Logo"
									className="max-h-full max-w-full object-contain"
								/>
							</div>
						:	<div className="h-14 w-14 bg-white rounded-xl border border-slate-200 flex items-center justify-center p-1 shadow-sm shrink-0">
								<img
									src="images/logo.png"
									alt="Default Logo"
									className="max-h-full max-w-full object-contain"
								/>
							</div>
						}
						<div className="min-w-0">
							<h1 className="text-xl font-extrabold uppercase italic tracking-tighter truncate text-slate-850">
								{businessName}
							</h1>
							<p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">
								Secure Local Shift Login
							</p>
						</div>
					</div>

					<form className="space-y-6 w-full shrink-0" onSubmit={handleSubmit}>
						<div className="space-y-1">
							<p className="text-lg font-bold text-slate-900">Log in</p>
							<p className="text-xs text-slate-500">
								Enter your credentials to access your session.
							</p>
						</div>

						<div className="space-y-4">
							<div className="space-y-1.5">
								<Label
									htmlFor="username"
									className="text-xs font-semibold text-slate-600"
								>
									Username
								</Label>
								<Input
									id="username"
									name="username"
									type="text"
									required
									className="h-11 border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 rounded-xl"
									placeholder="Enter your username"
									value={username}
									onChange={(e) => setUsername(e.target.value)}
								/>
							</div>
							<div className="space-y-1.5">
								<div className="flex items-center justify-between">
									<Label
										htmlFor="password"
										className="text-xs font-semibold text-slate-600"
									>
										Password
									</Label>
									<button
										type="button"
										onClick={() => setIsRecoveryOpen(true)}
										className="text-xs text-emerald-600 hover:text-emerald-700 font-bold"
									>
										Forgot password?
									</button>
								</div>
								<Input
									id="password"
									name="password"
									type="password"
									required
									className="h-11 border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 rounded-xl"
									placeholder="Enter your password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
								/>
							</div>
						</div>

						{error && (
							<div className="text-red-600 text-xs flex items-center gap-2 p-3.5 rounded-xl bg-red-50 border border-red-100 font-medium">
								<X className="size-4 shrink-0 text-red-500" />
								{error}
							</div>
						)}

						<Button
							type="submit"
							className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
							disabled={isLoading}
						>
							{isLoading ? "Signing in..." : "Sign in"}
							{!isLoading && <ArrowRight className="ml-2 size-4" />}
						</Button>
					</form>

					<div className="pt-8 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
						<span>Powered by Smartway POS</span>
						<span>Version 1.0.0</span>
					</div>
				</div>
			</div>

			{/* Recovery Dialog */}
			<Dialog open={isRecoveryOpen} onOpenChange={setIsRecoveryOpen}>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle className="mt-12">Admin Password Recovery</DialogTitle>
						<DialogDescription>
							{recoveryStep === 1 ?
								"Enter your License Key to verify ownership of this system."
							: recoveryStep === 2 ?
								"Authorization Required. Log in to your Smartway Portal to approve this request."
							:	"Identity verified! You can now set a new password for the primary admin account."
							}
						</DialogDescription>
					</DialogHeader>

					{recoveryStep === 1 ?
						<form onSubmit={handleVerifyKey} className="space-y-4 py-4">
							<div className="space-y-2">
								<Label htmlFor="licenseKey">License Key</Label>
								<Input
									id="licenseKey"
									placeholder="SW-XXXX-XXXX-XXXX"
									value={licenseKey}
									onChange={(e) => setLicenseKey(e.target.value)}
									required
									autoFocus
								/>
							</div>

							{recoveryError && (
								<div className="text-destructive text-sm bg-destructive/10 p-2 rounded border border-destructive/20 flex items-center gap-2">
									<X className="size-4" />
									{recoveryError}
								</div>
							)}

							<DialogFooter>
								<Button
									type="button"
									variant="outline"
									onClick={() => setIsRecoveryOpen(false)}
								>
									Cancel
								</Button>
								<Button type="submit" disabled={isProcessing}>
									{isProcessing ? "Verifying..." : "Verify License"}
								</Button>
							</DialogFooter>
						</form>
					: recoveryStep === 2 ?
						<div className="space-y-6 py-6 text-center">
							<div className="space-y-2">
								<p className="text-sm text-muted-foreground">
									Select the number below in your Portal dashboard:
								</p>
								<div className="text-6xl font-bold text-primary tracking-tighter">
									{verificationNumber}
								</div>
							</div>

							<div className="flex flex-col items-center gap-2">
								<div className="flex items-center gap-2 text-xs text-muted-foreground">
									<div className="size-2 rounded-full bg-primary animate-pulse" />
									Waiting for Admin approval...
								</div>
								<p className="text-[10px] text-muted-foreground px-6">
									Check your phone or computer where you are logged into the
									Smartway Portal.
								</p>
							</div>

							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => setRecoveryStep(1)}
								className="mt-4"
							>
								Back to License Key
							</Button>
						</div>
					:	<form onSubmit={handleResetPassword} className="space-y-4 py-4">
							<div className="space-y-2">
								<Label htmlFor="newPassword">New Password</Label>
								<Input
									id="newPassword"
									type="password"
									placeholder="Minimum 6 characters"
									value={newPassword}
									onChange={(e) => setNewPassword(e.target.value)}
									required
									autoFocus
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="confirmPassword">Confirm New Password</Label>
								<Input
									id="confirmPassword"
									type="password"
									placeholder="Repeat new password"
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									required
								/>
							</div>

							{recoveryError && (
								<div className="text-destructive text-sm bg-destructive/10 p-2 rounded border border-destructive/20 flex items-center gap-2">
									<X className="size-4" />
									{recoveryError}
								</div>
							)}

							<DialogFooter>
								<Button
									type="button"
									variant="outline"
									onClick={() => setRecoveryStep(2)}
								>
									Back
								</Button>
								<Button type="submit" disabled={isProcessing}>
									{isProcessing ? "Resetting..." : "Reset Password"}
								</Button>
							</DialogFooter>
						</form>
					}
				</DialogContent>
			</Dialog>
		</div>
	);
};
