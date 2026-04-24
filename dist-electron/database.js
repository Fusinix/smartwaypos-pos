"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabase = getDatabase;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path = __importStar(require("path"));
const electron_1 = require("electron");
let db = null;
function getDatabase() {
    if (db)
        return db;
    const dbPath = path.join(electron_1.app.getPath('userData'), 'smartwaypos.db');
    db = new better_sqlite3_1.default(dbPath);
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    // Save original methods to avoid recursion when wrapping
    const originalExec = db.exec.bind(db);
    // These helper methods make it compatible with your existing async calls
    db.run = async (sql, params = []) => {
        const info = Array.isArray(params) ? db.prepare(sql).run(...params) : db.prepare(sql).run(params);
        return {
            lastID: info.lastInsertRowid,
            changes: info.changes
        };
    };
    db.exec = async (sql) => {
        return originalExec(sql);
    };
    db.get = async (sql, params = []) => {
        return Array.isArray(params) ? db.prepare(sql).get(...params) : db.prepare(sql).get(params);
    };
    db.all = async (sql, params = []) => {
        return Array.isArray(params) ? db.prepare(sql).all(...params) : db.prepare(sql).all(params);
    };
    return db;
}
//# sourceMappingURL=database.js.map