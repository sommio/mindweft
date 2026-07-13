import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import ServiceWorkerRegistration from './sw-registration';

export const metadata: Metadata = {
  title: 'mindweft',
  description: 'Private AI companion',
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
