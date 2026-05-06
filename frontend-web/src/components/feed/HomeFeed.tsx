'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';

import { ProtectedPage } from '@/components/app/ProtectedPage';
import { AppTopNav } from '@/components/navigation/AppTopNav';
import { ThemedText } from '@/components/ui/ThemedText';
import { ComposerCard } from '@/components/post/ComposerCard';
import { FeedPost } from '@/components/post/FeedPost';
import { fetchPosts, resolveAvatarUrl } from '@/lib/api';
import { fetchCurrentUser, type AuthUser } from '@/lib/auth';
import { ROUTES } from '@/lib/routes';
import type { Post } from '@/lib/types';

const shortcuts = [
  { label: 'Home', icon: 'home' },
  { label: 'Saved sets', icon: 'bookmark_border' },
  { label: 'Circle updates', icon: 'autorenew' },
];

const stories = [
  { id: '1', title: 'Morning run club', time: '2h ago', fill: 'bg-[#66D575]', initials: 'MN' },
  { id: '2', title: 'Desk setup refresh', time: '5h ago', fill: 'bg-[#874FFF]', initials: 'DS' },
  { id: '3', title: 'Client moodboard', time: 'Yesterday', fill: 'bg-[#F24822]', initials: 'KM' },
];

const contacts = [
  { id: 'am', name: 'Ari Mendoza', status: 'Editing new campaign', initials: 'AM', bio: 'Builds campaign systems and keeps launch assets moving.' },
  { id: 'ne', name: 'Nadia Elsner', status: 'Reviewing typography', initials: 'NE', bio: 'Writes crisp product copy and organizes review-ready profile content.' },
  { id: 'jt', name: 'Jules Tate', status: 'In Riverside Studio', initials: 'JT', bio: 'Supports studio sessions and visual coordination across teams.' },
  { id: 'oy', name: 'Owen Ybarra', status: 'Exporting review clips', initials: 'OY', bio: 'Handles review exports, clips, and last-mile production polish.' },
];

const inboxItems = [
  { id: 'rm', name: 'Rafi Mercer', message: 'Can you review the revised launch pacing?', initials: 'RM', bio: 'Focuses on motion pacing, interaction polish, and handoff clarity.', unread: true },
  { id: 'at', name: 'Aya Tran', message: 'Dropping sprint references in five minutes.', initials: 'AT', bio: 'Shapes visual systems and tightens typography for product launches.' },
  { id: 'ne', name: 'Nadia Elsner', message: 'Shared fresh type comps for the thread.', initials: 'NE', bio: 'Writes crisp product copy and organizes review-ready profile content.' },
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
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchPosts(1, 20);
      if (res) {
        setPosts(res.items || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser().then(setCurrentUser).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        void loadPosts();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadPosts]);

  const initials = currentUser 
    ? `${currentUser.first_name?.[0] || ''}${currentUser.last_name?.[0] || ''}`.toUpperCase()
    : 'LE';

  return (
    <ProtectedPage>
      <main className="min-h-screen bg-[#EDF1F5] pb-8">
        <div className="mx-auto w-full max-w-[1720px] px-4 pb-6 pt-4 md:px-6">
          <AppTopNav searchPlaceholder="Search users" currentUser={currentUser} />

          <div className="mt-4 grid gap-4 xl:grid-cols-[350px_minmax(0,1fr)_360px]">
            {/* Left Rail */}
            <div className="space-y-4">
              <ThemedText as="p" className="px-1 text-lg font-semibold text-slate-900">Shortcuts</ThemedText>
              {shortcuts.map((item) => (
                <div key={item.label} className="flex items-center gap-4 rounded-[22px] bg-[#F7F8FA] px-4 py-4 hover:bg-slate-100 transition-colors cursor-pointer">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#D9ECF8] text-[#4A9FD8]">
                    <span className="material-icons text-[22px]">{item.icon}</span>
                  </div>
                  <ThemedText as="p" className="text-lg font-medium text-slate-900">{item.label}</ThemedText>
                </div>
              ))}

              <section className={`${surfaceClass} overflow-hidden shadow-sm`}>
                <div className="h-[180px] bg-[#EAF4FB]" />
                <div className="px-5 pb-5">
                  <div className="-mt-8">
                    {currentUser?.avatar_url ? (
                      <Image src={resolveAvatarUrl(currentUser.avatar_url) as string} width={64} height={64} className="h-16 w-16 rounded-[22px] border-4 border-white shadow-sm object-cover" alt="Avatar" unoptimized />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border-4 border-white bg-[#EAF4FB] shadow-sm">
                        <ThemedText as="span" className="text-xl font-bold text-slate-950">{initials}</ThemedText>
                      </div>
                    )}
                  </div>
                  <ThemedText as="h2" className="mt-4 text-[28px] font-semibold text-slate-950">
                    {currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Lena Evere'}
                  </ThemedText>
                  <ThemedText as="p" className="mt-2 text-base leading-7 text-slate-600">
                    {currentUser?.bio || 'Leading product design at Northfeed, shaping calmer social tools for creative teams.'}
                  </ThemedText>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-[22px] bg-[#F7F8FA] px-4 py-4">
                      <ThemedText as="p" className="text-sm text-slate-500">Followers</ThemedText>
                      <ThemedText as="p" className="mt-1 text-xl font-semibold text-slate-950">2.4k</ThemedText>
                    </div>
                    <div className="rounded-[22px] bg-[#F7F8FA] px-4 py-4">
                      <ThemedText as="p" className="text-sm text-slate-500">Posts</ThemedText>
                      <ThemedText as="p" className="mt-1 text-xl font-semibold text-slate-950">14</ThemedText>
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <Link className="rounded-[22px] bg-[#0A0A0A] px-4 py-4 text-center text-base font-medium !text-white hover:bg-slate-800 transition-colors" href={ROUTES.profile}>
                      View profile
                    </Link>
                    <Link href="/profile/edit" className="rounded-[22px] bg-[#F7F8FA] px-4 py-4 text-center text-base font-medium text-slate-900 hover:bg-slate-200 transition-colors">
                      Edit intro
                    </Link>
                  </div>
                </div>
              </section>
            </div>

            {/* Center Feed */}
            <div className="space-y-4">
              <ComposerCard onPostCreated={loadPosts} currentUser={currentUser} />

              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {stories.map((item) => (
                  <div key={item.id} className={`${item.fill} min-w-[180px] cursor-pointer hover:opacity-95 transition-opacity overflow-hidden rounded-[28px] p-5 shadow-sm`}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-white/20 text-white">
                        <ThemedText as="span" className="text-xs font-bold">{item.initials}</ThemedText>
                    </div>
                    <div className="mt-24 space-y-1">
                      <ThemedText as="p" className="text-lg font-semibold text-white">{item.title}</ThemedText>
                      <ThemedText as="p" className="text-sm text-white/80">{item.time}</ThemedText>
                    </div>
                  </div>
                ))}
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center p-12 space-y-4">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#4A9FD8] border-t-transparent" />
                  <ThemedText as="p" className="text-slate-500">Đang tải bài viết...</ThemedText>
                </div>
              ) : posts.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[28px] border border-[#E4E8EE]">
                  <span className="material-icons text-slate-300 text-[48px]">article</span>
                  <ThemedText as="p" className="mt-4 text-slate-500 font-medium">Chưa có bài viết nào</ThemedText>
                </div>
              ) : (
                <div className="space-y-4">
                    {posts.map((item) => (
                        <FeedPost key={item.id} item={item} currentUser={currentUser} />
                    ))}
                </div>
              )}
            </div>

            {/* Right Rail */}
            <div className="space-y-4">
              <SectionCard title="Contacts" rightLabel="12 online">
                {contacts.map((item) => (
                  <Link
                    key={item.id}
                    className="flex items-center gap-4 rounded-[22px] bg-[#F7F8FA] px-4 py-4 transition hover:opacity-95"
                    href={ROUTES.profileDetail(item.id, {
                      name: item.name,
                      initials: item.initials,
                      preview: item.status,
                      bio: item.bio,
                    })}>
                    <Avatar initials={item.initials} soft />
                    <div className="flex-1">
                      <ThemedText as="p" className="text-lg font-medium text-slate-900">{item.name}</ThemedText>
                      <ThemedText as="p" className="text-sm text-slate-500">{item.status}</ThemedText>
                    </div>
                    <div className="h-3 w-3 rounded-full bg-[#6FC18A]" />
                  </Link>
                ))}
              </SectionCard>

              <section className={`${surfaceClass} p-5 shadow-sm`}>
                <div className="inline-flex rounded-full bg-[#D9ECF8] px-3 py-2">
                  <ThemedText as="p" className="text-sm font-semibold text-slate-900">Tonight</ThemedText>
                </div>
                <ThemedText as="h2" className="mt-4 text-[24px] font-semibold leading-8 text-slate-950">
                  Prototype review with motion notes
                </ThemedText>
                <ThemedText as="p" className="mt-3 text-base text-slate-500">
                  18:30 - 19:15 | Riverside Studio 4
                </ThemedText>
                <button className="mt-5 rounded-[20px] bg-[#0A0A0A] px-6 py-4 text-base font-medium text-white hover:bg-slate-800 transition-colors" type="button">
                  View brief
                </button>
              </section>

              <SectionCard title="Messenger" rightLabel="3 unread">
                {inboxItems.map((item) => (
                  <Link
                    key={item.id}
                    className="flex items-center gap-4 rounded-[22px] bg-[#F7F8FA] px-4 py-4 transition hover:opacity-95"
                    href={ROUTES.profileDetail(item.id, {
                      name: item.name,
                      initials: item.initials,
                      preview: item.message,
                      bio: item.bio,
                    })}>
                    <Avatar initials={item.initials} soft />
                    <div className="flex-1 space-y-1">
                      <ThemedText as="p" className="text-lg font-medium text-slate-900">{item.name}</ThemedText>
                      <ThemedText as="p" className="text-sm text-slate-500 line-clamp-1">{item.message}</ThemedText>
                    </div>
                    {item.unread ? <div className="h-3 w-3 rounded-full bg-[#4A9FD8]" /> : null}
                  </Link>
                ))}
                <Link className="mt-2 block rounded-[22px] bg-[#0A0A0A] px-5 py-4 text-center text-base font-medium !text-white hover:bg-slate-800 transition-colors" href={ROUTES.inbox}>
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
