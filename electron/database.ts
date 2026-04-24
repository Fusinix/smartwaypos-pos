import Database from 'better-sqlite3';
import * as path from 'path';
import { app } from 'electron';

let db: any = null;

export function getDatabase() {
  if (db) return db;

  const dbPath = path.join(app.getPath('userData'), 'smartwaypos.db');
  
  db = new Database(dbPath);
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // These helper methods make it compatible with your existing async calls
  db.run = async (sql: string, params: any = []) => {
    const info = Array.isArray(params) ? db.prepare(sql).run(...params) : db.prepare(sql).run(params);
    return {
      lastID: info.lastInsertRowid,
      changes: info.changes
    };
  };
  
  db.get = async (sql: string, params: any = []) => {
    return Array.isArray(params) ? db.prepare(sql).get(...params) : db.prepare(sql).get(params);
  };
  
  db.all = async (sql: string, params: any = []) => {
    return Array.isArray(params) ? db.prepare(sql).all(...params) : db.prepare(sql).all(params);
  };

  return db;
}