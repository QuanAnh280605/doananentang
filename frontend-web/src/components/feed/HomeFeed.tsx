'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ProtectedPage } from '@/components/app/ProtectedPage';
import { AppTopNav } from '@/components/navigation/AppTopNav';
import { ThemedText } from '@/components/ui/ThemedText';
import { fetchPosts, deletePost, API_URL } from '@/lib/api';
import { fetchCurrentUser, type AuthUser } from '@/lib/auth';
import { ROUTES } from '@/lib/routes';
import type { Post } from '@/lib/types';

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

function Avatar({ initials, soft = false, avatarUrl }: { initials: string; soft?: boolean; avatarUrl?: string | null }) {
  if (avatarUrl) {
    const uri = avatarUrl.startsWith('http') ? avatarUrl : `${API_URL}${avatarUrl}`;
    return (
      <img 
        src={uri} 
        alt="Avatar"
        className="h-14 w-14 shrink-0 rounded-[22px] object-cover"
      />
    );
  }
  return (
    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] ${soft ? 'bg-[#D9ECF8]' : 'bg-[#EAF4FB]'}`}>
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

  useEffect(() => {
    let mounted = true;
    
    fetchCurrentUser()
      .then(user => { if (mounted) setCurrentUser(user); })
      .catch(() => {});

    fetchPosts(1, 10)
      .then((res) => {
        if (mounted && res) {
          setPosts(res.items || []);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Bạn có chắc muốn xóa bài viết này?')) return;
    try {
      await deletePost(postId);
      setPosts(current => current.filter(p => p.id !== postId));
    } catch (err) {
      alert('Không thể xóa bài viết. Vui lòng thử lại.');
    }
  };

  // Format time helper
  const formatTime = (isoStr: string) => {
    const diff = Date.now() - new Date(isoStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return `${Math.floor(hours / 24)} ngày trước`;
  };
  return (
    <ProtectedPage>
      <main className="min-h-screen bg-[#EDF1F5] pb-8">
        <div className="mx-auto w-full max-w-[1720px] px-4 pb-6 pt-4 md:px-6">
          <AppTopNav currentUser={currentUser} />

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

              {loading ? (
                <div className="flex justify-center p-8"><ThemedText as="p">Loading...</ThemedText></div>
              ) : posts.length === 0 ? (
                <div className="flex justify-center p-8"><ThemedText as="p">No posts yet.</ThemedText></div>
              ) : (
                posts.map((item) => {
                  const authorName = `${item.author.first_name} ${item.author.last_name}`;
                  const initials = `${item.author.first_name?.[0] || ''}${item.author.last_name?.[0] || ''}`.toUpperCase();
                  const firstMediaUrl = item.media && item.media.length > 0
                    ? (item.media[0].file_url.startsWith('http') ? item.media[0].file_url : `${API_URL}${item.media[0].file_url}`)
                    : null;

                  const isAuthor = currentUser?.id.toString() === String(item.author_id) || currentUser?.id.toString() === String(item.author?.id);

                  return (
                    <section key={item.id} className={`${surfaceClass} p-5`}>
                      <div className="flex items-start justify-between gap-4">
                        <Link href="/profile" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                          <Avatar initials={initials} soft avatarUrl={item.author.avatar_url} />
                          <div>
                            <ThemedText as="h2" className="text-[21px] font-semibold text-slate-950">{authorName}</ThemedText>
                            <ThemedText as="p" className="text-sm text-slate-500">{formatTime(item.created_at)}</ThemedText>
                          </div>
                        </Link>
                        {isAuthor ? (
                          <button onClick={() => handleDeletePost(item.id)} className="flex h-10 px-4 items-center justify-center rounded-[14px] bg-red-50 text-red-500 font-medium">Xóa</button>
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#F7F8FA] text-[#666666]">•••</div>
                        )}
                      </div>
                      <ThemedText as="p" className="mt-6 text-[16px] leading-7 text-slate-700">{item.content}</ThemedText>

                      {firstMediaUrl && (
                        <div className="mt-5 overflow-hidden rounded-[28px] bg-[#F7F8FA]">
                          <img
                            src={firstMediaUrl}
                            alt="Post media"
                            style={{ width: '100%', maxHeight: '800px', objectFit: 'contain' }}
                          />
                        </div>
                      )}

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <ThemedText as="p" className="text-sm text-slate-500">{item.like_count} reactions</ThemedText>
                        <ThemedText as="p" className="text-sm text-slate-500">{item.comment_count} comments</ThemedText>
                      </div>
                      <div className="mt-4 grid gap-3 border-t border-[#E4E8EE] pt-4 md:grid-cols-3">
                        <div className={`flex items-center justify-center rounded-[20px] px-4 py-4 cursor-pointer ${item.is_liked ? 'bg-red-50 text-red-500' : 'bg-[#F7F8FA] text-slate-900'}`}>
                          <ThemedText as="p" className="text-base font-medium">Like</ThemedText>
                        </div>
                        <Link href={`/post/${item.id}`} className="flex items-center justify-center rounded-[20px] bg-[#F7F8FA] px-4 py-4 cursor-pointer">
                          <ThemedText as="p" className="text-base font-medium text-slate-900">Comment</ThemedText>
                        </Link>
                        <div className="flex items-center justify-center rounded-[20px] bg-[#F7F8FA] px-4 py-4 cursor-pointer">
                          <ThemedText as="p" className="text-base font-medium text-slate-900">Share</ThemedText>
                        </div>
                      </div>
                    </section>
                  );
                })
              )}
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
