'use client';

import { useEffect, useRef, useState, type ComponentType } from 'react';

import { Aperture, Bell, EnvelopeSimple, SignOut, SquaresFour, User } from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { NotificationsModal } from '@/components/notifications/NotificationsModal';
import { useRealtimePresence } from '@/components/providers/RealtimeProvider';
import { useGlobalSearch } from '@/components/search/GlobalSearchProvider';
import { SearchInput } from '@/components/ui/SearchInput';
import { ThemedText } from '@/components/ui/ThemedText';
import { appColors } from '@/components/ui/design-system';
import { resolveAvatarUrl } from '@/lib/api';
import { logoutUser, type AuthUser } from '@/lib/auth';
import { ROUTES } from '@/lib/routes';

type AppTopNavProps = {
  searchPlaceholder?: string;
  avatarInitials?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  currentUser?: AuthUser | null;
  hideInboxAction?: boolean;
};

type IconComponent = ComponentType<{ className?: string; size?: number; weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone' }>;

function formatBadgeCount(count: number): string {
  if (count > 99) {
    return '99+';
  }

  return String(count);
}

function IconBubble({
  icon: Icon,
  href,
  label,
  badgeCount = 0,
  onClick,
}: {
  icon: IconComponent;
  href?: string;
  label: string;
  badgeCount?: number;
  onClick?: () => void;
}) {
  const className = 'group relative flex h-11 w-11 items-center justify-center rounded-[14px] bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 active:scale-90 transition-all duration-200 cursor-pointer';
  const hasBadge = badgeCount > 0;

  const badgeNode = hasBadge && (
    <span
      className="absolute -right-1.5 -top-1.5 z-10 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white ring-2 ring-slate-50 transition-colors duration-200 group-hover:ring-slate-100"
      style={{ backgroundColor: appColors.accent }}
    >
      {formatBadgeCount(badgeCount)}
    </span>
  );

  if (href) {
    return (
      <Link aria-label={label} className={className} href={href}>
        <Icon size={20} weight="regular" />
        {badgeNode}
      </Link>
    );
  }

  return (
    <button aria-label={label} className={className} onClick={onClick} type="button">
      <Icon size={20} weight="regular" />
      {badgeNode}
    </button>
  );
}

export function AppTopNav({
  searchPlaceholder = 'Search people, notes, or screenshots',
  avatarInitials = 'LE',
  searchValue,
  onSearchChange,
  currentUser,
  hideInboxAction = false,

}: AppTopNavProps) {
  const router = useRouter();
  const globalSearch = useGlobalSearch();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const isControlled = typeof onSearchChange === 'function';
  const resolvedSearchValue = isControlled ? (searchValue ?? '') : globalSearch.query;
  const initials = currentUser
    ? `${currentUser.first_name?.[0] || ''}${currentUser.last_name?.[0] || ''}`.toUpperCase()
    : avatarInitials;

  const avatarUrl = resolveAvatarUrl(currentUser?.avatar_url);

  const { hasNewMessage, unreadNotificationCount } = useRealtimePresence();

  const handleSearchChange = (value: string) => {
    if (isControlled) {
      onSearchChange(value);
      return;
    }

    globalSearch.setQuery(value);
  };

  const handleSearchFocus = () => {
    if (!isControlled) {
      globalSearch.open();
    }
  };

  useEffect(() => {
    if (!isAccountMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAccountMenuOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAccountMenuOpen]);

  const handleOpenProfile = () => {
    setIsAccountMenuOpen(false);
    router.push(ROUTES.profile);
  };

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    try {
      await logoutUser();
      setIsAccountMenuOpen(false);
      router.replace(ROUTES.login);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <nav className="rounded-[32px] border border-slate-200/60 bg-white/90 px-6 py-4 backdrop-blur-md shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex w-full flex-col gap-4 md:flex-1 md:flex-row md:items-center">
            <Link href="/" className="group flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-slate-950 text-white shadow-lg shadow-slate-950/20 transition-transform duration-300 group-hover:scale-105">
                <Aperture size={20} weight="fill" />
              </div>
              <div className="flex flex-col">
                <ThemedText as="p" className="leading-none text-[22px] font-bold tracking-tight text-slate-950">
                  Northfeed
                </ThemedText>
                <ThemedText as="p" className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Studio
                </ThemedText>
              </div>
            </Link>

            <SearchInput
              className="rounded-[18px] border border-transparent bg-slate-100/50 transition-all duration-300 focus-within:border-slate-200 focus-within:bg-white md:ml-6 md:max-w-[560px] md:flex-1"
              onChange={handleSearchChange}
              onFocus={handleSearchFocus}
              placeholder={searchPlaceholder}
              value={resolvedSearchValue}
            />
          </div>

          <div className="flex items-center gap-2.5">
            {!hideInboxAction ? <IconBubble href={ROUTES.inbox} icon={EnvelopeSimple} label="Open inbox" badgeCount={hasNewMessage ? 1 : 0} /> : null}
            <IconBubble icon={Bell} label="Open notifications" badgeCount={unreadNotificationCount} onClick={() => setIsNotificationsOpen(true)} />
            <IconBubble icon={SquaresFour} label="Open apps" />

            <div className="relative ml-2" ref={accountMenuRef}>
              <button
                aria-expanded={isAccountMenuOpen}
                aria-haspopup="menu"
                aria-label="Mở menu tài khoản"
                className="group block rounded-[14px] outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-soft)]"
                onClick={() => setIsAccountMenuOpen((current) => !current)}
                type="button"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="h-11 w-11 shrink-0 rounded-[14px] object-cover ring-0 ring-slate-100 transition-all duration-300 group-hover:ring-4"
                  />
                ) : (
                  <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-slate-100 transition-colors group-hover:bg-[var(--accent-soft)]">
                    <ThemedText as="span" className="text-[14px] font-bold text-slate-900">
                      {initials}
                    </ThemedText>
                  </span>
                )}
              </button>

              {isAccountMenuOpen ? (
                <div
                  className="absolute right-0 top-14 z-[230] w-56 overflow-hidden rounded-[24px] border border-slate-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
                  role="menu"
                >
                  <button
                    className="flex min-h-11 w-full items-center gap-3 rounded-[18px] px-3 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950"
                    onClick={handleOpenProfile}
                    role="menuitem"
                    type="button"
                  >
                    <User size={18} weight="bold" />
                    Profile
                  </button>
                  <button
                    className="flex min-h-11 w-full items-center gap-3 rounded-[18px] px-3 text-left text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isLoggingOut}
                    onClick={handleLogout}
                    role="menuitem"
                    type="button"
                  >
                    <SignOut size={18} weight="bold" />
                    {isLoggingOut ? 'Đang đăng xuất...' : 'Logout'}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </nav>

      {isNotificationsOpen ? <NotificationsModal open={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} /> : null}
    </>
  );
}
