/** @format */

import type { Order } from "@/types";

export const useReceipt = () => {
	const printReceipt = async (order: Order, openDrawer = false) => {
		if (!order || !order.items) return;

		// Calculate subtotal from items to ensure accuracy
		let calculatedSubtotal = 0;
		(order.items as any[]).forEach((item: any) => {
			const itemPrice =
				item.item_type === "food" ?
					item.food_price || item.price || 0
				:	item.price || 0;
			const quantity = item.quantity || 1;
			let itemTotal = itemPrice * quantity;
			if (item.item_type === "food" && item.extras && item.extras.length > 0) {
				const extrasTotal = item.extras.reduce(
					(sum: number, e: any) => sum + (e.price || 0) * (e.quantity || 1),
					0,
				);
				itemTotal += extrasTotal * quantity;
			}
			calculatedSubtotal += itemTotal;
		});

		const subtotal = calculatedSubtotal;
		const taxRate = order.tax || 0;
		const taxAmount = subtotal * (taxRate / 100);
		const total = subtotal + taxAmount;

		let businessName = "SmartWay Pos";
		let receiptCurrency = "GHS";
		const currentSettings = await window.electron.invoke("get-settings");
		let businessLogo = "";
		if (currentSettings?.general) {
			const gen =
				typeof currentSettings.general === "string" ?
					JSON.parse(currentSettings.general)
				:	currentSettings.general;
			businessName = gen.businessName || businessName;
			receiptCurrency = gen.defaultCurrency || receiptCurrency;
			businessLogo = gen.businessLogo || "";
		}

		// Safe formatting helper
		const safeFormat = (val: any) => {
			const n = parseFloat(val);
			return isNaN(n) ? "0.00" : n.toFixed(2);
		};

		console.log("Preparing receipt HTML...");
		await new Promise((r) => setTimeout(r, 100)); // Stability pause

		// Create receipt HTML
		const receiptHTML = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Receipt - Order #${order.order_number ?? order.id}</title>
                    <style>
                        body {
                            font-family: Arial, Helvetica, sans-serif;
                            font-size: 12px;
                            font-weight: 900;
                            line-height: 1.2;
                            width: 100%;
                            margin: 0 !important;
                            padding: 4px !important;
                            -webkit-font-smoothing: none !important;
                            text-rendering: optimizeSpeed !important;
                            image-rendering: pixelated !important;
                            color: #000 !important;
                            background-color: #fff !important;
                            -webkit-print-color-adjust: exact;
                        }
                        .header { text-align: center; border-bottom: 3px solid #000; padding: 5px 0; margin-bottom: 5px; }
                        .header h1 { font-size: 20px; margin: 0; color: #000 !important; font-weight: 900; }
                        .order-info { margin-bottom: 5px; font-size: 12px; color: #000 !important; }
                        .items { border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 5px; color: #000 !important; }
                        .item { display: flex; justify-content: space-between; margin: 5px 0; color: #000 !important; }
                        .totals { font-weight: 900; color: #000 !important; }
                        .totals div { display: flex; justify-content: space-between; margin: 2px 0; }
                        .total-row { border-top: 2px solid #000; padding-top: 5px; margin-top: 5px; font-size: 14px; font-weight: 900; }
                        .footer { text-align: center; margin-top: 15px; font-size: 11px; border-top: 1px solid #000; padding-top: 5px; color: #000 !important; }
                        @media print {
                            html, body {
                                height: auto !important;
                                overflow: visible !important;
                                background-color: #fff !important;
                                color: #000 !important;
                            }
                        }
                    </style>
                </head>
                <body style="font-family: 'Courier New', Courier, monospace; font-size: 7pt; font-weight: 600; line-height: 1.15; width: 72mm; margin: 0; padding: 0; color: #000; background-color: #fff;">
                    ${businessLogo ? `<div style="text-align: center; margin-bottom: 6px;"><img src="${businessLogo}" style="max-height: 80px; max-width: 80px; filter: grayscale(1) contrast(2);"></div>` : ""}
                    <div style="text-align: center; border-bottom: 1pt dashed #000; padding: 4px 0; margin-bottom: 6px;">
                        <h1 style="font-size: 10pt; margin: 0; font-weight: 800; color: #000;">${businessName}</h1>
                        <div style="font-size: 8pt; font-weight: 700; margin-top: 2px;">${order.status === "open" ? "BILL PREVIEW" : "OFFICIAL RECEIPT"}</div>
                    </div>
                    
                    <div style="margin-bottom: 8px; font-size: 7pt; font-weight: 700;">
                        <div style="display: flex; justify-content: space-between;"><span>ORDER:</span><span>#${order.order_number ?? order.id ?? "N/A"}</span></div>
                        ${order.customer_name ? `<div style="display: flex; justify-content: space-between;"><span>NAME:</span><span>${order.customer_name.toUpperCase()}</span></div>` : ""}
                        <div style="display: flex; justify-content: space-between;"><span>DATE:</span><span>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>
                    </div>
    
                    <div style="border-bottom: 1pt dashed #585858ff; border-top: 1pt dashed #585858ff; padding: 4px 0; margin-bottom: 6px;">
                        ${(order.items || [])
													.map((item: any) => {
														const name =
															item.food_item_name ||
															item.product_name ||
															"Item";
														const price = parseFloat(
															item.food_price || item.price || 0,
														);
														const qty = parseInt(item.quantity || 1);
														let itemTotal = price * qty;

														if (
															item.item_type === "food" &&
															item.extras?.length > 0
														) {
															const extrasTotal = item.extras.reduce(
																(s: number, e: any) =>
																	s +
																	(parseFloat(e.price) || 0) *
																		(e.quantity || 1),
																0,
															);
															itemTotal += extrasTotal * qty;
														}

														return `
                                <div style="margin: 3px 0;">
                                    <div style="display: flex; justify-content: space-between; font-weight: 700;">
                                        <span>${qty}x ${name}</span>
                                        <span>${receiptCurrency} ${safeFormat(itemTotal)}</span>
                                    </div>
                                </div>
                            `;
													})
													.join("")}
                    </div>
    
                    <div style="font-size: 7pt; font-weight: 700;">
                        <div style="display: flex; justify-content: space-between; margin: 2px 0;"><span>Subtotal:</span><span>${receiptCurrency} ${safeFormat(subtotal)}</span></div>
                        <div style="display: flex; justify-content: space-between; margin: 2px 0;"><span>Tax (${taxRate}%):</span><span>${receiptCurrency} ${safeFormat(taxAmount)}</span></div>
                        <div style="display: flex; justify-content: space-between; font-size: 8pt; font-weight: 700;"><span>TOTAL:</span><span>${receiptCurrency} ${safeFormat(total)}</span></div>
                    </div>
    
                    ${order.status === "open" ? `
                        <div style="margin-top: 10px; border-top: 1pt dashed #585858ff; padding-top: 6px; font-size: 7pt; font-weight: 700; text-align: center;">
                            * UNPAID BILL *
                        </div>
                    ` : `
                        <div style="margin-top: 10px; border-top: 1pt dashed #585858ff; padding-top: 6px; font-size: 7pt; font-weight: 700;">
                            <div style="display: flex; justify-content: space-between; font-weight: 700;font-size:7pt"><strong>PAYMENT:</strong> <span>${(order.payment_mode || "CASH").toUpperCase()}</span></div>
                            ${
															order.amount_tendered && order.amount_tendered > 0 ?
																`
                                <div style="display:flex; justify-content:space-between; "><span>Tendered:</span><span>${receiptCurrency} ${safeFormat(order.amount_tendered)}</span></div>
                                <div style="display:flex; justify-content:space-between; "><span>Change:</span><span>${receiptCurrency} ${safeFormat(order.amount_tendered - total)}</span></div>
                            `
															:	""
														}
                        </div>
                    `}
    
                    <div style="text-align: center; margin-top: 8px; font-size: 7pt; border-top: 1pt dashed #000; padding-top: 6px;">
                        <p style="margin: 3px 0; font-weight: 700;">Thank you for choosing ${businessName}</p>
                        <p style="margin: 3px 0;">Please come again!</p>
                    </div>
                    
                    <!-- Cutter Tail: Extra space to ensure paper clears the cutter -->
                    <div style="height: 10mm;"></div>
    </body>
                </html>
            `;

		// Trigger cash drawer only when explicitly requested AND payment is cash
		if (openDrawer && order.payment_mode?.toLowerCase() === "cash") {
			try {
				await window.electron.invoke("trigger-cash-drawer");
			} catch (drawerErr) {
				console.error("Failed to trigger cash drawer after print:", drawerErr);
			}
		}

		// Always attempt silent printing first (it handles auto-detection in the background)
		try {
			await window.electron.invoke("print-receipt-silent", receiptHTML, "");
			return; // If it worked (or found a default), we stop here
		} catch (err) {
			console.error("Silent print failed, falling back to window.print", err);
		}

		// Fallback to manual printing only if silent fails
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.write(receiptHTML);
			printWin.document.write(
				"<script>window.focus(); setTimeout(() => { window.print(); window.close(); }, 500);</script>",
			);
			printWin.document.close();
		}
	};

	const printKitchenOrder = async (order: Order) => {
		if (!order || !order.items) return;

		// Filter to only include food items for the kitchen
		const foodItems = (order.items || []).filter(
			(item: any) => item.item_type === "food" || item.itemType === "food",
		);

		if (foodItems.length === 0) return;

		let receiptCurrency = "GHS";
		let kitchenPrinterName = "";

		try {
			const currentSettings = await window.electron.invoke("get-settings");
			if (currentSettings?.general) {
				const gen =
					typeof currentSettings.general === "string" ?
						JSON.parse(currentSettings.general)
					:	currentSettings.general;
				receiptCurrency = gen.defaultCurrency || receiptCurrency;
			}
			if (currentSettings?.pos) {
				const pos =
					typeof currentSettings.pos === "string" ?
						JSON.parse(currentSettings.pos)
					:	currentSettings.pos;
				kitchenPrinterName = pos.kitchenPrinter || "";
			}
		} catch (err) {
			console.error("Failed to load settings for kitchen receipt:", err);
		}

		// Safe formatting helper
		const safeFormat = (val: any) => {
			const n = parseFloat(val);
			return isNaN(n) ? "0.00" : n.toFixed(2);
		};

		// Get order details
		const orderNum = order.order_number ?? order.id;
		const tableNum = order.table_number || "";
		const dateStr = new Date().toLocaleDateString();
		const time = new Date().toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit",
		});

		// Create kitchen order HTML with thermal styling
		const kitchenHTML = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {
                            font-family: Arial, Helvetica, sans-serif;
                            font-size: 14pt;
                            font-weight: 800;
                            line-height: 1.2;
                            width: 72mm;
                            margin: 0;
                            padding: 4px;
                            color: #000;
                            background-color: #fff;
                        }
                        .header {
                            text-align: left;
                            border-bottom: 1pt solid #000;
                            padding: 5px 0 24px 0;
                            margin-bottom: 16px;
                        }
                        .header h1 {
                            font-size: 22pt; 
                            margin: 0; 
                            font-weight: 900;
                        }
                        .items {
                            border-bottom: 1pt solid #000;
                            padding-bottom: 8px;
                            margin-bottom: 8px;
                        }
                        .item {
                            margin: 24px 0;
                            font-size: 16pt;
                        }
                        .item-main {
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-start;
                            font-weight: 900;
                        }
                        .qty {
                            margin-right: 10px;
                            background-color: #000;
                            color: #fff;
                            padding: 0 6px;
                            border-radius: 2px;
                        }
                        .notes {
                            color: #000;
                            font-weight: 700;
                            margin-top: 4px;
                            padding-left: 20px;
                            font-style: italic;
                            text-transform: uppercase;
                            font-size: 12pt;
                        }
                        .footer {
                            text-align: left;
                            margin-top: 20px;
                            font-weight: 900;
                            font-size: 12pt;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>KITCHEN TICKET</h1>
                        <div style="font-size: 12pt; font-weight: 900; margin-top: 4px;">ORDER #${orderNum} ${tableNum ? `- TABLE ${tableNum}` : ""}</div>
                        ${order.customer_name ? `<div style="font-size: 12pt; font-weight: 900; margin-top: 4px; margin-bottom: 4px;">NAME: ${order.customer_name.toUpperCase()}</div>` : ""}
                        <div style="font-size: 8pt;">${dateStr} ${time}</div>
                    </div>
    
                    <div class="items">
                        ${foodItems
													.map((item: any) => {
														const name =
															item.food_item_name ||
															item.product_name ||
															"Item";
														const qty = item.quantity || 1;
														const price = parseFloat(
															item.food_price || item.price || 0,
														);
														const itemTotal = price * qty;
														const extrasArr = item.extras || [];
														return `
                                <div class="item">
                                    <div class="item-main">
                                        <div style="display: flex; align-items: flex-start; margin-right: 4px;">
                                            <span class="qty">${qty}</span>
                                            <span>${name}</span>
                                        </div>
                                        <span style="white-space: nowrap; font-size: 8pt;">${receiptCurrency} ${safeFormat(itemTotal)}</span>
                                    </div>
                                    ${
																			extrasArr.length > 0 ?
																				`
                                        <div class="notes" style="font-size: 8pt; margin-left: 20px; font-style: normal;">
                                            ${extrasArr
																							.map((e: any) => {
																								const eqty = e.quantity || 1;
																								const eprice =
																									parseFloat(e.price) || 0;
																								const etotal = eprice * eqty;
																								return `<div style="margin: 2px 0;">+ ${eqty}x ${e.name} (${receiptCurrency} ${safeFormat(etotal)})</div>`;
																							})
																							.join("")}
                                        </div>
                                    `
																			:	""
																		}
                                    ${item.notes ? `<div class="notes" style="background-color: #eee; border: 1pt dashed #000; font-size: 8pt;  text-transform: capitalize; margin-left: 30px; padding: 4px; margin-top: 10px;">NOTE: ${item.notes}</div>` : ""}
                                </div>
                            `;
													})
													.join("")}
                    </div>
    
                    <div class="footer">
                        *** END OF TICKET ***
                    </div>
                    
                    <div style="height: 35mm;"></div>
                </body>
                </html>
            `;

		try {
			// Use kitchen printer if configured, otherwise fall back to default.
			// Kitchen receipts must NEVER trigger the cash drawer.
			await window.electron.invoke(
				"print-receipt-silent",
				kitchenHTML,
				kitchenPrinterName,
			);
		} catch (error) {
			console.error("Failed to print kitchen order:", error);
		}
	};

	return {
		printReceipt,
		printKitchenOrder,
	};
};
