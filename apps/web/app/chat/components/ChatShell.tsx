'use client';

import { useCallback, useEffect, useState } from 'react';

import type { ProviderConfig } from '@mindweft/ai';

import { ChatHeader } from './ChatHeader';
import { Composer } from './Composer';
import { ConversationDrawer } from './ConversationDrawer';
import { ConversationList } from './ConversationList';
import { IconRail } from './IconRail';
import { MessageList } from './MessageList';
import type { ConversationSummary } from '../store/conversations';
import { useOnlineStatus } from '../lib/use-online-status';
import { useChatSession } from '../lib/use-chat-session';
import styles from '../chat.module.css';

export type ChatShellProps = {
  config: ProviderConfig;
  embeddingConfig?: ProviderConfig | null;
};

export function ChatShell({ config, embeddingConfig = null }: ChatShellProps) {
  const [conversationId, setConversationId] = useState('default');
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('conversation');
    if (id) setConversationId(id);
  }, []);
  const selectConversation = (id: string) => {
    setConversationId(id);
    window.history.replaceState(
      null,
      '',
      `/chat?conversation=${encodeURIComponent(id)}`,
    );
  };

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const loadConversations = useCallback(async () => {
    const res = await fetch('/api/conversations');
    if (!res.ok) return;
    const data = (await res.json()) as {
      conversations?: ConversationSummary[];
    };
    setConversations(data.conversations ?? []);
  }, []);
  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  const createConversationHandler = useCallback(async () => {
    const res = await fetch('/api/conversations', { method: 'POST' });
    if (!res.ok) return;
    const data = (await res.json()) as { conversation: ConversationSummary };
    selectConversation(data.conversation.id);
    await loadConversations();
  }, [loadConversations]);

  const handleCreate = useCallback(() => {
    void createConversationHandler();
  }, [createConversationHandler]);

  const renameConversationHandler = useCallback(
    async (id: string, displayName: string) => {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ displayName }),
      });
      if (res.ok) await loadConversations();
    },
    [loadConversations],
  );

  const handleRename = useCallback(
    (id: string, displayName: string) => {
      void renameConversationHandler(id, displayName);
    },
    [renameConversationHandler],
  );

  const { messages, streaming, send, stop } = useChatSession(
    config,
    conversationId,
    embeddingConfig,
    {
      onConversationActivity: () => {
        void loadConversations();
      },
    },
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const online = useOnlineStatus();

  return (
    <div className={styles.shell}>
      <IconRail />
      <ConversationList
        items={conversations}
        currentId={conversationId}
        onSelect={selectConversation}
        onCreate={handleCreate}
        onRename={handleRename}
      />
      <main className={styles.main}>
        <ChatHeader
          model={config.model}
          onOpenDrawer={() => {
            setDrawerOpen(true);
          }}
        />
        {online ? null : (
          <div className={styles.offlineBanner} role="status">
            当前离线，发送已禁用。恢复联网后可继续对话。
          </div>
        )}
        <MessageList messages={messages} />
        <Composer
          conversationId={conversationId}
          streaming={streaming}
          onSend={send}
          onStop={stop}
          online={online}
        />
      </main>
      <ConversationDrawer
        open={drawerOpen}
        items={conversations}
        currentId={conversationId}
        onSelect={selectConversation}
        onCreate={handleCreate}
        onRename={handleRename}
        onClose={() => {
          setDrawerOpen(false);
        }}
      />
    </div>
  );
}
