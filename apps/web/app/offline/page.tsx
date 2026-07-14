import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '离线 — mindweft',
};

/**
 * 离线回退页。Service Worker 在导航请求网络失败时返回此页。
 * 聊天需要联网；离线时不创建发送队列，恢复联网后不会自动补发。
 */
export default function OfflinePage() {
  return (
    <main role="status" aria-live="polite">
      <section>
        <h1>当前离线</h1>
        <p>聊天暂不可用。请检查网络连接后重试。</p>
        <p>已安装的应用仍在，恢复联网即可继续对话。</p>
      </section>
    </main>
  );
}
