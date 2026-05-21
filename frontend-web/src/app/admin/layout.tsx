'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, ShieldCheck, Aperture, ArrowLeft } from '@phosphor-icons/react';

import { AdminProtectedPage } from '@/components/app/AdminProtectedPage';
import { ROUTES } from '@/lib/routes';

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Người dùng', href: ROUTES.adminUsers, icon: Users },
  { label: 'Kiểm duyệt', href: ROUTES.adminModeration, icon: ShieldCheck },
];

function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-2 rounded-[24px] border border-[#E4E8EE] bg-white p-4 self-start sticky top-4">
      {/* Logo */}
      <div className="mb-2 flex items-center gap-2.5 px-2 pb-3 border-b border-[#E4E8EE]">
        <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-slate-950 text-white">
          <Aperture size={18} weight="fill" />
        </div>
        <div>
          <p className="text-[14px] font-bold leading-none text-slate-950">Northfeed</p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Admin</p>
        </div>
      </div>

      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-[18px] px-3 py-2.5 text-[14px] font-semibold transition-colors ${
              isActive
                ? 'bg-[#4A9FD8] text-white'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <item.icon size={18} weight={isActive ? 'fill' : 'regular'} />
            {item.label}
          </Link>
        );
      })}

      <div className="mt-auto pt-3 border-t border-[#E4E8EE]">
        <Link
          href={ROUTES.home}
          className="flex items-center gap-3 rounded-[18px] px-3 py-2.5 text-[14px] font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={18} weight="regular" />
          Về trang chủ
        </Link>
      </div>
    </aside>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminProtectedPage>
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="mx-auto flex w-full max-w-[1400px] gap-6 px-4 py-6 md:px-6">
          <AdminSidebar />
          <main className="min-w-0 flex-1">
            {children}
          </main>
        </div>
      </div>
    </AdminProtectedPage>
  );
}
