'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { ProviderConfig } from '@mindweft/ai';

import { postStream } from './sse-client';

export type ChatSessionMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status: 'done' | 'streaming' | 'error';
  errorCode?: string;
};

export type UseChatSession = {
  messages: ChatSessionMessage[];
  streaming: boolean;
  send: (text: string) => void;
};

const CHAT_ENDPOINT = '/api/chat';

function newId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

/**
 * 会话内聊天状态。本 ticket 不持久化，刷新后丢失。
 */
export function useChatSession(config: ProviderConfig): UseChatSession {
  const [messages, setMessages] = useState<ChatSessionMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (trimmed === '' || abortRef.current !== null) return;

      const userId = newId();
      const assistantId = newId();
      const userMessage: ChatSessionMessage = {
        id: userId,
        role: 'user',
        content: trimmed,
        status: 'done',
      };
      const assistantPlaceholder: ChatSessionMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        status: 'streaming',
      };

      const priorMessages = messages.filter((m) => m.status === 'done');
      const payload = [
        ...priorMessages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: trimmed },
      ];

      setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);

      const controller = new AbortController();
      abortRef.current = controller;
      setStreaming(true);

      void postStream(
        CHAT_ENDPOINT,
        { provider: configRef.current, messages: payload },
        {
          onDelta: (delta) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + delta } : m,
              ),
            );
          },
          onDone: () => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, status: 'done' } : m,
              ),
            );
            abortRef.current = null;
            setStreaming(false);
          },
          onError: (code) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, status: 'error', errorCode: code }
                  : m,
              ),
            );
            abortRef.current = null;
            setStreaming(false);
          },
        },
        controller.signal,
      );
    },
    [messages],
  );

  return { messages, streaming, send };
}
