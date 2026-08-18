/** @format */

import React, { useState } from "react";
import { useKeyboard } from "@/context/KeyboardContext";
import { Button } from "@/components/ui/button";
import {
	X,
	Delete,
	ChevronRight,
	CornerDownLeft,
	Space,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const SideKeyboard: React.FC = () => {
	const { isOpen, mode, currentInput, closeKeyboard, setCurrentInput } =
		useKeyboard();

	const [layout, setLayout] = useState<"lowercase" | "uppercase" | "symbols">(
		"lowercase",
	);

	const handleKeyPress = (key: string) => {
		let activeInput = currentInput;

		// Magnet Connection: Always try to find the tagged active input first
		const taggedInput = document.querySelector(
			'[data-keyboard-active="true"]',
		) as HTMLInputElement | HTMLTextAreaElement;
		if (taggedInput && taggedInput !== activeInput) {
			activeInput = taggedInput;
			setCurrentInput(taggedInput);
		}

		if (!activeInput) return;

		// Self-healing: if the input was replaced in the DOM during a re-render
		if (!document.body.contains(activeInput)) {
			let replacement: HTMLInputElement | HTMLTextAreaElement | null = null;

			// Try finding by ID
			if (activeInput.id) {
				replacement = document.getElementById(activeInput.id) as any;
			}

			// Try finding by name if no ID or ID not found
			if (!replacement && activeInput.name) {
				replacement = document.querySelector(
					`input[name="${activeInput.name}"], textarea[name="${activeInput.name}"]`,
				) as any;
			}

			// Try finding by placeholder as a last resort
			if (!replacement && activeInput.placeholder) {
				const escapedPlaceholder = activeInput.placeholder.replace(
					/"/g,
					'\\"',
				);
				replacement = document.querySelector(
					`input[placeholder="${escapedPlaceholder}"], textarea[placeholder="${escapedPlaceholder}"]`,
				) as any;
			}

			if (replacement && replacement !== activeInput) {
				// Update both local and global state
				activeInput = replacement;
				setCurrentInput(replacement);

				// Ensure the new one is tagged
				replacement.setAttribute("data-keyboard-active", "true");
			} else {
				return;
			}
		}

		// Force focus if we lost it (e.g. due to clicking a label or Radix focus trap)
		if (document.activeElement !== activeInput) {
			activeInput.focus();
		}

		let start = 0;
		let end = 0;

		try {
			// Some input types like 'number' don't support selectionStart
			start = activeInput.selectionStart ?? activeInput.value.length;
			end = activeInput.selectionEnd ?? activeInput.value.length;
		} catch (e) {
			// Fallback for number inputs
			start = activeInput.value.length;
			end = activeInput.value.length;
		}
		const value = activeInput.value;
		let newPos = start;

		const updateInputValue = (newValue: string) => {
			if (!activeInput) return;

			// The "magic" setter that triggers React's internal state update
			const prototype =
				activeInput instanceof HTMLTextAreaElement ?
					window.HTMLTextAreaElement.prototype
				:	window.HTMLInputElement.prototype;

			const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");

			if (descriptor && descriptor.set) {
				descriptor.set.call(activeInput, newValue);
			} else {
				activeInput.value = newValue;
			}

			// Dispatch the input event
			const event = new Event("input", { bubbles: true });
			activeInput.dispatchEvent(event);
		};

		// Ensure focus before we do anything
		activeInput.focus();

		if (key === "BACKSPACE") {
			if (start === end && start > 0) {
				const newValue = value.substring(0, start - 1) + value.substring(end);
				updateInputValue(newValue);
				newPos = start - 1;
			} else {
				const newValue = value.substring(0, start) + value.substring(end);
				updateInputValue(newValue);
				newPos = start;
			}
		} else if (key === "ENTER") {
			const event = new KeyboardEvent("keydown", {
				key: "Enter",
				code: "Enter",
				bubbles: true,
			});
			activeInput.dispatchEvent(event);
			closeKeyboard();
			return;
		} else {
			// For normal characters and SPACE, use execCommand if possible for better React compatibility
			const char = key === "SPACE" ? " " : key;

			try {
				// Try execCommand first as it's best for React state sync
				const worked = document.execCommand("insertText", false, char);
				if (!worked) {
					throw new Error("execCommand failed");
				}
				// If it worked, browser updated value and triggered events
				newPos = start + 1;
			} catch (e) {
				// Fallback to manual update if execCommand is not supported or fails
				const newValue =
					value.substring(0, start) + char + value.substring(end);
				updateInputValue(newValue);
				newPos = start + 1;
			}
		}

		// Re-focus and restore selection after React has had a chance to re-render
		requestAnimationFrame(() => {
			if (!activeInput || !document.body.contains(activeInput)) return;
			activeInput.focus();
			try {
				activeInput.setSelectionRange(newPos, newPos);
			} catch (e) {}
		});
	};

	const Key = ({ value, label, className, variant = "outline" }: any) => (
		<Button
			variant={variant}
			tabIndex={-1}
			className={cn(
				"text-xl sm:text-xl font-bold rounded-xl transition-all active:scale-90 !shadow-none border-border/40 h-10 sm:h-11",
				className,
			)}
			onPointerDown={(e) => {
				e.preventDefault();
				e.stopPropagation();
				e.nativeEvent.stopImmediatePropagation();
			}}
			onMouseDown={(e) => {
				e.preventDefault();
			}}
			onClick={(e) => {
				e.stopPropagation();
				e.nativeEvent.stopImmediatePropagation();
				handleKeyPress(value);
			}}
		>
			{label || value}
		</Button>
	);

	const alphabet = [
		["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
		["a", "s", "d", "f", "g", "h", "j", "k", "l"],
		["SHIFT", "z", "x", "c", "v", "b", "n", "m", "BACKSPACE"],
		["123", "SPACE", "ENTER"],
	];

	const symbolKeys = [
		[1, 2, 3, 4, 5, 6, 7, 8, 9, 0],
		["-", "/", ":", ";", "(", ")", "$", "&", "@", '"'],
		["#", "+", "=", ".", ",", "?", "!", "'", "BACKSPACE"],
		["ABC", "SPACE", "ENTER"],
	];

	const bottomPositionClass = cn(
		"!z-[1000] transition-all duration-300 ease-in-out overflow-hidden flex flex-col keyboard-container flex-shrink-0 w-[100%]",
		// "h-screen",
		// isOpen ? "w-[400px] sm:w-[500px]" : "w-0 border-l-0 shadow-none",
		isOpen ? "h-fit" : "h-0 border-l-0 shadow-none",
		// "absolute bottom-0 left-0 right-0 z-10",
	);

	if (!isOpen) return null;

	return (
		<div
			tabIndex={-1}
			onPointerDown={(e) => {
				e.preventDefault();
				e.stopPropagation();
				e.nativeEvent.stopImmediatePropagation();
			}}
			onPointerUp={(e) => {
				e.stopPropagation();
				e.nativeEvent.stopImmediatePropagation();
			}}
			onMouseDown={(e) => {
				e.preventDefault();
				e.stopPropagation();
				e.nativeEvent.stopImmediatePropagation();
			}}
			onMouseUp={(e) => {
				e.stopPropagation();
				e.nativeEvent.stopImmediatePropagation();
			}}
			onClick={(e) => {
				e.stopPropagation();
				e.nativeEvent.stopImmediatePropagation();
			}}
			className={cn(
				"relative bg-muted border-t z-[1000] transition-all duration-300 ease-in-out shadow-none flex flex-col keyboard-container flex-shrink-0 p-2",
				bottomPositionClass,
				// isBottomPosition ? bottomPositionClass : rightPositionClass,
			)}
		>
			<div
				className={cn(
					"relative overflow-y-auto overflow-x-hidden flex-1 p-6 bg-white flex divide-x gap-6 w-full !max-w-[80%] xl:!max-w-[65%] mx-auto rounded-xl shadow-xl",
				)}
			>
				{/* {mode != "numeric" ? */}
				<div className={cn("flex flex-col gap-3 flex-1")}>
					{(layout === "symbols" || mode === "numeric" ?
						symbolKeys
					:	alphabet
					).map((row, i) => (
						<div key={i} className="flex justify-center gap-2">
							{row.map((key) => {
								if (key === "SHIFT") {
									return (
										<Button
											key="shift"
											variant="outline"
											tabIndex={-1}
											className={cn(
												"flex-1 rounded-xl shadow-none border-0 bg-muted/90 h-10 sm:h-12",
												layout === "uppercase" &&
													"bg-primary text-primary-foreground border-primary shadow-none shadow-primary/20",
											)}
											onPointerDown={(e) => {
												e.preventDefault();
												e.stopPropagation();
												e.nativeEvent.stopImmediatePropagation();
											}}
											onMouseDown={(e) => {
												e.preventDefault();
											}}
											onClick={(e) => {
												e.stopPropagation();
												e.nativeEvent.stopImmediatePropagation();
												setLayout((prev) =>
													prev === "lowercase" ? "uppercase" : "lowercase",
												);
											}}
										>
											<ChevronRight
												className={cn(
													"size-6 transition-transform",
													layout === "uppercase" ? "-rotate-90" : "",
												)}
											/>
										</Button>
									);
								}
								if (key === "123" || key === "ABC") {
									return (
										<Button
											key="mode"
											variant="outline"
											tabIndex={-1}
											className={cn(
												"flex-1 rounded-xl shadow-none bg-muted/90 border-0 text-sm font-black h-10 sm:h-12",
											)}
											onPointerDown={(e) => {
												e.preventDefault();
												e.stopPropagation();
												e.nativeEvent.stopImmediatePropagation();
											}}
											onMouseDown={(e) => {
												e.preventDefault();
											}}
											onClick={(e) => {
												e.stopPropagation();
												e.nativeEvent.stopImmediatePropagation();
												setLayout((prev) =>
													prev === "symbols" ? "lowercase" : "symbols",
												);
											}}
										>
											{key}
										</Button>
									);
								}
								if (key === "SPACE") {
									return (
										<Key
											key="space"
											value="SPACE"
											label={<Space className="size-6" />}
											className="flex-[3] bg-muted/90 border-none"
										/>
									);
								}
								if (key === "ENTER") {
									return (
										<Key
											key="enter"
											value="ENTER"
											label={<CornerDownLeft className="size-6" />}
											variant="default"
											className="flex-1 shadow-xl shadow-primary/30"
										/>
									);
								}
								if (key === "BACKSPACE") {
									return (
										<Key
											key="back"
											value="BACKSPACE"
											label={<Delete className="size-6" />}
											className="flex-1 bg-destructive text-white"
										/>
									);
								}

								const char =
									layout === "uppercase" && typeof key !== "number" ?
										key.toUpperCase()
									:	key;
								return (
									<Key
										key={key}
										value={char}
										className="flex-1 min-w-0 px-0 shadow-none"
									/>
								);
							})}
						</div>
					))}
				</div>
				{/* :	null} */}
				{/* {mode === "numeric" ?
					<div
						className={cn(
							"grid grid-cols-3 gap-4 max-h-[600px]",
							isBottomPosition ? "pl-6" : "",
						)}
					>
						{numericKeys.map((key) => (
							<Key
								key={key}
								value={key}
							
								label={
									key === "BACKSPACE" ? <Delete className="size-8" /> : key
								}
								className={
									key === "BACKSPACE" ?
										isBottomPosition ?
											"hidden"
										:	"bg-muted/50 text-destructive border-destructive/20"
									:	"bg-card hover:bg-muted/50"
								}
							/>
						))}
						<Button
							variant="default"
							tabIndex={-1}
							className={cn(
								"col-span-3 h-20 rounded-xl text-xl font-black uppercase italic tracking-widest shadow-xl shadow-primary/30 mt-2",
								isBottomPosition ? "hidden" : "",
							)}
							onPointerDown={(e) => {
								e.preventDefault();
								e.stopPropagation();
								e.nativeEvent.stopImmediatePropagation();
							}}
							onMouseDown={(e) => {
								e.preventDefault();
							}}
							onClick={(e) => {
								e.stopPropagation();
								e.nativeEvent.stopImmediatePropagation();
								closeKeyboard();
							}}
						>
							Confirm Entry
						</Button>
					</div>
				:	null} */}
				<Button
					variant="ghost"
					size="icon"
					tabIndex={-1}
					onPointerDown={(e) => {
						e.preventDefault();
						e.stopPropagation();
						e.nativeEvent.stopImmediatePropagation();
					}}
					onMouseDown={(e) => {
						e.preventDefault();
					}}
					onClick={(e) => {
						e.stopPropagation();
						e.nativeEvent.stopImmediatePropagation();
						closeKeyboard();
					}}
					className="absolute -top-1 -right-1 z-[999] rounded-full size-10 hover:bg-destructive/10 hover:text-destructive bg-card !shadow-none !border-0"
				>
					<X className="size-4" />
				</Button>
			</div>

			<div className="p-4 border-t border-border/30 bg-muted/20 hidden">
				<p className="text-[10px] text-center font-bold text-muted-foreground uppercase tracking-tighter">
					Smartway POS Keyboard v1.0
				</p>
			</div>
		</div>
	);
};
