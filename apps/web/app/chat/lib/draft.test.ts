import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clearDraft, draftKey, loadDraft, saveDraft } from './draft';

// jsdom 在本仓库的 vitest 环境下不暴露 localStorage，用一个等价的内存实现替代，
// 仅用于测试草稿存取的纯逻辑；生产环境浏览器自带 localStorage。
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

function installLocalStorage(): void {
  Object.defineProperty(window, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
  });
}

describe('draft storage', () => {
  beforeEach(() => {
    installLocalStorage();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('keys drafts by conversation id', () => {
    expect(draftKey('a')).toBe('mindweft.draft.a');
    expect(draftKey('b')).not.toBe(draftKey('a'));
  });

  it('saves and loads a draft per conversation independently', () => {
    saveDraft('a', '草稿A');
    saveDraft('b', '草稿B');
    expect(loadDraft('a')).toBe('草稿A');
    expect(loadDraft('b')).toBe('草稿B');
  });

  it('returns empty string when no draft exists', () => {
    expect(loadDraft('none')).toBe('');
  });

  it('does not let one conversation overwrite another', () => {
    saveDraft('a', 'A1');
    saveDraft('b', 'B1');
    saveDraft('a', 'A2');
    expect(loadDraft('a')).toBe('A2');
    expect(loadDraft('b')).toBe('B1');
  });

  it('clears only the target conversation draft', () => {
    saveDraft('a', 'A');
    saveDraft('b', 'B');
    clearDraft('a');
    expect(loadDraft('a')).toBe('');
    expect(loadDraft('b')).toBe('B');
  });

  it('preserves newlines and whitespace in a draft', () => {
    saveDraft('a', '第一行\n  第二行');
    expect(loadDraft('a')).toBe('第一行\n  第二行');
  });
});
