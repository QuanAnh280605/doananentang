import type { ComponentType } from 'react';

import { Aperture, Bell, EnvelopeSimple, SquaresFour } from '@phosphor-icons/react';
import { useGlobalSearch } from '@/components/search/GlobalSearchProvider';
import Link from 'next/link';

import { ThemedText } from '@/components/ui/ThemedText';
import { SearchInput } from '@/components/ui/SearchInput';
import { resolveAvatarUrl } from '@/lib/api';
import type { AuthUser } from '@/lib/auth';
import { ROUTES } from '@/lib/routes';

type AppTopNavProps = {
  searchPlaceholder?: string;
  avatarInitials?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  currentUser?: AuthUser | null;
};

type IconComponent = ComponentType<{ className?: string; size?: number; weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone' }>;

function IconBubble({ icon: Icon, href, label }: { icon: IconComponent; href?: string; label: string }) {
  const className = 'flex h-11 w-11 items-center justify-center rounded-[14px] bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 active:scale-90 transition-all duration-200 cursor-pointer';

  if (href) {
    return (
      <Link aria-label={label} className={className} href={href}>
        <Icon size={20} weight="regular" />
      </Link>
    );
  }

  return (
    <button aria-label={label} className={className} type="button">
      <Icon size={20} weight="regular" />
    </button>
  );
}

export function AppTopNav({
  searchPlaceholder = 'Search people, notes, or screenshots',
  avatarInitials = 'LE',
  searchValue,
  onSearchChange,
  currentUser,

}: AppTopNavProps) {
  const globalSearch = useGlobalSearch();
  const isControlled = typeof onSearchChange === 'function';
  const resolvedSearchValue = isControlled ? (searchValue ?? '') : globalSearch.query;
  const initials = currentUser 
    ? `${currentUser.first_name?.[0] || ''}${currentUser.last_name?.[0] || ''}`.toUpperCase()
    : avatarInitials;

  const avatarUrl = resolveAvatarUrl(currentUser?.avatar_url);

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

  return (
    <nav className="rounded-[32px] border border-slate-200/60 bg-white/90 backdrop-blur-md px-6 py-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex w-full flex-col gap-4 md:flex-1 md:flex-row md:items-center">
          {/* Logo Area */}
          <Link href="/" className="flex items-center gap-3.5 group">
            <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-slate-950 text-white shadow-lg shadow-slate-950/20 group-hover:scale-105 transition-transform duration-300">
              <Aperture size={20} weight="fill" />
            </div>
            <div className="flex flex-col">
              <ThemedText as="p" className="text-[22px] font-bold tracking-tight text-slate-950 leading-none">
                Northfeed
              </ThemedText>
              <ThemedText as="p" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Studio
              </ThemedText>
            </div>
          </Link>

          <SearchInput
            className="md:ml-6 md:max-w-[560px] md:flex-1 rounded-[20px] bg-slate-100/50 border border-transparent focus-within:border-slate-200 focus-within:bg-white transition-all duration-300"
            onChange={handleSearchChange}
            onFocus={handleSearchFocus}
            placeholder={searchPlaceholder}
            value={resolvedSearchValue}
          />
        </div>

        {/* Action Buttons & Avatar */}
        <div className="flex items-center gap-2.5">
          <IconBubble href={ROUTES.inbox} icon={EnvelopeSimple} label="Open inbox" />
          <IconBubble icon={Bell} label="Open notifications" />
          <IconBubble icon={SquaresFour} label="Open apps" />
          
          <Link href="/profile" className="ml-2 group">
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="Avatar"
                className="h-11 w-11 shrink-0 rounded-[14px] object-cover ring-0 group-hover:ring-4 ring-slate-100 transition-all duration-300"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-slate-100 group-hover:bg-[#EAF4FB] transition-colors">
                <ThemedText as="span" className="text-[14px] font-bold text-slate-900">
                  {initials}
                </ThemedText>
              </div>
            )}
          </Link>
        </div>
      </div>
    </nav>
  );
}
