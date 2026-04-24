"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Whitelist of allowed IPC channels
const validChannels = [
    'get-settings',
    'update-settings',
    'get-users',
    'add-user',
    'update-user',
    'delete-user',
    'export-database',
    'import-database',
    'login',
    'logout',
    'get-categories',
    'add-category',
    'update-category',
    'delete-category',
    'get-products',
    'add-product',
    'update-product',
    'delete-product',
    'get-product',
    'get-products-by-category',
    'update-product-stock',
    'get-low-stock-products',
    'get-orders',
    'get-order-by-id',
    'create-order',
    'update-order',
    'update-order-items',
    'get-logs',
    'get-dashboard-stats',
    'export-data',
    'get-sales-analytics',
    'get-top-products',
    'get-category-performance',
    'get-peak-hours',
    'get-order-status',
    'get-payment-methods',
    'get-inventory-insights',
    'get-out-of-stock-products',
    'get-tables',
    'add-table',
    'update-table',
    'delete-table',
    'get-food-categories',
    'add-food-category',
    'update-food-category',
    'delete-food-category',
    'get-food-items',
    'add-food-item',
    'update-food-item',
    'delete-food-item',
    'get-food-extras',
    'add-food-extra',
    'update-food-extra',
    'delete-food-extra',
    'get-food-stats',
    'activate-license',
    'check-license',
    'get-hardware-id',
    'get-license-info',
    'get-last-online-check',
    'super-admin-login',
    'force-license-validation',
    'clear-all-data',
    'list-serial-ports',
    'list-ports',
    'list-printers',
    'trigger-cash-drawer',
    'print-receipt-silent',
    'update-customer-display',
];
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electron', {
    invoke: (channel, ...args) => {
        if (validChannels.includes(channel)) {
            // console.log(`Invoking IPC channel: ${channel}`, args);
            return electron_1.ipcRenderer.invoke(channel, ...args);
        }
        console.error(`Unauthorized IPC channel: ${channel}`);
        throw new Error(`Unauthorized IPC channel: ${channel}`);
    },
});
//# sourceMappingURL=preload.js.map