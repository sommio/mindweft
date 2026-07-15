import { describe, expect, it } from 'vitest';

import {
  AUTO_NAME_MAX,
  CONVERSATION_NAME_MAX,
  deriveConversationName,
  normalizeConversationName,
} from './conversation-name';

describe('normalizeConversationName', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizeConversationName('  读书笔记  ')).toBe('读书笔记');
  });

  it('collapses internal whitespace runs', () => {
    expect(normalizeConversationName('a\t b\n c')).toBe('a b c');
  });

  it('rejects empty and whitespace-only names', () => {
    expect(normalizeConversationName('')).toBeNull();
    expect(normalizeConversationName('   ')).toBeNull();
  });

  it('rejects names exceeding the length limit', () => {
    expect(normalizeConversationName('x'.repeat(CONVERSATION_NAME_MAX))).toBe(
      'x'.repeat(CONVERSATION_NAME_MAX),
    );
    expect(
      normalizeConversationName('x'.repeat(CONVERSATION_NAME_MAX + 1)),
    ).toBeNull();
  });
});

describe('deriveConversationName', () => {
  it('uses the first non-empty line', () => {
    expect(deriveConversationName('第一行\n第二行')).toBe('第一行');
  });

  it('skips leading blank lines', () => {
    expect(deriveConversationName('\n\n  \n实际主题\n其它')).toBe('实际主题');
  });

  it('collapses whitespace in the chosen line', () => {
    expect(deriveConversationName('今天   读了一本   书')).toBe(
      '今天 读了一本 书',
    );
  });

  it('truncates long first messages and appends an ellipsis', () => {
    const long = '一'.repeat(AUTO_NAME_MAX + 10);
    const name = deriveConversationName(long);
    expect(name.length).toBe(AUTO_NAME_MAX + 1);
    expect(name.endsWith('…')).toBe(true);
    expect(name.slice(0, AUTO_NAME_MAX)).toBe('一'.repeat(AUTO_NAME_MAX));
  });

  it('keeps short content unchanged', () => {
    expect(deriveConversationName('短主题')).toBe('短主题');
  });

  it('allows multiple conversations to share the same derived name', () => {
    expect(deriveConversationName('重复主题')).toBe('重复主题');
    expect(deriveConversationName('重复主题')).toBe('重复主题');
  });
});
