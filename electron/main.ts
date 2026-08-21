/** @format */

import * as bcrypt from "bcryptjs";
import { app, BrowserWindow, ipcMain, protocol, dialog, net } from "electron";
import * as path from "path";
import { getDatabase } from "./database";
import { licensingManager } from "./licensing";
import * as fs from "fs";
import serve from "electron-serve";

const loadURL = serve({ directory: "dist" });
import { SerialPort } from "serialport";
import { exec } from "child_process";

// Types
interface Product {
	id?: number;
	name: string;
	description: string;
	category: number;
	price: number;
	cost_price?: number;
	stock: number;
	low_stock_threshold?: number;
	status: "active" | "inactive";
	image?: string;
}

interface Table {
	id?: number;
	name: string;
	capacity: number;
	status: "active" | "inactive";
}

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let db: any = null;

// Retry wrapper for database operations
async function withRetry<T>(
	operation: () => Promise<T>,
	maxRetries = 3,
	delay = 100,
): Promise<T> {
	let lastError: any;

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			return await operation();
		} catch (error: any) {
			lastError = error;

			// If it's a SQLITE_BUSY error and we haven't exceeded max retries, wait and retry
			if (error.message?.includes("SQLITE_BUSY") && attempt < maxRetries) {
				// console.log(`Database busy, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
				await new Promise((resolve) => setTimeout(resolve, delay));
				delay *= 2; // Exponential backoff
				continue;
			}

			// For other errors or max retries exceeded, throw immediately
			throw error;
		}
	}

	throw lastError;
}

const LOG_ACTIONS = {
	LOGIN: "login",
	LOGOUT: "logout",
	CREATE_ORDER: "create_order",
	UPDATE_ORDER: "update_order",
	CREATE_PRODUCT: "create_product",
	UPDATE_PRODUCT: "update_product",
	CREATE_CATEGORY: "create_category",
	UPDATE_CATEGORY: "update_category",
	CREATE_CART: "create_cart",
	UPDATE_CART: "update_cart",
	DELETE_ORDER: "delete_order",
	DELETE_PRODUCT: "delete_product",
	DELETE_CATEGORY: "delete_category",
	DELETE_CART: "delete_cart",
	UPDATE_SETTINGS: "update_settings",
	ADD_USER: "add_user",
	UPDATE_USER: "update_user",
	DELETE_USER: "delete_user",
	EXPORT_DATABASE: "export_database",
	IMPORT_DATABASE: "import_database",
	ADD_CATEGORY: "add_category",
	ADD_PRODUCT: "add_product",
	VIEW_ORDERS: "view_orders",
	UPDATE_STOCK: "update_stock",
	CREATE_FOOD_ITEM: "create_food_item",
	UPDATE_FOOD_ITEM: "update_food_item",
	DELETE_FOOD_ITEM: "delete_food_item",
	CREATE_FOOD_EXTRA: "create_food_extra",
	UPDATE_FOOD_EXTRA: "update_food_extra",
	DELETE_FOOD_EXTRA: "delete_food_extra",
	CREATE_FOOD_CATEGORY: "create_food_category",
	UPDATE_FOOD_CATEGORY: "update_food_category",
	DELETE_FOOD_CATEGORY: "delete_food_category",
	CLEAR_ALL_DATA: "clear_all_data",
	CLEAR_SELECTIVE_DATA: "clear_selective_data",
	ADD_EXPENSE: "add_expense",
	DELETE_EXPENSE: "delete_expense",
};

// Customer Display Handler
ipcMain.handle("list-ports", async () => {
	try {
		const ports = await SerialPort.list();
		return ports;
	} catch (error) {
		console.error("Error listing ports:", error);
		return [];
	}
});

ipcMain.handle(
	"update-customer-display",
	async (_, portPath: string, amount: string) => {
		return new Promise((resolve, reject) => {
			const port = new SerialPort({
				path: portPath,
				baudRate: 2400, // Update this to match your successful CMD 'MODE' test
				autoOpen: false,
			});

			port.open((err) => {
				if (err) return reject(err);

				// 1. ESC/POS Commands:
				// [0x1B, 0x40] = Initialize
				// [0x0C]       = Clear screen
				const initAndClear = Buffer.from([0x1b, 0x40, 0x0c]);

				// 2. Set Status Light (Optional):
				// [0x1B, 0x73, 0x32] turns on the "Total" light on this specific model
				const setTotalLight = Buffer.from([0x1b, 0x73, 0x32]);

				// 3. Format Amount:
				// Ensure the amount is exactly 8 characters by padding with spaces for right-alignment
				const text = Buffer.from(amount.padStart(8), "ascii");

				// 4. Write sequence: Initialize -> Set Light -> Write Text
				port.write(
					Buffer.concat([initAndClear, setTotalLight, text]),
					(writeErr) => {
						if (writeErr) {
							port.close();
							return reject(writeErr);
						}

						// Give the hardware 300ms to process the display buffer before closing
						setTimeout(() => {
							port.close(() => resolve(true));
						}, 300);
					},
				);
			});
		});
	},
);

// Toggle menu bar visibility
ipcMain.handle("set-menu-bar-visible", (_, visible: boolean) => {
	if (mainWindow) {
		mainWindow.setMenuBarVisibility(visible);
		mainWindow.setAutoHideMenuBar(!visible);
	}
});

// Toggle fullscreen mode
ipcMain.handle("set-fullscreen", (_, enabled: boolean) => {
	if (mainWindow) {
		mainWindow.setFullScreen(enabled);
	}
});

const DEFAULT_VENUE_TIMEZONE = "Africa/Accra";

function getLocalDateString(d = new Date()): string {
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function getDeviceLocalDateTimeString(date = new Date()): string {
	const pad = (num: number) => String(num).padStart(2, "0");
	return (
		date.getFullYear() +
		"-" + pad(date.getMonth() + 1) +
		"-" + pad(date.getDate()) +
		" " + pad(date.getHours()) +
		":" + pad(date.getMinutes()) +
		":" + pad(date.getSeconds())
	);
}

// Add before logAction:
interface LogActionParams {
	db: any;
	admin_id: number | null;
	admin_name: string | null;
	admin_role: string | null;
	action: string;
	page: string | null;
	context: any;
}

async function logAction({
	db,
	admin_id,
	admin_name,
	admin_role,
	action,
	page,
	context,
}: LogActionParams) {
	await db.run(
		"INSERT INTO logs (created_at, admin_id, admin_name, admin_role, action, page, context) VALUES (?, ?, ?, ?, ?, ?, ?)",
		[
			getDeviceLocalDateTimeString(),
			admin_id || null,
			admin_name || null,
			admin_role || null,
			action,
			page,
			context ? JSON.stringify(context) : null,
		],
	);
}

async function logInventoryChange({
	db,
	productId,
	changeAmount,
	previousStock,
	newStock,
	reason,
	adminId,
	productName,
	adminName,
	adminRole,
	note,
}: {
	db: any;
	productId: number;
	changeAmount: number;
	previousStock: number;
	newStock: number;
	reason: "sale" | "restock" | "adjustment" | "wastage";
	adminId: number | null;
	productName?: string | null;
	adminName?: string | null;
	adminRole?: string | null;
	note?: string | null;
}) {
	await db.run(
		"INSERT INTO inventory_logs (product_id, change_amount, previous_stock, new_stock, reason, admin_id, product_name, admin_name, admin_role, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		[
			productId,
			changeAmount,
			previousStock,
			newStock,
			reason,
			adminId,
			productName || null,
			adminName || null,
			adminRole || null,
			note || null,
			getDeviceLocalDateTimeString(),
		],
	);
}

// =====================================================
// Automated Cloud Sync Services
// =====================================================
let syncInterval: any = null;
let syncAfterMutationTimer: ReturnType<typeof setTimeout> | null = null;

function notifySyncStatusChanged() {
	if (mainWindow && !mainWindow.isDestroyed()) {
		mainWindow.webContents.send("sync-status-changed");
	}
}

function scheduleSyncAfterMutation() {
	notifySyncStatusChanged();

	if (syncAfterMutationTimer) {
		clearTimeout(syncAfterMutationTimer);
	}

	// Debounce — one order can create multiple rows (order, items, logs)
	syncAfterMutationTimer = setTimeout(() => {
		performSync().finally(() => notifySyncStatusChanged());
	}, 2000);
}

let cachedBaseUrl: string | null = null;
let lastCacheTime = 0;

async function getBaseUrl(): Promise<string> {
	const now = Date.now();
	if (cachedBaseUrl && now - lastCacheTime < 10000) {
		return cachedBaseUrl;
	}

	const licenseServerUrl =
		process.env.LICENSE_SERVER_URL || "https://smartwaypos.vercel.app";
	const isDev = !app.isPackaged || process.env.NODE_ENV === "development";

	if (!isDev) {
		cachedBaseUrl = licenseServerUrl;
		lastCacheTime = now;
		return licenseServerUrl;
	}

	// Dev mode: probe potential local portals ports
	const ports = [3000, 3001, 3002];
	let foundUrl: string | null = null;

	for (const port of ports) {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 300);
			const response = await fetch(`http://localhost:${port}/api/pos/ping`, {
				method: "GET",
				signal: controller.signal,
			}).catch(() => null);
			clearTimeout(timeoutId);

			if (response && response.ok) {
				const data = await response.json().catch(() => null);
				if (data && data.success && data.service === "smartwaypos-portal") {
					foundUrl = `http://localhost:${port}`;
					break;
				}
			}
		} catch {
			// Ignore connection issues and try next port
		}
	}

	if (foundUrl) {
		cachedBaseUrl = foundUrl;
	} else {
		cachedBaseUrl = licenseServerUrl;
	}

	lastCacheTime = now;
	return cachedBaseUrl;
}

type SyncResult =
	| { status: "skipped"; reason: string }
	| {
			status: "synced";
			orders: number;
			orderItems: number;
			inventoryLogs: number;
	  }
	| { status: "error"; message: string };

async function performSync(): Promise<SyncResult> {
	try {
		return await performSyncInternal();
	} finally {
		notifySyncStatusChanged();
	}
}

async function performSyncInternal(): Promise<SyncResult> {
	if (!net.isOnline()) {
		console.log("[Sync] Offline. Skipping cloud sync cycle.");
		return { status: "skipped", reason: "Device is offline." };
	}

	const licenseInfo = licensingManager.getLicenseInfo();
	if (!licenseInfo || !licenseInfo.licenseKey) {
		console.log("[Sync] No active license key found. Skipping sync.");
		return { status: "skipped", reason: "No active license key found." };
	}

	const databaseInstance = getDatabase();
	if (!databaseInstance) {
		return { status: "skipped", reason: "Database not initialised yet." };
	}

	// Fetch all records from SQLite to ensure Supabase is 1:1 with local machine
	const unsyncedOrders = await databaseInstance.all("SELECT * FROM orders");
	const unsyncedOrderItems = await databaseInstance.all(`
		SELECT 
			oi.*,
			COALESCE(
				CASE 
					WHEN oi.item_type = 'food' THEN fi.name 
					ELSE p.name 
				END, 
				'Unknown Product'
			) as product_name,
			COALESCE(
				CASE 
					WHEN oi.item_type = 'food' THEN fi.price 
					ELSE p.price 
				END, 
				0.0
			) as price
		FROM order_items oi
		LEFT JOIN products p ON oi.product_id = p.id
		LEFT JOIN food_items fi ON oi.food_item_id = fi.id
	`);
	const unsyncedInventoryLogs = await databaseInstance.all(`
		SELECT 
			il.*,
			COALESCE(p.name, 'Unknown Product') as product_name
		FROM inventory_logs il
		LEFT JOIN products p ON il.product_id = p.id
	`);

	if (
		unsyncedOrders.length === 0 &&
		unsyncedOrderItems.length === 0 &&
		unsyncedInventoryLogs.length === 0
	) {
		console.log("[Sync] Local database is empty. No records to sync.");
		return { status: "synced", orders: 0, orderItems: 0, inventoryLogs: 0 };
	}

	console.log(
		`[Sync] Uploading database records: ${unsyncedOrders.length} orders, ${unsyncedOrderItems.length} items, ${unsyncedInventoryLogs.length} logs to Supabase...`,
	);

	// Post payload to Next.js portals api gateway
	const baseUrl = await getBaseUrl();

	let response: Response;
	try {
		response = await fetch(`${baseUrl}/api/pos/sync`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				licenseKey: licenseInfo.licenseKey,
				orders: unsyncedOrders,
				orderItems: unsyncedOrderItems,
				inventoryLogs: unsyncedInventoryLogs,
			}),
		});
	} catch (fetchError: any) {
		const msg = `Network error reaching sync server: ${fetchError.message}`;
		console.error("[Sync]", msg);
		return { status: "error", message: msg };
	}

	if (!response.ok) {
		let errorText = response.statusText;
		try {
			errorText = await response.text();
		} catch {}
		const msg = `Sync server returned ${response.status}: ${errorText}`;
		console.error("[Sync]", msg);
		return { status: "error", message: msg };
	}

	let result: any;
	try {
		result = await response.json();
	} catch (jsonError: any) {
		const msg = `Invalid JSON from sync server: ${jsonError.message}`;
		console.error("[Sync]", msg);
		return { status: "error", message: msg };
	}

	if (!result.success) {
		const msg = result.message || "Sync rejected by server.";
		console.error("[Sync] Sync rejected by server:", msg);
		return { status: "error", message: msg };
	}

	const timestamp = new Date().toISOString();

	// Update orders synced_at
	if (result.syncedOrders && result.syncedOrders.length > 0) {
		const placeholders = result.syncedOrders.map(() => "?").join(",");
		await databaseInstance.run(
			`UPDATE orders SET synced_at = ? WHERE id IN (${placeholders})`,
			[timestamp, ...result.syncedOrders],
		);
	}

	// Update order_items synced_at
	if (result.syncedOrderItems && result.syncedOrderItems.length > 0) {
		const placeholders = result.syncedOrderItems.map(() => "?").join(",");
		await databaseInstance.run(
			`UPDATE order_items SET synced_at = ? WHERE id IN (${placeholders})`,
			[timestamp, ...result.syncedOrderItems],
		);
	}

	// Update inventory_logs synced_at
	if (result.syncedInventoryLogs && result.syncedInventoryLogs.length > 0) {
		const placeholders = result.syncedInventoryLogs.map(() => "?").join(",");
		await databaseInstance.run(
			`UPDATE inventory_logs SET synced_at = ? WHERE id IN (${placeholders})`,
			[timestamp, ...result.syncedInventoryLogs],
		);
	}

	const syncedOrderCount = result.syncedOrders?.length ?? 0;
	const syncedItemCount = result.syncedOrderItems?.length ?? 0;
	const syncedLogCount = result.syncedInventoryLogs?.length ?? 0;
	console.log(
		`[Sync] Successful sync cycle. Orders: ${syncedOrderCount}, Items: ${syncedItemCount}, Logs: ${syncedLogCount}.`,
	);
	return {
		status: "synced",
		orders: syncedOrderCount,
		orderItems: syncedItemCount,
		inventoryLogs: syncedLogCount,
	};
}

function startSyncLoop() {
	if (syncInterval) clearInterval(syncInterval);

	// Perform initial sync after 5 seconds to allow full startup
	setTimeout(() => {
		performSync();
	}, 5000);

	// Scheduled interval sync every 5 minutes
	syncInterval = setInterval(() => {
		performSync();
	}, 300000);
}

/**
 * Helper to fetch configured businessDayCutoffHour from settings.
 * Default is 4 (4:00 AM reset).
 */
async function getBusinessDayCutoffHour(db?: any): Promise<number> {
	try {
		const database = db || (await getDatabase());
		const row = await database.get(
			"SELECT general FROM settings ORDER BY id DESC LIMIT 1",
		);
		if (row?.general) {
			const general = JSON.parse(row.general);
			if (
				typeof general.businessDayCutoffHour === "number" &&
				!isNaN(general.businessDayCutoffHour)
			) {
				return general.businessDayCutoffHour;
			}
		}
	} catch (err) {
		console.error("Error reading businessDayCutoffHour from settings:", err);
	}
	return 4;
}

/**
 * Returns SQL expression to calculate Business Date ('YYYY-MM-DD') from a datetime column.
 */
function getBusinessDateExpr(
	column: string = "COALESCE(closed_at, updated_at, created_at)",
	cutoffHour: number = 4,
): string {
	if (cutoffHour <= 0) {
		return `strftime('%Y-%m-%d', ${column})`;
	}
	return `strftime('%Y-%m-%d', datetime(${column}, '-${cutoffHour} hours'))`;
}

/**
 * Computes logical Business Date string (YYYY-MM-DD) for a given JavaScript Date.
 */
function toBusinessDateStr(date: Date, cutoffHour: number): string {
	const shifted = new Date(date.getTime() - cutoffHour * 60 * 60 * 1000);
	const year = shifted.getFullYear();
	const month = String(shifted.getMonth() + 1).padStart(2, "0");
	const day = String(shifted.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/**
 * Calculates start and end Business Date strings (YYYY-MM-DD) for filtering queries.
 */
function getBusinessDateRange(filters: any, cutoffHour: number): { startDateStr: string; endDateStr: string; start: Date; end: Date } {
	const { timePeriod = "day", startDate, endDate } = filters;
	const now = new Date();

	// Calculate current business day string (YYYY-MM-DD)
	const currentBizDateStr = toBusinessDateStr(now, cutoffHour);
	const [bYear, bMonth, bDay] = currentBizDateStr.split("-").map(Number);
	const currentBizDate = new Date(bYear, bMonth - 1, bDay);

	let start: Date;
	let end: Date;

	switch (timePeriod) {
		case "day":
			start = currentBizDate;
			end = new Date(bYear, bMonth - 1, bDay + 1);
			break;
		case "yesterday":
			start = new Date(bYear, bMonth - 1, bDay - 1);
			end = currentBizDate;
			break;
		case "week":
			const dayOfWeek = currentBizDate.getDay();
			const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
			start = new Date(bYear, bMonth - 1, bDay - daysToSubtract);
			end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
			break;
		case "month":
			start = new Date(bYear, bMonth - 1, 1);
			end = new Date(bYear, bMonth, 1);
			break;
		case "custom":
			start = startDate ? new Date(startDate) : currentBizDate;
			end = endDate ? new Date(endDate) : currentBizDate;
			end = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);
			break;
		default:
			start = currentBizDate;
			end = new Date(bYear, bMonth - 1, bDay + 1);
	}

	const formatDate = (d: Date) => {
		const year = d.getFullYear();
		const month = String(d.getMonth() + 1).padStart(2, "0");
		const day = String(d.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	};

	return {
		startDateStr: formatDate(start),
		endDateStr: formatDate(end),
		start,
		end,
	};
}

// Register protocol before app is ready
protocol.registerSchemesAsPrivileged([
	{
		scheme: "app",
		privileges: {
			secure: true,
			standard: true,
			allowServiceWorkers: true,
			supportFetchAPI: true,
			corsEnabled: true,
			stream: true,
		},
	},
]);

async function createWindow() {
	// console.log("Starting table creation...")
	// 1. Create Splash Window
	splashWindow = new BrowserWindow({
		width: 450,
		height: 350,
		transparent: true,
		frame: false,
		alwaysOnTop: true,
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true,
		},
	});

	if (app.isPackaged) {
		splashWindow.loadFile(path.join(__dirname, "../dist/splash.html"));
	} else {
		splashWindow.loadFile(path.join(__dirname, "../public/splash.html"));
	}

	// 2. Create the main browser window (hidden initially)
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		show: false, // Keep it hidden while loading
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: true,
			preload: path.join(__dirname, "preload.js"),
			webSecurity: false, // Temporarily disable to fix "Not allowed to load local resource"
		},
	});

	// Initialize database
	try {
		db = getDatabase();

		// console.log('Database opened successfully');

		const tables = await db.all(
			"SELECT name FROM sqlite_master WHERE type='table'",
		);
		// console.log('Tables in DB:', tables);

		// Create tables if they don't exist
		await db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY,
        general TEXT,
        pos TEXT,
        theme TEXT
      );

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'cashier')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL CHECK(status IN ('active', 'inactive')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        price REAL NOT NULL,
        cost_price REAL DEFAULT 0,
        stock INTEGER NOT NULL DEFAULT 0,
        low_stock_threshold INTEGER DEFAULT 10,
        status TEXT DEFAULT 'active',
        image TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category) REFERENCES categories(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS inventory_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        change_amount INTEGER NOT NULL,
        previous_stock INTEGER NOT NULL,
        new_stock INTEGER NOT NULL,
        reason TEXT NOT NULL CHECK(reason IN ('sale', 'restock', 'adjustment', 'wastage')),
        admin_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number INTEGER,
        sale_id INTEGER,
        order_type TEXT,
        table_number TEXT,
        customer_name TEXT,
        payment_mode TEXT,
        tax REAL,
        amount REAL DEFAULT 0,
        amount_bt REAL DEFAULT 0,
        status TEXT,
        admin_id INTEGER,
        edited_by INTEGER,
        amount_tendered REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME DEFAULT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        admin_id INTEGER,
        admin_name TEXT,
        admin_role TEXT,
        action TEXT NOT NULL,
        page TEXT,
        context TEXT
      );

      CREATE TABLE IF NOT EXISTS tables (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        capacity INTEGER,
        status TEXT NOT NULL CHECK(status IN ('active', 'inactive')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS food_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL CHECK(status IN ('active', 'inactive')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS food_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        category_id INTEGER NOT NULL,
        price REAL NOT NULL,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
        image TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES food_categories(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS food_extras (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS food_item_extras (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        food_item_id INTEGER NOT NULL,
        extra_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (food_item_id) REFERENCES food_items(id) ON DELETE CASCADE,
        FOREIGN KEY (extra_id) REFERENCES food_extras(id) ON DELETE CASCADE,
        UNIQUE(food_item_id, extra_id)
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        admin_name TEXT NOT NULL,
        admin_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS shifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        clock_in DATETIME DEFAULT CURRENT_TIMESTAMP,
        clock_out DATETIME,
        total_hours REAL,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

		// Add amount columns to orders table if they don't exist (migration)
		// try {
		//   await db.run('ALTER TABLE orders ADD COLUMN amount REAL DEFAULT 0');
		//   // console.log('Added amount column to orders table');
		// } catch (error) {
		//   // Column might already exist, ignore error
		//   // console.log('amount column might already exist:', error.message);
		// }

		// try {
		//   await db.run('ALTER TABLE orders ADD COLUMN amount_bt REAL DEFAULT 0');
		//   // console.log('Added amount_bt column to orders table');
		// } catch (error) {
		//   // Column might already exist, ignore error
		//   // console.log('amount_bt column might already exist:', error.message);
		// }

		// Migrate order_items table to support food items
		try {
			// Check if food_item_id column exists
			const orderItemsColumns = await db.all("PRAGMA table_info(order_items)");
			const hasFoodItemId = orderItemsColumns.some(
				(col: any) => col.name === "food_item_id",
			);
			const hasItemType = orderItemsColumns.some(
				(col: any) => col.name === "item_type",
			);
			const hasNotes = orderItemsColumns.some(
				(col: any) => col.name === "notes",
			);

			if (!hasFoodItemId) {
				await db.run("ALTER TABLE order_items ADD COLUMN food_item_id INTEGER");
			}
			if (!hasItemType) {
				await db.run(
					"ALTER TABLE order_items ADD COLUMN item_type TEXT DEFAULT 'drink'",
				);
			}
			if (!hasNotes) {
				await db.run("ALTER TABLE order_items ADD COLUMN notes TEXT");
			}

			// Make product_id nullable for food items
			// SQLite doesn't support ALTER COLUMN, so we need to recreate the table
			const hasNullableProductId = orderItemsColumns.some(
				(col: any) => col.name === "product_id" && col.notnull === 0,
			);
			if (!hasNullableProductId) {
				// Create new table with nullable product_id
				await db.exec(`
					CREATE TABLE IF NOT EXISTS order_items_new (
						id INTEGER PRIMARY KEY AUTOINCREMENT,
						order_id INTEGER NOT NULL,
						product_id INTEGER,
						food_item_id INTEGER,
						item_type TEXT DEFAULT 'drink',
						quantity INTEGER NOT NULL,
						notes TEXT,
						created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
						FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
						FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
						FOREIGN KEY (food_item_id) REFERENCES food_items(id) ON DELETE SET NULL
					);
				`);

				// Copy data from old table to new table
				await db.exec(`
					INSERT INTO order_items_new (id, order_id, product_id, quantity, created_at)
					SELECT id, order_id, product_id, quantity, created_at FROM order_items;
				`);

				// Drop old table
				await db.exec("DROP TABLE order_items");

				// Rename new table
				await db.exec("ALTER TABLE order_items_new RENAME TO order_items");
			}
		} catch (error: any) {
			// Migration might have already been applied, ignore error
			console.log("Order items migration:", error.message);
		}

		// Create order_item_extras table if it doesn't exist
		try {
			await db.exec(`
				CREATE TABLE IF NOT EXISTS order_item_extras (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					order_item_id INTEGER NOT NULL,
					extra_id INTEGER NOT NULL,
					created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
					FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
					FOREIGN KEY (extra_id) REFERENCES food_extras(id) ON DELETE CASCADE,
					UNIQUE(order_item_id, extra_id)
				);
			`);
		} catch (error: any) {
			console.log("Order item extras table creation:", error.message);
		}

		// Add order_number column to orders table if it doesn't exist (migration)
		try {
			await db.run("ALTER TABLE orders ADD COLUMN order_number INTEGER");
		} catch (error: any) {
			if (!error.message?.includes("duplicate column name: order_number")) {
				console.error("Error adding order_number column:", error);
			}

			// Add amount_tendered column to orders table if it doesn't exist (migration)
			try {
				await db.run(
					"ALTER TABLE orders ADD COLUMN amount_tendered REAL DEFAULT 0",
				);
			} catch (error: any) {
				// Column might already exist, ignore error
			}
		}

		// // Add low_stock_threshold column to products table if it doesn't exist (migration)
		// try {
		//   await db.run('ALTER TABLE products ADD COLUMN low_stock_threshold INTEGER DEFAULT 10');
		//   // console.log('Added low_stock_threshold column to products table');
		// } catch (error) {
		//   // Column might already exist, ignore error
		//   // console.log('low_stock_threshold column might already exist:', error.message);
		// }

		// console.log('Tables created successfully');

		// Add cost_price column to products table if it doesn't exist (migration)
		try {
			await db.run("ALTER TABLE products ADD COLUMN cost_price REAL DEFAULT 0");
			// console.log('Added cost_price column to products table');
		} catch (error: any) {
			// Column might already exist, ignore error
		}

		// Add low_stock_threshold column to products table if it doesn't exist
		try {
			await db.run(
				"ALTER TABLE products ADD COLUMN low_stock_threshold INTEGER DEFAULT 10",
			);
		} catch (error: any) {
			// Column might already exist, ignore error
		}

		// Migration: add product_name, admin_name, admin_role, note columns to inventory_logs
		for (const colDef of [
			"product_name TEXT",
			"admin_name TEXT",
			"admin_role TEXT",
			"note TEXT",
		]) {
			try {
				await db.run(`ALTER TABLE inventory_logs ADD COLUMN ${colDef}`);
			} catch {
				// Column already exists — safe to ignore
			}
		}

		// Add item_type and notes columns to order_items table if they don't exist (migration)
		try {
			await db.run(
				"ALTER TABLE order_items ADD COLUMN item_type TEXT DEFAULT 'drink' CHECK(item_type IN ('drink', 'food'))",
			);
		} catch (error: any) {
			// Column might already exist, ignore error
		}

		try {
			await db.run("ALTER TABLE order_items ADD COLUMN food_item_id INTEGER");
		} catch (error: any) {
			// Column might already exist, ignore error
		}

		try {
			await db.run("ALTER TABLE order_items ADD COLUMN notes TEXT");
		} catch (error: any) {
			// Column might already exist, ignore error
		}

		// Create order_item_extras table for tracking selected extras for food items
		try {
			await db.exec(`
				CREATE TABLE IF NOT EXISTS order_item_extras (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					order_item_id INTEGER NOT NULL,
					extra_id INTEGER NOT NULL,
					created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
					FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
					FOREIGN KEY (extra_id) REFERENCES food_extras(id) ON DELETE SET NULL
				)
			`);
		} catch (error: any) {
			// Table might already exist, ignore error
		}

		// Migration: add quantity column to order_item_extras if it doesn't exist
		try {
			await db.run(
				"ALTER TABLE order_item_extras ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1",
			);
		} catch {
			// Column already exists — safe to ignore
		}

		// Migration: add edited_by column to orders if it doesn't exist
		try {
			await db.run("ALTER TABLE orders ADD COLUMN edited_by INTEGER");
		} catch (error: any) {
			// Column might already exist, safe to ignore
		}

		// Sync Migrations: Add synced_at columns to orders, order_items, and inventory_logs if not exist
		try {
			await db.run(
				"ALTER TABLE orders ADD COLUMN synced_at DATETIME DEFAULT NULL",
			);
		} catch (error: any) {
			// Column might already exist, ignore error
		}
		try {
			await db.run(
				"ALTER TABLE order_items ADD COLUMN synced_at DATETIME DEFAULT NULL",
			);
		} catch (error: any) {
			// Column might already exist, ignore error
		}
		try {
			await db.run(
				"ALTER TABLE inventory_logs ADD COLUMN synced_at DATETIME DEFAULT NULL",
			);
		} catch (error: any) {
			// Column might already exist, ignore error
		}

		// Migration: Add timezone and business_date columns to orders, order_items, inventory_logs, and expenses if not exist
		for (const table of ["orders", "order_items", "inventory_logs", "expenses"]) {
			try {
				await db.run(`ALTER TABLE ${table} ADD COLUMN timezone TEXT DEFAULT 'Africa/Accra'`);
			} catch {}
			try {
				await db.run(`ALTER TABLE ${table} ADD COLUMN business_date TEXT`);
			} catch {}
		}

		// Migration: add closed_at column to orders if it doesn't exist
		try {
			await db.run("ALTER TABLE orders ADD COLUMN closed_at DATETIME DEFAULT NULL");
		} catch (error: any) {
			// Column might already exist, safe to ignore
		}

		// Backfill business_date for historical records where business_date IS NULL
		try {
			await db.run("UPDATE orders SET business_date = DATE(created_at) WHERE business_date IS NULL");
			await db.run("UPDATE order_items SET business_date = DATE(created_at) WHERE business_date IS NULL");
			await db.run("UPDATE inventory_logs SET business_date = DATE(created_at) WHERE business_date IS NULL");
			await db.run("UPDATE expenses SET business_date = DATE(created_at) WHERE business_date IS NULL");
			await db.run("UPDATE orders SET closed_at = COALESCE(updated_at, created_at) WHERE status = 'closed' AND closed_at IS NULL");
		} catch {}

		// Create default admin user if not exists
		const adminUser = await db.get(
			"SELECT * FROM users WHERE role = ? LIMIT 1",
			["admin"],
		);
		console.log("--- Startup Check ---");
		console.log("Admin user found in DB:", !!adminUser);

		if (!adminUser) {
			console.log("Creating default admin user...");
			const hashedPassword = await bcrypt.hash("Lagmin123", 10);
			await db.run(
				"INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
				["admin", hashedPassword, "admin"],
			);
			console.log("Default admin user created successfully.");
		}

		// Start automated cloud sync loop
		startSyncLoop();

		// Load the index.html file
		if (!app.isPackaged) {
			const devUrl = "http://localhost:5173";
			mainWindow.loadURL(devUrl).catch(() => {
				console.log("Vite not ready, retrying...");
				setTimeout(() => {
					mainWindow?.loadURL(devUrl);
				}, 1000);
			});
			mainWindow.webContents.openDevTools();
		} else {
			// Google-Recommended Robust Protocol Handler
			if (!protocol.isProtocolRegistered("app")) {
				protocol.handle("app", async (request) => {
					try {
						// Google's trick: Decode and Normalize the path
						const url = new URL(request.url);
						let pathName = decodeURIComponent(url.pathname);

						// On Windows, the pathname might start with a / that we don't need
						if (pathName.startsWith("/")) pathName = pathName.slice(1);
						if (!pathName || pathName === "index.html") pathName = "index.html";

						const filePath = path.normalize(
							path.join(app.getAppPath(), "dist", pathName),
						);

						// Verify file exists
						if (!fs.existsSync(filePath)) {
							// Fallback to index.html for SPA routing
							const indexPath = path.normalize(
								path.join(app.getAppPath(), "dist", "index.html"),
							);
							return new Response(fs.readFileSync(indexPath));
						}

						return new Response(fs.readFileSync(filePath));
					} catch (e) {
						console.error("Protocol error:", e);
						return new Response("Error loading resource", { status: 500 });
					}
				});
			}
			mainWindow.loadURL("app://index.html");
		}

		// 3. Transition from Splash to Main
		mainWindow.once("ready-to-show", async () => {
			if (splashWindow) {
				splashWindow.close();
				splashWindow = null;
			}
			if (mainWindow) {
				mainWindow.show();
				mainWindow.maximize();

				// Apply saved menu bar preference (default: hidden for POS kiosk)
				try {
					const savedSettings = await db.get(
						"SELECT pos FROM settings ORDER BY id DESC LIMIT 1",
					);
					const posSettings =
						savedSettings?.pos ? JSON.parse(savedSettings.pos) : {};

					const hideMenuBar = posSettings.hideMenuBar !== false; // default true (hidden)
					mainWindow.setMenuBarVisibility(!hideMenuBar);
					mainWindow.setAutoHideMenuBar(hideMenuBar);

					const fullscreen = posSettings.fullscreen === true; // default false
					if (fullscreen) mainWindow.setFullScreen(true);
				} catch {
					// If settings can't be read, hide menu bar by default
					mainWindow.setMenuBarVisibility(false);
					mainWindow.setAutoHideMenuBar(true);
				}
			}
		});
	} catch (error) {
		console.error("Database initialization error:", error);
	}
}

// Authentication handler
ipcMain.handle("login", async (_, username: string, password: string) => {
	try {
		// console.log('Login attempt for user:', username);

		if (!username || !password) {
			throw new Error("Username and password are required");
		}

		const user = await db.get("SELECT * FROM users WHERE username = ?", [
			username,
		]);
		// console.log('User found:', user ? 'yes' : 'no');

		if (!user) {
			throw new Error("Invalid username or password");
		}

		const isValidPassword = await bcrypt.compare(password, user.password);
		// console.log('Password valid:', isValidPassword);

		if (!isValidPassword) {
			throw new Error("Invalid username or password");
		}

		// Return user data without password
		const { password: _, ...userWithoutPassword } = user;
		// console.log('Login successful for user:', username);
		await logAction({
			db,
			admin_id: user.id,
			admin_name: user.username,
			admin_role: user.role,
			action: LOG_ACTIONS.LOGIN,
			page: "users",
			context: userWithoutPassword,
		});
		return userWithoutPassword;
	} catch (error) {
		console.error("Login error:", error);
		throw error;
	}
});

// Settings handlers
ipcMain.handle("get-settings", async () => {
	try {
		// console.log('Getting settings...');
		const settings = await db.get(
			"SELECT * FROM settings ORDER BY id DESC LIMIT 1",
		);
		if (settings) {
			return {
				id: settings.id,
				general: settings.general ? JSON.parse(settings.general) : {},
				pos: settings.pos ? JSON.parse(settings.pos) : {},
				theme: settings.theme ? JSON.parse(settings.theme) : {},
			};
		}
		return { general: {}, pos: {}, theme: {} };
	} catch (error) {
		console.error("Error getting settings:", error);
		throw error;
	}
});

ipcMain.handle("update-settings", async (_, settings) => {
	const { author, ...cleanSettings } = settings;
	try {
		// console.log('Updating settings:', settings);
		// Check if settings record exists
		const existingSettings = await db.get("SELECT * FROM settings");
		let mergedSettings = { general: {}, pos: {}, theme: {} };
		if (existingSettings) {
			mergedSettings.general =
				existingSettings.general ? JSON.parse(existingSettings.general) : {};
			mergedSettings.pos =
				existingSettings.pos ? JSON.parse(existingSettings.pos) : {};
			mergedSettings.theme =
				existingSettings.theme ? JSON.parse(existingSettings.theme) : {};
		}
		// Merge incoming settings
		mergedSettings = {
			general: { ...mergedSettings.general, ...(settings.general || {}) },
			pos: { ...mergedSettings.pos, ...(settings.pos || {}) },
			theme: { ...mergedSettings.theme, ...(settings.theme || {}) },
		};
		if (!existingSettings) {
			// Insert new settings if none exist
			await db.run(
				"INSERT INTO settings (general, pos, theme) VALUES (?, ?, ?)",
				[
					JSON.stringify(mergedSettings.general),
					JSON.stringify(mergedSettings.pos),
					JSON.stringify(mergedSettings.theme),
				],
			);
		} else {
			// Update existing settings
			await db.run("UPDATE settings SET general = ?, pos = ?, theme = ?", [
				JSON.stringify(mergedSettings.general),
				JSON.stringify(mergedSettings.pos),
				JSON.stringify(mergedSettings.theme),
			]);
		}
		const updated = await db.get("SELECT * FROM settings");
		// console.log('Settings updated:', updated);
		await logAction({
			db,
			admin_id: author?.id || null,
			admin_name: author?.username || null,
			admin_role: author?.role || null,
			action: LOG_ACTIONS.UPDATE_SETTINGS,
			page: "settings",
			context: cleanSettings,
		});
		return updated;
	} catch (error) {
		console.error("Error updating settings:", error);
		throw error;
	}
});

// User management handlers
ipcMain.handle("get-users", async () => {
	try {
		// console.log('Getting users...');
		const users = await db.all("SELECT * FROM users");
		// console.log('Users retrieved:', users);
		return users;
	} catch (error) {
		console.error("Error getting users:", error);
		throw error;
	}
});

ipcMain.handle("add-user", async (_, data) => {
	const { author, ...user } = data;
	try {
		// console.log('Adding user with data:', user);

		if (!user || typeof user !== "object") {
			throw new Error("Invalid user data provided");
		}

		if (!user.username || !user.password || !user.role) {
			throw new Error("Username, password, and role are required");
		}

		// Check if username already exists
		const existingUser = await db.get(
			"SELECT * FROM users WHERE username = ?",
			[user.username],
		);
		if (existingUser) {
			throw new Error("Username already exists");
		}

		const hashedPassword = await bcrypt.hash(user.password, 10);
		// console.log('Password hashed successfully');

		const result = await db.run(
			"INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
			[user.username, hashedPassword, user.role],
		);
		// console.log('User inserted with ID:', result.lastID);

		const users = await db.all("SELECT id, username, role FROM users");
		// console.log('Updated users list:', users);
		await logAction({
			db,
			admin_id: author?.id || null,
			admin_name: author?.username || null,
			admin_role: author?.role || null,
			action: LOG_ACTIONS.ADD_USER,
			page: "users",
			context: { user: user.username, role: user.role },
		});
		return users;
	} catch (error) {
		console.error("Error in add-user handler:", error);
		throw error;
	}
});

ipcMain.handle("update-user", async (_, id, data) => {
	const { author, ...user } = data;
	try {
		// console.log('Updating user:', { id, user });
		if (user.password) {
			const hashedPassword = await bcrypt.hash(user.password, 10);
			await db.run(
				"UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?",
				[user.username, hashedPassword, user.role, id],
			);
		} else {
			await db.run("UPDATE users SET username = ?, role = ? WHERE id = ?", [
				user.username,
				user.role,
				id,
			]);
		}
		const users = await db.all("SELECT * FROM users");
		// console.log('User updated, updated users:', users);
		await logAction({
			db,
			admin_id: author?.id || null,
			admin_name: author?.username || null,
			admin_role: author?.role || null,
			action: LOG_ACTIONS.UPDATE_USER,
			page: "users",
			context: { id, user },
		});
		return users;
	} catch (error) {
		console.error("Error updating user:", error);
		throw error;
	}
});

ipcMain.handle("clock-in", async (_, userId) => {
	try {
		const nowStr = new Date().toISOString();
		// Ensure no other active shift exists for this user
		await db.run(
			"UPDATE shifts SET status = 'completed', clock_out = ? WHERE user_id = ? AND status = 'active'",
			[nowStr, userId],
		);

		await db.run(
			"INSERT INTO shifts (user_id, clock_in, status) VALUES (?, ?, 'active')",
			[userId, nowStr],
		);
		const shift = await db.get(
			"SELECT * FROM shifts WHERE user_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1",
			[userId],
		);
		return shift;
	} catch (error) {
		console.error("Error clocking in:", error);
		throw error;
	}
});

ipcMain.handle("clock-out", async (_, userId) => {
	try {
		const activeShift = await db.get(
			"SELECT * FROM shifts WHERE user_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1",
			[userId],
		);
		if (!activeShift) return null;

		const clockOut = new Date().toISOString();
		let clockInStr = activeShift.clock_in;
		if (
			clockInStr &&
			!clockInStr.includes("Z") &&
			!clockInStr.includes("+") &&
			!clockInStr.includes("T")
		) {
			clockInStr = clockInStr.replace(" ", "T") + "Z";
		}
		const clockIn = new Date(clockInStr);
		const diffMs = new Date(clockOut).getTime() - clockIn.getTime();
		const totalHours = diffMs / (1000 * 60 * 60);

		await db.run(
			"UPDATE shifts SET clock_out = ?, total_hours = ?, status = 'completed' WHERE id = ?",
			[clockOut, totalHours, activeShift.id],
		);
		return {
			...activeShift,
			clock_out: clockOut,
			total_hours: totalHours,
			status: "completed",
		};
	} catch (error) {
		console.error("Error clocking out:", error);
		throw error;
	}
});

ipcMain.handle("get-active-shift", async (_, userId) => {
	try {
		return await db.get(
			"SELECT * FROM shifts WHERE user_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1",
			[userId],
		);
	} catch (error) {
		console.error("Error getting active shift:", error);
		throw error;
	}
});

ipcMain.handle("get-all-shifts", async (_, filters) => {
	try {
		let query =
			"SELECT shifts.*, users.username FROM shifts JOIN users ON shifts.user_id = users.id";
		const params: any[] = [];

		if (filters?.userId) {
			query += " WHERE user_id = ?";
			params.push(filters.userId);
		}

		query += " ORDER BY clock_in DESC";
		return await db.all(query, params);
	} catch (error) {
		console.error("Error getting shifts:", error);
		throw error;
	}
});

ipcMain.handle("delete-user", async (_, id, options) => {
	const { author } = options || {};
	try {
		// console.log('Deleting user:', id);
		await db.run("DELETE FROM users WHERE id = ?", [id]);
		const users = await db.all("SELECT * FROM users");
		// console.log('User deleted, updated users:', users);
		await logAction({
			db,
			admin_id: author?.id || null,
			admin_name: author?.username || null,
			admin_role: author?.role || null,
			action: LOG_ACTIONS.DELETE_USER,
			page: "users",
			context: { id },
		});
		return users;
	} catch (error) {
		console.error("Error deleting user:", error);
		throw error;
	}
});

ipcMain.handle("request-password-reset", async (_, licenseKey) => {
	try {
		// 1. Verify License Key locally first to save a network call if it's junk
		const validation = await licensingManager.validateLicense(licenseKey);
		if (!validation.valid) {
			return {
				success: false,
				message: validation.message || "Invalid license key.",
			};
		}

		// 2. Request reset from Portal
		const baseUrl = await getBaseUrl();

		const response = await fetch(`${baseUrl}/api/pos/reset-request`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				license_key: licenseKey,
				device_id: licensingManager.getHardwareId(),
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			return { success: false, message: `Portal Error: ${response.status}` };
		}

		const result = await response.json();
		return {
			success: true,
			verificationNumber: result.verificationNumber, // This is the "08" number
		};
	} catch (error: any) {
		console.error("Password reset request error:", error);
		return {
			success: false,
			message: "Could not connect to Portal. Please check your internet.",
		};
	}
});

ipcMain.handle("check-reset-status", async (_, licenseKey) => {
	try {
		const baseUrl = await getBaseUrl();

		const response = await fetch(
			`${baseUrl}/api/pos/reset-status?license_key=${licenseKey}`,
			{
				method: "GET",
				headers: { "Content-Type": "application/json" },
			},
		);

		if (!response.ok) return { status: "pending" };

		const result = await response.json();
		return { status: result.status }; // "pending", "approved", or "rejected"
	} catch (error) {
		return { status: "pending" };
	}
});

ipcMain.handle(
	"complete-password-reset",
	async (_, licenseKey, newPassword) => {
		try {
			// 1. Final verification with Portal that this is actually approved
			const baseUrl = await getBaseUrl();

			const response = await fetch(`${baseUrl}/api/pos/reset-complete`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					license_key: licenseKey,
					device_id: licensingManager.getHardwareId(),
				}),
			});

			const result = await response.json();
			if (!result.authorized) {
				throw new Error("Unauthorized reset attempt.");
			}

			// 2. Find the primary admin account locally
			const adminUser = await db.get(
				"SELECT * FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1",
			);

			if (!adminUser) {
				throw new Error("No admin account found to reset.");
			}

			// 3. Update the password locally
			const hashedPassword = await bcrypt.hash(newPassword, 10);
			await db.run("UPDATE users SET password = ? WHERE id = ?", [
				hashedPassword,
				adminUser.id,
			]);

			// 4. Log the action
			await logAction({
				db,
				admin_id: null,
				admin_name: "PORTAL_AUTHORIZED_RECOVERY",
				admin_role: "system",
				action: LOG_ACTIONS.UPDATE_USER,
				page: "login_recovery",
				context: { user_id: adminUser.id, method: "portal_authorization" },
			});

			return { success: true, username: adminUser.username };
		} catch (error: any) {
			console.error("Password reset completion error:", error);
			throw error;
		}
	},
);

// Database backup/restore handlers
ipcMain.handle("export-database", async (_, exportType = "all", options) => {
	const { author } = options || {};
	try {
		// console.log('Exporting database with type:', exportType);
		const data: any = {};

		if (exportType === "all" || exportType === "settings") {
			data.settings = await db.get("SELECT * FROM settings");
		}
		if (exportType === "all" || exportType === "users") {
			data.users = await db.all("SELECT * FROM users");
		}
		if (exportType === "all" || exportType === "products") {
			data.products = await db.all("SELECT * FROM products");
		}
		if (exportType === "all" || exportType === "categories") {
			data.categories = await db.all("SELECT * FROM categories");
		}
		if (exportType === "all" || exportType === "orders") {
			data.orders = await db.all("SELECT * FROM orders");
			data.order_items = await db.all("SELECT * FROM order_items");
		}
		if (exportType === "all" || exportType === "logs") {
			data.logs = await db.all("SELECT * FROM logs");
		}

		const jsonData = JSON.stringify(data);
		// console.log('Database exported successfully');
		await logAction({
			db,
			admin_id: author?.id || null,
			admin_name: author?.username || author?.name || null,
			admin_role: author?.role || null,
			action: LOG_ACTIONS.EXPORT_DATABASE,
			page: "database",
			context: { operation: "export", exportType, data },
		});
		return jsonData;
	} catch (error) {
		console.error("Error exporting database:", error);
		throw error;
	}
});

ipcMain.handle(
	"import-database",
	async (_, data, importType = "all", options) => {
		const { author } = options || {};
		try {
			// console.log('Importing database with type:', importType);
			const parsedData = typeof data === "string" ? JSON.parse(data) : data;

			// Clear existing data based on import type
			if (importType === "all" || importType === "settings") {
				await db.run("DELETE FROM settings");
			}
			if (importType === "all" || importType === "users") {
				await db.run("DELETE FROM users");
			}
			if (importType === "all" || importType === "products") {
				await db.run("DELETE FROM products");
			}
			if (importType === "all" || importType === "categories") {
				await db.run("DELETE FROM categories");
			}
			if (importType === "all" || importType === "orders") {
				await db.run("DELETE FROM order_items");
				await db.run("DELETE FROM orders");
			}
			if (importType === "all" || importType === "logs") {
				await db.run("DELETE FROM logs");
			}

			// Import data based on type
			if (
				(importType === "all" || importType === "settings") &&
				parsedData.settings
			) {
				await db.run(
					"INSERT INTO settings (general, pos, theme) VALUES (?, ?, ?)",
					[
						parsedData.settings.general,
						parsedData.settings.pos,
						parsedData.settings.theme,
					],
				);
			}

			if (
				(importType === "all" || importType === "users") &&
				parsedData.users
			) {
				for (const user of parsedData.users) {
					await db.run(
						"INSERT INTO users (username, password, role, created_at) VALUES (?, ?, ?, ?)",
						[user.username, user.password, user.role, user.created_at],
					);
				}
			}

			if (
				(importType === "all" || importType === "categories") &&
				parsedData.categories
			) {
				for (const category of parsedData.categories) {
					await db.run(
						"INSERT INTO categories (name, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
						[
							category.name,
							category.description,
							category.status,
							category.created_at,
							category.updated_at,
						],
					);
				}
			}

			if (
				(importType === "all" || importType === "products") &&
				parsedData.products
			) {
				for (const product of parsedData.products) {
					await db.run(
						"INSERT INTO products (name, description, category, price, cost_price, stock, status, image, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
						[
							product.name,
							product.description,
							product.category,
							product.price,
							product.cost_price || 0,
							product.stock,
							product.status,
							product.image,
							product.created_at,
							product.updated_at,
						],
					);
				}
			}

			if (
				(importType === "all" || importType === "orders") &&
				parsedData.orders
			) {
				for (const order of parsedData.orders) {
					await db.run(
						"INSERT INTO orders (sale_id, order_type, table_number, customer_name, payment_mode, tax, amount, amount_bt, status, admin_id, created_at, updated_at, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
						[
							order.sale_id,
							order.order_type,
							order.table_number,
							order.customer_name,
							order.payment_mode,
							order.tax,
							order.amount || 0,
							order.amount_bt || 0,
							order.status,
							order.admin_id,
							order.created_at,
							order.updated_at,
							order.notes,
						],
					);
				}

				if (parsedData.order_items) {
					for (const item of parsedData.order_items) {
						await db.run(
							"INSERT INTO order_items (order_id, product_id, quantity, created_at) VALUES (?, ?, ?, ?)",
							[item.order_id, item.product_id, item.quantity, item.created_at],
						);
					}
				}
			}

			if ((importType === "all" || importType === "logs") && parsedData.logs) {
				for (const log of parsedData.logs) {
					await db.run(
						"INSERT INTO logs (created_at, admin_id, admin_name, admin_role, action, page, context) VALUES (?, ?, ?, ?, ?, ?, ?)",
						[
							log.created_at,
							log.admin_id,
							log.admin_name,
							log.admin_role,
							log.action,
							log.page,
							log.context,
						],
					);
				}
			}

			// console.log('Database imported successfully');
			await logAction({
				db,
				admin_id: author?.id || null,
				admin_name: author?.username || author?.name || null,
				admin_role: author?.role || null,
				action: LOG_ACTIONS.IMPORT_DATABASE,
				page: "database",
				context: { operation: "import", importType, data: parsedData },
			});
			return true;
		} catch (error) {
			console.error("Error importing database:", error);
			throw error;
		}
	},
);

// Clear all data handler
ipcMain.handle("clear-all-data", async (_, user) => {
	try {
		const db = await getDatabase();

		// Delete all data from all tables (order matters due to foreign keys)
		await db.run("DELETE FROM order_items");
		await db.run("DELETE FROM orders");
		await db.run("DELETE FROM products");
		await db.run("DELETE FROM categories");
		await db.run("DELETE FROM logs");
		await db.run("DELETE FROM tables");
		await db.run("DELETE FROM settings");
		await db.run("DELETE FROM users");

		// Recreate default admin user
		const hashedPassword = await bcrypt.hash("Lagmin123", 10);
		await db.run(
			"INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
			["admin", hashedPassword, "admin"],
		);

		// Log the action
		const author = user?.author || user || {};
		await logAction({
			db,
			admin_id: author.id || null,
			admin_name: author.username || author.name || null,
			admin_role: author.role || null,
			action: LOG_ACTIONS.CLEAR_ALL_DATA,
			page: "settings",
			context: { action: "clear_all_data" },
		});

		return { success: true };
	} catch (error) {
		console.error("Error clearing all data:", error);
		throw error;
	}
});

// Clear selective data handler
ipcMain.handle("clear-selective-data", async (_, options) => {
	try {
		const db = await getDatabase();
		const { clearLogs, clearTransactions, clearStock, author } = options || {};
		const clearedItems: string[] = [];

		if (clearLogs) {
			await db.run("DELETE FROM logs");
			await db.run("DELETE FROM inventory_logs");
			clearedItems.push("logs");
		}

		if (clearTransactions) {
			try {
				await db.run("DELETE FROM order_item_extras");
			} catch (e) {
				// Ignore error if table doesn't exist
			}
			await db.run("DELETE FROM order_items");
			await db.run("DELETE FROM orders");
			await db.run("DELETE FROM expenses");
			clearedItems.push("transactions");
		}

		if (clearStock) {
			await db.run("UPDATE products SET stock = 0");
			clearedItems.push("stock_data");
		}

		const userAuthor = author || {};
		if (!clearLogs) {
			await logAction({
				db,
				admin_id: userAuthor.id || null,
				admin_name: userAuthor.username || userAuthor.name || null,
				admin_role: userAuthor.role || null,
				action: LOG_ACTIONS.CLEAR_SELECTIVE_DATA,
				page: "settings",
				context: { cleared: clearedItems },
			});
		}

		return { success: true, cleared: clearedItems };
	} catch (error) {
		console.error("Error clearing selective data:", error);
		throw error;
	}
});

// Category management handlers
ipcMain.handle("get-categories", async () => {
	try {
		const categories = await withRetry(async () => {
			const db = await getDatabase();
			return await db.all("SELECT * FROM categories ORDER BY name ASC");
		});
		return categories;
	} catch (error) {
		console.error("Error getting categories:", error);
		throw error;
	}
});

ipcMain.handle("add-category", async (_, category) => {
	try {
		// console.log('Adding category:', category);

		if (!category || typeof category !== "object") {
			throw new Error("Invalid category data provided");
		}

		if (!category.name) {
			throw new Error("Category name is required");
		}

		const result = await db.run(
			"INSERT INTO categories (name, description, status) VALUES (?, ?, ?)",
			[
				category.name,
				category.description || null,
				category.status || "active",
			],
		);
		// console.log('Category inserted with ID:', result.lastID);

		const newCategory = await db.get("SELECT * FROM categories WHERE id = ?", [
			result.lastID,
		]);
		// console.log('New category:', newCategory);
		const author = category.author || {};
		await logAction({
			db,
			admin_id: author.id || null,
			admin_name: author.name || null,
			admin_role: author.role || null,
			action: LOG_ACTIONS.ADD_CATEGORY,
			page: "categories",
			context: category,
		});
		return newCategory;
	} catch (error) {
		console.error("Error in add-category handler:", error);
		throw error;
	}
});

ipcMain.handle("update-category", async (_, { id, ...category }) => {
	try {
		// console.log('Updating category:', { id, category });

		if (!category.name) {
			throw new Error("Category name is required");
		}

		await db.run(
			"UPDATE categories SET name = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
			[category.name, category.description || null, category.status, id],
		);

		const updatedCategory = await db.get(
			"SELECT * FROM categories WHERE id = ?",
			[id],
		);
		// console.log('Updated category:', updatedCategory);
		const author = category.author || {};
		await logAction({
			db,
			admin_id: author.id || null,
			admin_name: author.name || null,
			admin_role: author.role || null,
			action: LOG_ACTIONS.UPDATE_CATEGORY,
			page: "categories",
			context: { id, category },
		});
		return updatedCategory;
	} catch (error) {
		console.error("Error updating category:", error);
		throw error;
	}
});

ipcMain.handle("delete-category", async (_, id, payload = {}) => {
	try {
		const db = await getDatabase();
		await db.run("DELETE FROM categories WHERE id = ?", [id]);
		// console.log('Category deleted successfully');
		const author = payload.author || {};
		await logAction({
			db,
			admin_id: author.id || null,
			admin_name: author.name || null,
			admin_role: author.role || null,
			action: LOG_ACTIONS.DELETE_CATEGORY,
			page: "categories",
			context: { id },
		});
		return true;
	} catch (error) {
		console.error("Error deleting category:", error);
		throw error;
	}
});

ipcMain.handle("open-keyboard", () => {
	console.log("[Main] open-keyboard requested");
	if (process.platform === "win32") {
		// exec("start osk", (err) => {
		// 	if (err) {
		// 		const tabTipPath = "C:\\Program Files\\Common Files\\microsoft shared\\ink\\TabTip.exe";
		// 		exec(`"${tabTipPath}"`, (err2) => {
		// 			if (err2) console.error("[Main] Failed to open TabTip:", err2.message);
		// 		});
		// 	}
		// });
	}
	// 	else if (process.platform === "darwin") {
	// 		// Get macOS major version to determine correct approach
	// 		exec("sw_vers -productVersion", (err, stdout) => {
	// 			const major = parseInt((stdout || "12").split(".")[0]);

	// 			if (major >= 13) {
	//     exec("open 'x-apple.systempreferences:com.apple.preference.universalaccess?Keyboard'");
	// } else {
	// 				// macOS 12 and below — KeyboardViewer process approach
	// 				const script = 'tell application "System Events" to set visible of process "KeyboardViewer" to true';
	// 				exec(`osascript -e '${script}'`, (err2) => {
	// 					if (err2) {
	// 						exec("open -b com.apple.KeyboardViewer", (err3) => {
	// 							if (err3) console.error("[Main] macOS Keyboard error:", err3.message);
	// 						});
	// 					}
	// 				});
	// 			}
	// 		});
	// 	}
	return true;
});

ipcMain.handle("close-keyboard", () => {
	console.log("[Main] close-keyboard requested");
	// if (process.platform === "win32") {
	// 	exec("taskkill /f /im osk.exe");
	// 	exec("taskkill /f /im TabTip.exe");
	// } else if (process.platform === "darwin") {
	// 	exec("sw_vers -productVersion", (err, stdout) => {
	// 		const major = parseInt((stdout || "12").split(".")[0]);

	// 		if (major >= 13) {
	// 			// Same shortcut toggles it off on Ventura+
	// 			exec(
	// 				`osascript -e 'tell application "System Events" to key code 96 using {command down, option down}'`
	// 			);
	// 		} else {
	// 			exec("pkill -x KeyboardViewer");
	// 		}
	// 	});
	// }
	return true;
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});

// Product handlers
ipcMain.handle("get-products", async () => {
	try {
		const products = await withRetry(async () => {
			const db = await getDatabase();
			const rawProducts = await db.all(`
        SELECT p.*, c.name as category_name 
        FROM products p 
        LEFT JOIN categories c ON p.category = c.id 
        ORDER BY p.name ASC
      `);

			const enrichedProducts = await Promise.all(
				rawProducts.map(async (product: any) => {
					let starting_stock = product.stock;

					// Check today's inventory logs
					const logs = await db.all(
						`SELECT previous_stock FROM inventory_logs 
						 WHERE product_id = ? 
						 AND date(created_at, 'localtime') = date('now', 'localtime') 
						 ORDER BY id ASC`,
						[product.id],
					);

					if (logs.length > 0) {
						starting_stock = logs[0].previous_stock;
					} else {
						// Check sales today if no inventory log exists yet
						const salesData = await db.get(
							`SELECT SUM(oi.quantity) as sold_qty
							 FROM order_items oi
							 JOIN orders o ON oi.order_id = o.id
							 WHERE oi.product_id = ? 
							 AND oi.item_type = 'drink'
							 AND o.status IN ('open', 'closed')
							 AND date(o.created_at, 'localtime') = date('now', 'localtime')`,
							[product.id],
						);
						const sold = salesData?.sold_qty || 0;
						starting_stock = product.stock + sold;
					}

					return {
						...product,
						starting_stock,
						closing_stock: product.stock,
					};
				}),
			);

			return enrichedProducts;
		});
		return products;
	} catch (error) {
		console.error("Error getting products:", error);
		throw error;
	}
});

ipcMain.handle(
	"add-product",
	async (_, product: Omit<Product, "id">, payload = {}) => {
		try {
			const db = await getDatabase();
			const result = await db.run(
				`
      INSERT INTO products (
        name, 
        description, 
        category, 
        price, 
        cost_price,
        stock, 
        low_stock_threshold,
        status,
        image
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
				[
					product.name,
					product.description,
					product.category,
					product.price,
					product.cost_price || 0,
					product.stock,
					product.low_stock_threshold || 10,
					product.status,
					product.image || null,
				],
			);
			const newProduct = await db.get("SELECT * FROM products WHERE id = ?", [
				result.lastID,
			]);
			// console.log('New product:', newProduct);
			const author = payload.author || {};
			await logAction({
				db,
				admin_id: author.id || null,
				admin_name: author.name || null,
				admin_role: author.role || null,
				action: LOG_ACTIONS.ADD_PRODUCT,
				page: "products",
				context: newProduct,
			});

			if (newProduct && newProduct.stock > 0) {
				await logInventoryChange({
					db,
					productId: newProduct.id!,
					changeAmount: newProduct.stock,
					previousStock: 0,
					newStock: newProduct.stock,
					reason: "restock",
					adminId: author.id || null,
					productName: newProduct.name || null,
					adminName: author.name || null,
					adminRole: author.role || null,
					note: null,
				});
			}

			return newProduct;
		} catch (error) {
			console.error("Error adding product:", error);
			throw error;
		}
	},
);

ipcMain.handle("update-product", async (_, product: Product, payload = {}) => {
	try {
		const db = await getDatabase();
		const oldProduct = await db.get("SELECT stock FROM products WHERE id = ?", [
			product.id,
		]);
		const oldStock = oldProduct?.stock || 0;

		await db.run(
			`
      UPDATE products 
      SET name = ?,
          description = ?,
          category = ?,
          price = ?,
          cost_price = ?,
          stock = ?,
          low_stock_threshold = ?,
          status = ?,
          image = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
			[
				product.name,
				product.description,
				product.category,
				product.price,
				product.cost_price || 0,
				product.stock,
				product.low_stock_threshold || 10,
				product.status,
				product.image || null,
				product.id,
			],
		);
		const updatedProduct = await db.get("SELECT * FROM products WHERE id = ?", [
			product.id,
		]);
		// console.log('Updated product:', updatedProduct);
		const author = payload.author || {};

		// Log inventory change if stock was modified
		if (updatedProduct.stock !== oldStock) {
			await logInventoryChange({
				db,
				productId: product.id!,
				changeAmount: updatedProduct.stock - oldStock,
				previousStock: oldStock,
				newStock: updatedProduct.stock,
				reason:
					payload.reason ||
					(updatedProduct.stock > oldStock ? "restock" : "adjustment"),
				adminId: author.id || null,
				productName: updatedProduct.name || null,
				adminName: author.name || null,
				adminRole: author.role || null,
				note: payload.note || null,
			});
		}

		await logAction({
			db,
			admin_id: author.id || null,
			admin_name: author.name || null,
			admin_role: author.role || null,
			action: LOG_ACTIONS.UPDATE_PRODUCT,
			page: "products",
			context: updatedProduct,
		});
		return updatedProduct;
	} catch (error) {
		console.error("Error updating product:", error);
		throw error;
	}
});

ipcMain.handle("delete-product", async (_, id: number, payload = {}) => {
	try {
		const db = await getDatabase();
		await db.run("DELETE FROM products WHERE id = ?", [id]);
		const product = await db.get("SELECT * FROM products WHERE id = ?", [id]);
		// console.log('Product deleted:', product);
		const author = payload.author || {};
		await logAction({
			db,
			admin_id: author.id || null,
			admin_name: author.name || null,
			admin_role: author.role || null,
			action: LOG_ACTIONS.DELETE_PRODUCT,
			page: "products",
			context: { id },
		});
		return { id };
	} catch (error) {
		console.error("Error deleting product:", error);
		throw error;
	}
});

// Stock management handlers
ipcMain.handle("get-low-stock-products", async () => {
	try {
		const products = await withRetry(async () => {
			const db = await getDatabase();
			return await db.all(`
        SELECT p.*, c.name as category_name 
        FROM products p 
        LEFT JOIN categories c ON p.category = c.id 
        WHERE p.stock <= p.low_stock_threshold AND p.stock > 0
        ORDER BY p.stock ASC
      `);
		});
		return products;
	} catch (error) {
		console.error("Error getting low stock products:", error);
		throw error;
	}
});

ipcMain.handle("get-out-of-stock-products", async () => {
	try {
		const products = await withRetry(async () => {
			const db = await getDatabase();
			return await db.all(`
        SELECT p.*, c.name as category_name 
        FROM products p 
        LEFT JOIN categories c ON p.category = c.id 
        WHERE p.stock = 0
        ORDER BY p.name ASC
      `);
		});
		return products;
	} catch (error) {
		console.error("Error getting out of stock products:", error);
		throw error;
	}
});

ipcMain.handle(
	"update-product-stock",
	async (_, productId: number, newStock: number, payload: any = {}) => {
		try {
			const db = await getDatabase();
			const oldStock = await db.get(
				"SELECT stock, name FROM products WHERE id = ?",
				[productId],
			);

			if (!oldStock) {
				throw new Error("Product not found");
			}

			await db.run(
				"UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
				[newStock, productId],
			);

			const author = payload.author || {};
			const changeReason =
				payload.reason ||
				(newStock > oldStock.stock ? "restock" : "adjustment");

			// Log inventory change
			await logInventoryChange({
				db,
				productId,
				changeAmount: newStock - oldStock.stock,
				previousStock: oldStock.stock,
				newStock: newStock,
				reason: changeReason,
				adminId: author.id || null,
				productName: oldStock.name || null,
				adminName: author.name || null,
				adminRole: author.role || null,
				note: payload.note || null,
			});

			await logAction({
				db,
				admin_id: author.id || null,
				admin_name: author.name || null,
				admin_role: author.role || null,
				action: LOG_ACTIONS.UPDATE_STOCK,
				page: "products",
				context: {
					productId,
					productName: oldStock.name,
					oldStock: oldStock.stock,
					newStock,
				},
			});

			return { productId, oldStock: oldStock.stock, newStock };
		} catch (error) {
			console.error("Error updating product stock:", error);
			throw error;
		}
	},
);

ipcMain.handle(
	"get-daily-inventory-report",
	async (_, dateArg?: any, author?: any) => {
		try {
			const db = await getDatabase();
			const cutoffHour = await getBusinessDayCutoffHour(db);
			const dateExpr = getBusinessDateExpr("COALESCE(closed_at, updated_at, created_at)", cutoffHour);
			const orderDateExpr = getBusinessDateExpr("COALESCE(o.closed_at, o.updated_at, o.created_at)", cutoffHour);
			const createdDateExpr = getBusinessDateExpr("created_at", cutoffHour);
			const expenseDateExpr = getBusinessDateExpr("e.created_at", cutoffHour);
			const inventoryLogDateExpr = getBusinessDateExpr("i.created_at", cutoffHour);

			const now = new Date();
			let reportDate = toBusinessDateStr(now, cutoffHour);
			let period = "today";

			if (typeof dateArg === "string") {
				if (dateArg === "today") {
					reportDate = toBusinessDateStr(now, cutoffHour);
					period = "today";
				} else if (dateArg === "yesterday") {
					const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
					reportDate = toBusinessDateStr(yesterday, cutoffHour);
					period = "yesterday";
				} else if (dateArg.trim()) {
					reportDate = dateArg.trim();
					period = "custom_date";
				}
			} else if (dateArg && typeof dateArg === "object") {
				if (dateArg.period === "yesterday") {
					const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
					reportDate = toBusinessDateStr(yesterday, cutoffHour);
					period = "yesterday";
				} else if (dateArg.period === "today") {
					reportDate = toBusinessDateStr(now, cutoffHour);
					period = "today";
				} else if (dateArg.date) {
					reportDate = dateArg.date;
					period = "custom_date";
				}
			}

			// Only allow admins to view all accounts and filter periods
			const isAdmin = author?.role === "admin";
			const filterAdminId = !isAdmin ? author?.id || null : null;

			// Helper function to build report for a specific date and admin_id filter
			const buildReportForAdmin = async (targetAdminId: number | null) => {
				const products = await db.all(
					"SELECT id, name, price, stock, low_stock_threshold FROM products ORDER BY name ASC",
				);

				const report: any[] = [];

				for (const product of products) {
					const logs = await db.all(
						`SELECT * FROM inventory_logs 
					 WHERE product_id = ? 
					 AND ${createdDateExpr} = ?` +
							(targetAdminId ? ` AND admin_id = ?` : ``),
						targetAdminId ?
							[product.id, reportDate, targetAdminId]
						:	[product.id, reportDate],
					);

					const salesData = await db.get(
						`SELECT SUM(oi.quantity) as sold_qty
					 FROM order_items oi
					 JOIN orders o ON oi.order_id = o.id
					 WHERE oi.product_id = ? 
					 AND oi.item_type = 'drink'
					 AND o.status IN ('open', 'closed')
					 AND ${orderDateExpr} = ?` +
							(targetAdminId ? ` AND COALESCE(o.edited_by, o.admin_id) = ?` : ``),
						targetAdminId ?
							[product.id, reportDate, targetAdminId]
						:	[product.id, reportDate],
					);

					const closedSalesData = await db.get(
						`SELECT SUM(oi.quantity) as sold_closed_qty
					 FROM order_items oi
					 JOIN orders o ON oi.order_id = o.id
					 WHERE oi.product_id = ? 
					 AND oi.item_type = 'drink'
					 AND o.status = 'closed'
					 AND ${orderDateExpr} = ?` +
							(targetAdminId ? ` AND COALESCE(o.edited_by, o.admin_id) = ?` : ``),
						targetAdminId ?
							[product.id, reportDate, targetAdminId]
						:	[product.id, reportDate],
					);

					const sold = salesData?.sold_qty || 0;
					const soldClosed = closedSalesData?.sold_closed_qty || 0;
					let added = 0;
					let adjusted = 0;
					let damaged = 0;
					let hasInventoryAction = false;

					logs.forEach((log: any) => {
						if (log.reason === "restock") {
							added += log.change_amount;
							hasInventoryAction = true;
						} else if (log.reason === "wastage") {
							damaged += Math.abs(log.change_amount);
							hasInventoryAction = true;
						} else if (log.reason === "adjustment") {
							if (log.change_amount > 0) {
								added += log.change_amount;
							} else {
								adjusted += Math.abs(log.change_amount);
							}
							hasInventoryAction = true;
						}
					});

					let openingStock = product.stock;
					if (logs.length > 0) {
						const firstLog = logs.reduce((prev: any, curr: any) =>
							prev.id < curr.id ? prev : curr,
						);
						openingStock = firstLog.previous_stock;
					}

					const stockLeft = openingStock + added - sold - damaged - adjusted;

					if (sold > 0 || soldClosed > 0 || hasInventoryAction) {
						report.push({
							id: product.id,
							name: product.name,
							openingStock,
							added,
							sold,
							damaged,
							adjusted,
							totalStock: openingStock + added,
							price: product.price,
							totalSales: soldClosed * product.price,
							stockLeft,
							lowStockThreshold: product.low_stock_threshold,
						});
					}
				}

				const foodSalesRaw = await db.all(
					`SELECT fi.id, fi.name, SUM(oi.quantity) as quantity, fi.price
				 FROM order_items oi
				 JOIN food_items fi ON oi.food_item_id = fi.id
				 JOIN orders o ON oi.order_id = o.id
				 WHERE oi.item_type = 'food'
				 AND o.status = 'closed'
				 AND ${orderDateExpr} = ?` +
						(targetAdminId ? ` AND COALESCE(o.edited_by, o.admin_id) = ?` : ``) +
						` GROUP BY fi.id, fi.name, fi.price`,
					targetAdminId ?
						[reportDate, targetAdminId]
					:	[reportDate],
				);

				const foodSalesEnriched = await Promise.all(
					foodSalesRaw.map(async (f: any) => {
						const extrasRaw = await db.all(
							`SELECT fe.id, fe.name, fe.price, SUM(COALESCE(oie.quantity, 1) * COALESCE(oi.quantity, 1)) as quantity
						 FROM order_item_extras oie
						 JOIN food_extras fe ON oie.extra_id = fe.id
						 JOIN order_items oi ON oie.order_item_id = oi.id
						 JOIN orders o ON oi.order_id = o.id
						 WHERE oi.food_item_id = ?
						 AND oi.item_type = 'food'
						 AND o.status = 'closed'
						 AND ${orderDateExpr} = ?` +
								(targetAdminId ? ` AND COALESCE(o.edited_by, o.admin_id) = ?` : ``) +
								` GROUP BY fe.id, fe.name, fe.price`,
							targetAdminId ?
								[f.id, reportDate, targetAdminId]
							:	[f.id, reportDate],
						);

						const baseSales = f.quantity * f.price;
						const extrasSales = extrasRaw.reduce(
							(sum: number, e: any) =>
								sum + (e.quantity || 1) * Number(e.price || 0),
							0,
						);
						const totalSales = baseSales + extrasSales;

						return {
							id: f.id,
							name: f.name,
							quantity: f.quantity,
							price: f.price,
							baseSales,
							extrasSales,
							totalSales,
							extras: extrasRaw.map((e: any) => ({
								id: e.id,
								name: e.name,
								quantity: e.quantity || 1,
								price: e.price,
								totalSales: (e.quantity || 1) * Number(e.price || 0),
							})),
						};
					}),
				);

				const pendingOrders = await db.get(
					`SELECT COUNT(id) as count, SUM(amount) as total
				 FROM orders 
				 WHERE status = 'open' 
				 AND ${dateExpr} = ?` +
						(targetAdminId ? ` AND COALESCE(edited_by, admin_id) = ?` : ``),
					targetAdminId ?
						[reportDate, targetAdminId]
					:	[reportDate],
				);

				const expenses = await db.all(
					`SELECT * FROM expenses WHERE ${createdDateExpr} = ?` +
						(targetAdminId ? ` AND admin_id = ?` : ``),
					targetAdminId ?
						[reportDate, targetAdminId]
					:	[reportDate],
				);

				const paymentBreakdown = await db.all(
					`SELECT LOWER(payment_mode) as method, SUM(amount) as total
				 FROM orders
				 WHERE status = 'closed'
				 AND ${dateExpr} = ?` +
						(targetAdminId ? ` AND COALESCE(edited_by, admin_id) = ?` : ``) +
						` GROUP BY LOWER(payment_mode)`,
					targetAdminId ?
						[reportDate, targetAdminId]
					:	[reportDate],
				);

				let cashTotal = 0;
				let momoTotal = 0;
				let cardTotal = 0;
				let otherTotal = 0;

				paymentBreakdown.forEach((p: any) => {
					const method = String(p.method || "").toLowerCase().trim();
					const amt = Number(p.total) || 0;
					if (
						method === "momo" ||
						method.includes("momo") ||
						method.includes("mobile") ||
						method.includes("mtn") ||
						method.includes("telecel") ||
						method.includes("vodafone")
					) {
						momoTotal += amt;
					} else if (
						method === "card" ||
						method.includes("card") ||
						method.includes("pos") ||
						method.includes("visa") ||
						method.includes("master")
					) {
						cardTotal += amt;
					} else {
						cashTotal += amt;
					}
				});

				const totalClosedSales = cashTotal + momoTotal + cardTotal + otherTotal;

				return {
					date: reportDate,
					inventory: report,
					foodSales: foodSalesEnriched,
					pendingOrders: {
						count: pendingOrders?.count || 0,
						total: pendingOrders?.total || 0,
					},
					expenses: expenses.map((e: any) => ({
						description: e.description,
						amount: e.amount,
						staff: e.admin_name,
					})),
					totalExpenses: expenses.reduce(
						(sum: number, e: any) => sum + e.amount,
						0,
					),
					cashTotal,
					momoTotal,
					cardTotal,
					otherTotal,
					totalClosedSales,
				};
			};

			// Build overall report
			const overallReport = await buildReportForAdmin(filterAdminId);

			// Multi-account reports only for admin role
			const accountReports: any[] = [];
			if (isAdmin) {
				const activeAccounts = await db.all(
					`SELECT DISTINCT admin_id, username, role FROM (
						SELECT COALESCE(o.edited_by, o.admin_id) as admin_id, u.username, u.role 
						FROM orders o 
						LEFT JOIN users u ON COALESCE(o.edited_by, o.admin_id) = u.id 
						WHERE ${orderDateExpr} = ? 
						AND COALESCE(o.edited_by, o.admin_id) IS NOT NULL

						UNION

						SELECT e.admin_id, COALESCE(u.username, e.admin_name) as username, COALESCE(u.role, 'staff') as role 
						FROM expenses e 
						LEFT JOIN users u ON e.admin_id = u.id 
						WHERE ${expenseDateExpr} = ? 
						AND e.admin_id IS NOT NULL

						UNION

						SELECT i.admin_id, COALESCE(u.username, i.admin_name) as username, COALESCE(u.role, 'staff') as role 
						FROM inventory_logs i 
						LEFT JOIN users u ON i.admin_id = u.id 
						WHERE ${inventoryLogDateExpr} = ? 
						AND i.admin_id IS NOT NULL
					)`,
					[reportDate, reportDate, reportDate],
				);

				for (const acc of activeAccounts) {
					if (acc.admin_id) {
						const subReport = await buildReportForAdmin(acc.admin_id);
						accountReports.push({
							accountId: acc.admin_id,
							accountName: acc.username || `User #${acc.admin_id}`,
							role: acc.role || "staff",
							...subReport,
						});
					}
				}
			}

			return {
				...overallReport,
				period,
				accountReports,
			};
		} catch (error) {
			console.error("Error generating daily report:", error);
			throw error;
		}
	},
);

// Expense handlers
ipcMain.handle("get-expenses", async (_, filters: any = {}) => {
	try {
		const db = await getDatabase();

		let start, end;
		const now = new Date();
		const timePeriod = filters.timePeriod || "day";
		const startDate = filters.startDate;
		const endDate = filters.endDate;

		switch (timePeriod) {
			case "day":
				start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
				end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
				break;
			case "yesterday":
				start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
				end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
				break;
			case "week":
				const dayOfWeek = now.getDay();
				const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
				start = new Date(
					now.getFullYear(),
					now.getMonth(),
					now.getDate() - daysToSubtract,
				);
				end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
				break;
			case "month":
				start = new Date(now.getFullYear(), now.getMonth(), 1);
				end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
				break;
			case "custom":
				start = startDate ? new Date(startDate) : new Date();
				end = endDate ? new Date(endDate) : new Date();
				end.setHours(23, 59, 59, 999);
				break;
			default:
				// Backward compatibility for when just a date string is passed
				if (typeof filters === "string") {
					const dateStr = filters;
					const expenses = await db.all(
						"SELECT * FROM expenses WHERE date(created_at) = date(?) ORDER BY created_at DESC",
						[dateStr],
					);
					return expenses;
				}
				start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
				end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
		}

		const formatDate = (d: Date) => {
			const year = d.getFullYear();
			const month = String(d.getMonth() + 1).padStart(2, "0");
			const day = String(d.getDate()).padStart(2, "0");
			return `${year}-${month}-${day}`;
		};

		const startDateStr = formatDate(start);
		const endDateStr = formatDate(end);

		const expenses = await db.all(
			"SELECT * FROM expenses WHERE date(created_at) >= date(?) AND date(created_at) < date(?) ORDER BY created_at DESC",
			[startDateStr, endDateStr],
		);
		return expenses;
	} catch (error) {
		console.error("Error getting expenses:", error);
		throw error;
	}
});

ipcMain.handle(
	"add-expense",
	async (
		_,
		expense: {
			description: string;
			amount: number;
			admin_name: string;
			admin_id?: number;
		},
	) => {
		try {
			const db = await getDatabase();
			const result = await db.run(
				"INSERT INTO expenses (description, amount, admin_name, admin_id) VALUES (?, ?, ?, ?)",
				[
					expense.description,
					expense.amount,
					expense.admin_name,
					expense.admin_id || null,
				],
			);

			await logAction({
				db,
				admin_id: expense.admin_id || null,
				admin_name: expense.admin_name || "System",
				admin_role: "admin", // Assuming admin for now
				action: LOG_ACTIONS.ADD_EXPENSE,
				page: "accounting",
				context: expense,
			});

			return { success: true, id: result.lastID };
		} catch (error) {
			console.error("Error adding expense:", error);
			throw error;
		}
	},
);

ipcMain.handle("delete-expense", async (_, id: number) => {
	try {
		const db = await getDatabase();
		await db.run("DELETE FROM expenses WHERE id = ?", [id]);

		await logAction({
			db,
			admin_id: null,
			admin_name: "System",
			admin_role: "system",
			action: LOG_ACTIONS.DELETE_EXPENSE,
			page: "accounting",
			context: { id },
		});

		return { success: true };
	} catch (error) {
		console.error("Error deleting expense:", error);
		throw error;
	}
});

// Food Category handlers
ipcMain.handle("get-food-categories", async () => {
	try {
		const categories = await withRetry(async () => {
			const db = await getDatabase();
			return await db.all(`
        SELECT * FROM food_categories 
        ORDER BY name ASC
      `);
		});
		return categories;
	} catch (error) {
		console.error("Error getting food categories:", error);
		throw error;
	}
});

ipcMain.handle(
	"add-food-category",
	async (
		_,
		category: { name: string; description?: string; status: string },
		payload = {},
	) => {
		try {
			const db = await getDatabase();
			const result = await db.run(
				`
      INSERT INTO food_categories (name, description, status) VALUES (?, ?, ?)
    `,
				[
					category.name,
					category.description || null,
					category.status || "active",
				],
			);
			const newCategory = await db.get(
				"SELECT * FROM food_categories WHERE id = ?",
				[result.lastID],
			);
			const author = payload.author || {};
			await logAction({
				db,
				admin_id: author.id || null,
				admin_name: author.name || null,
				admin_role: author.role || null,
				action: LOG_ACTIONS.CREATE_FOOD_CATEGORY,
				page: "food",
				context: newCategory,
			});
			return newCategory;
		} catch (error) {
			console.error("Error adding food category:", error);
			throw error;
		}
	},
);

ipcMain.handle(
	"update-food-category",
	async (
		_,
		category: {
			id: number;
			name: string;
			description?: string;
			status: string;
		},
		payload = {},
	) => {
		try {
			const db = await getDatabase();
			await db.run(
				`
      UPDATE food_categories 
      SET name = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
				[
					category.name,
					category.description || null,
					category.status,
					category.id,
				],
			);
			const updatedCategory = await db.get(
				"SELECT * FROM food_categories WHERE id = ?",
				[category.id],
			);
			const author = payload.author || {};
			await logAction({
				db,
				admin_id: author.id || null,
				admin_name: author.name || null,
				admin_role: author.role || null,
				action: LOG_ACTIONS.UPDATE_FOOD_CATEGORY,
				page: "food",
				context: updatedCategory,
			});
			return updatedCategory;
		} catch (error) {
			console.error("Error updating food category:", error);
			throw error;
		}
	},
);

ipcMain.handle("delete-food-category", async (_, id: number, payload = {}) => {
	try {
		const db = await getDatabase();
		await db.run("DELETE FROM food_categories WHERE id = ?", [id]);
		const author = payload.author || {};
		await logAction({
			db,
			admin_id: author.id || null,
			admin_name: author.name || null,
			admin_role: author.role || null,
			action: LOG_ACTIONS.DELETE_FOOD_CATEGORY,
			page: "food",
			context: { id },
		});
		return { id };
	} catch (error) {
		console.error("Error deleting food category:", error);
		throw error;
	}
});

// Food Item handlers
ipcMain.handle("get-food-items", async () => {
	try {
		const items = await withRetry(async () => {
			const db = await getDatabase();
			const foodItems = await db.all(`
        SELECT fi.*, fc.name as category_name 
        FROM food_items fi 
        LEFT JOIN food_categories fc ON fi.category_id = fc.id 
        ORDER BY fi.name ASC
      `);

			// Get extras for each food item
			for (const item of foodItems) {
				const extras = await db.all(
					`
          SELECT fe.* 
          FROM food_extras fe
          INNER JOIN food_item_extras fie ON fe.id = fie.extra_id
          WHERE fie.food_item_id = ? AND fe.status = 'active'
          ORDER BY fe.name ASC
        `,
					[item.id],
				);
				item.extras = extras;
			}

			return foodItems;
		});
		return items;
	} catch (error) {
		console.error("Error getting food items:", error);
		throw error;
	}
});

ipcMain.handle(
	"add-food-item",
	async (
		_,
		item: {
			name: string;
			description?: string;
			category_id: number;
			price: number;
			status: string;
			image?: string;
			extra_ids?: number[];
		},
		payload = {},
	) => {
		try {
			const db = await getDatabase();
			const result = await db.run(
				`
      INSERT INTO food_items (name, description, category_id, price, status, image) 
      VALUES (?, ?, ?, ?, ?, ?)
    `,
				[
					item.name,
					item.description || null,
					item.category_id,
					item.price,
					item.status || "active",
					item.image || null,
				],
			);
			const newItem = await db.get("SELECT * FROM food_items WHERE id = ?", [
				result.lastID,
			]);

			// Add extras if provided
			console.log("Adding food item - received extra_ids:", {
				extra_ids: item.extra_ids,
				type: typeof item.extra_ids,
				isArray: Array.isArray(item.extra_ids),
				length: item.extra_ids?.length,
			});
			if (
				item.extra_ids &&
				Array.isArray(item.extra_ids) &&
				item.extra_ids.length > 0
			) {
				console.log(
					`Inserting ${item.extra_ids.length} extras for food item ${result.lastID}`,
				);
				for (const extraId of item.extra_ids) {
					console.log(
						`Inserting extra ${extraId} for food item ${result.lastID}`,
					);
					await db.run(
						"INSERT INTO food_item_extras (food_item_id, extra_id) VALUES (?, ?)",
						[result.lastID, extraId],
					);
				}
				console.log(`Successfully inserted ${item.extra_ids.length} extras`);
			} else {
				console.log("No extras to insert or extra_ids is not a valid array");
			}

			const author = payload.author || {};
			await logAction({
				db,
				admin_id: author.id || null,
				admin_name: author.name || null,
				admin_role: author.role || null,
				action: LOG_ACTIONS.CREATE_FOOD_ITEM,
				page: "food",
				context: newItem,
			});
			return newItem;
		} catch (error) {
			console.error("Error adding food item:", error);
			throw error;
		}
	},
);

ipcMain.handle(
	"update-food-item",
	async (
		_,
		item: {
			id: number;
			name: string;
			description?: string;
			category_id: number;
			price: number;
			status: string;
			image?: string;
			extra_ids?: number[];
		},
		payload = {},
	) => {
		try {
			const db = await getDatabase();
			await db.run(
				`
      UPDATE food_items 
      SET name = ?, description = ?, category_id = ?, price = ?, status = ?, image = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
				[
					item.name,
					item.description || null,
					item.category_id,
					item.price,
					item.status,
					item.image || null,
					item.id,
				],
			);

			// Update extras
			console.log("Updating food item - received extra_ids:", {
				extra_ids: item.extra_ids,
				type: typeof item.extra_ids,
				isArray: Array.isArray(item.extra_ids),
				length: item.extra_ids?.length,
			});
			await db.run("DELETE FROM food_item_extras WHERE food_item_id = ?", [
				item.id,
			]);
			if (
				item.extra_ids &&
				Array.isArray(item.extra_ids) &&
				item.extra_ids.length > 0
			) {
				console.log(
					`Inserting ${item.extra_ids.length} extras for food item ${item.id}`,
				);
				for (const extraId of item.extra_ids) {
					console.log(`Inserting extra ${extraId} for food item ${item.id}`);
					await db.run(
						"INSERT INTO food_item_extras (food_item_id, extra_id) VALUES (?, ?)",
						[item.id, extraId],
					);
				}
				console.log(`Successfully inserted ${item.extra_ids.length} extras`);
			} else {
				console.log("No extras to insert or extra_ids is not a valid array");
			}

			const updatedItem = await db.get(
				"SELECT * FROM food_items WHERE id = ?",
				[item.id],
			);
			const author = payload.author || {};
			await logAction({
				db,
				admin_id: author.id || null,
				admin_name: author.name || null,
				admin_role: author.role || null,
				action: LOG_ACTIONS.UPDATE_FOOD_ITEM,
				page: "food",
				context: updatedItem,
			});
			return updatedItem;
		} catch (error) {
			console.error("Error updating food item:", error);
			throw error;
		}
	},
);

ipcMain.handle("delete-food-item", async (_, id: number, payload = {}) => {
	try {
		const db = await getDatabase();
		await db.run("DELETE FROM food_items WHERE id = ?", [id]);
		const author = payload.author || {};
		await logAction({
			db,
			admin_id: author.id || null,
			admin_name: author.name || null,
			admin_role: author.role || null,
			action: LOG_ACTIONS.DELETE_FOOD_ITEM,
			page: "food",
			context: { id },
		});
		return { id };
	} catch (error) {
		console.error("Error deleting food item:", error);
		throw error;
	}
});

// Food Extra handlers
ipcMain.handle("get-food-extras", async () => {
	try {
		const extras = await withRetry(async () => {
			const db = await getDatabase();
			return await db.all(`
        SELECT * FROM food_extras 
        ORDER BY name ASC
      `);
		});
		return extras;
	} catch (error) {
		console.error("Error getting food extras:", error);
		throw error;
	}
});

ipcMain.handle(
	"add-food-extra",
	async (
		_,
		extra: { name: string; price: number; status: string },
		payload = {},
	) => {
		try {
			const db = await getDatabase();
			const result = await db.run(
				`
      INSERT INTO food_extras (name, price, status) VALUES (?, ?, ?)
    `,
				[extra.name, extra.price, extra.status || "active"],
			);
			const newExtra = await db.get("SELECT * FROM food_extras WHERE id = ?", [
				result.lastID,
			]);
			const author = payload.author || {};
			await logAction({
				db,
				admin_id: author.id || null,
				admin_name: author.name || null,
				admin_role: author.role || null,
				action: LOG_ACTIONS.CREATE_FOOD_EXTRA,
				page: "food",
				context: newExtra,
			});
			return newExtra;
		} catch (error) {
			console.error("Error adding food extra:", error);
			throw error;
		}
	},
);

ipcMain.handle(
	"update-food-extra",
	async (
		_,
		extra: { id: number; name: string; price: number; status: string },
		payload = {},
	) => {
		try {
			const db = await getDatabase();
			await db.run(
				`
      UPDATE food_extras 
      SET name = ?, price = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
				[extra.name, extra.price, extra.status, extra.id],
			);
			const updatedExtra = await db.get(
				"SELECT * FROM food_extras WHERE id = ?",
				[extra.id],
			);
			const author = payload.author || {};
			await logAction({
				db,
				admin_id: author.id || null,
				admin_name: author.name || null,
				admin_role: author.role || null,
				action: LOG_ACTIONS.UPDATE_FOOD_EXTRA,
				page: "food",
				context: updatedExtra,
			});
			return updatedExtra;
		} catch (error) {
			console.error("Error updating food extra:", error);
			throw error;
		}
	},
);

ipcMain.handle("delete-food-extra", async (_, id: number, payload = {}) => {
	try {
		const db = await getDatabase();
		await db.run("DELETE FROM food_extras WHERE id = ?", [id]);
		const author = payload.author || {};
		await logAction({
			db,
			admin_id: author.id || null,
			admin_name: author.name || null,
			admin_role: author.role || null,
			action: LOG_ACTIONS.DELETE_FOOD_EXTRA,
			page: "food",
			context: { id },
		});
		return { id };
	} catch (error) {
		console.error("Error deleting food extra:", error);
		throw error;
	}
});

// Helper function to generate take-out table number
async function generateTakeOutTableNumber(db: any): Promise<string> {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");

	// Get the last take-out table number for this month
	const lastTakeOutOrder = await db.get(
		`SELECT table_number FROM orders 
     WHERE order_type = 'takeout' 
     AND strftime('%Y-%m', created_at) = ?
     AND table_number LIKE 'TO-%'
     ORDER BY CAST(SUBSTR(table_number, 4) AS INTEGER) DESC LIMIT 1`,
		[`${year}-${month}`],
	);

	let nextNumber = 1;
	if (lastTakeOutOrder?.table_number) {
		// Extract number from "TO-001" format
		const match = lastTakeOutOrder.table_number.match(/TO-(\d+)/);
		if (match) {
			nextNumber = parseInt(match[1], 10) + 1;
		}
	}

	// Format as TO-001, TO-002, etc.
	return `TO-${String(nextNumber).padStart(3, "0")}`;
}

// Helper function to generate dine-in table number
async function generateDineInTableNumber(db: any): Promise<string> {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");

	// Get the last dine-in table number for this month
	const lastDineInOrder = await db.get(
		`SELECT table_number FROM orders 
     WHERE order_type = 'table' 
     AND strftime('%Y-%m', created_at) = ?
     AND table_number LIKE 'DINE-%'
     ORDER BY CAST(SUBSTR(table_number, 4) AS INTEGER) DESC LIMIT 1`,
		[`${year}-${month}`],
	);

	let nextNumber = 1;
	if (lastDineInOrder?.table_number) {
		// Extract number from "DINE-001" format
		const match = lastDineInOrder.table_number.match(/DINE-(\d+)/);
		if (match) {
			nextNumber = parseInt(match[1], 10) + 1;
		}
	}

	// Format as DINE-001, DINE-002, etc.
	return `DINE-${String(nextNumber).padStart(3, "0")}`;
}

// Order handlers
ipcMain.handle("create-order", async (_event, order) => {
	try {
		const db = await getDatabase();
		const { items, ...orderData } = order;

		// Calculate amounts based on order items
		let amount_bt = 0; // amount before tax
		let amount = 0; // amount with tax

		if (Array.isArray(items) && items.length > 0) {
			// Get product/food prices and calculate totals
			for (const item of items) {
				if (item.itemType === "drink" && item.productId) {
					const product = await db.get(
						"SELECT price FROM products WHERE id = ?",
						[item.productId],
					);
					if (product) {
						const itemTotal = product.price * item.quantity;
						amount_bt += itemTotal;
					}
				} else if (item.itemType === "food" && item.foodItemId) {
					const foodItem = await db.get(
						"SELECT price FROM food_items WHERE id = ?",
						[item.foodItemId],
					);
					if (foodItem) {
						let itemTotal = foodItem.price * item.quantity;
						// Add extras prices
						if (item.extraIds && item.extraIds.length > 0) {
							for (const extraId of item.extraIds) {
								const extra = await db.get(
									"SELECT price FROM food_extras WHERE id = ?",
									[extraId],
								);
								if (extra) {
									itemTotal += extra.price * item.quantity;
								}
							}
						}
						amount_bt += itemTotal;
					}
				}
			}

			// Calculate amount with tax
			const taxRate = orderData.tax || 0;
			amount = amount_bt + (amount_bt * taxRate) / 100;
		}

		// Calculate order number for current month
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, "0");

		// Get the last order number for this month
		const lastOrder = await db.get(
			`SELECT order_number FROM orders 
       WHERE strftime('%Y-%m', created_at) = ?
       ORDER BY order_number DESC LIMIT 1`,
			[`${year}-${month}`],
		);

		const orderNumber =
			lastOrder?.order_number ? lastOrder.order_number + 1 : 1;

		// Generate take-out or dine-in table number
		let tableNumber = orderData.table_number || null;
		if (orderData.order_type === "takeout") {
			tableNumber = await generateTakeOutTableNumber(db);
		} else if (orderData.order_type === "table") {
			tableNumber = await generateDineInTableNumber(db);
		}

		// Insert order with calculated amounts, order number, venue timezone, and business date
		const nowUtcIso = new Date().toISOString();
		const bDate = getLocalDateString();
		const closedAt = orderData.status === "closed" ? nowUtcIso : null;
		const result = await db.run(
			"INSERT INTO orders (order_number, sale_id, order_type, table_number, customer_name, payment_mode, tax, amount, amount_bt, status, closed_at, admin_id, notes, timezone, business_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
			[
				orderNumber,
				orderData.sale_id || null,
				orderData.order_type,
				tableNumber,
				orderData.customer_name || null,
				orderData.payment_mode,
				orderData.tax || 0,
				amount,
				amount_bt,
				orderData.status || "open",
				closedAt,
				orderData.admin_id || null,
				orderData.notes || null,
				DEFAULT_VENUE_TIMEZONE,
				bDate,
				nowUtcIso,
				nowUtcIso,
			],
		);
		const orderId = result.lastID;

		// Get author info for logging
		const author = orderData.author || {};

		// Insert order items and update product stock (for drinks only)
		if (Array.isArray(items)) {
			for (const item of items) {
				if (item.itemType === "drink" && item.productId) {
					// Insert order item for drink
					const orderItemResult = await db.run(
						"INSERT INTO order_items (order_id, product_id, food_item_id, item_type, quantity, notes, timezone, business_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
						[orderId, item.productId, null, "drink", item.quantity, null, DEFAULT_VENUE_TIMEZONE, bDate, nowUtcIso],
					);

					// Update product stock (reduce by ordered quantity)
					// Get stock before update for logging
					const oldProduct = await db.get(
						"SELECT name, stock FROM products WHERE id = ?",
						[item.productId],
					);
					const oldStock = oldProduct?.stock || 0;

					// Update product stock (reduce by ordered quantity)
					await db.run(
						"UPDATE products SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
						[item.quantity, item.productId],
					);

					const newStock = oldStock - item.quantity;

					// Log inventory change
					await logInventoryChange({
						db,
						productId: item.productId!,
						changeAmount: -item.quantity,
						previousStock: oldStock,
						newStock: newStock,
						reason: "sale",
						adminId: author.id || null,
						productName: oldProduct?.name || null,
						adminName: author.name || null,
						adminRole: author.role || null,
					});

					if (oldProduct) {
						await logAction({
							db,
							admin_id: author.id || null,
							admin_name: author.name || null,
							admin_role: author.role || null,
							action: LOG_ACTIONS.UPDATE_STOCK,
							page: "orders",
							context: {
								productId: item.productId,
								productName: oldProduct.name,
								quantityReduced: item.quantity,
								newStock: newStock,
								orderId,
							},
						});
					}
				} else if (item.itemType === "food" && item.foodItemId) {
					// Insert order item for food
					const orderItemResult = await db.run(
						"INSERT INTO order_items (order_id, product_id, food_item_id, item_type, quantity, notes, timezone, business_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
						[
							orderId,
							null,
							item.foodItemId,
							"food",
							item.quantity,
							item.notes || null,
							DEFAULT_VENUE_TIMEZONE,
							bDate,
							nowUtcIso,
						],
					);
					const orderItemId = orderItemResult.lastID;

					// Insert order item extras if any
					if (
						item.extraIds &&
						Array.isArray(item.extraIds) &&
						item.extraIds.length > 0
					) {
						// Deduplicate: count occurrences of each extra_id to get quantity
						const extraCounts = new Map<number, number>();
						for (const extraId of item.extraIds) {
							const id = Number(extraId);
							extraCounts.set(id, (extraCounts.get(id) || 0) + 1);
						}
						for (const [extraId, qty] of extraCounts.entries()) {
							await db.run(
								"INSERT OR IGNORE INTO order_item_extras (order_item_id, extra_id, quantity) VALUES (?, ?, ?)",
								[orderItemId, extraId, qty],
							);
						}
					}
				}
			}
		}

		// Log action
		await logAction({
			db,
			admin_id: author.id || null,
			admin_name: author.name || null,
			admin_role: author.role || null,
			action: LOG_ACTIONS.CREATE_ORDER,
			page: "orders",
			context: { orderId, amount, amount_bt, ...orderData },
		});

		// Fetch the full order with items and extras (same logic as get-order-by-id)
		const createdOrder = await db.get(
			`
			SELECT 
				o.*,
				u_creator.username AS creator_name,
				u_editor.username AS editor_name
			FROM orders o
			LEFT JOIN users u_creator ON o.admin_id = u_creator.id
			LEFT JOIN users u_editor ON o.edited_by = u_editor.id
			WHERE o.id = ?
		`,
			[orderId],
		);
		const orderItems = await db.all(
			`
			SELECT 
				oi.id,
				oi.order_id,
				oi.product_id,
				oi.food_item_id,
				oi.item_type,
				oi.quantity,
				oi.notes,
				p.name as product_name,
				p.price,
				p.image,
				c.name as category_name,
				fi.name as food_item_name,
				fi.price as food_price,
				fi.image as food_image,
				fc.name as food_category_name
			FROM order_items oi
			LEFT JOIN products p ON oi.product_id = p.id AND oi.item_type = 'drink'
			LEFT JOIN categories c ON p.category = c.id
			LEFT JOIN food_items fi ON oi.food_item_id = fi.id AND oi.item_type = 'food'
			LEFT JOIN food_categories fc ON fi.category_id = fc.id
			WHERE oi.order_id = ?
			ORDER BY oi.id
		`,
			[orderId],
		);

		for (const item of orderItems) {
			if (item.item_type === "food") {
				const extrasRaw = await db.all(
					`
					SELECT fe.id, fe.name, fe.price, oie.quantity
					FROM order_item_extras oie
					JOIN food_extras fe ON oie.extra_id = fe.id
					WHERE oie.order_item_id = ?
				`,
					[item.id],
				);
				item.extras = extrasRaw.map((e: any) => ({
					id: e.id,
					name: e.name,
					price: e.price,
					quantity: e.quantity || 1,
				}));
				item.food_item_name = item.food_item_name || item.product_name;
				item.price = item.food_price || item.price;
				item.image = item.food_image || item.image;
				item.category_name = item.food_category_name || item.category_name;
			}
		}

		scheduleSyncAfterMutation();

		return {
			...createdOrder,
			items: orderItems,
		};
	} catch (error) {
		console.error("Error creating order:", error);
		throw error;
	}
});

ipcMain.handle("get-orders", async (_event, payload = {}) => {
	try {
		// console.log('get-orders handler called with payload:', payload);
		const result = await withRetry(async () => {
			const db = await getDatabase();
			const orders = await db.all(`
				SELECT 
					o.*,
					u_creator.username AS creator_name,
					u_editor.username AS editor_name
				FROM orders o
				LEFT JOIN users u_creator ON o.admin_id = u_creator.id
				LEFT JOIN users u_editor ON o.edited_by = u_editor.id
			`);

			// Log action within the retry wrapper
			const author = payload.author || {};
			await logAction({
				db,
				admin_id: author.id || null,
				admin_name: author.name || null,
				admin_role: author.role || null,
				action: LOG_ACTIONS.VIEW_ORDERS,
				page: "orders",
				context: null,
			});

			return orders;
		});

		// console.log('get-orders completed successfully');
		return result;
	} catch (error) {
		console.error("Error getting orders:", error);
		throw error;
	}
});

// Get single order by ID with order items
ipcMain.handle(
	"get-order-by-id",
	async (_event, orderId: number, payload = {}) => {
		try {
			const result = await withRetry(async () => {
				const db = await getDatabase();

				// Get the order
				const order = await db.get(
					`
					SELECT 
						o.*,
						u_creator.username AS creator_name,
						u_editor.username AS editor_name
					FROM orders o
					LEFT JOIN users u_creator ON o.admin_id = u_creator.id
					LEFT JOIN users u_editor ON o.edited_by = u_editor.id
					WHERE o.id = ?
				`,
					[orderId],
				);

				if (!order) {
					throw new Error("Order not found");
				}

				// Get order items with product/food details
				const orderItems = await db.all(
					`
        SELECT 
          oi.id,
          oi.order_id,
          oi.product_id,
          oi.food_item_id,
          oi.item_type,
          oi.quantity,
          oi.notes,
          p.name as product_name,
          p.price,
          p.image,
          c.name as category_name,
          fi.name as food_item_name,
          fi.price as food_price,
          fi.image as food_image,
          fc.name as food_category_name
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id AND oi.item_type = 'drink'
        LEFT JOIN categories c ON p.category = c.id
        LEFT JOIN food_items fi ON oi.food_item_id = fi.id AND oi.item_type = 'food'
        LEFT JOIN food_categories fc ON fi.category_id = fc.id
        WHERE oi.order_id = ?
        ORDER BY oi.id
      `,
					[orderId],
				);

				// Get extras for each food order item (with quantities)
				for (const item of orderItems) {
					if (item.item_type === "food") {
						const extrasRaw = await db.all(
							`
                            SELECT fe.id, fe.name, fe.price, oie.quantity
              FROM order_item_extras oie
              JOIN food_extras fe ON oie.extra_id = fe.id
              WHERE oie.order_item_id = ?
            `,
							[item.id],
						);
						item.extras = extrasRaw.map((e: any) => ({
							id: e.id,
							name: e.name,
							price: e.price,
							quantity: e.quantity || 1,
						}));
						// Set food-specific fields
						item.food_item_name = item.food_item_name || item.product_name;
						item.price = item.food_price || item.price;
						item.image = item.food_image || item.image;
						item.category_name = item.food_category_name || item.category_name;
					}
				}

				// Attach order items to the order
				const orderWithItems = {
					...order,
					items: orderItems,
				};

				// Log action within the retry wrapper
				const author = payload.author || {};
				await logAction({
					db,
					admin_id: author.id || null,
					admin_name: author.name || null,
					admin_role: author.role || null,
					action: LOG_ACTIONS.VIEW_ORDERS,
					page: "orders",
					context: { orderId, itemsCount: orderItems.length },
				});

				return orderWithItems;
			});

			return result;
		} catch (error) {
			console.error("Error getting order by ID:", error);
			throw error;
		}
	},
);

// Order update handler
ipcMain.handle("update-order", async (_, order) => {
	try {
		const result = await withRetry(async () => {
			const db = await getDatabase();

			// Fetch the existing order to detect status transitions and closed_at
			const existingOrder = await db.get(
				"SELECT status, closed_at FROM orders WHERE id = ?",
				[order.id],
			);

			// If order is being cancelled, restore drink stock and log the change
			const author = order.author || {};
			if (
				existingOrder &&
				existingOrder.status !== "cancelled" &&
				order.status === "cancelled"
			) {
				const drinkItemsToRestore = await db.all(
					"SELECT oi.product_id, oi.quantity FROM order_items oi WHERE oi.order_id = ? AND oi.item_type = 'drink'",
					[order.id],
				);
				for (const item of drinkItemsToRestore) {
					if (!item.product_id) continue;
					const currentProduct = await db.get(
						"SELECT stock, name FROM products WHERE id = ?",
						[item.product_id],
					);
					const oldStock = currentProduct?.stock || 0;
					const newStock = oldStock + item.quantity;
					await db.run(
						"UPDATE products SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
						[item.quantity, item.product_id],
					);
					await logInventoryChange({
						db,
						productId: item.product_id,
						changeAmount: item.quantity,
						previousStock: oldStock,
						newStock,
						reason: "sale",
						adminId: author.id || null,
						productName: currentProduct?.name || null,
						adminName: author.name || null,
						adminRole: author.role || null,
					});
				}
			}

			// Calculate amounts based on current order items
			let amount_bt = 0; // amount before tax
			let amount = 0; // amount with tax

			// Get current order items and calculate totals (drinks + food)
			const drinkItems = await db.all(
				"SELECT oi.*, p.price FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ? AND oi.item_type = 'drink'",
				[order.id],
			);
			const foodItems = await db.all(
				"SELECT oi.*, fi.price as food_price FROM order_items oi LEFT JOIN food_items fi ON oi.food_item_id = fi.id WHERE oi.order_id = ? AND oi.item_type = 'food'",
				[order.id],
			);

			for (const item of drinkItems) {
				const itemPrice = item.price || 0;
				amount_bt += itemPrice * item.quantity;
			}

			for (const item of foodItems) {
				const itemPrice = item.food_price || 0;
				let itemTotal = itemPrice * item.quantity;
				// Add extras for food items
				const extras = await db.all(
					"SELECT fe.price, oie.quantity FROM order_item_extras oie JOIN food_extras fe ON oie.extra_id = fe.id WHERE oie.order_item_id = ?",
					[item.id],
				);
				for (const extra of extras) {
					itemTotal +=
						(extra.price || 0) * (extra.quantity || 1) * item.quantity;
				}
				amount_bt += itemTotal;
			}

			if (drinkItems.length > 0 || foodItems.length > 0) {
				// Calculate amount with tax
				const taxRate = order.tax || 0;
				amount = amount_bt + (amount_bt * taxRate) / 100;
			}

			const editorId = author.id || null;
			let closedAt = existingOrder?.closed_at || null;
			if (order.status === "closed") {
				if (!closedAt || existingOrder?.status !== "closed") {
					closedAt = new Date().toISOString();
				}
			} else {
				closedAt = null;
			}

			await db.run(
				`
        UPDATE orders
        SET sale_id = ?,
            order_type = ?,
            table_number = ?,
            customer_name = ?,
            payment_mode = ?,
            tax = ?,
            amount = ?,
            amount_bt = ?,
            status = ?,
            closed_at = ?,
            admin_id = ?,
            edited_by = ?,
            amount_tendered = ?,
            notes = ?,
            synced_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
				[
					order.sale_id,
					order.order_type,
					order.table_number || null,
					order.customer_name || null,
					order.payment_mode,
					order.tax || 0,
					amount,
					amount_bt,
					order.status,
					closedAt,
					order.admin_id,
					editorId,
					order.amount_tendered || 0,
					order.notes || null,
					order.id,
				],
			);

			await db.run(
				"UPDATE order_items SET synced_at = NULL WHERE order_id = ?",
				[order.id],
			);

			// Log action within the retry wrapper
			await logAction({
				db,
				admin_id: author.id || null,
				admin_name: author.name || null,
				admin_role: author.role || null,
				action: LOG_ACTIONS.UPDATE_ORDER,
				page: "orders",
				context: { ...order, amount, amount_bt },
			});

			return { ...order, amount, amount_bt };
		});

		scheduleSyncAfterMutation();
		return result;
	} catch (error) {
		console.error("Error updating order:", error);
		throw error;
	}
});

// Bulk update orders handler
ipcMain.handle("bulk-update-orders", async (_, { ids, status, author }) => {
	try {
		const result = await withRetry(async () => {
			const db = await getDatabase();
			const editorId = author?.id || null;

			for (const id of ids) {
				// Fetch existing order to check for cancellation or deletion stock restore
				const existingOrder = await db.get(
					"SELECT status, closed_at FROM orders WHERE id = ?",
					[id]
				);

				if (!existingOrder) continue;

				let closedAt = existingOrder.closed_at || null;
				if (status === "closed") {
					if (!closedAt || existingOrder.status !== "closed") {
						closedAt = new Date().toISOString();
					}
				} else {
					closedAt = null;
				}

				// If order is being cancelled or deleted, restore drink stock and log change
				if (
					existingOrder.status !== "cancelled" &&
					existingOrder.status !== "deleted" &&
					(status === "cancelled" || status === "deleted")
				) {
					const drinkItemsToRestore = await db.all(
						"SELECT oi.product_id, oi.quantity FROM order_items oi WHERE oi.order_id = ? AND oi.item_type = 'drink'",
						[id]
					);
					for (const item of drinkItemsToRestore) {
						if (!item.product_id) continue;
						const currentProduct = await db.get(
							"SELECT stock, name FROM products WHERE id = ?",
							[item.product_id]
						);
						const oldStock = currentProduct?.stock || 0;
						const newStock = oldStock + item.quantity;
						await db.run(
							"UPDATE products SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
							[item.quantity, item.product_id]
						);
						await logInventoryChange({
							db,
							productId: item.product_id,
							changeAmount: item.quantity,
							previousStock: oldStock,
							newStock,
							reason: "sale",
							adminId: author?.id || null,
							productName: currentProduct?.name || null,
							adminName: author?.name || null,
							adminRole: author?.role || null,
						});
					}
				}

				// Perform update
				await db.run(
					`
					UPDATE orders
					SET status = ?,
						closed_at = ?,
						edited_by = ?,
						synced_at = NULL,
						updated_at = CURRENT_TIMESTAMP
					WHERE id = ?
					`,
					[status, closedAt, editorId, id]
				);

				// Mark order items as unsynced
				await db.run(
					"UPDATE order_items SET synced_at = NULL WHERE order_id = ?",
					[id]
				);

				// Log action
				await logAction({
					db,
					admin_id: author?.id || null,
					admin_name: author?.name || null,
					admin_role: author?.role || null,
					action: LOG_ACTIONS.UPDATE_ORDER,
					page: "orders",
					context: { id, status },
				});
			}

			return { success: true, count: ids.length };
		});

		scheduleSyncAfterMutation();
		return result;
	} catch (error) {
		console.error("Error in bulk update orders:", error);
		throw error;
	}
});

// Update order items handler
ipcMain.handle(
	"update-order-items",
	async (_, orderId: number, newItems: any[], payload = {}) => {
		try {
			const result = await withRetry(async () => {
				const db = await getDatabase();

				// Get current order items for stock adjustment
				const currentItems = await db.all(
					"SELECT * FROM order_items WHERE order_id = ?",
					[orderId],
				);

				// Calculate stock adjustments using a more accurate method
				const stockAdjustments = new Map();

				// Create maps for easy lookup (only for drinks/products)
				const currentItemsMap = new Map();
				for (const item of currentItems) {
					if (item.item_type === "drink" && item.product_id) {
						currentItemsMap.set(item.product_id, item.quantity);
					}
				}

				const newItemsMap = new Map();
				for (const item of newItems) {
					if (item.itemType === "drink" && item.productId) {
						newItemsMap.set(item.productId, item.quantity);
					}
				}

				// Calculate adjustments for each product (drinks only)
				const allProductIds = new Set([
					...currentItems
						.filter(
							(item: any) => item.item_type === "drink" && item.product_id,
						)
						.map((item: any) => item.product_id),
					...newItems
						.filter((item: any) => item.itemType === "drink" && item.productId)
						.map((item: any) => item.productId),
				]);

				for (const productId of allProductIds) {
					const currentQty = currentItemsMap.get(productId) || 0;
					const newQty = newItemsMap.get(productId) || 0;
					const adjustment = currentQty - newQty; // Positive = restore stock, Negative = reduce stock

					if (adjustment !== 0) {
						stockAdjustments.set(productId, adjustment);
					}
				}

				// Apply stock adjustments (drinks only)
				const author = payload.author || {};
				for (const [productId, adjustment] of stockAdjustments) {
					if (adjustment !== 0) {
						// Get current stock before update
						const currentProduct = await db.get(
							"SELECT stock, name FROM products WHERE id = ?",
							[productId],
						);
						const oldStock = currentProduct?.stock || 0;

						await db.run(
							"UPDATE products SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
							[adjustment, productId],
						);

						const newStock = oldStock + adjustment;

						// Log the inventory change so the daily report tracks this correctly
						await logInventoryChange({
							db,
							productId,
							changeAmount: adjustment,
							previousStock: oldStock,
							newStock,
							reason: "sale",
							adminId: author.id || null,
							productName: currentProduct?.name || null,
							adminName: author.name || null,
							adminRole: author.role || null,
						});
					}
				}

				// Delete all current order items and their extras
				await db.run(
					"DELETE FROM order_item_extras WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id = ?)",
					[orderId],
				);
				await db.run("DELETE FROM order_items WHERE order_id = ?", [orderId]);

				// Insert new order items
				for (const item of newItems) {
					if (item.itemType === "drink" && item.productId) {
						// Insert order item for drink
						await db.run(
							"INSERT INTO order_items (order_id, product_id, food_item_id, item_type, quantity, notes) VALUES (?, ?, ?, ?, ?, ?)",
							[orderId, item.productId, null, "drink", item.quantity, null],
						);
					} else if (item.itemType === "food" && item.foodItemId) {
						// Insert order item for food
						const orderItemResult = await db.run(
							"INSERT INTO order_items (order_id, product_id, food_item_id, item_type, quantity, notes) VALUES (?, ?, ?, ?, ?, ?)",
							[
								orderId,
								null,
								item.foodItemId,
								"food",
								item.quantity,
								item.notes || null,
							],
						);
						const orderItemId = orderItemResult.lastID;

						// Insert order item extras if any
						if (Array.isArray(item.extraIds) && item.extraIds.length > 0) {
							// Deduplicate: count occurrences of each extra_id to get quantity
							const extraCounts = new Map<number, number>();
							for (const extraId of item.extraIds) {
								const id = Number(extraId);
								extraCounts.set(id, (extraCounts.get(id) || 0) + 1);
							}
							for (const [extraId, qty] of extraCounts.entries()) {
								await db.run(
									"INSERT OR IGNORE INTO order_item_extras (order_item_id, extra_id, quantity) VALUES (?, ?, ?)",
									[orderItemId, extraId, qty],
								);
							}
						}
					}
				}

				// Recalculate order amounts
				let amount_bt = 0;
				for (const item of newItems) {
					if (item.itemType === "drink" && item.productId) {
						const product = await db.get(
							"SELECT price FROM products WHERE id = ?",
							[item.productId],
						);
						if (product) {
							amount_bt += product.price * item.quantity;
						}
					} else if (item.itemType === "food" && item.foodItemId) {
						const foodItem = await db.get(
							"SELECT price FROM food_items WHERE id = ?",
							[item.foodItemId],
						);
						if (foodItem) {
							let itemTotal = foodItem.price * item.quantity;
							// Add extras prices
							if (
								item.extraIds &&
								Array.isArray(item.extraIds) &&
								item.extraIds.length > 0
							) {
								for (const extraId of item.extraIds) {
									const extra = await db.get(
										"SELECT price FROM food_extras WHERE id = ?",
										[extraId],
									);
									if (extra) {
										itemTotal += extra.price * item.quantity;
									}
								}
							}
							amount_bt += itemTotal;
						}
					}
				}

				// Get order for tax calculation
				const order = await db.get("SELECT tax FROM orders WHERE id = ?", [
					orderId,
				]);
				const taxRate = order?.tax || 0;
				const amount = amount_bt + (amount_bt * taxRate) / 100;

				const editorId = author.id || null;

				// Update order amounts and edited_by — mark unsynced for cloud backup
				await db.run(
					"UPDATE orders SET amount = ?, amount_bt = ?, edited_by = ?, synced_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
					[amount, amount_bt, editorId, orderId],
				);
				await db.run(
					"UPDATE order_items SET synced_at = NULL WHERE order_id = ?",
					[orderId],
				);

				// Log action within the retry wrapper
				await logAction({
					db,
					admin_id: author.id || null,
					admin_name: author.name || null,
					admin_role: author.role || null,
					action: LOG_ACTIONS.UPDATE_ORDER,
					page: "orders",
					context: {
						orderId,
						itemsCount: newItems.length,
						amount,
						amount_bt,
						stockAdjustments: Object.fromEntries(stockAdjustments),
					},
				});

				// Return updated order with items (using same query as get-order-by-id)
				const updatedOrder = await db.get(
					`
					SELECT 
						o.*,
						u_creator.username AS creator_name,
						u_editor.username AS editor_name
					FROM orders o
					LEFT JOIN users u_creator ON o.admin_id = u_creator.id
					LEFT JOIN users u_editor ON o.edited_by = u_editor.id
					WHERE o.id = ?
				`,
					[orderId],
				);
				const updatedItems = await db.all(
					`
        SELECT 
          oi.id,
          oi.order_id,
          oi.product_id,
          oi.food_item_id,
          oi.item_type,
          oi.quantity,
          oi.notes,
          p.name as product_name,
          p.price,
          p.image,
          c.name as category_name,
          fi.name as food_item_name,
          fi.price as food_price,
          fi.image as food_image,
          fc.name as food_category_name
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id AND oi.item_type = 'drink'
        LEFT JOIN categories c ON p.category = c.id
        LEFT JOIN food_items fi ON oi.food_item_id = fi.id AND oi.item_type = 'food'
        LEFT JOIN food_categories fc ON fi.category_id = fc.id
        WHERE oi.order_id = ?
        ORDER BY oi.id
      `,
					[orderId],
				);

				// Get extras for each food order item (with quantities)
				for (const item of updatedItems) {
					if (item.item_type === "food") {
						const extrasRaw = await db.all(
							`
                            SELECT fe.id, fe.name, fe.price, oie.quantity
              FROM order_item_extras oie
              JOIN food_extras fe ON oie.extra_id = fe.id
              WHERE oie.order_item_id = ?
            `,
							[item.id],
						);
						item.extras = extrasRaw.map((e: any) => ({
							id: e.id,
							name: e.name,
							price: e.price,
							quantity: e.quantity || 1,
						}));
						// Set food-specific fields
						item.food_item_name = item.food_item_name || item.product_name;
						item.price = item.food_price || item.price;
						item.image = item.food_image || item.image;
						item.category_name = item.food_category_name || item.category_name;
					}
				}

				return {
					...updatedOrder,
					items: updatedItems,
				};
			});

			scheduleSyncAfterMutation();
			return result;
		} catch (error) {
			console.error("Error updating order items:", error);
			throw error;
		}
	},
);

// Add after other IPC handlers:
ipcMain.handle("get-logs", async (_event, filters: any = {}) => {
	try {
		const db = await getDatabase();
		const { startDate, endDate, type } = filters;

		let query = "SELECT * FROM logs";
		const params: any[] = [];
		const conditions: string[] = [];

		if (startDate && endDate) {
			conditions.push("strftime('%Y-%m-%d', created_at) BETWEEN ? AND ?");
			params.push(startDate, endDate);
		}

		if (type === "crud") {
			// Exclude non-modifying actions
			conditions.push("action NOT LIKE 'view_%'");
			conditions.push("action NOT LIKE 'login%'");
			conditions.push("action NOT LIKE 'logout%'");
			conditions.push("action NOT LIKE 'export_%'");
		}

		if (conditions.length > 0) {
			query += " WHERE " + conditions.join(" AND ");
		}

		query += " ORDER BY created_at DESC";

		const logs = await db.all(query, params);
		return logs;
	} catch (error) {
		console.error("Error getting logs:", error);
		throw error;
	}
});

ipcMain.handle("logout", async (_event, payload = {}) => {
	try {
		const db = await getDatabase();
		const author = payload.author || {};
		await logAction({
			db,
			admin_id: author.id || null,
			admin_name: author.name || null,
			admin_role: author.role || null,
			action: LOG_ACTIONS.LOGOUT,
			page: "users",
			context: { message: "User logged out" },
		});
		return true;
	} catch (error) {
		console.error("Logout error:", error);
		throw error;
	}
});

// Food stats handler
ipcMain.handle("get-food-stats", async () => {
	try {
		const db = await getDatabase();

		// Get all closed orders with food items
		const foodOrderItems = await db.all(`
			SELECT 
				oi.id,
				oi.order_id,
				oi.food_item_id,
				oi.quantity,
				fi.price as food_price,
				o.status
			FROM order_items oi
			JOIN food_items fi ON oi.food_item_id = fi.id
			JOIN orders o ON oi.order_id = o.id
			WHERE oi.item_type = 'food' AND o.status = 'closed'
		`);

		// Calculate total food sales (base food item prices)
		let totalFoodSales = 0;
		let totalExtrasSales = 0;

		for (const item of foodOrderItems) {
			const foodPrice = Number(item.food_price) || 0;
			const quantity = Number(item.quantity) || 0;
			totalFoodSales += foodPrice * quantity;

			// Get extras for this order item
			const extras = await db.all(
				`
				SELECT fe.price
				FROM order_item_extras oie
				JOIN food_extras fe ON oie.extra_id = fe.id
				WHERE oie.order_item_id = ?
			`,
				[item.id],
			);

			// Calculate extras sales for this item
			for (const extra of extras) {
				const extraPrice = Number(extra.price) || 0;
				totalExtrasSales += extraPrice * quantity;
			}
		}

		return {
			totalFoodSales,
			totalExtrasSales,
		};
	} catch (error) {
		console.error("Error getting food stats:", error);
		throw error;
	}
});

// Dashboard handlers
ipcMain.handle("get-dashboard-stats", async (_event, filters = {}) => {
	try {
		const db = await getDatabase();
		const cutoffHour = await getBusinessDayCutoffHour(db);
		const dateExpr = getBusinessDateExpr("COALESCE(updated_at, created_at)", cutoffHour);
		const createdDateExpr = getBusinessDateExpr("created_at", cutoffHour);
		const orderDateExpr = getBusinessDateExpr("COALESCE(o.updated_at, o.created_at)", cutoffHour);

		const { startDateStr, endDateStr, start, end } = getBusinessDateRange(filters, cutoffHour);

		const closedOrders = await db.all(
			`
      SELECT * FROM orders 
      WHERE status = 'closed' 
      AND ${dateExpr} >= ?
      AND ${dateExpr} < ?
    `,
			[startDateStr, endDateStr],
		);

		// Get all orders in date range (for total count) - includes both open and closed
		const allOrders = await db.all(
			`
      SELECT COUNT(*) as count FROM orders 
      WHERE ${createdDateExpr} >= ? AND ${createdDateExpr} < ?
    `,
			[startDateStr, endDateStr],
		);

		// Calculate previous period for comparison
		const periodDuration = end.getTime() - start.getTime();
		const prevStart = new Date(start.getTime() - periodDuration);
		const prevEnd = new Date(start.getTime());

		const formatDate = (d: Date) => {
			const year = d.getFullYear();
			const month = String(d.getMonth() + 1).padStart(2, "0");
			const day = String(d.getDate()).padStart(2, "0");
			return `${year}-${month}-${day}`;
		};

		const prevStartDateStr = formatDate(prevStart);
		const prevEndDateStr = formatDate(prevEnd);

		const prevClosedOrders = await db.all(
			`
      SELECT * FROM orders 
      WHERE status = 'closed' 
      AND ${dateExpr} >= ?
      AND ${dateExpr} < ?
    `,
			[prevStartDateStr, prevEndDateStr],
		);

		// Get previous period all orders count
		const prevAllOrders = await db.all(
			`
      SELECT COUNT(*) as count FROM orders 
      WHERE ${createdDateExpr} >= ? AND ${createdDateExpr} < ?
    `,
			[prevStartDateStr, prevEndDateStr],
		);

		// Calculate current period stats (only from closed orders)
		const currentRevenue = closedOrders.reduce((sum: number, order: any) => {
			const amount = Number(order.amount) || 0;
			return sum + amount;
		}, 0);
		const currentOrdersCount = Number(allOrders[0]?.count) || 0;
		const closedOrdersCount = closedOrders.length;
		const currentAverageOrder =
			closedOrdersCount > 0 ? currentRevenue / closedOrdersCount : 0;

		// Calculate previous period stats
		const prevRevenue = prevClosedOrders.reduce(
			(sum: number, order: any) => sum + (order.amount || 0),
			0,
		);
		const prevOrdersCount = prevAllOrders[0]?.count || 0;
		const prevAverageOrder =
			prevClosedOrders.length > 0 ? prevRevenue / prevClosedOrders.length : 0;

		// Calculate changes
		const revenueChange =
			prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100
			: currentRevenue > 0 ? 100
			: 0;
		const ordersChange =
			prevOrdersCount > 0 ?
				((currentOrdersCount - prevOrdersCount) / prevOrdersCount) * 100
			: currentOrdersCount > 0 ? 100
			: 0;
		const averageOrderChange =
			prevAverageOrder > 0 ?
				((currentAverageOrder - prevAverageOrder) / prevAverageOrder) * 100
			: currentAverageOrder > 0 ? 100
			: 0;

		// Get breakdown of sales by item type (drinks vs. food)
		const breakdownResult = await db.all(
			`
			SELECT 
				oi.item_type,
				COALESCE(SUM(oi.quantity), 0) as count,
				COALESCE(SUM(oi.quantity * COALESCE(p.price, fi.price)), 0) as revenue
			FROM order_items oi
			INNER JOIN orders o ON oi.order_id = o.id 
				AND o.status = 'closed'
				AND ${orderDateExpr} >= ?
				AND ${orderDateExpr} < ?
			LEFT JOIN products p ON oi.product_id = p.id AND oi.item_type = 'drink'
			LEFT JOIN food_items fi ON oi.food_item_id = fi.id AND oi.item_type = 'food'
			GROUP BY oi.item_type
		`,
			[startDateStr, endDateStr],
		);

		const breakdown = {
			drinks: { revenue: 0, count: 0 },
			food: { revenue: 0, count: 0 },
			others: { revenue: 0, count: 0 },
		};

		breakdownResult.forEach((row: any) => {
			if (row.item_type === "drink") {
				breakdown.drinks = {
					revenue: Number(row.revenue) || 0,
					count: Number(row.count) || 0,
				};
			} else if (row.item_type === "food") {
				breakdown.food = {
					revenue: Number(row.revenue) || 0,
					count: Number(row.count) || 0,
				};
			} else {
				breakdown.others = {
					revenue: Number(row.revenue) || 0,
					count: Number(row.count) || 0,
				};
			}
		});

		// Get active orders (all open orders, not filtered by date)
		const activeOrdersResult = await db.all(`
      SELECT COUNT(*) as count FROM orders WHERE status = 'open'
    `);

		return {
			revenue: currentRevenue,
			ordersCount: currentOrdersCount,
			activeOrders: activeOrdersResult[0]?.count || 0,
			averageOrderValue: currentAverageOrder,
			revenueChange,
			ordersChange,
			averageOrderChange,
			breakdown,
		};
	} catch (error) {
		console.error("Error getting dashboard stats:", error);
		throw error;
	}
});

ipcMain.handle(
	"export-data",
	async (_event, { type, format, filters = {} }) => {
		try {
			const db = await getDatabase();
			let data;

			const cutoffHour = await getBusinessDayCutoffHour(db);
			const dateExpr = getBusinessDateExpr("COALESCE(closed_at, updated_at, created_at)", cutoffHour);
			const orderDateExpr = getBusinessDateExpr("COALESCE(o.closed_at, o.updated_at, o.created_at)", cutoffHour);
			const { startDateStr, endDateStr } = getBusinessDateRange(filters, cutoffHour);

			if (type === "dashboard") {
				// Gather dashboard analytics for export
				// 1. Revenue & Orders by Date (only closed orders)
				const salesData = await db.all(
					`
        SELECT ${dateExpr} as date, SUM(amount) as revenue, COUNT(*) as orders
        FROM orders
        WHERE status = 'closed'
        AND ${dateExpr} >= ? 
        AND ${dateExpr} < ?
        GROUP BY ${dateExpr}
        ORDER BY date
      `,
					[startDateStr, endDateStr],
				);

				// 2. Top Products (only closed orders)
				const topProducts = await db.all(
					`
        SELECT 
          COALESCE(p.name, f.name) as product, 
          COALESCE(c_drink.name, c_food.name, 'Uncategorized') as category, 
          SUM(oi.quantity) as sold, 
          SUM(oi.quantity * COALESCE(p.price, f.price)) as revenue
        FROM order_items oi
        LEFT JOIN orders o ON oi.order_id = o.id
        LEFT JOIN products p ON oi.product_id = p.id AND oi.item_type = 'drink'
        LEFT JOIN food_items f ON oi.food_item_id = f.id AND oi.item_type = 'food'
        LEFT JOIN categories c_drink ON p.category = c_drink.id
        LEFT JOIN food_categories c_food ON f.category_id = c_food.id
        WHERE o.status = 'closed'
        AND ${orderDateExpr} >= ?
        AND ${orderDateExpr} < ?
        GROUP BY oi.item_type, COALESCE(p.id, f.id), COALESCE(p.name, f.name), COALESCE(c_drink.name, c_food.name)
        ORDER BY revenue DESC
        LIMIT 10
      `,
					[startDateStr, endDateStr],
				);

				// 3. Category Performance (only closed orders)
				const categoryPerformance = await db.all(
					`
        SELECT 
          category,
          SUM(revenue) as revenue,
          SUM(orders) as orders
        FROM (
          SELECT 
            c.name as category,
            COALESCE(SUM(oi.quantity * p.price), 0) as revenue,
            COUNT(DISTINCT o.id) as orders
          FROM categories c
          LEFT JOIN products p ON c.id = p.category
          LEFT JOIN order_items oi ON p.id = oi.product_id AND oi.item_type = 'drink'
          LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'closed'
            AND ${orderDateExpr} >= ?
            AND ${orderDateExpr} < ?
          GROUP BY c.id, c.name

          UNION ALL

          SELECT 
            fc.name as category,
            COALESCE(SUM(oi.quantity * fi.price), 0) as revenue,
            COUNT(DISTINCT o.id) as orders
          FROM food_categories fc
          LEFT JOIN food_items fi ON fc.id = fi.category_id
          LEFT JOIN order_items oi ON fi.id = oi.food_item_id AND oi.item_type = 'food'
          LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'closed'
            AND ${orderDateExpr} >= ?
            AND ${orderDateExpr} < ?
          GROUP BY fc.id, fc.name
        )
        GROUP BY category
        ORDER BY revenue DESC
      `,
					[startDateStr, endDateStr, startDateStr, endDateStr],
				);

				// 4. Peak Hours (only closed orders)
				const peakHours = await db.all(
					`
        SELECT CAST(strftime('%H', COALESCE(updated_at, created_at)) AS INTEGER) as hour, COUNT(*) as orders, SUM(amount) as revenue
        FROM orders
        WHERE status = 'closed'
        AND ${dateExpr} >= ? AND ${dateExpr} < ?
        GROUP BY CAST(strftime('%H', COALESCE(updated_at, created_at)) AS INTEGER)
        ORDER BY hour
      `,
					[startDateStr, endDateStr],
				);

				// 5. Payment Methods
				const paymentMethods = await db.all(
					`
        SELECT payment_mode as method, COUNT(*) as count, SUM(amount) as revenue
        FROM orders
        WHERE created_at >= ? AND created_at < ?
        GROUP BY payment_mode
      `,
					[
						filters.startDate ||
							new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
						filters.endDate || new Date().toISOString(),
					],
				);

				// 6. Inventory Insights
				const inventoryInsights = await db.all(`
        SELECT p.name as product, c.name as category, p.stock, COALESCE(SUM(oi.quantity), 0) as sold, p.price, (p.stock * p.price) as stockValue
        FROM products p
        LEFT JOIN categories c ON p.category = c.id
        LEFT JOIN order_items oi ON p.id = oi.product_id
        LEFT JOIN orders o ON oi.order_id = o.id
        GROUP BY p.id, p.name, c.name, p.stock, p.price
        ORDER BY stockValue DESC
        LIMIT 10
      `);

				// Compose export as a single table (flattened for CSV/Excel/PDF)
				// We'll export each section as a block, separated by a header row
				const exportRows: any[] = [];
				const addSection = (title: string, columns: string[], rows: any[]) => {
					exportRows.push({ __section: title });
					if (rows.length > 0) {
						rows.forEach((row) => exportRows.push(row));
					} else {
						exportRows.push(
							Object.fromEntries(columns.map((col) => [col, "No data"])),
						);
					}
					exportRows.push({}); // blank row
				};
				// Revenue & Orders
				addSection(
					"Revenue & Orders by Date",
					["date", "revenue", "orders"],
					salesData,
				);
				// Top Products
				addSection(
					"Top Products",
					["product", "category", "sold", "revenue"],
					topProducts,
				);
				// Category Performance
				addSection(
					"Category Performance",
					["category", "revenue", "orders"],
					categoryPerformance,
				);
				// Peak Hours
				addSection("Peak Hours", ["hour", "orders", "revenue"], peakHours);
				// Payment Methods
				addSection(
					"Payment Methods",
					["method", "count", "revenue"],
					paymentMethods,
				);
				// Inventory Insights
				addSection(
					"Inventory Insights",
					["product", "category", "stock", "sold", "price", "stockValue"],
					inventoryInsights,
				);

				// For export, columns are the union of all columns used
				const allColumns = [
					"date",
					"revenue",
					"orders",
					"product",
					"category",
					"sold",
					"hour",
					"method",
					"count",
					"stock",
					"price",
					"stockValue",
				];
				data = {
					columns: allColumns,
					rows: exportRows,
				};
			} else {
				switch (type) {
					case "sales":
						data = await db.all(`
            SELECT 
              p.id as product_id,
              p.name as product_name,
              p.stock as stock_balance,
              p.price as rate,
              COALESCE(SUM(oi.quantity), 0) as sold,
              COALESCE(SUM(oi.quantity * p.price), 0) as total,
              COALESCE(SUM(oi.quantity * p.price), 0) as profit,
              p.stock as closing_bal
            FROM products p
            LEFT JOIN order_items oi ON p.id = oi.product_id
            LEFT JOIN orders o ON oi.order_id = o.id
            GROUP BY p.id, p.name, p.stock, p.price
          `);
						break;
					case "orders":
						data = await db.all(`
            SELECT o.*, 
                   GROUP_CONCAT(p.name || ' x' || oi.quantity) as items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            GROUP BY o.id
          `);
						break;
					case "products":
						data = await db.all("SELECT * FROM products");
						break;
					case "categories":
						data = await db.all("SELECT * FROM categories");
						break;
					default:
						throw new Error("Invalid export type");
				}
			}

			let finalPath = "";

			if (format === "csv") {
				let csvString = "";
				if (type === "dashboard") {
					// data is { columns: string[], rows: any[] }
					csvString += data.columns.join(",") + "\n";
					data.rows.forEach((row: any) => {
						if (row.__section) {
							csvString += `\n"${row.__section}"\n`;
						} else {
							csvString +=
								data.columns
									.map((col: string) => {
										const val =
											row[col] !== undefined && row[col] !== null ?
												String(row[col])
											:	"";
										// Escape quotes and wrap in quotes to handle commas within values
										return `"${val.replace(/"/g, '""')}"`;
									})
									.join(",") + "\n";
						}
					});
				} else {
					// data is an array of objects
					if (data.length > 0) {
						const columns = Object.keys(data[0]);
						csvString += columns.join(",") + "\n";
						data.forEach((row: any) => {
							csvString +=
								columns
									.map((col) => {
										const val =
											row[col] !== undefined && row[col] !== null ?
												String(row[col])
											:	"";
										return `"${val.replace(/"/g, '""')}"`;
									})
									.join(",") + "\n";
						});
					} else {
						csvString = "No data available";
					}
				}

				// Prompt save dialog
				const { canceled, filePath } = await dialog.showSaveDialog({
					title: "Save CSV Export",
					defaultPath: `Smartway_Export_${type}_${new Date().toISOString().split("T")[0]}.csv`,
					filters: [{ name: "CSV Files", extensions: ["csv"] }],
				});

				if (canceled || !filePath) {
					return { success: false, message: "Export cancelled" };
				}

				fs.writeFileSync(filePath, csvString, "utf8");
				finalPath = filePath;
			} else {
				// Stub for PDF or other formats
				return {
					success: false,
					message: `Export format ${format} not fully implemented yet. Please use CSV.`,
				};
			}

			return {
				success: true,
				data,
				message: `${type} data exported successfully to ${finalPath}`,
			};
		} catch (error) {
			console.error("Export error:", error);
			throw error;
		}
	},
);

// Analytics handlers
ipcMain.handle("get-sales-analytics", async (_event, filters = {}) => {
	try {
		const db = await getDatabase();
		const cutoffHour = await getBusinessDayCutoffHour(db);
		const dateExpr = getBusinessDateExpr("COALESCE(updated_at, created_at)", cutoffHour);
		const { startDateStr, endDateStr, start, end } = getBusinessDateRange(filters, cutoffHour);

		const salesData = await db.all(
			`
      SELECT 
        ${dateExpr} as date,
        COALESCE(SUM(amount), 0) as revenue,
        COUNT(*) as orders
      FROM orders 
      WHERE status = 'closed'
      AND ${dateExpr} >= ?
      AND ${dateExpr} < ?
      GROUP BY ${dateExpr}
      ORDER BY date
    `,
			[startDateStr, endDateStr],
		);

		// Ensure all dates in the range are represented (fill gaps with 0)
		const dateMap = new Map<string, { revenue: number; orders: number }>();
		salesData.forEach((row: any) => {
			// Ensure numeric values
			const revenue = Number(row.revenue) || 0;
			const orders = Number(row.orders) || 0;
			dateMap.set(row.date, { revenue, orders });
		});

		// Fill in missing dates with zero values
		const filledData: any[] = [];
		const currentDate = new Date(start);
		while (currentDate < end) {
			const dateStr = currentDate.toISOString().split("T")[0];
			if (dateMap.has(dateStr)) {
				filledData.push({
					date: dateStr,
					revenue: dateMap.get(dateStr)!.revenue,
					orders: dateMap.get(dateStr)!.orders,
				});
			} else {
				filledData.push({
					date: dateStr,
					revenue: 0,
					orders: 0,
				});
			}
			currentDate.setDate(currentDate.getDate() + 1);
		}

		return filledData;
	} catch (error) {
		console.error("Error getting sales analytics:", error);
		throw error;
	}
});

ipcMain.handle("get-top-products", async (_event, filters = {}) => {
	try {
		const db = await getDatabase();
		const cutoffHour = await getBusinessDayCutoffHour(db);
		const orderDateExpr = getBusinessDateExpr("COALESCE(o.closed_at, o.updated_at, o.created_at)", cutoffHour);
		const { startDateStr, endDateStr } = getBusinessDateRange(filters, cutoffHour);

		const topProducts = await db.all(
			`
      SELECT 
        COALESCE(p.id, f.id) as id,
        COALESCE(p.name, f.name) as name,
        COALESCE(c_drink.name, c_food.name, 'Uncategorized') as category,
        SUM(oi.quantity) as sold,
        SUM(oi.quantity * COALESCE(p.price, f.price)) as revenue
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id 
        AND o.status = 'closed'
        AND ${orderDateExpr} >= ?
        AND ${orderDateExpr} < ?
      LEFT JOIN products p ON oi.product_id = p.id AND oi.item_type = 'drink'
      LEFT JOIN food_items f ON oi.food_item_id = f.id AND oi.item_type = 'food'
      LEFT JOIN categories c_drink ON p.category = c_drink.id
      LEFT JOIN food_categories c_food ON f.category_id = c_food.id
      GROUP BY oi.item_type, COALESCE(p.id, f.id), COALESCE(p.name, f.name), COALESCE(c_drink.name, c_food.name)
      ORDER BY revenue DESC
      LIMIT 10
    `,
			[startDateStr, endDateStr],
		);

		return topProducts;
	} catch (error) {
		console.error("Error getting top products:", error);
		throw error;
	}
});

ipcMain.handle("get-category-performance", async (_event, filters = {}) => {
	try {
		const db = await getDatabase();
		const cutoffHour = await getBusinessDayCutoffHour(db);
		const orderDateExpr = getBusinessDateExpr("COALESCE(o.updated_at, o.created_at)", cutoffHour);
		const { startDateStr, endDateStr } = getBusinessDateRange(filters, cutoffHour);

		const categoryData = await db.all(
			`
      SELECT 
        category,
        SUM(revenue) as revenue,
        SUM(orders) as orders
      FROM (
        SELECT 
          c.name as category,
          COALESCE(SUM(oi.quantity * p.price), 0) as revenue,
          COUNT(DISTINCT o.id) as orders
        FROM categories c
        LEFT JOIN products p ON c.id = p.category
        LEFT JOIN order_items oi ON p.id = oi.product_id AND oi.item_type = 'drink'
        LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'closed'
          AND ${orderDateExpr} >= ?
          AND ${orderDateExpr} < ?
        GROUP BY c.id, c.name

        UNION ALL

        SELECT 
          fc.name as category,
          COALESCE(SUM(oi.quantity * fi.price), 0) as revenue,
          COUNT(DISTINCT o.id) as orders
        FROM food_categories fc
        LEFT JOIN food_items fi ON fc.id = fi.category_id
        LEFT JOIN order_items oi ON fi.id = oi.food_item_id AND oi.item_type = 'food'
        LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'closed'
          AND ${orderDateExpr} >= ?
          AND ${orderDateExpr} < ?
        GROUP BY fc.id, fc.name
      )
      GROUP BY category
      ORDER BY revenue DESC
    `,
			[startDateStr, endDateStr, startDateStr, endDateStr],
		);

		// Calculate percentages
		const totalRevenue = categoryData.reduce(
			(sum: number, cat: any) => sum + cat.revenue,
			0,
		);
		return categoryData.map((cat: any) => ({
			...cat,
			percentage: totalRevenue > 0 ? (cat.revenue / totalRevenue) * 100 : 0,
		}));
	} catch (error) {
		console.error("Error getting category performance:", error);
		throw error;
	}
});

ipcMain.handle("get-peak-hours", async (_event, filters = {}) => {
	try {
		const db = await getDatabase();
		const cutoffHour = await getBusinessDayCutoffHour(db);
		const dateExpr = getBusinessDateExpr("COALESCE(updated_at, created_at)", cutoffHour);
		const { startDateStr, endDateStr } = getBusinessDateRange(filters, cutoffHour);

		const peakHours = await db.all(
			`
      SELECT 
        CAST(strftime('%H', COALESCE(closed_at, updated_at, created_at)) AS INTEGER) as hour,
        COUNT(*) as orders,
        SUM(amount) as revenue
      FROM orders 
      WHERE status = 'closed'
      AND ${dateExpr} >= ?
      AND ${dateExpr} < ?
      GROUP BY CAST(strftime('%H', COALESCE(closed_at, updated_at, created_at)) AS INTEGER)
      ORDER BY hour
    `,
			[startDateStr, endDateStr],
		);

		return peakHours;
	} catch (error) {
		console.error("Error getting peak hours:", error);
		throw error;
	}
});

ipcMain.handle("get-order-status", async (_event, filters = {}) => {
	try {
		const db = await getDatabase();
		const cutoffHour = await getBusinessDayCutoffHour(db);
		const dateExpr = getBusinessDateExpr("COALESCE(updated_at, created_at)", cutoffHour);
		const { startDateStr, endDateStr } = getBusinessDateRange(filters, cutoffHour);

		const orderStatus = await db.all(
			`
      SELECT 
        status,
        COUNT(*) as count
      FROM orders 
      WHERE ${dateExpr} >= ?
      AND ${dateExpr} < ?
      GROUP BY status
    `,
			[startDateStr, endDateStr],
		);

		// Calculate percentages
		const totalOrders = orderStatus.reduce(
			(sum: number, status: any) => sum + status.count,
			0,
		);
		return orderStatus.map((status: any) => ({
			...status,
			percentage: totalOrders > 0 ? (status.count / totalOrders) * 100 : 0,
		}));
	} catch (error) {
		console.error("Error getting order status:", error);
		throw error;
	}
});

ipcMain.handle("get-payment-methods", async (_event, filters = {}) => {
	try {
		const db = await getDatabase();
		const cutoffHour = await getBusinessDayCutoffHour(db);
		const dateExpr = getBusinessDateExpr("COALESCE(updated_at, created_at)", cutoffHour);
		const { startDateStr, endDateStr } = getBusinessDateRange(filters, cutoffHour);

		const paymentMethods = await db.all(
			`
      SELECT 
        payment_mode as method,
        COUNT(*) as count,
        SUM(amount) as revenue
      FROM orders 
      WHERE status = 'closed'
      AND ${dateExpr} >= ?
      AND ${dateExpr} < ?
      GROUP BY payment_mode
    `,
			[startDateStr, endDateStr],
		);

		// Calculate percentages
		const totalOrders = paymentMethods.reduce(
			(sum: number, method: any) => sum + method.count,
			0,
		);
		return paymentMethods.map((method: any) => ({
			...method,
			percentage: totalOrders > 0 ? (method.count / totalOrders) * 100 : 0,
		}));
	} catch (error) {
		console.error("Error getting payment methods:", error);
		throw error;
	}
});

ipcMain.handle("get-inventory-insights", async (_event, filters = {}) => {
	try {
		const db = await getDatabase();

		const inventoryInsights = await db.all(`
      SELECT 
        p.id as productId,
        p.name as productName,
        c.name as category,
        p.stock,
        COALESCE(SUM(oi.quantity), 0) as sold,
        p.price,
        (COALESCE(SUM(oi.quantity), 0) / NULLIF(p.stock, 0)) as turnoverRate,
        p.price as profitMargin,
        (p.stock * p.price) as stockValue
      FROM products p
      LEFT JOIN categories c ON p.category = c.id
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'closed'
      GROUP BY p.id, p.name, c.name, p.stock, p.price
      ORDER BY turnoverRate DESC
    `);

		return inventoryInsights;
	} catch (error) {
		console.error("Error getting inventory insights:", error);
		throw error;
	}
});

// Table management handlers
ipcMain.handle("get-tables", async () => {
	try {
		const tables = await withRetry(async () => {
			const db = await getDatabase();
			return await db.all("SELECT * FROM tables ORDER BY name ASC");
		});
		return tables;
	} catch (error) {
		console.error("Error getting tables:", error);
		throw error;
	}
});

ipcMain.handle(
	"add-table",
	async (_, table: Omit<Table, "id">, payload = {}) => {
		try {
			const result = await withRetry(async () => {
				const db = await getDatabase();
				const result = await db.run(
					`
        INSERT INTO tables (name, capacity, status) VALUES (?, ?, ?)
      `,
					[table.name, table.capacity || null, table.status || "active"],
				);

				const newTable = await db.get("SELECT * FROM tables WHERE id = ?", [
					result.lastID,
				]);
				return newTable;
			});

			// Log action
			const author = payload.author || {};
			await logAction({
				db: await getDatabase(),
				admin_id: author.id || null,
				admin_name: author.name || null,
				admin_role: author.role || null,
				action: "add_table",
				page: "settings",
				context: result,
			});

			return result;
		} catch (error) {
			console.error("Error adding table:", error);
			throw error;
		}
	},
);

ipcMain.handle("update-table", async (_, table: Table, payload = {}) => {
	try {
		const result = await withRetry(async () => {
			const db = await getDatabase();
			await db.run(
				`
        UPDATE tables 
        SET name = ?, capacity = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
				[table.name, table.capacity || null, table.status, table.id],
			);

			const updatedTable = await db.get("SELECT * FROM tables WHERE id = ?", [
				table.id,
			]);
			return updatedTable;
		});

		// Log action
		const author = payload.author || {};
		await logAction({
			db: await getDatabase(),
			admin_id: author.id || null,
			admin_name: author.name || null,
			admin_role: author.role || null,
			action: "update_table",
			page: "settings",
			context: result,
		});

		return result;
	} catch (error) {
		console.error("Error updating table:", error);
		throw error;
	}
});

ipcMain.handle("delete-table", async (_, tableId: number, payload = {}) => {
	try {
		await withRetry(async () => {
			const db = await getDatabase();
			await db.run("DELETE FROM tables WHERE id = ?", [tableId]);
		});

		// Log action
		const author = payload.author || {};
		await logAction({
			db: await getDatabase(),
			admin_id: author.id || null,
			admin_name: author.name || null,
			admin_role: author.role || null,
			action: "delete_table",
			page: "settings",
			context: { tableId },
		});

		return { success: true };
	} catch (error) {
		console.error("Error deleting table:", error);
		throw error;
	}
});

// License management handlers
ipcMain.handle("activate-license", async (_, licenseKey: string) => {
	try {
		const result = await licensingManager.validateLicense(licenseKey);

		// Log license activation attempt
		await logAction({
			db: await getDatabase(),
			admin_id: null,
			admin_name: null,
			admin_role: null,
			action: "license_activation_attempt",
			page: "license",
			context: {
				licenseKey: licenseKey.substring(0, 8) + "...", // Only log first 8 chars
				hardwareId: licensingManager.getHardwareId(),
				success: result.valid,
				message: result.message,
			},
		});

		return result;
	} catch (error) {
		console.error("Error activating license:", error);
		throw error;
	}
});

ipcMain.handle("check-license", async () => {
	try {
		const result = await licensingManager.checkLicense();
		return result;
	} catch (error) {
		console.error("Error checking license:", error);
		throw error;
	}
});

ipcMain.handle("get-hardware-id", async () => {
	try {
		return licensingManager.getHardwareId();
	} catch (error) {
		console.error("Error getting hardware ID:", error);
		throw error;
	}
});

ipcMain.handle("get-license-info", async () => {
	try {
		return licensingManager.getLicenseInfo();
	} catch (error) {
		console.error("Error getting license info:", error);
		throw error;
	}
});

ipcMain.handle("get-last-online-check", async () => {
	try {
		const checkFile = path.join(
			app.getPath("userData"),
			"last-online-check.json",
		);
		if (fs.existsSync(checkFile)) {
			const data = fs.readFileSync(checkFile, "utf8");
			const check = JSON.parse(data);
			return check.timestamp;
		}
		return null;
	} catch (error) {
		console.error("Error getting last online check:", error);
		return null;
	}
});

ipcMain.handle("get-sync-status", async () => {
	try {
		const databaseInstance = getDatabase();
		if (!databaseInstance)
			return { success: false, message: "Database not initialized" };

		const ordersCount = await databaseInstance.get(
			"SELECT COUNT(*) as count FROM orders WHERE synced_at IS NULL",
		);
		const itemsCount = await databaseInstance.get(
			"SELECT COUNT(*) as count FROM order_items WHERE synced_at IS NULL",
		);
		const logsCount = await databaseInstance.get(
			"SELECT COUNT(*) as count FROM inventory_logs WHERE synced_at IS NULL",
		);

		const latestOrderSync = await databaseInstance.get(
			"SELECT MAX(synced_at) as last_sync FROM orders WHERE synced_at IS NOT NULL",
		);
		const latestItemSync = await databaseInstance.get(
			"SELECT MAX(synced_at) as last_sync FROM order_items WHERE synced_at IS NOT NULL",
		);
		const latestLogSync = await databaseInstance.get(
			"SELECT MAX(synced_at) as last_sync FROM inventory_logs WHERE synced_at IS NOT NULL",
		);

		const lastSyncDates = [
			latestOrderSync?.last_sync,
			latestItemSync?.last_sync,
			latestLogSync?.last_sync,
		]
			.filter(Boolean)
			.map((dateStr) => new Date(dateStr).getTime());

		const lastSyncedAt =
			lastSyncDates.length > 0 ?
				new Date(Math.max(...lastSyncDates)).toISOString()
			:	null;

		return {
			success: true,
			unsyncedOrders: Number(ordersCount?.count ?? 0),
			unsyncedOrderItems: Number(itemsCount?.count ?? 0),
			unsyncedInventoryLogs: Number(logsCount?.count ?? 0),
			lastSyncedAt,
		};
	} catch (error: any) {
		console.error("Error in get-sync-status handler:", error);
		return { success: false, message: error.message };
	}
});

ipcMain.handle("trigger-manual-sync", async () => {
	const result = await performSync();
	if (result.status === "error") {
		return { success: false, message: result.message };
	}
	if (result.status === "skipped") {
		// Treat "already up to date" as success, but tell the UI
		return { success: true, skipped: true, reason: result.reason };
	}
	// status === "synced"
	return {
		success: true,
		skipped: false,
		orders: result.orders,
		orderItems: result.orderItems,
		inventoryLogs: result.inventoryLogs,
	};
});

ipcMain.handle("check-app-version", async () => {
	try {
		const currentVersion = app.getVersion();
		const platform = process.platform === "darwin" ? "macos" : "windows";

		const baseUrl = await getBaseUrl();

		const response = await fetch(
			`${baseUrl}/api/pos/version?platform=${platform}`,
		);
		if (!response.ok) {
			throw new Error(`Version API returned ${response.status}`);
		}

		const result = await response.json();

		const compareVersions = (v1: string, v2: string): number => {
			const parts1 = v1.split(".").map(Number);
			const parts2 = v2.split(".").map(Number);
			for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
				const p1 = parts1[i] || 0;
				const p2 = parts2[i] || 0;
				if (p1 < p2) return -1;
				if (p1 > p2) return 1;
			}
			return 0;
		};

		if (result.success) {
			return {
				success: true,
				currentVersion,
				latestVersion: result.version,
				// check platform specific url we have windows and mac
				downloadUrl: result.download_url,
				releaseNotes: result.releaseNotes,
				updateAvailable: compareVersions(currentVersion, result.version) < 0,
			};
		}
		return { success: false, message: result.message };
	} catch (error: any) {
		if (
			error.message?.includes("fetch failed") ||
			error.code === "ECONNREFUSED" ||
			error.cause?.code === "ECONNREFUSED"
		) {
			console.log(
				"[Version Check] Update server unreachable. Running in offline/local mode.",
			);
		} else {
			console.error("Error in check-app-version handler:", error);
		}
		return { success: false, message: error.message };
	}
});

// Super Admin handlers
ipcMain.handle(
	"super-admin-login",
	async (
		_,
		credentials: { username: string; password: string; licenseKey: string },
	) => {
		try {
			// Get license server URL from environment or settings
			const licenseServerUrl = process.env.LICENSE_SERVER_URL || "";

			if (!licenseServerUrl) {
				return { success: false, message: "License server not configured" };
			}

			// Validate with license server
			const response = await fetch(`${licenseServerUrl}/api/admin/login`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: credentials.username,
					password: credentials.password,
					licenseKey: credentials.licenseKey,
					hardwareId: licensingManager.getHardwareId(),
				}),
			});

			if (!response.ok) {
				const error = await response
					.json()
					.catch(() => ({ message: "Authentication failed" }));
				return {
					success: false,
					message: error.message || "Authentication failed",
				};
			}

			const result = await response.json();

			if (result.success) {
				// Update license info if provided
				if (result.licenseInfo) {
					await licensingManager.validateLicense(credentials.licenseKey);
				}
				return { success: true, message: "Authentication successful" };
			}

			return {
				success: false,
				message: result.message || "Authentication failed",
			};
		} catch (error: any) {
			console.error("Super admin login error:", error);
			return {
				success: false,
				message: error.message || "Failed to connect to license server",
			};
		}
	},
);

ipcMain.handle("force-license-validation", async (_, licenseKey: string) => {
	try {
		const result = await licensingManager.forceOnlineValidation(licenseKey);
		return result;
	} catch (error: any) {
		console.error("Force license validation error:", error);
		return { valid: false, message: error.message || "Validation failed" };
	}
});

ipcMain.handle("list-serial-ports", async () => {
	try {
		const ports = await SerialPort.list();
		return ports;
	} catch (error) {
		console.error("Error listing serial ports:", error);
		throw error;
	}
});

ipcMain.handle("list-printers", async (event) => {
	try {
		const printers = await event.sender.getPrintersAsync();
		return printers;
	} catch (error) {
		console.error("Error listing printers:", error);
		throw error;
	}
});

ipcMain.handle("trigger-cash-drawer", async (event) => {
	try {
		const dbInstance = await getDatabase();
		// Get cash drawer settings
		const settings = await dbInstance.get("SELECT pos FROM settings");
		if (!settings || !settings.pos) {
			throw new Error("Cash drawer settings not found");
		}

		const posSettings = JSON.parse(settings.pos);
		const printerName = posSettings.receiptPrinter;
		const portPath = posSettings.cashDrawerPort;
		const kickCodeStr = posSettings.cashDrawerKickCode || "0x07";

		let finalPrinterName = printerName;

		// ALWAYS try to auto-detect the POS printer for the drawer to ensure we have the correct name
		const printers = await event.sender.getPrintersAsync();
		const autoDetected = printers.find(
			(p: any) =>
				p.name.toUpperCase().includes("POS") ||
				p.name.includes("80") ||
				p.name.toUpperCase().includes("THERMAL"),
		);

		if (autoDetected) {
			finalPrinterName = autoDetected.name;
			console.log(
				`Using auto-detected printer for drawer: "${finalPrinterName}"`,
			);
		}

		// Fallback to default printer if no printer is configured/auto-detected
		if (!finalPrinterName && printers.length > 0) {
			const defaultPrinter =
				printers.find((p: any) => (p as any).isDefault) || printers[0];
			finalPrinterName = defaultPrinter.name;
			console.log(
				`Falling back to default printer for drawer: "${finalPrinterName}"`,
			);
		}

		// CASE 1: RJ11 Drawer connected to Printer (Preferred)
		if (finalPrinterName) {
			console.log(`Attempting to kick drawer on: ${finalPrinterName}`);

			if (process.platform === "win32") {
				// Windows raw print command using dynamically compiled P/Invoke C# winspool.drv in PowerShell
				const psScript = `
$source = @"
using System;
using System.Runtime.InteropServices;
public class RawPrinterHelper {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }
    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true)]
    public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);
    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);
    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);
}
"@
Add-Type -TypeDefinition $source -ErrorAction SilentlyContinue
function Send-RawBytes {
    param([string]$name, [byte[]]$bytes)
    $h = [IntPtr]::Zero
    if ([RawPrinterHelper]::OpenPrinter($name, [ref]$h, [IntPtr]::Zero)) {
        $di = New-Object RawPrinterHelper+DOCINFOA
        $di.pDocName = "Drawer Kick"
        $di.pDataType = "RAW"
        if ([RawPrinterHelper]::StartDocPrinter($h, 1, $di)) {
            [RawPrinterHelper]::StartPagePrinter($h)
            $p = [System.Runtime.InteropServices.Marshal]::AllocCoTaskMem($bytes.Length)
            [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $p, $bytes.Length)
            $w = 0
            [RawPrinterHelper]::WritePrinter($h, $p, $bytes.Length, [ref]$w)
            [System.Runtime.InteropServices.Marshal]::FreeCoTaskMem($p)
            [RawPrinterHelper]::EndPagePrinter($h)
            [RawPrinterHelper]::EndDocPrinter($h)
        }
        [RawPrinterHelper]::ClosePrinter($h)
    }
}
$b = [byte[]]@(27, 64, 27, 112, 0, 50, 250, 27, 64)
Send-RawBytes -name "${finalPrinterName.replace(/"/g, '\\"')}" -bytes $b
`;
				const buffer = Buffer.from(psScript, "utf16le");
				const base64 = buffer.toString("base64");
				const command = `powershell -NoProfile -NonInteractive -EncodedCommand ${base64}`;

				return new Promise((resolve, reject) => {
					exec(command, (error: any, stdout: string, stderr: string) => {
						if (error) {
							console.error("Windows Cash drawer trigger error:", error);
							console.error("stderr:", stderr);
							return reject(error);
						}
						console.log(
							"Windows Cash drawer triggered successfully via PowerShell!",
						);
						resolve(true);
					});
				});
			} else {
				// macOS / Linux raw print command
				// Use lpr -P with raw mode, it's more robust with spaces in names
				// Force-cancel any stuck jobs in the CUPS queue, then Reset, Kick, and Reset again.
				// Append '2>/dev/null || true' to prevent cancel command errors from failing the execution.
				const command = `/usr/bin/cancel -a "${finalPrinterName}" 2>/dev/null || true ; /usr/bin/perl -e 'print "\\x1b\\x40\\x1b\\x70\\x00\\x32\\xfa\\x1b\\x40"' | /usr/bin/lp -d "${finalPrinterName}" -o raw`;

				return new Promise((resolve, reject) => {
					exec(command, (error: any) => {
						if (error) {
							console.error("macOS/Linux Cash drawer trigger error:", error);
							return reject(error);
						}
						console.log("macOS/Linux Cash drawer triggered successfully!");
						resolve(true);
					});
				});
			}
		}

		// CASE 2: Direct USB/Serial Drawer
		if (!portPath) {
			throw new Error("No printer or COM port configured for cash drawer");
		}

		// Create a numeric kick code from settings (supports hex like '0x07' or decimal '7')
		let kickCode: number;
		if (kickCodeStr.startsWith("0x")) {
			kickCode = parseInt(kickCodeStr, 16);
		} else {
			kickCode = parseInt(kickCodeStr, 10);
		}

		if (isNaN(kickCode)) {
			throw new Error(`Invalid kick code: ${kickCodeStr}`);
		}

		return new Promise((resolve, reject) => {
			const port = new SerialPort({
				path: portPath,
				baudRate: 9600,
				autoOpen: false,
			});

			port.open((err) => {
				if (err) {
					console.error("Error opening cash drawer port:", err);
					return reject(err);
				}

				port.write(Buffer.from([kickCode]), (writeErr) => {
					if (writeErr) {
						console.error("Error writing to cash drawer port:", writeErr);
						port.close();
						return reject(writeErr);
					}

					// Close port after a short delay to ensure write completion
					setTimeout(() => {
						port.close();
						resolve(true);
					}, 200);
				});
			});
		});
	} catch (error: any) {
		console.error("Error triggering cash drawer:", error);
		throw error;
	}
});

ipcMain.handle("print-receipt-silent", async (event, html, printerName) => {
	return new Promise(async (resolve, reject) => {
		try {
			const printers = await event.sender.getPrintersAsync();
			console.log("-----------------------------------------");
			console.log("PRINTERS FOUND:", printers.map((p) => p.name).join(", "));

			let targetPrinter: any = null;
			if (printerName) {
				targetPrinter =
					printers.find((p) => p.name === printerName) ||
					printers.find((p) =>
						p.name.toLowerCase().includes(printerName.toLowerCase()),
					);
			}

			if (!targetPrinter) {
				console.log("Auto-detecting POS printer...");
				targetPrinter = printers.find(
					(p) =>
						p.name.toUpperCase().includes("POS") ||
						p.name.includes("80") ||
						p.name.toUpperCase().includes("THERMAL"),
				);
			}

			const deviceName =
				targetPrinter ?
					targetPrinter.name
				:	printers.find((p) => (p as any).isDefault)?.name ||
					printers[0]?.name ||
					"";
			console.log(`>>> TARGET: "${deviceName}"`);

			const tempPath = path.join(
				app.getPath("temp"),
				`receipt_${Date.now()}.html`,
			);
			const fs = require("fs");
			fs.writeFileSync(tempPath, html);

			let win = new BrowserWindow({
				show: false,
				width: 272, // ~72mm at 96dpi
				height: 3000, // Increased to 3000 for very long receipts
				webPreferences: {
					nodeIntegration: false,
					contextIsolation: true,
				},
			});

			await win.loadFile(tempPath);
			await new Promise((r) => setTimeout(r, 800));

			// MEASURE the exact content height for zero-waste
			const contentHeight = await win.webContents.executeJavaScript(
				"document.body.scrollHeight",
			);
			console.log(`Measured Content Height: ${contentHeight}px`);

			win.webContents.print(
				{
					silent: true,
					deviceName: deviceName,
					printBackground: true,
					color: false,
					margins: { marginType: "none" },
					pageSize: {
						width: 72000, // 72mm
						height: contentHeight * 265 + 12000, // Increased safety margin (12mm)
					},
				},
				(success, errorType) => {
					win.destroy();
					try {
						fs.unlinkSync(tempPath);
					} catch (e) {}
					if (success) {
						console.log("Silent print finished successfully.");
						resolve(true);
					} else {
						console.error("Silent Print Error:", errorType);
						reject(new Error(`Silent print failed: ${errorType}`));
					}
				},
			);
		} catch (error: any) {
			console.error("Critical print error:", error);
			reject(error);
		}
	});
});
