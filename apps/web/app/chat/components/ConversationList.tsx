'use client';

import { useEffect, useState } from 'react';

import { cn } from '../lib/cn';
import styles from '../chat.module.css';

export type Conversation = { id: string; displayName: string };

export function ConversationList({
  currentId,
  onSelect,
}: {
  currentId: string;
  onSelect: (id: string) => void;
}) {
  const [items, setItems] = useState<Conversation[]>([]);
  const load = () => {
    void fetch('/api/conversations')
      .then((r) => r.json())
      .then((data: { conversations?: Conversation[] }) => {
        setItems(data.conversations ?? []);
      });
  };
  useEffect(load, []);
  return (
    <aside className={styles.list} aria-label="对话列表">
      <p className={styles.listTitle}>对话</p>
      <button
        type="button"
        className={styles.newConversation}
        onClick={() => {
          void fetch('/api/conversations', { method: 'POST' })
            .then((r) => r.json())
            .then((data: { conversation: Conversation }) => {
              onSelect(data.conversation.id);
              load();
            });
        }}
      >
        新建对话
      </button>
      {items.map((item) => (
        <button
          type="button"
          key={item.id}
          className={cn(
            styles.convoItem,
            item.id === currentId && styles.convoItemActive,
          )}
          onClick={() => {
            onSelect(item.id);
          }}
        >
          {item.displayName}
        </button>
      ))}
    </aside>
  );
}
