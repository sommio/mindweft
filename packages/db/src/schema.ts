import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const health = sqliteTable('health', {
  id: integer('id').primaryKey(),
  status: text('status').notNull(),
});

// 唯一默认对话。本迭代只使用一个默认对话，不提供多对话管理。
export const conversations = sqliteTable(
  'conversations',
  {
    id: text('id').primaryKey(),
    displayName: text('display_name').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    check(
      'conversations_display_name_not_empty',
      sql`length(trim(${table.displayName})) > 0`,
    ),
  ],
);

// 对话中的消息。首版只有 user 与 assistant 两种发送方，内容为纯文本与换行。
export const messages = sqliteTable(
  'messages',
  {
    id: text('id').primaryKey(),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    content: text('content').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    check('messages_role_domain', sql`${table.role} in ('user', 'assistant')`),
    check(
      'messages_content_not_empty',
      sql`length(trim(${table.content})) > 0`,
    ),
    index('messages_conversation_created_idx').on(
      table.conversationId,
      table.createdAt,
    ),
  ],
);

export const memoryChunks = sqliteTable(
  'memory_chunks',
  {
    id: text('id').primaryKey(),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    startMessageId: text('start_message_id').notNull(),
    endMessageId: text('end_message_id').notNull(),
    sourceText: text('source_text').notNull(),
    summary: text('summary'),
    status: text('status').notNull().default('pending'),
    errorCode: text('error_code'),
    profile: text('profile'),
    embedding: text('embedding'),
    dimension: integer('dimension'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    index('memory_chunks_conversation_idx').on(table.conversationId),
    index('memory_chunks_range_idx').on(
      table.conversationId,
      table.startMessageId,
      table.endMessageId,
    ),
    uniqueIndex('memory_chunks_conversation_range_unique').on(
      table.conversationId,
      table.startMessageId,
      table.endMessageId,
    ),
  ],
);

export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type MemoryChunk = typeof memoryChunks.$inferSelect;
