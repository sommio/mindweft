const DRAFT_PREFIX = 'mindweft.draft.';

/**
 * 草稿在客户端持久化存储中的 key，按对话 ID 隔离。
 */
export function draftKey(conversationId: string): string {
  return `${DRAFT_PREFIX}${conversationId}`;
}

/**
 * 读取指定对话的未发送草稿。无草稿或无法访问存储时返回空串。
 */
export function loadDraft(conversationId: string): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(draftKey(conversationId)) ?? '';
  } catch {
    return '';
  }
}

/**
 * 写入指定对话的草稿。草稿不写入 messages 表，不进入 Provider 上下文。
 */
export function saveDraft(conversationId: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(draftKey(conversationId), value);
  } catch {
    // 存储满或被禁用时静默降级：草稿仅是体验增强，不应阻断输入。
  }
}

/**
 * 清除指定对话的草稿（发送成功后调用）。
 */
export function clearDraft(conversationId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(draftKey(conversationId));
  } catch {
    // 静默降级。
  }
}
