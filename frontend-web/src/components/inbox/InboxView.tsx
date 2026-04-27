'use client';

import { useState } from 'react';

import { ProtectedPage } from '@/components/app/ProtectedPage';
import { InboxListItem, type InboxListItemData } from '@/components/inbox/InboxListItem';
import { MessageBubble, type MessageBubbleData } from '@/components/inbox/MessageBubble';
import { ProfilePanelStat, type ProfilePanelStatData } from '@/components/inbox/ProfilePanelStat';
import { AppTopNav } from '@/components/navigation/AppTopNav';
import { SearchInput } from '@/components/ui/SearchInput';
import { ThemedText } from '@/components/ui/ThemedText';
import { ROUTES } from '@/lib/routes';

const threads: InboxListItemData[] = [
  { id: '1', name: 'Lena Evere', preview: 'Updated the final review deck and moved three comments into the handoff.', time: '09:24', initials: 'LE', bio: 'Leads launch reviews and keeps the team aligned on calmer product details.', active: true, unread: 2 },
  { id: '2', name: 'Aya Tran', preview: 'I left the typography notes in the thread for round two.', time: '08:10', initials: 'AT', bio: 'Shapes visual systems and tightens typography for product launches.' },
  { id: '3', name: 'Rafi Mercer', preview: 'Need one more pass on the motion pacing before sign-off.', time: 'Yesterday', initials: 'RM', bio: 'Focuses on motion pacing, interaction polish, and handoff clarity.' },
  { id: '4', name: 'Nadia Elsner', preview: 'Profile rail content is ready whenever you want to swap copy.', time: 'Yesterday', initials: 'NE', bio: 'Writes crisp product copy and organizes profile content for review.' },
];

const messages: MessageBubbleData[] = [
  { id: '1', body: 'Morning. I tightened the final deck and grouped the open notes by launch priority.', time: '09:14', incoming: true },
  { id: '2', body: 'Looks calmer already. I want to keep the left rail dense, but the center column can breathe more.', time: '09:18' },
  { id: '3', body: 'Agreed. I also pulled the profile module into fewer blocks so the right side reads faster on mobile.', time: '09:20', incoming: true },
  { id: '4', body: 'Perfect. Ship this static frame first and we can wire the states after design review.', time: '09:24' },
];

const profileDetails: ProfilePanelStatData[] = [
  { label: 'Role', value: 'Product Design Lead' },
  { label: 'Team', value: 'Northfeed Studio' },
  { label: 'Timezone', value: 'GMT+7' },
  { label: 'Response', value: 'Usually within 1 hour' },
];

const quickActions = ['View brief', 'Shared files', 'Mute thread'];
const surfaceClass = 'rounded-[28px] border border-[#E2E8F0] bg-white';

export function InboxView() {
  const [inboxNavSearchQuery, setInboxNavSearchQuery] = useState('');
  const [inboxSearchQuery, setInboxSearchQuery] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const normalizedInboxSearchQuery = inboxSearchQuery.trim().toLowerCase();
  const filteredThreads = threads.filter((item) => {
    if (!normalizedInboxSearchQuery) {
      return true;
    }

    return (
      item.name.toLowerCase().includes(normalizedInboxSearchQuery) ||
      item.preview.toLowerCase().includes(normalizedInboxSearchQuery)
    );
  });

  return (
    <ProtectedPage>
      <main className="min-h-screen bg-[#F8FAFC] pb-8">
        <div className="mx-auto w-full max-w-[1720px] px-4 pb-6 pt-4 md:px-6">
          <AppTopNav
            onSearchChange={setInboxNavSearchQuery}
            searchPlaceholder="Search inbox threads, files, or people"
            searchValue={inboxNavSearchQuery}
          />
          <div className="mt-4 grid gap-4 xl:grid-cols-[336px_minmax(0,1fr)_248px]">
            <section className={`${surfaceClass} p-5`}>
              <ThemedText as="h1" className="text-[24px] font-semibold text-slate-950">Inbox</ThemedText>
              <ThemedText as="p" className="mt-1 text-sm text-slate-500">Priority threads and recent updates</ThemedText>
              <SearchInput className="mt-5" onChange={setInboxSearchQuery} placeholder="Search users" value={inboxSearchQuery} />
              <div className="mt-4 space-y-3">
                {filteredThreads.map((item) => (
                  <InboxListItem
                    key={item.id}
                    href={ROUTES.profileDetail(item.id, {
                      name: item.name,
                      initials: item.initials,
                      preview: item.preview,
                      bio: item.bio ?? item.preview,
                    })}
                    item={item}
                  />
                ))}
              </div>
            </section>

            <section className={`${surfaceClass} p-5`}>
              <ThemedText as="h2" className="text-[24px] font-semibold text-slate-950">Conversation</ThemedText>
              <ThemedText as="p" className="mt-1 text-sm text-slate-500">Lena Evere · Final review deck</ThemedText>
              <div className="mt-5 flex items-center justify-between gap-3 rounded-[24px] bg-[#F8FAFC] px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#DBEAFE]"><span className="text-sm font-semibold tracking-[0.6px] text-slate-900">LE</span></div>
                  <div>
                    <ThemedText as="p" className="text-base font-semibold text-slate-950">Lena Evere</ThemedText>
                    <ThemedText as="p" className="text-sm text-slate-500">Active 4 min ago</ThemedText>
                  </div>
                </div>
                <button className="rounded-[18px] bg-white px-4 py-3 text-sm font-semibold text-slate-900" type="button">Call</button>
              </div>
              <div className="mt-4 flex min-h-[360px] flex-col rounded-[28px] bg-[#FCFDFE] px-4 py-4">
                <div className="flex flex-1 flex-col gap-4">{messages.map((item) => <MessageBubble key={item.id} item={item} />)}</div>
              </div>
              <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                <textarea className="min-h-[72px] w-full resize-none bg-transparent text-base leading-6 text-slate-900 outline-none" onChange={(event) => setDraftMessage(event.target.value)} placeholder="Write a reply..." value={draftMessage} />
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
                  <div className="flex items-center gap-2 text-[#475569]">
                    <button className="h-11 w-11 rounded-[18px] bg-white" type="button">+</button>
                    <button className="h-11 w-11 rounded-[18px] bg-white" type="button">◎</button>
                    <button className="h-11 w-11 rounded-[18px] bg-white" type="button">◉</button>
                  </div>
                  <button className="rounded-[18px] bg-slate-900 px-5 py-3 text-sm font-semibold text-white" type="button">Send</button>
                </div>
              </div>
            </section>

            <section className={`${surfaceClass} p-5`}>
              <ThemedText as="h2" className="text-[24px] font-semibold text-slate-950">Profile</ThemedText>
              <ThemedText as="p" className="mt-1 text-sm text-slate-500">Context and quick actions</ThemedText>
              <div className="mt-5 space-y-4">
                <div className="overflow-hidden rounded-[24px] bg-[#DBEAFE]">
                  <div className="h-[120px] bg-[#BFDBFE]" />
                  <div className="px-4 pb-4">
                    <div className="-mt-6 flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#E2E8F0] text-sm font-semibold tracking-[0.6px] text-slate-900">LE</div>
                    <ThemedText as="h3" className="mt-4 text-[24px] font-semibold text-slate-950">Lena Evere</ThemedText>
                    <ThemedText as="p" className="mt-2 text-sm leading-6 text-slate-600">Leads the launch review stream and keeps the team aligned on calmer product details.</ThemedText>
                  </div>
                </div>
                <div className="space-y-3">{quickActions.map((label) => <button key={label} className="flex w-full items-center justify-between rounded-[22px] bg-[#F8FAFC] px-4 py-4 text-base font-medium text-slate-900" type="button">{label}<span className="text-[#94A3B8]">›</span></button>)}</div>
                <div className="space-y-3">{profileDetails.map((item) => <ProfilePanelStat key={item.label} item={item} />)}</div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </ProtectedPage>
  );
}
