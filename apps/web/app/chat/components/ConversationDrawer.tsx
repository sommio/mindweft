'use client';

import { useEffect, useRef } from 'react';

import styles from '../chat.module.css';
import { ConversationList } from './ConversationList';
import type { Conversation } from './ConversationList';

export type ConversationDrawerProps = {
  open: boolean;
  onClose: () => void;
  items: Conversation[];
  currentId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string, displayName: string) => void;
};

export function ConversationDrawer({
  open,
  onClose,
  items,
  currentId,
  onSelect,
  onCreate,
  onRename,
}: ConversationDrawerProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dlg = ref.current;
    if (dlg === null) return;
    if (open && !dlg.open) {
      dlg.showModal();
    } else if (!open && dlg.open) {
      dlg.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.drawer}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className={styles.drawerContent}>
        <ConversationList
          items={items}
          currentId={currentId}
          onSelect={(id) => {
            onSelect(id);
            onClose();
          }}
          onCreate={() => {
            onCreate();
            onClose();
          }}
          onRename={onRename}
          onClose={onClose}
        />
      </div>
    </dialog>
  );
}
