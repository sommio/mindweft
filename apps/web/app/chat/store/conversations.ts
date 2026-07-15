import { asc, conversations, db, desc, eq, messages } from '@mindweft/db';

export const DEFAULT_CONVERSATION_ID = 'default';
const DEFAULT_DISPLAY_NAME = '默认对话';
export const NEW_CONVERSATION_NAME = '新对话';

export type ConversationSummary = {
  id: string;
  displayName: string;
  createdAt: number;
  updatedAt: number;
  latestMessage: string | null;
};

/**
 * 确保存在且只使用一个默认对话。无则插入固定 id 的默认对话。
 */
export function ensureDefaultConversation(): ConversationSummary {
  const existing = db
    .select()
    .from(conversations)
    .where(eq(conversations.id, DEFAULT_CONVERSATION_ID))
    .get();
  if (existing !== undefined) {
    return toSummary(existing);
  }
  const now = Date.now();
  db.insert(conversations)
    .values({
      id: DEFAULT_CONVERSATION_ID,
      displayName: DEFAULT_DISPLAY_NAME,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return toSummary({
    id: DEFAULT_CONVERSATION_ID,
    displayName: DEFAULT_DISPLAY_NAME,
    createdAt: now,
    updatedAt: now,
  });
}

function toSummary(row: {
  id: string;
  displayName: string;
  createdAt: number;
  updatedAt: number;
}): ConversationSummary {
  const latest = db
    .select({ content: messages.content })
    .from(messages)
    .where(eq(messages.conversationId, row.id))
    .orderBy(desc(messages.createdAt), desc(messages.id))
    .get();
  return { ...row, latestMessage: latest?.content ?? null };
}

export function listConversations(): ConversationSummary[] {
  return db
    .select()
    .from(conversations)
    .orderBy(desc(conversations.updatedAt), asc(conversations.id))
    .all()
    .map(toSummary);
}

export function getConversation(id: string): ConversationSummary | undefined {
  const row = db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id))
    .get();
  return row === undefined ? undefined : toSummary(row);
}

export function createConversation(): ConversationSummary {
  const now = Date.now();
  const row = {
    id: crypto.randomUUID(),
    displayName: NEW_CONVERSATION_NAME,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(conversations).values(row).run();
  return toSummary(row);
}

/**
 * 重命名对话。name 必须已通过 normalizeConversationName 规范化（非空、不超长）。
 * 对话不存在时返回 undefined；调用方据此回 404。
 */
export function renameConversation(
  id: string,
  name: string,
): ConversationSummary | undefined {
  const row = db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id))
    .get();
  if (row === undefined) return undefined;
  db.update(conversations)
    .set({ displayName: name })
    .where(eq(conversations.id, id))
    .run();
  return toSummary({ ...row, displayName: name });
}
