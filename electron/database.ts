import { open } from 'sqlite';
import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import { app } from 'electron';

let db: any = null;

interface Product {
  id?: number;
  name: string;
  description: string;
  category: number;
  price: number;
  stock: number;
  status: 'active' | 'inactive';
  image?: string;
}

export async function getDatabase() {
  if (db) return db;

  const dbPath = path.join(app.getPath('userData'), 'smartwaypos.db');
  
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Enable foreign keys
  await db.run('PRAGMA foreign_keys = ON');

  return db;
} 