/** @format */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Logo } from "@/components/ui/logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowRight, X } from "lucide-react";

export const Login: React.FC = () => {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const { login, isLoading, user, isAuthenticated } = useAuth();
	const navigate = useNavigate();

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
				<div className="rounded-md shadow-none space-y-2 p-6">
					<p className="text-sm text-muted-foreground">
						Sign in to your account
					</p>
					<div>
						<Label htmlFor="username" className="">
							Username
						</Label>
						<Input
							id="username"
							name="username"
							type="text"
							required
							className="appearance-none rounded-md relative bg-white/20 block w-full px-3 py-2 border placeholder-muted-foreground text-foreground focus:outline-none focus:border-primary focus:!ring-0 focus:z-10 sm:text-sm"
							placeholder="Username"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
						/>
					</div>
					<div>
						<Label htmlFor="password" className="">
							Password
						</Label>
						<Input
							id="password"
							name="password"
							type="password"
							required
							className="appearance-none rounded-md relative bg-white/20 block w-full px-3 py-2 !pr-10 border placeholder-muted-foreground text-foreground focus:outline-none focus:border-primary focus:!ring-0 focus:z-10 sm:text-sm"
							placeholder="Password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
						/>
					</div>
					{error && (
						<div className="text-red-500 text-sm flex items-center gap-2 p-2 py-1 mb-4 rounded-md bg-destructive/10">
							<X className="size-4" />
							{error}
						</div>
					)}

					<div className="flex justify-end ">
						<Button type="submit" disabled={isLoading}>
							{isLoading ? "Signing in..." : "Sign in"}
							{!isLoading && <ArrowRight className="size-4" />}
						</Button>
					</div>
				</div>
			</form>
		</div>
	);
};
