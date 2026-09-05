import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';

import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'NKC Institute Management System',
  description: 'Internal IMS for students, faculty, and administration',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
            style: { fontFamily: 'Inter, system-ui, sans-serif' },
          }}
        />
      </body>
    </html>
  );
}
