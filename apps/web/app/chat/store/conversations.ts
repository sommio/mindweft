import { conversations, db, eq } from '@mindweft/db';

export const DEFAULT_CONVERSATION_ID = 'default';
const DEFAULT_DISPLAY_NAME = '默认对话';

export type DefaultConversation = {
  id: string;
  displayName: string;
};

/**
 * 确保存在且只使用一个默认对话。无则插入固定 id 的默认对话。
 */
export function ensureDefaultConversation(): DefaultConversation {
  const existing = db
    .select({ id: conversations.id, displayName: conversations.displayName })
    .from(conversations)
    .where(eq(conversations.id, DEFAULT_CONVERSATION_ID))
    .get();
  if (existing !== undefined) {
    return { id: existing.id, displayName: existing.displayName };
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
  return { id: DEFAULT_CONVERSATION_ID, displayName: DEFAULT_DISPLAY_NAME };
}
