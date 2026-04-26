'use client';

import type { ReactNode } from 'react';

import { ToastProvider } from '@/components/toast/ToastProvider';

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return <ToastProvider>{children}</ToastProvider>;
}
