/// <reference lib="webworker" />

import { defaultCache } from '@serwist/next/worker';
import { NetworkOnly, Serwist, type PrecacheEntry } from 'serwist';

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: Array<PrecacheEntry | string>;
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  clientsClaim: true,
  skipWaiting: true,
  navigationPreload: true,
  runtimeCaching: [
    // 聊天与消息 API：network-only，绝不由 Service Worker 缓存响应。
    {
      matcher: ({ url }) => url.pathname.startsWith('/api/'),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
  // 导航请求网络失败时回退到预缓存的 /offline 页。
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
});

serwist.addEventListeners();
