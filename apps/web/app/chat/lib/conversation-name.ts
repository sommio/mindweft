import { NEW_CONVERSATION_NAME } from '../store/conversations';

/**
 * 对话显示名称的合理长度上限。超出视为非法名称。
 */
export const CONVERSATION_NAME_MAX = 100;

/**
 * 自动生成临时名称时从首条用户消息截取的最大字符数。
 */
export const AUTO_NAME_MAX = 20;

/**
 * 规范化用户输入的对话名称：去除首尾空白，折叠内部连续空白。
 * 返回 null 表示名称为空或超过长度上限，调用方应回 4xx。
 */
export function normalizeConversationName(raw: string): string | null {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  if (trimmed.length === 0 || trimmed.length > CONVERSATION_NAME_MAX) {
    return null;
  }
  return trimmed;
}

/**
 * 从首条用户消息内容用本地规则生成临时对话名称。不调用 AI Provider。
 * 取首个非空行，折叠空白，超过 AUTO_NAME_MAX 字符则截断并加省略号。
 * 输入保证非空（由 parseChatRequest 校验），但仍防御性回退到默认名称。
 */
export function deriveConversationName(content: string): string {
  const firstLine =
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? '';
  const base = (firstLine || content.trim()).replace(/\s+/g, ' ').trim();
  if (base.length === 0) return NEW_CONVERSATION_NAME;
  if (base.length <= AUTO_NAME_MAX) return base;
  return `${base.slice(0, AUTO_NAME_MAX)}…`;
}
