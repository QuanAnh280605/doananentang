import Link from 'next/link';

import { ThemedText } from '@/components/ui/ThemedText';

export type InboxListItemData = {
  id: string;
  name: string;
  preview: string;
  time: string;
  initials: string;
  bio?: string;
  active?: boolean;
  unread?: number;
};

export function InboxListItem({ item, href }: { item: InboxListItemData; href?: string }) {
  const content = (
    <>
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#DBEAFE]">
          <ThemedText as="span" className="text-sm font-semibold tracking-[0.6px] text-slate-900">{item.initials}</ThemedText>
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between gap-3">
            <ThemedText as="p" className="text-base font-semibold text-slate-950">{item.name}</ThemedText>
            <ThemedText as="p" className="text-xs font-medium text-slate-400">{item.time}</ThemedText>
          </div>
          <ThemedText as="p" className="text-sm leading-6 text-slate-500">{item.preview}</ThemedText>
        </div>
      </div>
      {item.unread ? <div className="mt-3 inline-flex rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">{item.unread} new</div> : null}
    </>
  );

  return (
    href ? (
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
