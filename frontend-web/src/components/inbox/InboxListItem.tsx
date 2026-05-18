import Link from 'next/link';

import { ThemedText } from '@/components/ui/ThemedText';
import { resolveAvatarUrl } from '@/lib/api';

export type InboxListItemData = {
  id: string;
  name: string;
  preview: string;
  time: string;
  initials: string;
  avatarUrl?: string | null;
  bio?: string;
  active?: boolean;
  isOnline?: boolean;
  unread?: number;
};

type InboxListItemProps = {
  item: InboxListItemData;
  href?: string;
  onClick?: () => void;
};

export function InboxListItem({ item, href, onClick }: InboxListItemProps) {
  const avatarUrl = resolveAvatarUrl(item.avatarUrl);
  const content = (
    <>
      <div className="flex items-start gap-3">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-[#DBEAFE]">
          {avatarUrl ? (
            <img alt={item.name} className="h-full w-full object-cover" src={avatarUrl} />
          ) : (
            <ThemedText as="span" className="text-sm font-semibold tracking-[0.6px] text-slate-900">{item.initials}</ThemedText>
          )}
          {item.isOnline ? <span aria-label="Online" className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" /> : null}
        </div>
        <div className="flex flex-1 items-start justify-between gap-3 min-w-0">
          <div className="min-w-0 flex-1 space-y-1">
            <ThemedText as="p" className={`text-base font-semibold truncate ${item.unread ? 'text-slate-950' : 'text-slate-800'}`}>{item.name}</ThemedText>
            <ThemedText as="p" className={`text-sm leading-6 line-clamp-2 ${item.unread ? 'font-medium text-slate-900' : 'text-slate-500'}`}>{item.preview}</ThemedText>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2 pt-0.5">
            <ThemedText as="p" className={`text-xs font-medium ${item.unread ? 'text-red-500' : 'text-slate-400'}`}>{item.time}</ThemedText>
            {item.unread ? <span className="block h-2.5 w-2.5 rounded-full bg-red-500 shadow-sm" /> : null}
          </div>



        </div>
      </div>

    </>
  );

  return (
    onClick ? (
      <button className={`block w-full rounded-[24px] border px-4 py-4 text-left transition hover:opacity-95 ${item.active ? 'border-[#BFDBFE] bg-[#EFF6FF]' : 'border-transparent bg-[#F8FAFC]'}`} onClick={onClick} type="button">
        {content}
      </button>
    ) : href ? (
      <Link className={`block rounded-[24px] border px-4 py-4 transition hover:opacity-95 ${item.active ? 'border-[#BFDBFE] bg-[#EFF6FF]' : 'border-transparent bg-[#F8FAFC]'}`} href={href}>
        {content}
      </Link>
    ) : (
      <div className={`rounded-[24px] border px-4 py-4 ${item.active ? 'border-[#BFDBFE] bg-[#EFF6FF]' : 'border-transparent bg-[#F8FAFC]'}`}>
        {content}
      </div>
    )
  );
}
