import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// 给导入 @mindweft/db 的集成测试提供一个隔离的临时 SQLite 文件。
// 必须在任何 @mindweft/db import 之前设置 DATABASE_URL。
const dbPath = join(tmpdir(), `mindweft-vitest-${String(process.pid)}.db`);
rmSync(dbPath, { force: true });
process.env.DATABASE_URL = dbPath;
