'use client';

import Link from 'next/link';

import { ChatShell } from './components/ChatShell';
import { useProviderConfig } from '../../lib/use-provider-config';

export default function ChatPage() {
  const { config, ready } = useProviderConfig();

  if (!ready) {
    return (
      <main>
        <p aria-busy="true">加载中…</p>
      </main>
    );
  }

  if (!config) {
    return (
      <main>
        <section>
          <h1>聊天</h1>
          <p>先连接一个 Provider。</p>
          <Link href="/settings/provider">去配置 Provider</Link>
        </section>
      </main>
    );
  }

  return <ChatShell config={config} />;
}
