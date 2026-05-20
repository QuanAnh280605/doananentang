'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

const ADMIN_NAV = [
  { label: 'Kiểm duyệt (Moderation)', href: '/admin/moderation' },
  { label: 'Người dùng (Users)', href: '/admin/users' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-[var(--app-bg)] md:flex-row">
      {/* Sidebar */}
      <aside className="w-full border-b border-[var(--border)] bg-[var(--surface)] md:w-64 md:border-b-0 md:border-r">
        <div className="flex h-16 items-center px-6 border-b border-[var(--border)]">
          <span className="text-xl font-bold text-[var(--text)]">Admin Panel</span>
        </div>
        <nav className="flex gap-2 p-4 md:flex-col overflow-x-auto md:overflow-visible">
          {ADMIN_NAV.map((nav) => {
            const isActive = pathname.startsWith(nav.href);
            return (
              <Link
                key={nav.href}
                href={nav.href}
                className={`whitespace-nowrap rounded-[14px] px-4 py-3 text-[15px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]'
                }`}
              >
                {nav.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mx-auto max-w-4xl">
          {children}
        </div>
      </main>
    </div>
  );
}
