/** @format */

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Share2, Printer, MessageCircle, Mail, Phone } from "lucide-react";
import { useState, useEffect } from "react";
import type { Order } from "@/types";
import { useCurrency } from "@/hooks/useCurrency";
import { useSettings } from "@/hooks/useSettings";

interface ReceiptShareDialogProps {
	order: Order | null;
	open: boolean;
	onClose: () => void;
	onPrint?: () => void;
}

export const ReceiptShareDialog: React.FC<ReceiptShareDialogProps> = ({
	order,
	open,
	onClose,
	onPrint,
}) => {
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [whatsappPhone, setWhatsappPhone] = useState("");
	const { format: formatCurrency, currency } = useCurrency();
	const { settings } = useSettings();
	const [businessName, setBusinessName] = useState("SmartWay Pos");

	useEffect(() => {
		if (settings?.general?.businessName) {
			setBusinessName(settings.general.businessName);
		}
	}, [settings]);

	if (!order) return null;

	const generateReceiptText = () => {
		const subtotal = order.amount_bt ?? 0;
		const taxAmount = (order.amount ?? 0) - subtotal;
		const total = order.amount ?? 0;

		let receiptText = `${businessName}\n`;
		receiptText += `Receipt - Order #${order.order_number ?? order.id}\n`;
		receiptText += `Date: ${new Date(order.created_at || new Date()).toLocaleString()}\n`;
		const orderTypeLabel = order.order_type === "table" ? "Table Order" : order.order_type === "takeout" ? "Take-Out Order" : "Customer Order";
		receiptText += `Type: ${orderTypeLabel}\n`;
		if (order.order_type === "table" && order.table_number) {
			receiptText += `Table: ${order.table_number}\n`;
		}
		if (order.order_type === "takeout" && order.table_number) {
			receiptText += `Take-Out Table: ${order.table_number}\n`;
		}
		receiptText += `\nItems:\n\n`;

		if (order.items && order.items.length > 0) {
			order.items.forEach((item: any) => {
				const itemName = item.item_type === "food" ? (item.food_item_name || item.product_name || "Item") : (item.product_name || "Item");
				const basePrice = item.item_type === "food" ? (item.food_price || item.price || 0) : (item.price || 0);
				let itemTotal = basePrice * (item.quantity || 1);
				let extrasTotal = 0;
				
				// Add extras for food items
				if (item.item_type === "food" && item.extras && item.extras.length > 0) {
					extrasTotal = item.extras.reduce(
						(sum: number, e: any) => sum + (e.price || 0) * (e.quantity || 1),
						0
					);
					itemTotal += extrasTotal * (item.quantity || 1);
				}
				
				receiptText += `${itemName} x${item.quantity || 1} - ${formatCurrency(itemTotal)}\n`;
				
				// Show base price
				if (basePrice > 0) {
					receiptText += `  Base: ${formatCurrency(basePrice * (item.quantity || 1))}\n`;
				}
				
				// Show extras with prices
				if (item.item_type === "food" && item.extras && item.extras.length > 0 && extrasTotal > 0) {
					receiptText += `  Extras:\n`;
					item.extras.forEach((e: any) => {
						const extraQty = e.quantity || 1;
						const extraPrice = (e.price || 0) * extraQty * (item.quantity || 1);
						receiptText += `    - ${e.name}${extraQty > 1 ? ` (×${extraQty})` : ""}: ${formatCurrency(extraPrice)}\n`;
					});
					receiptText += `  Extras Total: ${formatCurrency(extrasTotal * (item.quantity || 1))}\n`;
				}
				
				if (item.notes) {
					receiptText += `  Note: ${item.notes}\n`;
				}
				
				receiptText += `\n`;
			});
		}

		receiptText += `\nSubtotal: ${formatCurrency(subtotal)}\n`;
		receiptText += `\nTax (${order.tax || 0}%): ${formatCurrency(taxAmount)}\n`;
		receiptText += `\nTOTAL: ${formatCurrency(total)}\n`;
		receiptText += `\nPayment: ${(order.payment_mode || "cash").toUpperCase()}\n`;

		if (order.notes) {
			receiptText += `\nNotes: ${order.notes}\n`;
		}

		receiptText += `\nThank you for your business!`;

		return receiptText;
	};

	const handleWhatsAppShare = () => {
		if (!whatsappPhone) {
			alert("Please enter a phone number");
			return;
		}

		const receiptText = generateReceiptText();
		const encodedText = encodeURIComponent(receiptText);
		const phoneNumber = whatsappPhone.replace(/[^0-9]/g, ""); // Remove non-numeric characters

		// WhatsApp Web API
		const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedText}`;
		window.open(whatsappUrl, "_blank");
		onClose();
	};

	const handleEmailShare = () => {
		if (!email) {
			alert("Please enter an email address");
			return;
		}

		const receiptText = generateReceiptText();
		const subject = encodeURIComponent(`Receipt - Order #${order.id}`);
		const body = encodeURIComponent(receiptText);

		const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;
		window.location.href = mailtoUrl;
		onClose();
	};

	const handleSMSShare = () => {
		if (!phone) {
			alert("Please enter a phone number");
			return;
		}

		const receiptText = generateReceiptText();
		const encodedText = encodeURIComponent(receiptText);
		const phoneNumber = phone.replace(/[^0-9]/g, ""); // Remove non-numeric characters

		// SMS link (works on mobile devices)
		const smsUrl = `sms:${phoneNumber}?body=${encodedText}`;
		window.location.href = smsUrl;
		onClose();
	};

	const handlePrint = () => {
		if (onPrint) {
			onPrint();
		}
		onClose();
	};

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						{/* <Share2 className="h-5 w-5" /> */}
						Share Receipt - Order #{order.id}
					</DialogTitle>
					<DialogDescription>
						Choose how you want to share or print this receipt
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					{/* Print Option */}
					<div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
						<div className="flex items-center gap-3">
							<Printer className="h-5 w-5 text-gray-600" />
							<div>
								<Label className="text-base font-medium">Print Receipt</Label>
								<p className="text-sm text-gray-500">Print a physical copy</p>
							</div>
						</div>
						<Button onClick={handlePrint} variant="outline" size="sm">
							Print
						</Button>
					</div>

					{/* WhatsApp Option */}
					<div className="p-4 border rounded-lg">
						<div className="flex items-center gap-3 mb-3">
							<MessageCircle className="h-5 w-5 text-green-600" />
							<div>
								<Label className="text-base font-medium">
									Share via WhatsApp
								</Label>
								<p className="text-sm text-gray-500">
									Send receipt via WhatsApp
								</p>
							</div>
						</div>
						<div className="flex gap-2">
							<Input
								type="tel"
								placeholder="Phone number (e.g., 233123456789)"
								value={whatsappPhone}
								onChange={(e) => setWhatsappPhone(e.target.value)}
								className="flex-1"
							/>
							<Button
								onClick={handleWhatsAppShare}
								className="bg-green-600 hover:bg-green-700"
							>
								Send
							</Button>
						</div>
					</div>

					{/* Email Option */}
					<div className="p-4 border rounded-lg">
						<div className="flex items-center gap-3 mb-3">
							<Mail className="h-5 w-5 text-blue-600" />
							<div>
								<Label className="text-base font-medium">Share via Email</Label>
								<p className="text-sm text-gray-500">Send receipt via email</p>
							</div>
						</div>
						<div className="flex gap-2">
							<Input
								type="email"
								placeholder="Email address"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="flex-1"
							/>
							<Button
								onClick={handleEmailShare}
								className="bg-blue-600 hover:bg-blue-700"
							>
								Send
							</Button>
						</div>
					</div>

					{/* SMS Option */}
					<div className="p-4 border rounded-lg">
						<div className="flex items-center gap-3 mb-3">
							<Phone className="h-5 w-5 text-purple-600" />
							<div>
								<Label className="text-base font-medium">Share via SMS</Label>
								<p className="text-sm text-gray-500">Send receipt via SMS</p>
							</div>
						</div>
						<div className="flex gap-2">
							<Input
								type="tel"
								placeholder="Phone number (e.g., 233123456789)"
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
								className="flex-1"
							/>
							<Button
								onClick={handleSMSShare}
								className="bg-purple-600 hover:bg-purple-700"
							>
								Send
							</Button>
						</div>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
