import Link from 'next/link';
import { ThemedText } from '@/components/ui/ThemedText';
import { API_URL } from '@/lib/api';
import type { AuthUser } from '@/lib/auth';

type AppTopNavProps = {
  searchPlaceholder?: string;
  avatarInitials?: string;
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
  currentUser,
}: AppTopNavProps) {
  const initials = currentUser 
    ? `${currentUser.first_name?.[0] || ''}${currentUser.last_name?.[0] || ''}`.toUpperCase()
    : avatarInitials;
    
  const avatarUrl = currentUser?.avatar_url 
    ? (currentUser.avatar_url.startsWith('http') ? currentUser.avatar_url : `${API_URL}${currentUser.avatar_url}`)
    : null;

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

          {/* Search Bar */}
          <div className="rounded-[22px] bg-[#F7F8FA] px-4 py-4 md:ml-6 md:max-w-[560px] md:flex-1">
            <div className="flex items-center gap-3">
              <span className="material-icons text-[20px] text-slate-400">search</span>
              <input 
                type="text"
                placeholder={searchPlaceholder}
                className="flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons & Avatar */}
        <div className="flex items-center gap-3">
          <IconBubble icon="mail_outline" />
          <IconBubble icon="notifications_none" />
          <IconBubble icon="apps" />
          
          <Link href="/profile" className="ml-1 hover:opacity-80 transition-opacity">
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="Avatar"
                className="h-14 w-14 shrink-0 rounded-[22px] object-cover"
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
