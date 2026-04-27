'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';

import { ProtectedPage } from '@/components/app/ProtectedPage';
import { AppTopNav } from '@/components/navigation/AppTopNav';
import { ThemedText } from '@/components/ui/ThemedText';
import { ComposerCard } from '@/components/post/ComposerCard';
import { FeedPost } from '@/components/post/FeedPost';
import { PostDetailModal } from '@/components/post/PostDetailModal';
import { fetchPosts, API_URL } from '@/lib/api';
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

const surfaceClass = 'rounded-[32px] border border-slate-200/60 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.02)]';

function SectionCard({ title, rightLabel, children }: { title: string; rightLabel?: string; children: React.ReactNode }) {
  return (
    <section className={`${surfaceClass} p-6`}>
      <div className="flex items-center justify-between gap-3 px-1">
        <ThemedText as="h2" className="text-[20px] font-bold text-slate-950 tracking-tight">
          {title}
        </ThemedText>
        {rightLabel ? <ThemedText as="p" className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">{rightLabel}</ThemedText> : null}
      </div>
      <div className="mt-5 space-y-3">{children}</div>
    </section>
  );
}

export function HomeFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

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

  const [userPostCount, setUserPostCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    fetchCurrentUser().then(user => {
      if (isMounted) {
        setCurrentUser(user);
        if (user) {
          fetchPosts(1, 1, user.id).then(res => {
            if (isMounted) setUserPostCount(res.total || 0);
          });
        }
      }
    }).catch(() => { });
    loadPosts();
    return () => { isMounted = false; };
  }, [loadPosts]);

  const initials = currentUser
    ? `${currentUser.first_name?.[0] || ''}${currentUser.last_name?.[0] || ''}`.toUpperCase()
    : 'LE';

  return (
    <ProtectedPage>
      <main className="min-h-screen bg-[#F8FAFC] pb-12">
        {selectedPostId && (
          <PostDetailModal
            postId={selectedPostId}
            onClose={() => setSelectedPostId(null)}
            currentUser={currentUser}
          />
        )}
        <div className="mx-auto w-full max-w-[1720px] px-4 pb-6 pt-4 md:px-6">
          <AppTopNav currentUser={currentUser} />

          <div className="mt-4 grid gap-4 xl:grid-cols-[350px_minmax(0,1fr)_360px]">
            {/* Left Rail */}
            <div className="space-y-5">
              <ThemedText as="p" className="px-2 text-[13px] font-bold text-slate-400 uppercase tracking-[0.15em]">Shortcuts</ThemedText>
              <div className="space-y-3">
                {shortcuts.map((item) => (
                  <div key={item.label} className="flex items-center gap-4 rounded-[24px] bg-white border border-slate-100 p-4 hover:border-slate-200 hover:shadow-md transition-all duration-300 cursor-pointer group">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-slate-50 text-slate-400 group-hover:bg-[#EAF4FB] group-hover:text-[#4A9FD8] transition-colors">
                      <span className="material-icons text-[22px]">{item.icon}</span>
                    </div>
                    <ThemedText as="p" className="text-[16px] font-bold text-slate-950 tracking-tight">{item.label}</ThemedText>
                  </div>
                ))}
              </div>

              <section className={`${surfaceClass} overflow-hidden`}>
                <div className="h-[160px] bg-gradient-to-br from-[#EAF4FB] to-[#D9ECF8]" />
                <div className="px-6 pb-6">
                  <div className="-mt-10">
                    {currentUser?.avatar_url ? (
                      <img
                        src={currentUser.avatar_url.startsWith('http') ? currentUser.avatar_url : `${API_URL}${currentUser.avatar_url}`}
                        className="h-20 w-20 rounded-[24px] border-[5px] border-white shadow-xl object-cover"
                        alt="Avatar"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-[24px] border-[5px] border-white bg-[#EAF4FB] shadow-xl">
                        <ThemedText as="span" className="text-2xl font-bold text-slate-950">{initials}</ThemedText>
                      </div>
                    )}
                  </div>
                  <ThemedText as="h2" className="mt-5 text-[26px] font-bold text-slate-950 tracking-tight">
                    {currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Lena Evere'}
                  </ThemedText>
                  <ThemedText as="p" className="mt-2.5 text-[15px] leading-relaxed text-slate-500 font-medium">
                    {currentUser?.bio || 'Chưa có tiểu sử giới thiệu.'}
                  </ThemedText>
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="rounded-[24px] bg-slate-50 p-4 border border-slate-100">
                      <ThemedText as="p" className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Followers</ThemedText>
                      <ThemedText as="p" className="mt-1 text-[19px] font-bold text-slate-950">0</ThemedText>
                    </div>
                    <div className="rounded-[24px] bg-slate-50 p-4 border border-slate-100">
                      <ThemedText as="p" className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Posts</ThemedText>
                      <ThemedText as="p" className="mt-1 text-[19px] font-bold text-slate-950">{userPostCount}</ThemedText>
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <Link className="rounded-[20px] bg-slate-950 px-4 py-4 text-center text-[15px] font-bold !text-white hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-950/10" href={ROUTES.profile}>
                      View profile
                    </Link>
                    <Link href="/profile/edit" className="rounded-[20px] bg-slate-50 px-4 py-4 text-center text-[15px] font-bold text-slate-900 border border-slate-100 hover:bg-slate-100 transition-all active:scale-95">
                      Edit profile
                    </Link>
                  </div>
                </div>
              </section>
            </div>

            {/* Center Feed */}
            <div className="space-y-6">
              <ComposerCard onPostCreated={loadPosts} currentUser={currentUser} />

              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {stories.map((item) => (
                  <div key={item.id} className={`${item.fill} min-w-[200px] cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 overflow-hidden rounded-[32px] p-6 shadow-sm relative group`}>
                    <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-white/20 backdrop-blur-md text-white border border-white/20 group-hover:bg-white/30 transition-colors">
                      <ThemedText as="span" className="text-[13px] font-bold">{item.initials}</ThemedText>
                    </div>
                    <div className="mt-28 space-y-1 relative z-10">
                      <ThemedText as="p" className="text-[17px] font-bold text-white tracking-tight leading-tight">{item.title}</ThemedText>
                      <ThemedText as="p" className="text-[12px] font-bold text-white/70 uppercase tracking-wider">{item.time}</ThemedText>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                  </div>
                ))}
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center p-16 space-y-4">
                  <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#4A9FD8] border-t-transparent" />
                  <ThemedText as="p" className="text-[15px] font-medium text-slate-400">Refreshing your feed...</ThemedText>
                </div>
              ) : posts.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 bg-white rounded-[32px] border border-slate-200/60 shadow-sm">
                  <div className="h-20 w-20 flex items-center justify-center rounded-[28px] bg-slate-50 mb-6">
                    <span className="material-icons text-slate-300 text-[36px]">article</span>
                  </div>
                  <ThemedText as="p" className="text-slate-400 font-bold text-lg">No posts yet</ThemedText>
                  <ThemedText as="p" className="text-slate-400 text-sm mt-1">Start by sharing your first update!</ThemedText>
                </div>
              ) : (
                <div className="space-y-6">
                  {posts.map((item) => (
                    <FeedPost
                      key={item.id}
                      item={item}
                      currentUser={currentUser}
                      onPostClick={(id) => setSelectedPostId(id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right Rail */}
            <div className="space-y-5">
              <SectionCard title="Contacts" rightLabel="12 online">
                {contacts.map((item) => (
                  <div key={item.name} className="flex items-center gap-4 rounded-[24px] bg-white border border-slate-100 p-4 hover:border-slate-200 hover:shadow-md transition-all duration-300 cursor-pointer group">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-slate-50 text-slate-900 font-bold group-hover:bg-[#EAF4FB] transition-colors">
                      {item.initials}
                    </div>
                    <div className="flex-1">
                      <ThemedText as="p" className="text-[16px] font-bold text-slate-950 tracking-tight">{item.name}</ThemedText>
                      <ThemedText as="p" className="text-[13px] font-medium text-slate-400">{item.status}</ThemedText>
                    </div>
                    <div className="h-2.5 w-2.5 rounded-full bg-[#6FC18A] border-2 border-white ring-1 ring-slate-100" />
                  </div>
                ))}
              </SectionCard>

              <section className={`${surfaceClass} p-6 overflow-hidden relative group`}>
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <span className="material-icons text-[64px]">event</span>
                </div>
                <div className="inline-flex rounded-full bg-[#EAF4FB] px-3 py-1.5 border border-[#D9ECF8]">
                  <ThemedText as="p" className="text-[11px] font-bold text-[#4A9FD8] uppercase tracking-wider">Tonight</ThemedText>
                </div>
                <ThemedText as="h2" className="mt-5 text-[22px] font-bold leading-tight text-slate-950 tracking-tight">
                  Prototype review with motion notes
                </ThemedText>
                <div className="mt-4 flex items-center gap-2 text-slate-400">
                  <span className="material-icons text-[18px]">schedule</span>
                  <ThemedText as="p" className="text-[14px] font-medium">
                    18:30 - 19:15 | Riverside Studio 4
                  </ThemedText>
                </div>
                <button className="mt-6 w-full rounded-[20px] bg-slate-950 px-6 py-4 text-[15px] font-bold text-white hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-950/10" type="button">
                  View brief
                </button>
              </section>

              <SectionCard title="Messenger" rightLabel="3 unread">
                {inboxItems.map((item) => (
                  <div key={item.name} className="flex items-center gap-4 rounded-[24px] bg-white border border-slate-100 p-4 hover:border-slate-200 hover:shadow-md transition-all duration-300 cursor-pointer group">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-slate-50 text-slate-950 font-bold group-hover:bg-[#EAF4FB] transition-colors">
                      {item.initials}
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <ThemedText as="p" className="text-[16px] font-bold text-slate-950 tracking-tight">{item.name}</ThemedText>
                      <ThemedText as="p" className="text-[13px] font-medium text-slate-400 line-clamp-1 group-hover:text-slate-500 transition-colors">{item.message}</ThemedText>
                    </div>
                    {item.unread ? <div className="h-2.5 w-2.5 rounded-full bg-[#4A9FD8] shadow-[0_0_10px_rgba(74,159,216,0.5)]" /> : null}
                  </div>
                ))}
                <Link className="mt-4 block rounded-[20px] bg-slate-950 px-5 py-4 text-center text-[15px] font-bold !text-white hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-950/10" href={ROUTES.inbox}>
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
