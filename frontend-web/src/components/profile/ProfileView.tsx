'use client';

import { useEffect, useMemo, useState } from 'react';

import { ProtectedPage } from '@/components/app/ProtectedPage';
import { AppTopNav } from '@/components/navigation/AppTopNav';
import { ThemedText } from '@/components/ui/ThemedText';
import { fetchCurrentUser, type AuthUser } from '@/lib/auth';

type ProfileTab = 'posts' | 'about' | 'media';

const tabs: { key: ProfileTab; label: string }[] = [
  { key: 'posts', label: 'Posts' },
  { key: 'about', label: 'About' },
  { key: 'media', label: 'Media' },
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
  const firstName = user?.first_name?.trim() || 'Lena';
  const lastName = user?.last_name?.trim() || 'Evere';
  const displayName = `${firstName} ${lastName}`.trim();
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  const emailHandle = user?.email ? user.email.replace(/^mailto:/, '') : 'northfeed.design/lena';

  return {
    displayName,
    initials: initials || 'LE',
    headline: 'Design lead profile',
    intro: 'Leading product design at Northfeed. Building calmer social tools, sharper review loops, and cleaner collaboration rituals.',
    studio: 'Northfeed Studio',
    location: 'Chicago, IL',
    website: emailHandle,
  };
}

const surfaceClass = 'rounded-[28px] border border-[#E4E8EE] bg-white';

export function ProfileView() {
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetchCurrentUser()
      .then((nextUser) => {
        if (isMounted) {
          setUser(nextUser);
        }
      })
      .catch(() => {
        if (isMounted) {
          setUser(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const profile = useMemo(() => buildProfileViewModel(user), [user]);

  return (
    <ProtectedPage>
      <main className="min-h-screen bg-[#F8FAFC] pb-8">
        <div className="mx-auto w-full max-w-[1720px] gap-4 px-4 pb-6 pt-4 md:px-6">
          <AppTopNav searchPlaceholder="Search profile highlights, media, or posts" />
          <section className={`${surfaceClass} mt-4 overflow-hidden`}>
            <div className="h-[210px] bg-[#D9ECF8]" />
            <div className="px-5 pb-5">
              <div className="-mt-12 flex items-end justify-between gap-4">
                <div className="flex items-end gap-4">
                  <div className="flex h-[92px] w-[92px] items-center justify-center rounded-[28px] bg-[#EAF4FB] text-[28px] font-semibold tracking-[0.5px] text-slate-900">{profile.initials}</div>
                  <div className="pb-1"><div className="rounded-full bg-white/90 px-3 py-2 text-sm font-semibold text-slate-700">{profile.headline}</div></div>
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="xl:max-w-[760px] xl:flex-1">
                  <ThemedText as="h1" className="text-[34px] font-semibold leading-[42px] text-slate-950">{profile.displayName}</ThemedText>
                  <ThemedText as="p" className="mt-3 max-w-3xl text-[16px] leading-7 text-slate-600">{profile.intro}</ThemedText>
                </div>
                <button className="rounded-[20px] bg-[#0A0A0A] px-4 py-4 text-base font-medium text-white" type="button">Edit profile</button>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                {tabs.map((tab) => <button key={tab.key} className={`min-w-[112px] rounded-[20px] px-4 py-4 text-base font-medium ${activeTab === tab.key ? 'bg-[#0A0A0A] text-white' : 'bg-[#F7F8FA] text-slate-900'}`} onClick={() => setActiveTab(tab.key)} type="button">{tab.label}</button>)}
              </div>
            </div>
          </section>

          <div className="mt-4 grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
            <div className="space-y-4">
              <section className={`${surfaceClass} p-5`}>
                <ThemedText as="h2" className="text-[24px] font-semibold text-slate-950">Intro</ThemedText>
                <ThemedText as="p" className="mt-5 text-base leading-7 text-slate-700">Design lead focused on calmer collaboration patterns, review systems, and fast-moving product rituals for distributed teams.</ThemedText>
                <div className="mt-4 space-y-3">
                  {[profile.studio, profile.location, profile.website].map((value) => <div key={value} className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#F7F8FA] text-[#64748B]">•</div><ThemedText as="p" className="flex-1 text-base font-medium text-slate-800">{value}</ThemedText></div>)}
                </div>
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
                  {recentPosts.map((post) => (
                    <section key={post.id} className={`${surfaceClass} p-5`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-[#D9ECF8] text-base font-semibold tracking-[0.5px] text-slate-900">{profile.initials}</div><div><ThemedText as="p" className="text-[20px] font-semibold text-slate-950">Lena Evere</ThemedText><ThemedText as="p" className="text-sm text-slate-500">{post.time}</ThemedText></div></div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#F7F8FA] text-[#666666]">•••</div>
                      </div>
                      <ThemedText as="p" className="mt-5 text-[16px] leading-7 text-slate-700">{post.body}</ThemedText>
                      <div className={`mt-5 h-[220px] rounded-[28px] ${post.accentClassName}`} />
                      <div className="mt-4 flex items-center justify-between gap-3"><ThemedText as="p" className="text-sm text-slate-500">384 reactions</ThemedText><ThemedText as="p" className="text-sm text-slate-500">28 comments 6 shares</ThemedText></div>
                    </section>
                  ))}
                </div>
              ) : null}

              {activeTab === 'about' ? (
                <section className={`${surfaceClass} p-5`}>
                  <ThemedText as="h2" className="text-[24px] font-semibold text-slate-950">About</ThemedText>
                  <ThemedText as="p" className="mt-1 text-sm text-slate-500">Calm collaboration, sharper reviews, cleaner systems</ThemedText>
                  <div className="mt-5 space-y-4"><div className="rounded-[24px] bg-[#F7F8FA] px-4 py-4"><ThemedText as="p" className="text-base leading-7 text-slate-700">{profile.intro}</ThemedText></div><div className="flex flex-wrap gap-3">{[profile.studio, profile.location, profile.website].map((item) => <div key={item} className="rounded-full bg-[#F7F8FA] px-4 py-3 text-sm font-medium text-slate-700">{item}</div>)}</div></div>
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
