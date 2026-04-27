'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { ProtectedPage } from '@/components/app/ProtectedPage';
import { AppTopNav } from '@/components/navigation/AppTopNav';
import { ThemedText } from '@/components/ui/ThemedText';
import { fetchCurrentUser, updateUserProfile, type AuthUser } from '@/lib/auth';
import { FeedPost } from '@/components/post/FeedPost';
import { fetchPosts, deletePost, API_URL } from '@/lib/api';
import type { Post } from '@/lib/types';

type ProfileTab = 'posts' | 'about' | 'media';

const tabs: { key: ProfileTab; label: string; icon: string }[] = [
  { key: 'posts', label: 'Posts', icon: 'grid_view' },
  { key: 'about', label: 'About', icon: 'person_outline' },
  { key: 'media', label: 'Media', icon: 'photo_library' },
];

const featuredMedia = [
  { id: '1', title: 'Review systems playbook', subtitle: 'A tighter artifact for faster approvals and clearer motion notes.', fillClassName: 'bg-[#D9ECF8]' },
  { id: '2', title: 'Northfeed launch board', subtitle: 'Signals, rituals, and release checkpoints shaped for distributed teams.', fillClassName: 'bg-[#EEE8FF]' },
];

const recentPosts = [
  { id: '1', time: 'Updated 12 min ago', body: 'Shared a revised review template for the motion pass. The goal is less ceremony, clearer decision points, and faster approval once the story is already obvious.', accentClassName: 'bg-[#D9ECF8]' },
  { id: '2', time: 'Yesterday', body: 'Pinned three references that keep social products feeling light: fewer panels, stronger hierarchy, and interaction states that resolve without noise.', accentClassName: 'bg-[#FCE7F3]' },
];

function buildProfileViewModel(user: AuthUser | null) {
  const firstName = user?.first_name?.trim() || '';
  const lastName = user?.last_name?.trim() || '';
  const displayName = `${firstName} ${lastName}`.trim();
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  const emailHandle = user?.email ? user.email.replace(/^mailto:/, '') : '';
  const avatarUrl = user?.avatar_url ? (user.avatar_url.startsWith('http') ? user.avatar_url : `${API_URL}${user.avatar_url}`) : null;

  return {
    displayName,
    initials: initials || 'N/A',
    intro: user?.bio || '',
    location: user?.city || '',
    email: user?.email || '',
    avatarUrl,
  };
}

const surfaceClass = 'rounded-[28px] border border-[#E4E8EE] bg-white';

export function ProfileView() {
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [isEditingIntro, setIsEditingIntro] = useState(false);
  const [tempIntro, setTempIntro] = useState('');
  const [tempCity, setTempCity] = useState('');
  const [isSavingIntro, setIsSavingIntro] = useState(false);

  useEffect(() => {
    let isMounted = true;

    fetchCurrentUser()
      .then((nextUser) => {
        if (isMounted) {
          setUser(nextUser);
          if (nextUser) {
            setTempIntro(nextUser.bio || '');
            setTempCity(nextUser.city || '');
            setLoadingPosts(true);
            fetchPosts(1, 20, nextUser.id)
              .then((res) => {
                if (isMounted) setPosts(res.items || []);
              })
              .finally(() => {
                if (isMounted) setLoadingPosts(false);
              });
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          setUser(null);
          setLoadingPosts(false);
        }
      });

    return () => {
      isMounted = false;
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

  const handleSaveIntro = async () => {
    setIsSavingIntro(true);
    try {
      const payload = {
        bio: tempIntro.trim() || null,
        city: tempCity.trim() || null,
      };
      console.log('DEBUG: Sending profile update:', payload);
      await updateUserProfile(payload);
      // Refresh current user to update UI
      const updatedUser = await fetchCurrentUser();
      setUser(updatedUser);
      setIsEditingIntro(false);
    } catch (err) {
      alert('Không thể cập nhật thông tin.');
    } finally {
      setIsSavingIntro(false);
    }
  };

  const handleCancelIntro = () => {
    setTempIntro(user?.bio || '');
    setTempCity(user?.city || '');
    setIsEditingIntro(false);
  };

  const formatTime = (isoStr: string) => {
    const diff = Date.now() - new Date(isoStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return `${Math.floor(hours / 24)} ngày trước`;
  };

  const profile = useMemo(() => buildProfileViewModel(user), [user]);

  return (
    <ProtectedPage>
      <main className="min-h-screen bg-[#F8FAFC] pb-8">
        <div className="mx-auto w-full max-w-[1720px] gap-4 px-4 pb-6 pt-4 md:px-6">
          {/* Back header */}
          <div className="mt-4 flex items-center gap-3 rounded-[28px] border border-[#E4E8EE] bg-white px-5 py-4">
            <Link 
              href="/" 
              className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#F7F8FA] text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <span className="material-icons">arrow_back</span>
            </Link>
            <ThemedText as="h1" className="text-lg font-semibold text-slate-900">Profile</ThemedText>
          </div>

          <section className={`${surfaceClass} mt-4 overflow-hidden`}>
            <div className="h-[210px] bg-[#D9ECF8]" />
            <div className="px-5 pb-5">
              <div className="-mt-12 flex items-end justify-between gap-4">
                <div className="flex items-end gap-4">
                  <div className="flex h-[92px] w-[92px] items-center justify-center rounded-[28px] border-4 border-white bg-[#EAF4FB] text-[28px] font-semibold tracking-[0.5px] text-slate-900 overflow-hidden">
                    {profile.avatarUrl ? (
                      <img src={profile.avatarUrl} alt={profile.displayName} className="h-full w-full object-cover" />
                    ) : (
                      profile.initials
                    )}
                  </div>
                  <div className="pb-1">
                    <ThemedText as="h1" className="text-[24px] font-bold text-slate-950">{profile.displayName}</ThemedText>
                  </div>
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="xl:max-w-[760px] xl:flex-1" />
                <Link 
                  href="/profile/edit" 
                  className="inline-flex min-w-[140px] items-center justify-center rounded-[22px] bg-[#0A0A0A] px-6 py-4 text-base font-medium !text-white hover:bg-slate-800 transition-colors"
                >
                  Edit profile
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                {tabs.map((tab) => (
                  <button 
                    key={tab.key} 
                    className={`flex min-w-[112px] items-center justify-center gap-2 rounded-[20px] px-6 py-4 text-base font-medium transition-colors ${activeTab === tab.key ? 'bg-[#0A0A0A] !text-white' : 'bg-[#F7F8FA] text-slate-900 hover:bg-slate-200'}`} 
                    onClick={() => setActiveTab(tab.key)} 
                    type="button"
                  >
                    <span className="material-icons text-[20px]">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <div className="mt-4 grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
            <div className="space-y-4">
              <section className={`${surfaceClass} p-5`}>
                <div className="flex items-center justify-between mb-5">
                  <ThemedText as="h2" className="text-[24px] font-semibold text-slate-950">Intro</ThemedText>
                  {!isEditingIntro ? (
                    <button 
                      onClick={() => setIsEditingIntro(true)} 
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                  ) : null}
                </div>
                
                {isEditingIntro ? (
                  <div className="space-y-4">
                    <div>
                      <ThemedText className="mb-1 block text-xs font-semibold text-slate-500">LOCATION</ThemedText>
                      <input
                        type="text"
                        className="w-full rounded-xl border border-slate-200 bg-[#F7F8FA] px-4 py-2.5 text-base text-slate-900 outline-none focus:border-slate-400"
                        value={tempCity}
                        onChange={(e) => setTempCity(e.target.value)}
                        placeholder="VD: Hà Nội, VN"
                      />
                    </div>
                    <div>
                      <ThemedText className="mb-1 block text-xs font-semibold text-slate-500">BIO / INTRO</ThemedText>
                      <textarea
                        className="w-full rounded-xl border border-slate-200 bg-[#F7F8FA] px-4 py-3 text-base text-slate-900 outline-none focus:border-slate-400"
                        rows={4}
                        value={tempIntro}
                        onChange={(e) => setTempIntro(e.target.value)}
                        placeholder="Giới thiệu về bạn..."
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleSaveIntro}
                        disabled={isSavingIntro}
                        className="flex-1 rounded-full bg-slate-900 py-3 text-sm font-semibold text-white active:opacity-80 disabled:opacity-50"
                      >
                        {isSavingIntro ? 'Saving...' : 'Save All Changes'}
                      </button>
                      <button
                        onClick={handleCancelIntro}
                        className="flex-1 rounded-full bg-[#F7F8FA] py-3 text-sm font-semibold text-slate-700 active:opacity-80"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {profile.intro ? (
                      <ThemedText className="text-base leading-7 text-slate-700">{profile.intro}</ThemedText>
                    ) : (
                      <ThemedText className="text-base italic text-slate-400">Chưa có giới thiệu.</ThemedText>
                    )}
                    <div className="mt-4 space-y-3">
                      {[
                        { icon: 'mail', value: profile.email },
                        { icon: 'location_on', value: profile.location },
                      ].filter(item => !!item.value).map((item) => (
                        <div key={item.icon} className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#F7F8FA]">
                            <span className="material-icons text-[20px] text-slate-500">{item.icon}</span>
                          </div>
                          <ThemedText className="flex-1 truncate text-base font-medium text-slate-800">{item.value}</ThemedText>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>

              <section className={`${surfaceClass} p-5`}>
                <ThemedText as="h2" className="text-[24px] font-semibold text-slate-950">Featured media</ThemedText>
                <div className="mt-5 space-y-4">{featuredMedia.map((item) => <div key={item.id} className="space-y-3"><div className={`h-[150px] rounded-[24px] ${item.fillClassName}`} /><div><ThemedText as="p" className="text-lg font-semibold text-slate-950">{item.title}</ThemedText><ThemedText as="p" className="mt-1 text-sm leading-6 text-slate-600">{item.subtitle}</ThemedText></div></div>)}</div>
              </section>
            </div>

            <div className="space-y-4">
              {activeTab === 'posts' ? (
                <div className="space-y-4">
                  <ThemedText as="h2" className="px-1 text-[28px] font-semibold text-slate-950">Recent posts</ThemedText>
                  {loadingPosts ? (
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
                        <FeedPost key={item.id} item={item} currentUser={user} />
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {activeTab === 'about' ? (
                <section className={`${surfaceClass} p-5`}>
                  <ThemedText as="h2" className="text-[24px] font-semibold text-slate-950">About</ThemedText>
                  <ThemedText as="p" className="mt-1 text-sm text-slate-500">Calm collaboration, sharper reviews, cleaner systems</ThemedText>
                  <div className="mt-5 space-y-4">
                    <div className="rounded-[24px] bg-[#F7F8FA] px-4 py-4">
                      <ThemedText as="p" className="text-base leading-7 text-slate-700">{profile.intro || 'Chưa có giới thiệu.'}</ThemedText>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {[profile.location].filter(Boolean).map((item) => (
                        <div key={item} className="rounded-full bg-[#F7F8FA] px-4 py-3 text-sm font-medium text-slate-700">{item}</div>
                      ))}
                    </div>
                  </div>
                </section>
              ) : null}

              {activeTab === 'media' ? (
                <section className={`${surfaceClass} p-5`}>
                  <ThemedText as="h2" className="text-[24px] font-semibold text-slate-950">Media</ThemedText>
                  <ThemedText as="p" className="mt-1 text-sm text-slate-500">Featured references and shareable artifacts</ThemedText>
                  <div className="mt-5 grid gap-4 lg:grid-cols-2">{featuredMedia.map((item) => <div key={item.id} className="space-y-3"><div className={`h-[220px] rounded-[28px] ${item.fillClassName}`} /><ThemedText as="p" className="text-lg font-semibold text-slate-950">{item.title}</ThemedText><ThemedText as="p" className="text-sm leading-6 text-slate-600">{item.subtitle}</ThemedText></div>)}</div>
                </section>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </ProtectedPage>
  );
}
