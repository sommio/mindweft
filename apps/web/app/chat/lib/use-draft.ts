'use client';

import { useCallback, useEffect, useState } from 'react';

import { clearDraft, loadDraft, saveDraft } from './draft';

/**
 * 按对话 ID 隔离的未发送草稿状态。切换对话时加载目标对话草稿，
 * 输入时写回客户端持久化存储，发送时清除。草稿不写入 messages 表。
 */
export function useDraft(
  conversationId: string,
): [string, (value: string) => void, () => void] {
  const [value, setValue] = useState('');

  useEffect(() => {
    setValue(loadDraft(conversationId));
  }, [conversationId]);

  const set = useCallback(
    (next: string) => {
      setValue(next);
      saveDraft(conversationId, next);
    },
    [conversationId],
  );

  const clear = useCallback(() => {
    setValue('');
    clearDraft(conversationId);
  }, [conversationId]);

  return [value, set, clear];
}
