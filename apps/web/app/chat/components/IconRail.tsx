'use client';

import Link from 'next/link';

import styles from '../chat.module.css';

export function IconRail() {
  return (
    <nav className={styles.rail} aria-label="主导航">
      <Link href="/chat" className={styles.railLink} aria-label="聊天">
        💬
      </Link>
      <Link
        href="/settings/provider"
        className={styles.railLink}
        aria-label="Provider 设置"
      >
        ⚙
      </Link>
    </nav>
  );
}
