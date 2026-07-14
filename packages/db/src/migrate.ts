import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runMigrations } from './client';

export { runMigrations };

// 通过 `pnpm --filter @mindweft/db db:migrate` 直接执行时显式运行（import client 已自动迁移一次，幂等）。
if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
) {
  runMigrations();
}
