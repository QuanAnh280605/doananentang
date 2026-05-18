'use client';

import type { ReactNode } from 'react';

import { RealtimeProvider } from '@/components/providers/RealtimeProvider';
import { GlobalSearchProvider } from '@/components/search/GlobalSearchProvider';
import { ToastProvider } from '@/components/toast/ToastProvider';

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ToastProvider>
      <RealtimeProvider>
        <GlobalSearchProvider>{children}</GlobalSearchProvider>
      </RealtimeProvider>
    </ToastProvider>
  );
}
