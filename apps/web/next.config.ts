import type { NextConfig } from 'next';
import path from 'node:path';
import withSerwistInit from '@serwist/next';

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  serverExternalPackages: ['better-sqlite3', 'sqlite-vec'],
};

export default withSerwist(nextConfig);
