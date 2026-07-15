import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { conversations, db, eq, messages, runMigrations } from '@mindweft/db';
import { createConversation, listConversations } from './conversations';

function insertConversation(): string {
  const id = `test-${Math.random().toString(36).slice(2)}`;
  const now = Date.now();
  db.insert(conversations)
    .values({
      id,
      displayName: '测试对话',
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return id;
}

describe('messages schema constraints', () => {
  let conversationId: string;

  beforeAll(() => {
    runMigrations();
  });

  afterEach(() => {
    db.delete(messages).run();
    db.delete(conversations).run();
  });

  it('rejects an unknown role', () => {
    conversationId = insertConversation();
    expect(() =>
      db
        .insert(messages)
        .values({
          id: 'm1',
          conversationId,
          role: 'tool',
          content: 'x',
          createdAt: Date.now(),
        })
        .run(),
    ).toThrow();
  });

  it('rejects empty or whitespace-only content', () => {
    conversationId = insertConversation();
    expect(() =>
      db
        .insert(messages)
        .values({
          id: 'm2',
          conversationId,
          role: 'user',
          content: '   ',
          createdAt: Date.now(),
        })
        .run(),
    ).toThrow();
    expect(() =>
      db
        .insert(messages)
        .values({
          id: 'm3',
          conversationId,
          role: 'assistant',
          content: '',
          createdAt: Date.now(),
        })
        .run(),
    ).toThrow();
  });

  it('accepts valid user and assistant messages', () => {
    conversationId = insertConversation();
    expect(() =>
      db
        .insert(messages)
        .values({
          id: 'm4',
          conversationId,
          role: 'user',
          content: '你好',
          createdAt: Date.now(),
        })
        .run(),
    ).not.toThrow();
  });
});

describe('conversation store', () => {
  beforeAll(() => {
    runMigrations();
  });

  afterEach(() => {
    db.delete(conversations).run();
  });

  it('creates and lists multiple conversations by recent activity', () => {
    const first = createConversation();
    const second = createConversation();
    db.update(conversations)
      .set({ updatedAt: Date.now() + 1000 })
      .where(eq(conversations.id, first.id))
      .run();
    expect(listConversations().map((conversation) => conversation.id)).toEqual([
      first.id,
      second.id,
    ]);
  });
});
