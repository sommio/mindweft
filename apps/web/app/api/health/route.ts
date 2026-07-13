import { sqlite } from '@mindweft/db';

export const runtime = 'nodejs';

export function GET() {
  const result = sqlite.prepare('select 1 as ok').get() as { ok: number } | undefined;
  return Response.json({ status: result?.ok === 1 ? 'ok' : 'error' });
}
