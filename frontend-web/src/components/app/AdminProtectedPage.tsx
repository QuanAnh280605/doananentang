'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldSlash } from '@phosphor-icons/react';

import { restoreAuthSession } from '@/lib/api';
import { fetchCurrentUser } from '@/lib/auth';
import { ROUTES } from '@/lib/routes';
import { getAccessToken } from '@/lib/session';

type AdminProtectedPageProps = {
  children: ReactNode;
};

type State = 'loading' | 'forbidden' | 'ready';

export function AdminProtectedPage({ children }: AdminProtectedPageProps) {
  const router = useRouter();
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    let isMounted = true;

    async function checkAccess() {
      try {
        await restoreAuthSession();
        if (!getAccessToken()) {
          if (isMounted) router.replace(ROUTES.login);
          return;
        }
        const user = await fetchCurrentUser();
        if (!isMounted) return;
        // AuthUser không có field `role`, nên ép type any để check
        const role = (user as unknown as { role?: string }).role;
        if (role !== 'admin') {
          setState('forbidden');
        } else {
          setState('ready');
        }
      } catch {
        if (isMounted) router.replace(ROUTES.login);
      }
    }

    checkAccess();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (state === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#EDF1F5] px-6 py-10">
        <div className="rounded-[32px] border border-white/70 bg-white/90 px-8 py-12 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-600">Northfeed Admin</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-900">
            Đang kiểm tra quyền truy cập...
          </h1>
        </div>
      </main>
    );
  }

  if (state === 'forbidden') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#EDF1F5] px-6 py-10">
        <div className="flex flex-col items-center rounded-[32px] border border-white/70 bg-white/90 px-8 py-14 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm max-w-md w-full">
          <span className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-rose-50">
            <ShieldSlash size={32} weight="fill" className="text-rose-500" />
          </span>
          <h1 className="mt-5 text-2xl font-bold text-slate-900">Truy cập bị từ chối</h1>
          <p className="mt-2 text-[15px] text-slate-500">
            Bạn không có quyền truy cập vào trang quản trị. Chỉ tài khoản Admin mới được phép.
          </p>
          <button
            type="button"
            onClick={() => router.push(ROUTES.home)}
            className="mt-8 rounded-[18px] bg-slate-900 px-8 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-slate-700"
          >
            Quay về trang chủ
          </button>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
