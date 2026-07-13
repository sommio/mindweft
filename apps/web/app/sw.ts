/// <reference lib="webworker" />

import { defaultCache } from '@serwist/next/worker';
import { Serwist, type PrecacheEntry } from 'serwist';

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: Array<PrecacheEntry | string>;
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  clientsClaim: true,
  skipWaiting: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
