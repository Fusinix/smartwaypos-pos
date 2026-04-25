/** @format */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Logo } from "@/components/ui/logo";
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
					const result = await window.electron.invoke("check-reset-status", licenseKey);
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
		} catch (err) {
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
				licenseKey
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
				newPassword
			);
			toast.success(
				`Password for admin "${result.username}" reset successfully!`
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
		<div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
			<form
				className="w-full max-w-md mx-auto bg-white shadow-md border rounded-xl"
				onSubmit={handleSubmit}
			>
				<div className="p-8 border-b border-border/50 bg-muted/5">
					<Logo size="md" />
					<p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-4 leading-relaxed">
						The best offline System for <span className="text-primary">Desktop & Tablet</span> devices
					</p>
				</div>
				<div className="rounded-md shadow-none space-y-4 p-6">
					<div className="space-y-1">
						<p className="text-sm font-medium text-foreground">
							Sign in to your account
						</p>
						<p className="text-xs text-muted-foreground">
							Enter your credentials to access the POS
						</p>
					</div>

					<div className="space-y-4">
						<div>
							<Label htmlFor="username">Username</Label>
							<Input
								id="username"
								name="username"
								type="text"
								required
								className="mt-1"
								placeholder="Username"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
							/>
						</div>
						<div>
							<div className="flex items-center justify-between">
								<Label htmlFor="password">Password</Label>
								<button
									type="button"
									onClick={() => setIsRecoveryOpen(true)}
									className="text-xs text-primary hover:underline font-medium"
								>
									Forgot password?
								</button>
							</div>
							<Input
								id="password"
								name="password"
								type="password"
								required
								className="mt-1"
								placeholder="Password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
						</div>
					</div>

					{error && (
						<div className="text-red-500 text-sm flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
							<X className="size-4" />
							{error}
						</div>
					)}

					<Button type="submit" className="w-full" disabled={isLoading}>
						{isLoading ? "Signing in..." : "Sign in"}
						{!isLoading && <ArrowRight className="ml-2 size-4" />}
					</Button>
				</div>
			</form>

			{/* Recovery Dialog */}
			<Dialog open={isRecoveryOpen} onOpenChange={setIsRecoveryOpen}>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>Admin Password Recovery</DialogTitle>
						<DialogDescription>
							{recoveryStep === 1 
								? "Enter your License Key to verify ownership of this system."
								: recoveryStep === 2
								? "Authorization Required. Log in to your Smartway Portal to approve this request."
								: "Identity verified! You can now set a new password for the primary admin account."}
						</DialogDescription>
					</DialogHeader>

					{recoveryStep === 1 ? (
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
					) : recoveryStep === 2 ? (
						<div className="space-y-6 py-6 text-center">
							<div className="space-y-2">
								<p className="text-sm text-muted-foreground">Select the number below in your Portal dashboard:</p>
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
									Check your phone or computer where you are logged into the Smartway Portal.
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
					) : (
						<form onSubmit={handleResetPassword} className="space-y-4 py-4">
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
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
};
