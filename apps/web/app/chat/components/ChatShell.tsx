'use client';

import { useState } from 'react';

import type { ProviderConfig } from '@mindweft/ai';

import { ChatHeader } from './ChatHeader';
import { Composer } from './Composer';
import { ConversationDrawer } from './ConversationDrawer';
import { ConversationList } from './ConversationList';
import { IconRail } from './IconRail';
import { MessageList } from './MessageList';
import { useOnlineStatus } from '../lib/use-online-status';
import { useChatSession } from '../lib/use-chat-session';
import styles from '../chat.module.css';

export type ChatShellProps = {
  config: ProviderConfig;
};

export function ChatShell({ config }: ChatShellProps) {
  const { messages, streaming, send, stop } = useChatSession(config);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const online = useOnlineStatus();

  return (
    <div className={styles.shell}>
      <IconRail />
      <ConversationList />
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
          streaming={streaming}
          onSend={send}
          onStop={stop}
          online={online}
        />
      </main>
      <ConversationDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
        }}
      />
    </div>
  );
}
