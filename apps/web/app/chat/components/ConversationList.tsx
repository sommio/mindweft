'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '../lib/cn';
import type { ConversationSummary } from '../store/conversations';
import styles from '../chat.module.css';

export type Conversation = Pick<ConversationSummary, 'id' | 'displayName'>;

export type ConversationListProps = {
  items: Conversation[];
  currentId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string, displayName: string) => void;
  onClose?: () => void;
};

export function ConversationList({
  items,
  currentId,
  onSelect,
  onCreate,
  onRename,
  onClose,
}: ConversationListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  return (
    <aside className={styles.list} aria-label="对话列表">
      <div className={styles.listHeader}>
        <p className={styles.listTitle}>对话</p>
        {onClose ? (
          <button
            type="button"
            className={styles.closeButton}
            aria-label="关闭对话列表"
            onClick={onClose}
          >
            ✕
          </button>
        ) : null}
      </div>
      <button
        type="button"
        className={styles.newConversation}
        onClick={onCreate}
      >
        新建对话
      </button>
      <div className={styles.convoScroll}>
        {items.map((item) => (
          <ConversationItem
            key={item.id}
            item={item}
            active={item.id === currentId}
            editing={editingId === item.id}
            draftName={draftName}
            onStartEdit={() => {
              setEditingId(item.id);
              setDraftName(item.displayName);
            }}
            onChangeDraft={setDraftName}
            onCancel={() => {
              setEditingId(null);
            }}
            onSave={() => {
              const trimmed = draftName.trim();
              if (trimmed !== '') {
                onRename(item.id, trimmed);
              }
              setEditingId(null);
            }}
            onSelect={() => {
              onSelect(item.id);
            }}
          />
        ))}
      </div>
    </aside>
  );
}

type ConversationItemProps = {
  item: Conversation;
  active: boolean;
  editing: boolean;
  draftName: string;
  onStartEdit: () => void;
  onChangeDraft: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
  onSelect: () => void;
};

function ConversationItem({
  item,
  active,
  editing,
  draftName,
  onStartEdit,
  onChangeDraft,
  onCancel,
  onSave,
  onSelect,
}: ConversationItemProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (editing) {
    return (
      <div className={cn(styles.convoItem, active && styles.convoItemActive)}>
        <input
          ref={inputRef}
          className={styles.convoRenameInput}
          value={draftName}
          onChange={(e) => {
            onChangeDraft(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSave();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              onCancel();
            }
          }}
          aria-label="重命名对话"
        />
        <button
          type="button"
          className={styles.convoRenameSave}
          aria-label="保存名称"
          onClick={onSave}
        >
          ✓
        </button>
        <button
          type="button"
          className={styles.convoRenameCancel}
          aria-label="取消重命名"
          onClick={onCancel}
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className={cn(styles.convoItem, active && styles.convoItemActive)}>
      <button
        type="button"
        className={styles.convoItemSelect}
        onClick={onSelect}
      >
        {item.displayName}
      </button>
      <button
        type="button"
        className={styles.convoRenameButton}
        aria-label={`重命名 ${item.displayName}`}
        onClick={onStartEdit}
      >
        ✎
      </button>
    </div>
  );
}
