'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

import { restoreAuthSession } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { getAccessToken } from '@/lib/session';

type ProtectedPageProps = {
  children: ReactNode;
};

export function ProtectedPage({ children }: ProtectedPageProps) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    restoreAuthSession()
      .catch(() => null)
      .finally(() => {
        if (!isMounted) {
          return;
        }

        if (!getAccessToken()) {
          router.replace(ROUTES.login);
          return;
        }

        setIsReady(true);
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (!isReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#EDF1F5] px-6 py-10 text-slate-900">
        <div className="rounded-[32px] border border-white/70 bg-white/90 px-8 py-12 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-600">Northfeed</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-900">
            Đang mở không gian làm việc...
          </h1>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
