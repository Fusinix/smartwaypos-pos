/** @format */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseJSONString } from "@/lib/utils";
import React, { useEffect, useState } from "react";
import { SimpleAlert } from "../components/alerts/simple-alert";
import { SectionCard } from "../components/settings/SectionCard";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../hooks/useSettings";
import type { GeneralSettings } from "../types/settings";

export const Profile: React.FC = () => {
	const { user } = useAuth();
	const { settings, loading, error, updateSettings } = useSettings();

	const [localError, setLocalError] = useState<string | null>(null);
	const [showErrorDialog, setShowErrorDialog] = useState(false);

	// Local state for settings with default values
	const [localGeneralSettings, setLocalGeneralSettings] =
		useState<GeneralSettings>({
			businessName: "",
			defaultCurrency: "GHS",
			printReceipts: false,
			...settings?.general,
		});

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
	}, [settings]);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-lg">Loading profile...</div>
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

	return (
		<div className="h-full flex flex-col">
			{/* Page Header */}
			<div className="bg-white border-b px-8 py-6">
				<h1 className="text-3xl font-bold text-gray-900">Profile</h1>
				<p className="text-sm text-gray-500 mt-1">
					Manage your business information
				</p>
			</div>

			{/* Main Content */}
			<div className="flex-1 px-8 py-6 overflow-y-auto">
				<SimpleAlert
					open={showErrorDialog}
					onOpenChange={setShowErrorDialog}
					message={localError || error || ""}
				/>

				<SectionCard title={user?.role === "admin" ? "General Settings" : ""}>
					{user?.role === "admin" ?
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
									className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary/90 focus:ring-primary/90 sm:text-sm"
								/>
							</div>
							<div>
								<Label className="block text-sm font-medium text-gray-700">
									Business Logo
								</Label>
								<div className="mt-2 flex items-center space-x-4">
									{localGeneralSettings.businessLogo && (
										<div className="h-16 w-16 border rounded bg-gray-50 flex items-center justify-center p-1">
											<img 
												src={localGeneralSettings.businessLogo} 
												alt="Logo" 
												className="max-h-full max-w-full object-contain"
											/>
										</div>
									)}
									<input
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
										className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90"
									/>
									{localGeneralSettings.businessLogo && (
										<Button 
											variant="ghost" 
											size="sm" 
											onClick={() => setLocalGeneralSettings({...localGeneralSettings, businessLogo: ""})}
											className="text-red-500 hover:text-red-700"
										>
											Clear
										</Button>
									)}
								</div>
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
									className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary/90 focus:ring-primary/90 sm:text-sm"
								>
									<option value="GHS">GHS</option>
								</select>
							</div>
							<div className="flex justify-end">
								<Button
									onClick={handleSaveGeneralSettings}
									className="bg-primary text-white hover:bg-primary"
								>
									Save Changes
								</Button>
							</div>
						</div>
					:	<div className="space-y-6">
							{/* show user name and role, all should be read only */}
							<div>
								<Label className="block text-sm font-medium text-gray-700">
									Name
								</Label>
								<Input
									type="text"
									value={user?.username}
									className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary/90 focus:ring-primary/90 sm:text-sm"
									readOnly
								/>
							</div>
							<div>
								<Label className="block text-sm font-medium text-gray-700">
									Role
								</Label>
								<Input
									type="text"
									value={user?.role}
									className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary/90 focus:ring-primary/90 sm:text-sm"
									readOnly
								/>
							</div>
						</div>
					}
				</SectionCard>
			</div>
		</div>
	);
};

export default Profile;
