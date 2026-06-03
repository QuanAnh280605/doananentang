'use client';

import { Article } from '@phosphor-icons/react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';

import { ProtectedPage } from '@/components/app/ProtectedPage';
import { AppTopNav } from '@/components/navigation/AppTopNav';
import { ThemedText } from '@/components/ui/ThemedText';
import { elevatedSurfaceClass } from '@/components/ui/design-system';
import { ComposerCard } from '@/components/post/ComposerCard';
import { FeedPost } from '@/components/post/FeedPost';
import { PostDetailModal } from '@/components/post/PostDetailModal';
import { CreateStoryModal } from '@/components/story/CreateStoryModal';
import { StoryStrip } from '@/components/story/StoryStrip';
import { StoryViewerModal } from '@/components/story/StoryViewerModal';
import { mapApiStoryToStoryItem, type StoryItem } from '@/components/story/storyState';
import { API_URL, fetchPosts, fetchStories, markStoryViewed, resolveAvatarUrl } from '@/lib/api';
import { fetchCurrentUser, fetchFollowStatus, type AuthUser } from '@/lib/auth';
import { listDirectChats } from '@/lib/chat';
import type { InboxThreadData } from '@/lib/chat.types';
import { patchPostMetrics as patchPostMetricsInFeed } from '@/lib/postMetrics';
import { ROUTES } from '@/lib/routes';
import type { Post } from '@/lib/types';

function buildInitials(firstName?: string | null, lastName?: string | null): string {
  return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || 'US';
}

function UserAvatar({ user, initials }: { user: { avatar_url: string | null }; initials: string }) {
  const avatarUrl = resolveAvatarUrl(user.avatar_url);

  if (avatarUrl) {
    return <img src={avatarUrl} alt="Avatar" className="h-11 w-11 rounded-[14px] object-cover" />;
  }

  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-slate-50 text-slate-900 font-bold group-hover:bg-[#EAF4FB] transition-colors">
      {initials}
    </div>
  );
}

const surfaceClass = elevatedSurfaceClass;

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

function MessengerRow({ item }: { item: InboxThreadData }) {
  const isGroup = item.isGroup === true;

  if (isGroup) {
    const groupName = item.groupName || 'Nhóm Trò Chuyện';
    const initials = groupName.slice(0, 2).toUpperCase();

    return (
      <Link
        href={`/inbox?chatId=${item.chatId}`}
        className="flex items-center gap-4 rounded-[24px] border border-slate-100 bg-white p-4 transition-all duration-300 hover:border-slate-200 hover:shadow-md group"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-[#DBEAFE]">
          {item.avatarUrl ? (
            <img alt={groupName} className="h-full w-full object-cover" src={item.avatarUrl.startsWith('http') ? item.avatarUrl : `${API_URL}${item.avatarUrl}`} />
          ) : (
            <span className="text-sm font-semibold tracking-[0.6px] text-slate-900">{initials}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <ThemedText as="p" className="truncate text-[16px] font-bold tracking-tight text-slate-950">{groupName}</ThemedText>
          <ThemedText as="p" className="truncate text-[13px] font-medium text-slate-400">{item.preview || `${item.memberCount || '—'} thành viên`}</ThemedText>
        </div>
      </Link>
    );
  }

  if (!item.user) return null;

  const initials = buildInitials(item.user.first_name, item.user.last_name);

  return (
    <Link
      href={`/inbox?userId=${item.user.id}`}
      className="flex items-center gap-4 rounded-[24px] border border-slate-100 bg-white p-4 transition-all duration-300 hover:border-slate-200 hover:shadow-md group"
    >
      <UserAvatar user={item.user} initials={initials} />
      <div className="min-w-0 flex-1">
        <ThemedText as="p" className="truncate text-[16px] font-bold tracking-tight text-slate-950">{item.user.full_name}</ThemedText>
        <ThemedText as="p" className="truncate text-[13px] font-medium text-slate-400">{item.preview}</ThemedText>
      </div>
    </Link>
  );
}

function RightRail({ currentUser }: { currentUser: AuthUser | null }) {
  const [threads, setThreads] = useState<InboxThreadData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!currentUser) {
      return () => {
        isMounted = false;
      };
    }

    queueMicrotask(() => {
      if (!isMounted) return;
      setLoading(true);
      setError(null);
    });

    void listDirectChats()
      .then((directThreads) => {
        if (!isMounted) return;
        setThreads(directThreads.slice(0, 3));
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu liên hệ');
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  return (
    <div className="space-y-5">
      <SectionCard title="Messenger" rightLabel={loading ? 'Loading' : `${threads.length} threads`}>
        {loading ? (
          <ThemedText as="p" className="text-[14px] font-medium text-slate-400">Đang tải hội thoại...</ThemedText>
        ) : error ? (
          <ThemedText as="p" className="text-[14px] font-medium text-red-500">{error}</ThemedText>
        ) : threads.length === 0 ? (
          <ThemedText as="p" className="text-[14px] font-medium text-slate-400">Chưa có hội thoại nào.</ThemedText>
        ) : (
          threads.map((item) => <MessengerRow key={item.id} item={item} />)
        )}

        <Link href={ROUTES.inbox} className="mt-2 block rounded-[22px] bg-[#0A0A0A] px-5 py-4 text-center text-[14px] font-bold !text-white transition-all hover:bg-slate-800 active:scale-95">
          Open inbox
        </Link>
      </SectionCard>
    </div>
  );
}

export function HomeFeed() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const postIdFromUrl = searchParams.get('postId');

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(postIdFromUrl);
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);

  // Infinite scroll state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 10;

  // Followers count
  const [followersCount, setFollowersCount] = useState(0);

  const handleClosePostModal = useCallback(() => {
    setSelectedPostId(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('postId');
    const newUrl = params.toString() ? `${pathname}?${params}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [pathname, searchParams, router]);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setCurrentPage(1);
    setHasMore(true);
    try {
      const res = await fetchPosts(1, PAGE_SIZE);
      if (res) {
        setPosts(res.items || []);
        setHasMore((res.items?.length ?? 0) >= PAGE_SIZE && res.total > PAGE_SIZE);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const res = await fetchPosts(nextPage, PAGE_SIZE);
      if (res && res.items && res.items.length > 0) {
        setPosts((prev) => [...prev, ...res.items]);
        setCurrentPage(nextPage);
        setHasMore(res.items.length >= PAGE_SIZE && nextPage * PAGE_SIZE < res.total);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  }, [currentPage, hasMore, loadingMore]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingMore && !loading) {
          void loadMorePosts();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, loadMorePosts]);

  const patchPostMetrics = useCallback((postId: number, patch: Partial<Pick<Post, 'like_count' | 'comment_count' | 'is_liked'>>) => {
    setPosts((currentPosts) => patchPostMetricsInFeed(currentPosts, String(postId), patch));
  }, []);

  const [userPostCount, setUserPostCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    void fetchPosts(1, PAGE_SIZE)
      .then((res) => {
        if (isMounted) {
          setPosts(res.items || []);
          setHasMore((res.items?.length ?? 0) >= PAGE_SIZE && res.total > PAGE_SIZE);
        }
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    fetchCurrentUser().then(user => {
      if (isMounted) {
        setCurrentUser(user);
        if (user) {
          fetchPosts(1, 1, user.id).then(res => {
            if (isMounted) setUserPostCount(res.total || 0);
          });
          // Lấy số followers thực từ API
          fetchFollowStatus(user.id).then(status => {
            if (isMounted) setFollowersCount(status.followers_count);
          }).catch(() => { });
        }
      }
    }).catch(() => { });

    fetchStories()
      .then((response) => {
        if (isMounted) {
          setStories(response.map((story) => mapApiStoryToStoryItem(story, API_URL)));
        }
      })
      .catch((err) => {
        console.error(err);
      });

    return () => { isMounted = false; };
  }, [loadPosts]);

  const initials = currentUser
    ? `${currentUser.first_name?.[0] || ''}${currentUser.last_name?.[0] || ''}`.toUpperCase()
    : 'LE';

  const handleCreateStory = (story: StoryItem) => {
    setStories((currentStories) => [story, ...currentStories.filter((item) => item.id !== story.id)]);
  };

  const handleOpenStory = useCallback((storyId: string) => {
    setSelectedStoryId(storyId);

    void markStoryViewed(storyId)
      .then((status) => {
        setStories((currentStories) => currentStories.map((story) => {
          if (story.id !== storyId) return story;

          return {
            ...story,
            isViewed: true,
            timeLabel: 'Đã xem',
            viewCount: status.view_count,
          };
        }));
      })
      .catch((err: unknown) => {
        console.error(err);
      });
  }, []);

  return (
    <ProtectedPage>
      <main className="min-h-screen bg-[#F8FAFC] pb-12">
        {isCreateStoryOpen && (
          <CreateStoryModal
            currentUser={currentUser}
            onClose={() => setIsCreateStoryOpen(false)}
            onCreateStory={handleCreateStory}
          />
        )}
        {selectedStoryId && (
          <StoryViewerModal
            currentUser={currentUser}
            onClose={() => setSelectedStoryId(null)}
            onSelectStory={handleOpenStory}
            selectedStoryId={selectedStoryId}
            stories={stories}
          />
        )}
        {selectedPostId && (
          <PostDetailModal
            postId={selectedPostId}
            onClose={handleClosePostModal}
            currentUser={currentUser}
            onPostMetricsChange={patchPostMetrics}
          />
        )}
        <div className="mx-auto w-full max-w-[1720px] px-4 pb-6 pt-4 md:px-6">
          <AppTopNav searchPlaceholder="Search users" currentUser={currentUser} />

          <div className="mt-4 grid gap-4 xl:grid-cols-[350px_minmax(0,1fr)_360px]">
            {/* Left Rail */}
            <div className="space-y-4">
              <section className={`${surfaceClass} overflow-hidden`}>
                {/* Banner */}
                <div className="h-[120px] bg-gradient-to-br from-[#EAF4FB] to-[#D9ECF8]" />
                <div className="px-5 pb-5">
                  <div className="-mt-10">
                    {currentUser?.avatar_url ? (
                      <img
                        src={resolveAvatarUrl(currentUser.avatar_url) as string}
                        className="h-20 w-20 rounded-[24px] border-[5px] border-white shadow-xl object-cover"
                        alt="Avatar"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-[24px] border-[5px] border-white bg-[#EAF4FB] shadow-xl">
                        <ThemedText as="span" className="text-2xl font-bold text-slate-950">{initials}</ThemedText>
                      </div>
                    )}
                  </div>
                  <ThemedText as="h2" className="mt-4 text-[22px] font-bold text-slate-950 tracking-tight">
                    {currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Lena Evere'}
                  </ThemedText>
                  <ThemedText as="p" className="mt-2 text-[14px] leading-relaxed text-slate-500">
                    {currentUser?.bio || 'Chưa có tiểu sử giới thiệu.'}
                  </ThemedText>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-[20px] bg-slate-50 p-4 border border-slate-100">
                      <ThemedText as="p" className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Followers</ThemedText>
                      <ThemedText as="p" className="mt-1 text-[22px] font-bold text-slate-950">{followersCount}</ThemedText>
                    </div>
                    <div className="rounded-[20px] bg-slate-50 p-4 border border-slate-100">
                      <ThemedText as="p" className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Posts</ThemedText>
                      <ThemedText as="p" className="mt-1 text-[22px] font-bold text-slate-950">{userPostCount}</ThemedText>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Link className="rounded-[18px] bg-slate-950 px-4 py-3.5 text-center text-[14px] font-bold !text-white hover:bg-slate-800 transition-all active:scale-95" href={ROUTES.profile}>
                      View profile
                    </Link>
                    <Link href="/profile/edit" className="rounded-[18px] bg-slate-50 px-4 py-3.5 text-center text-[14px] font-bold text-slate-900 border border-slate-100 hover:bg-slate-100 transition-all active:scale-95">
                      Edit profile
                    </Link>
                  </div>
                </div>
              </section>
            </div>

            {/* Center Feed */}
            <div className="space-y-6">
              <ComposerCard onPostCreated={loadPosts} currentUser={currentUser} />

              <StoryStrip
                currentUser={currentUser}
                onCreateStory={() => setIsCreateStoryOpen(true)}
                onOpenStory={handleOpenStory}
                stories={stories}
              />

              {loading ? (
                <div className="flex flex-col items-center justify-center p-16 space-y-4">
                  <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#4A9FD8] border-t-transparent" />
                  <ThemedText as="p" className="text-[15px] font-medium text-slate-400">Refreshing your feed...</ThemedText>
                </div>
              ) : posts.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 bg-white rounded-[32px] border border-slate-200/60 shadow-sm">
                  <div className="h-20 w-20 flex items-center justify-center rounded-[24px] bg-slate-50 mb-6">
                    <Article className="text-slate-300" size={36} weight="regular" />
                  </div>
                  <ThemedText as="p" className="text-slate-400 font-bold text-lg">No posts yet</ThemedText>
                  <ThemedText as="p" className="text-slate-400 text-sm mt-1">Start by sharing your first update!</ThemedText>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((item) => (
                    <FeedPost
                      key={item.id}
                      item={item}
                      currentUser={currentUser}
                      onPostClick={(id) => setSelectedPostId(id)}
                      onOptimisticMetricsChange={patchPostMetrics}
                    />
                  ))}
                  {/* Infinite scroll sentinel */}
                  <div ref={bottomRef} className="h-4" />
                  {loadingMore && (
                    <div className="flex items-center justify-center py-6">
                      <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[#4A9FD8] border-t-transparent" />
                      <ThemedText as="p" className="ml-3 text-[14px] font-medium text-slate-400">Đang tải thêm...</ThemedText>
                    </div>
                  )}
                  {!hasMore && posts.length > 0 && (
                    <div className="py-6 text-center">
                      <ThemedText as="p" className="text-[13px] font-medium text-slate-400">Bạn đã xem hết tất cả bài viết</ThemedText>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Rail */}
            <RightRail currentUser={currentUser} />
          </div>
        </div>
      </main>
    </ProtectedPage>
  );
}
