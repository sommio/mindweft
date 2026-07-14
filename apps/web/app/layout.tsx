import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import ServiceWorkerRegistration from './sw-registration';

export const metadata: Metadata = {
  title: 'mindweft',
  description: 'Private AI companion',
};

export const viewport: Viewport = {
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
