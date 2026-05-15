/** @format */

const EmptyState = ({
	icon,
	title,
	description,
}: {
	icon: any;
	title: string;
	description?: string;
}) => {
	const Icon = icon;
	return (
		<div className="text-center py-12 rounded-xl bg-card">
			{icon && <Icon className="mx-auto text-muted-foreground/60" />}
			<div className="text-lg font-semibold mt-4">{title}</div>
			{description && (
				<div className="text-sm text-gray-400">{description}</div>
			)}
		</div>
	);
};

export default EmptyState;
