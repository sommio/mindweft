export { db, sqlite } from './client';
export { conversations, health, messages, memoryChunks } from './schema';
export { runMigrations } from './migrate';
export type { Conversation, Message, MemoryChunk } from './schema';
export { and, asc, desc, eq, ne } from 'drizzle-orm';
