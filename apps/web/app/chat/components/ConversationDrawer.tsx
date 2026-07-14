'use client';

import { useEffect, useRef } from 'react';

import { cn } from '../lib/cn';
import styles from '../chat.module.css';

export type ConversationDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export function ConversationDrawer({ open, onClose }: ConversationDrawerProps) {
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
        <p className={styles.listTitle}>对话</p>
        <div className={cn(styles.convoItem, styles.convoItemActive)}>
          默认对话
        </div>
      </div>
    </dialog>
  );
}
