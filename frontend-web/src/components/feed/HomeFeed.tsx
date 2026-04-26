'use client';

import Link from 'next/link';

import { ProtectedPage } from '@/components/app/ProtectedPage';
import { AppTopNav } from '@/components/navigation/AppTopNav';
import { ThemedText } from '@/components/ui/ThemedText';
import { ROUTES } from '@/lib/routes';

const shortcuts = [
  { label: 'Home', mark: 'H' },
  { label: 'Saved sets', mark: 'S' },
  { label: 'Circle updates', mark: 'C' },
];

const stories = [
  { id: '1', title: 'Morning run club', time: '2h ago', fill: 'bg-[#66D575]', initials: 'MN' },
  { id: '2', title: 'Desk setup refresh', time: '5h ago', fill: 'bg-[#874FFF]', initials: 'DS' },
  { id: '3', title: 'Client moodboard', time: 'Yesterday', fill: 'bg-[#F24822]', initials: 'KM' },
];

const posts = [
  {
    id: '1',
    author: 'Lina Corbe',
    time: '32 min ago',
    caption:
      'Wrapped an early prototype for the studio dashboard. The quieter version tested better than the busy one, so I pulled the motion back and kept the signal stronger.',
    reactions: '384 reactions',
    meta: '28 comments 6 shares',
  },
  {
    id: '2',
    author: 'Rafi Mercer',
    time: '1 hr ago',
    caption:
      'We cut the launch page into a lighter sequence and the handoff got noticeably faster. Posting the revised frame set for comments before lunch.',
    reactions: '142 reactions',
    meta: '17 comments 3 shares',
  },
  {
    id: '3',
    author: 'Aya Tran',
    time: '3 hr ago',
    caption:
      'Collecting references for the May sprint. Drop one detail you think social products still get wrong: too much chrome, weak context, or noisy motion?',
    reactions: '96 reactions',
    meta: '54 comments 2 reposts',
  },
];

const contacts = [
  { name: 'Ari Mendoza', status: 'Editing new campaign', initials: 'AM' },
  { name: 'Nadia Elsner', status: 'Reviewing typography', initials: 'NE' },
  { name: 'Jules Tate', status: 'In Riverside Studio', initials: 'JT' },
  { name: 'Owen Ybarra', status: 'Exporting review clips', initials: 'OY' },
];

const inboxItems = [
  { name: 'Rafi Mercer', message: 'Can you review the revised launch pacing?', initials: 'RM', unread: true },
  { name: 'Aya Tran', message: 'Dropping sprint references in five minutes.', initials: 'AT' },
  { name: 'Nadia Elsner', message: 'Shared fresh type comps for the thread.', initials: 'NE' },
];

const surfaceClass = 'rounded-[28px] border border-[#E4E8EE] bg-white';

function Avatar({ initials, soft = false }: { initials: string; soft?: boolean }) {
  return (
    <div className={`flex h-14 w-14 items-center justify-center rounded-[22px] ${soft ? 'bg-[#D9ECF8]' : 'bg-[#EAF4FB]'}`}>
      <ThemedText as="span" className="text-base font-semibold tracking-[0.5px] text-slate-900">
        {initials}
      </ThemedText>
    </div>
  );
}

function SectionCard({ title, rightLabel, children }: { title: string; rightLabel?: string; children: React.ReactNode }) {
  return (
    <section className={`${surfaceClass} p-5`}>
      <div className="flex items-center justify-between gap-3">
        <ThemedText as="h2" className="text-[22px] font-semibold text-slate-950">
          {title}
        </ThemedText>
        {rightLabel ? <ThemedText as="p" className="text-sm text-slate-500">{rightLabel}</ThemedText> : null}
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

export function HomeFeed() {
  return (
    <ProtectedPage>
      <main className="min-h-screen bg-[#EDF1F5] pb-8">
        <div className="mx-auto w-full max-w-[1720px] px-4 pb-6 pt-4 md:px-6">
          <AppTopNav />

          <div className="mt-4 grid gap-4 xl:grid-cols-[350px_minmax(0,1fr)_360px]">
            <div className="space-y-4">
              <ThemedText as="p" className="px-1 text-lg font-semibold text-slate-900">Shortcuts</ThemedText>
              {shortcuts.map((item) => (
                <div key={item.label} className="flex items-center gap-4 rounded-[22px] bg-[#F7F8FA] px-4 py-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#D9ECF8] text-[#4A9FD8]">
                    {item.mark}
                  </div>
                  <ThemedText as="p" className="text-lg font-medium text-slate-900">{item.label}</ThemedText>
                </div>
              ))}

              <section className={`${surfaceClass} overflow-hidden`}>
                <div className="h-[180px] bg-[#EAF4FB]" />
                <div className="px-5 pb-5">
                  <div className="-mt-8"><Avatar initials="LE" /></div>
                  <ThemedText as="h2" className="mt-4 text-[28px] font-semibold text-slate-950">Lena Evere</ThemedText>
                  <ThemedText as="p" className="mt-2 text-base leading-7 text-slate-600">
                    Leading product design at Northfeed, shaping calmer social tools for creative teams.
                  </ThemedText>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-[22px] bg-[#F7F8FA] px-4 py-4">
                      <ThemedText as="p" className="text-sm text-slate-500">Followers</ThemedText>
                      <ThemedText as="p" className="mt-1 text-xl font-semibold text-slate-950">2.4k</ThemedText>
                    </div>
                    <div className="rounded-[22px] bg-[#F7F8FA] px-4 py-4">
                      <ThemedText as="p" className="text-sm text-slate-500">Projects</ThemedText>
                      <ThemedText as="p" className="mt-1 text-xl font-semibold text-slate-950">14 live</ThemedText>
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <Link className="rounded-[22px] bg-[#0A0A0A] px-4 py-4 text-center text-base font-medium !text-white" href={ROUTES.profile}>
                      View profile
                    </Link>
                    <button className="rounded-[22px] bg-[#F7F8FA] px-4 py-4 text-base font-medium text-slate-900" type="button">
                      Edit intro
                    </button>
                  </div>
                </div>
              </section>
            </div>

            <div className="space-y-4">
              <section className={`${surfaceClass} p-5`}>
                <div className="flex items-center gap-4">
                  <Avatar initials="LC" soft />
                  <div className="flex-1 rounded-[24px] bg-[#F7F8FA] px-5 py-4">
                    <ThemedText as="p" className="text-base text-slate-500">
                      Share a project update, a photo, or a thought
                    </ThemedText>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 border-t border-[#E4E8EE] pt-4 md:grid-cols-3">
                  {['Live', 'Photo', 'Write note'].map((label) => (
                    <div key={label} className="flex items-center justify-center rounded-[20px] bg-[#F7F8FA] px-4 py-4">
                      <ThemedText as="p" className="text-base font-medium text-slate-900">{label}</ThemedText>
                    </div>
                  ))}
                </div>
              </section>

              <div className="flex gap-4 overflow-x-auto pb-1">
                {stories.map((item) => (
                  <div key={item.id} className={`${item.fill} min-w-[180px] overflow-hidden rounded-[28px] p-5`}>
                    <Avatar initials={item.initials} />
                    <div className="mt-24 space-y-1">
                      <ThemedText as="p" className="text-lg font-semibold text-white">{item.title}</ThemedText>
                      <ThemedText as="p" className="text-sm text-white/80">{item.time}</ThemedText>
                    </div>
                  </div>
                ))}
              </div>

              {posts.map((item) => (
                <section key={item.id} className={`${surfaceClass} p-5`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <Avatar initials={item.author.slice(0, 2).toUpperCase()} soft />
                      <div>
                        <ThemedText as="h2" className="text-[21px] font-semibold text-slate-950">{item.author}</ThemedText>
                        <ThemedText as="p" className="text-sm text-slate-500">{item.time}</ThemedText>
                      </div>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#F7F8FA] text-[#666666]">•••</div>
                  </div>
                  <ThemedText as="p" className="mt-6 text-[16px] leading-7 text-slate-700">{item.caption}</ThemedText>
                  <div className="mt-5 h-[220px] rounded-[28px] bg-[#F7F8FA]" />
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <ThemedText as="p" className="text-sm text-slate-500">{item.reactions}</ThemedText>
                    <ThemedText as="p" className="text-sm text-slate-500">{item.meta}</ThemedText>
                  </div>
                  <div className="mt-4 grid gap-3 border-t border-[#E4E8EE] pt-4 md:grid-cols-3">
                    {['Like', 'Comment', 'Share'].map((label) => (
                      <div key={label} className="flex items-center justify-center rounded-[20px] bg-[#F7F8FA] px-4 py-4">
                        <ThemedText as="p" className="text-base font-medium text-slate-900">{label}</ThemedText>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="space-y-4">
              <SectionCard title="Contacts" rightLabel="12 online">
                {contacts.map((item) => (
                  <div key={item.name} className="flex items-center gap-4 rounded-[22px] bg-[#F7F8FA] px-4 py-4">
                    <Avatar initials={item.initials} soft />
                    <div className="flex-1">
                      <ThemedText as="p" className="text-lg font-medium text-slate-900">{item.name}</ThemedText>
                      <ThemedText as="p" className="text-sm text-slate-500">{item.status}</ThemedText>
                    </div>
                    <div className="h-3 w-3 rounded-full bg-[#6FC18A]" />
                  </div>
                ))}
              </SectionCard>

              <section className={`${surfaceClass} p-5`}>
                <div className="inline-flex rounded-full bg-[#D9ECF8] px-3 py-2">
                  <ThemedText as="p" className="text-sm font-semibold text-slate-900">Tonight</ThemedText>
                </div>
                <ThemedText as="h2" className="mt-4 text-[24px] font-semibold leading-8 text-slate-950">
                  Prototype review with motion notes
                </ThemedText>
                <ThemedText as="p" className="mt-3 text-base text-slate-500">
                  18:30 - 19:15 | Riverside Studio 4
                </ThemedText>
                <button className="mt-5 rounded-[20px] bg-[#0A0A0A] px-5 py-4 text-base font-medium text-white" type="button">
                  View brief
                </button>
              </section>

              <SectionCard title="Messenger" rightLabel="3 unread">
                {inboxItems.map((item) => (
                  <div key={item.name} className="flex items-center gap-4 rounded-[22px] bg-[#F7F8FA] px-4 py-4">
                    <Avatar initials={item.initials} soft />
                    <div className="flex-1 space-y-1">
                      <ThemedText as="p" className="text-lg font-medium text-slate-900">{item.name}</ThemedText>
                      <ThemedText as="p" className="text-sm text-slate-500">{item.message}</ThemedText>
                    </div>
                    {item.unread ? <div className="h-3 w-3 rounded-full bg-[#4A9FD8]" /> : null}
                  </div>
                ))}
                <Link className="mt-2 block rounded-[22px] bg-[#0A0A0A] px-5 py-4 text-center text-base font-medium !text-white" href={ROUTES.inbox}>
                  Open inbox
                </Link>
              </SectionCard>
            </div>
          </div>
        </div>
      </main>
    </ProtectedPage>
  );
}
