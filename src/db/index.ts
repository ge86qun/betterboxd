import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';

const dbPath = process.env.DATABASE_URL || './betterboxd.db';
const sqlite = new Database(dbPath);

// Enable WAL mode and foreign key enforcement for SQLite
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
export { sqlite };
