/** @format */

import React from "react";

interface SectionCardProps {
	title: string;
	children: React.ReactNode;
	className?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({
	title,
	children,
	className = "",
}) => {
	return (
		<div className={`${className}`}>
			<h2 className="text-base font-semibold text-gray-900 mb-4">{title}</h2>
			<div className="space-y-4 bg-card rounded-xl border p-4">{children}</div>
		</div>
	);
};
