'use client';

import { useEffect, useRef } from 'react';

import styles from '../chat.module.css';
import { ConversationList } from './ConversationList';

export type ConversationDrawerProps = {
  open: boolean;
  onClose: () => void;
  currentId?: string;
  onSelect?: (id: string) => void;
};

export function ConversationDrawer({
  open,
  onClose,
  currentId = 'default',
  onSelect = () => undefined,
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
          currentId={currentId}
          onSelect={(id) => {
            onSelect(id);
            onClose();
          }}
        />
      </div>
    </dialog>
  );
}
