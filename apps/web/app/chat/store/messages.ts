import { type Message, asc, db, eq, messages } from '@mindweft/db';

export type { Message };

export type MessageRole = 'user' | 'assistant';

export type StoredMessage = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
};

function toStored(message: Message): StoredMessage {
  return {
    id: message.id,
    role: message.role as MessageRole,
    content: message.content,
    createdAt: message.createdAt,
  };
}

function newId(): string {
  return crypto.randomUUID();
}

/**
 * 读取默认对话的全部消息，按创建时间与 id 稳定排序。
 */
export function listMessages(conversationId: string): StoredMessage[] {
  const rows = db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt), asc(messages.id))
    .all();
  return rows.map(toStored);
}

/**
 * 持久化一条消息。content 由调用方保证非空（schema 与应用层共同保护）。
 */
export function insertMessage(
  conversationId: string,
  role: MessageRole,
  content: string,
): StoredMessage {
  const row: Message = {
    id: newId(),
    conversationId,
    role,
    content,
    createdAt: Date.now(),
  };
  db.insert(messages).values(row).run();
  return toStored(row);
}

/** 持久化用户消息（在调用 Provider 前写入）。 */
export function insertUserMessage(
  conversationId: string,
  content: string,
): StoredMessage {
  return insertMessage(conversationId, 'user', content);
}

/** 持久化完整 assistant 消息。仅在流正常结束时调用。 */
export function insertAssistantMessage(
  conversationId: string,
  content: string,
): StoredMessage {
  return insertMessage(conversationId, 'assistant', content);
}

/**
 * 清空默认对话的全部消息。仅 E2E 测试使用（由 env 守卫路由调用）。
 */
export function clearConversationMessages(conversationId: string): void {
  db.delete(messages).where(eq(messages.conversationId, conversationId)).run();
}
