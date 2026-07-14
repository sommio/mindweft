'use client';

import { cn } from '../lib/cn';
import styles from '../chat.module.css';

export function ConversationList() {
  return (
    <aside className={styles.list} aria-label="对话列表">
      <p className={styles.listTitle}>对话</p>
      <div className={cn(styles.convoItem, styles.convoItemActive)}>
        默认对话
      </div>
    </aside>
  );
}
