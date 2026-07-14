import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const sqliteVec =
  require('sqlite-vec') as unknown as typeof import('sqlite-vec');

const databasePath = process.env.DATABASE_URL ?? './data/mindweft.db';
mkdirSync(dirname(databasePath), { recursive: true });
const sqlite = new Database(databasePath);
sqliteVec.load(sqlite);

export const db = drizzle(sqlite);
export { sqlite };

/**
 * 运行 Drizzle 迁移。默认从本包 `../drizzle` 解析迁移目录；
 * standalone 运行时通过 `DRIZZLE_MIGRATIONS_FOLDER` 指定被复制进去的迁移目录。
 */
export function runMigrations(
  migrationsFolder: string = process.env.DRIZZLE_MIGRATIONS_FOLDER ??
    resolve(fileURLToPath(import.meta.url), '..', '..', 'drizzle'),
): void {
  migrate(db, { migrationsFolder });
}

// 进程首次加载 DB 客户端时自动迁移，确保默认对话与消息表存在。
runMigrations();
