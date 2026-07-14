'use client';

import { useState } from 'react';

import type { ProviderConfig } from '@mindweft/ai';

import { ChatHeader } from './ChatHeader';
import { Composer } from './Composer';
import { ConversationDrawer } from './ConversationDrawer';
import { ConversationList } from './ConversationList';
import { IconRail } from './IconRail';
import { MessageList } from './MessageList';
import { useChatSession } from '../lib/use-chat-session';
import styles from '../chat.module.css';

export type ChatShellProps = {
  config: ProviderConfig;
};

export function ChatShell({ config }: ChatShellProps) {
  const { messages, streaming, send, stop } = useChatSession(config);
  const [drawerOpen, setDrawerOpen] = useState(false);

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
        <MessageList messages={messages} />
        <Composer streaming={streaming} onSend={send} onStop={stop} />
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
