export { db, sqlite } from './client';
export { conversations, health, messages } from './schema';
export { runMigrations } from './migrate';
export type { Conversation, Message } from './schema';
export { asc, eq } from 'drizzle-orm';
