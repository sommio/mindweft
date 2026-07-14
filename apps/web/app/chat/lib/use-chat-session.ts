'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { ProviderConfig } from '@mindweft/ai';

import { postStream } from './sse-client';

export type ChatSessionMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status: 'done' | 'streaming' | 'error' | 'incomplete';
  errorCode?: string;
};

export type UseChatSession = {
  messages: ChatSessionMessage[];
  streaming: boolean;
  send: (text: string) => void;
  stop: () => void;
};

const CHAT_ENDPOINT = '/api/chat';
const MESSAGES_ENDPOINT = '/api/conversations/default/messages';

function newId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

type ServerMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
};

async function fetchMessages(): Promise<ChatSessionMessage[]> {
  const res = await fetch(MESSAGES_ENDPOINT);
  if (!res.ok) return [];
  const data = (await res.json()) as { messages?: ServerMessage[] };
  const list = Array.isArray(data.messages) ? data.messages : [];
  return list.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    status: 'done' as const,
  }));
}

/**
 * 聊天会话状态。历史来自服务端 SQLite；用户消息发送时立即持久化，
 * 完整 AI 消息在流正常结束后持久化。流被中断或失败时，部分 AI 内容
 * 只保留在当前页面（标记 incomplete/error），不写入数据库。
 */
export function useChatSession(config: ProviderConfig): UseChatSession {
  const [messages, setMessages] = useState<ChatSessionMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const configRef = useRef(config);
  configRef.current = config;
  const assistantIdRef = useRef<string | null>(null);
  const interactedRef = useRef<boolean>(false);

  // mount 时从服务端加载默认对话的全部有序消息。
  // 若用户在冷启动慢加载完成前已发送消息，则丢弃迟到的初始加载结果，避免覆盖乐观状态/错误行。
  const initialCancelledRef = useRef<boolean>(false);
  useEffect(() => {
    initialCancelledRef.current = false;
    void (async () => {
      const loaded = await fetchMessages();
      if (!initialCancelledRef.current && !interactedRef.current) {
        setMessages(loaded);
      }
    })();
    return () => {
      initialCancelledRef.current = true;
    };
  }, []);

  // 卸载时中断进行中的流。
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const send = useCallback((text: string) => {
    const trimmed = text.trim();
    if (trimmed === '' || abortRef.current !== null) return;
    interactedRef.current = true;

    const userId = newId();
    const assistantId = newId();
    assistantIdRef.current = assistantId;
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

    setMessages((prev) => {
      // 丢弃上一轮遗留的 incomplete/error 行，保留全部 done 消息。
      const kept = prev.filter((m) => m.status === 'done');
      return [...kept, userMessage, assistantPlaceholder];
    });

    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);

    void postStream(
      CHAT_ENDPOINT,
      { provider: configRef.current, content: trimmed },
      {
        onDelta: (delta) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + delta } : m,
            ),
          );
        },
        onDone: () => {
          // 流正常结束：服务端已持久化完整 assistant 消息。
          // 从服务端拉取真源，对齐 id/顺序/持久化状态，并清理遗留 incomplete/error 行。
          abortRef.current = null;
          setStreaming(false);
          void (async () => {
            const synced = await fetchMessages();
            setMessages(synced);
          })();
        },
        onError: (code) => {
          // 失败：保留用户消息（已持久化），把 assistant 占位标记为安全错误。
          // 不 refetch，以免丢失错误反馈；刷新后 partial assistant 自然消失。
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
  }, []);

  const stop = useCallback(() => {
    const controller = abortRef.current;
    if (controller === null) return;
    const assistantId = assistantIdRef.current;
    controller.abort();
    abortRef.current = null;
    setStreaming(false);
    if (assistantId !== null) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, status: 'incomplete' } : m,
        ),
      );
    }
  }, []);

  return { messages, streaming, send, stop };
}
