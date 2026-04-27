import { useGlobalSearch } from '@/components/search/GlobalSearchProvider';
import Link from 'next/link';
import Image from 'next/image';
import { ThemedText } from '@/components/ui/ThemedText';
import { SearchInput } from '@/components/ui/SearchInput';
import { API_URL } from '@/lib/api';
import type { AuthUser } from '@/lib/auth';

type AppTopNavProps = {
  searchPlaceholder?: string;
  avatarInitials?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  currentUser?: AuthUser | null;
};

function IconBubble({ icon }: { icon: string }) {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#F7F8FA] text-[#666666] hover:bg-[#E2E8F0] transition-colors cursor-pointer">
      <span className="material-icons text-[21px]">{icon}</span>
    </div>
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

  const avatarUrl = currentUser?.avatar_url
    ? (currentUser.avatar_url.startsWith('http') ? currentUser.avatar_url : `${API_URL}${currentUser.avatar_url}`)
    : null;

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
    <nav className="rounded-[28px] border border-[#E4E8EE] bg-white px-5 py-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex w-full flex-col gap-4 md:flex-1 md:flex-row md:items-center">
          {/* Logo Area */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#4A9FD8] text-white">
              <span className="material-icons text-[22px]">filter_tilt_shift</span>
            </div>
            <div>
              <ThemedText as="p" className="text-[26px] font-semibold tracking-[-0.5px] text-slate-950">
                Northfeed
              </ThemedText>
              <ThemedText as="p" className="text-sm text-slate-500 leading-3">
                studio
              </ThemedText>
            </div>
          </Link>

          <SearchInput
            className="md:ml-6 md:max-w-[560px] md:flex-1"
            onChange={handleSearchChange}
            onFocus={handleSearchFocus}
            placeholder={searchPlaceholder}
            value={resolvedSearchValue}
          />
        </div>

        {/* Action Buttons & Avatar */}
        <div className="flex items-center gap-3">
          <IconBubble icon="mail_outline" />
          <IconBubble icon="notifications_none" />
          <IconBubble icon="apps" />
          
          <Link href="/profile" className="ml-1 hover:opacity-80 transition-opacity">
            {avatarUrl ? (
              <Image 
                src={avatarUrl} 
                alt="Avatar"
                width={56}
                height={56}
                className="h-14 w-14 shrink-0 rounded-[22px] object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-[#EAF4FB]">
                <ThemedText as="span" className="text-base font-semibold tracking-[0.5px] text-slate-900">
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
