import type { NextConfig } from 'next';
import path from 'node:path';
import withSerwistInit from '@serwist/next';

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
  // 预缓存离线回退页，供导航请求网络失败时由 Service Worker 返回。
  additionalPrecacheEntries: [{ url: '/offline' }],
});

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  serverExternalPackages: ['better-sqlite3', 'sqlite-vec'],
  ...(process.env.NODE_ENV === 'development'
    ? { allowedDevOrigins: ['*.*.*.*', '*.local'] }
    : {}),
};

export default withSerwist(nextConfig);
