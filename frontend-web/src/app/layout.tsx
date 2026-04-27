import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { AppProviders } from '@/components/providers/AppProviders';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Northfeed',
  description: 'Northfeed web experience',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
