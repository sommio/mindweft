import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';

const require = createRequire(import.meta.url);
const sqliteVec =
  require('sqlite-vec') as unknown as typeof import('sqlite-vec');

const databasePath = process.env.DATABASE_URL ?? './data/mindweft.db';
mkdirSync(dirname(databasePath), { recursive: true });
const sqlite = new Database(databasePath);
sqliteVec.load(sqlite);

export const db = drizzle(sqlite);
export { sqlite };
