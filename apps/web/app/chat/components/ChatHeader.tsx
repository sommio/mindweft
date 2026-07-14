'use client';

import Link from 'next/link';

import styles from '../chat.module.css';

export type ChatHeaderProps = {
  model: string;
  onOpenDrawer: () => void;
};

export function ChatHeader({ model, onOpenDrawer }: ChatHeaderProps) {
  return (
    <header className={styles.header}>
      <button
        type="button"
        className={styles.hamburger}
        aria-label="打开对话列表"
        onClick={onOpenDrawer}
      >
        ☰
      </button>
      <h1 className={styles.headerTitle}>聊天</h1>
      <div className={styles.headerMeta}>
        <span>
          Model 为 <strong>{model}</strong>
        </span>
        <Link href="/settings/provider" className={styles.headerMetaLink}>
          编辑 Provider
        </Link>
      </div>
    </header>
  );
}
