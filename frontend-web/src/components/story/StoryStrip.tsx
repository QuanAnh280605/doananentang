'use client';

/* eslint-disable @next/next/no-img-element */

import { Plus } from '@phosphor-icons/react';

import { ThemedText } from '@/components/ui/ThemedText';
import { resolveAvatarUrl } from '@/lib/api';
import type { AuthUser } from '@/lib/auth';

import { groupStoriesByAuthor, type StoryItem } from './storyState';

type StoryStripProps = {
  currentUser: AuthUser | null;
  stories: StoryItem[];
  onCreateStory: () => void;
  onOpenStory: (storyId: string) => void;
};

function getInitials(user: AuthUser | null): string {
  if (!user) return 'US';

  return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'US';
}

function StoryAvatar({ story }: { story: StoryItem }) {
  return (
    <div className={`absolute left-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface)] ring-4 ${story.ringClass}`}>
      {story.avatarUrl ? (
        <img
          alt={`Ảnh đại diện của ${story.authorName}`}
          className="h-9 w-9 rounded-full object-cover"
          src={story.avatarUrl}
        />
      ) : (
        <span className="text-[12px] font-bold text-[var(--accent)]">{story.authorInitials}</span>
      )}
    </div>
  );
}

export function StoryStrip({ currentUser, stories, onCreateStory, onOpenStory }: StoryStripProps) {
  const avatarUrl = resolveAvatarUrl(currentUser?.avatar_url);
  const initials = getInitials(currentUser);
  const storyGroups = groupStoriesByAuthor(stories);

  return (
    <section className="rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
      <div className="mb-4 flex items-center justify-between px-1">
        <div>
          <ThemedText as="h2" className="text-[22px] font-bold tracking-tight text-[var(--text)]">
            Tin
          </ThemedText>
          <ThemedText as="p" className="text-[13px] font-medium text-[var(--text-muted)]">
            Xem nhanh khoảnh khắc từ bạn bè
          </ThemedText>
        </div>
        <button
          className="rounded-[18px] px-4 py-2 text-[14px] font-bold text-[var(--accent)] transition-colors hover:bg-[var(--accent-soft)] active:scale-[0.98]"
          onClick={onCreateStory}
          type="button"
        >
          Tạo tin
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        <button
          className="group relative h-[216px] w-[124px] max-w-[124px] flex-none overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] text-left transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
          onClick={onCreateStory}
          type="button"
        >
          <div className="h-[142px] bg-[var(--accent-soft)]">
            {avatarUrl ? (
              <img alt="Ảnh đại diện của bạn" className="h-full w-full object-cover" src={avatarUrl} />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[28px] font-bold text-[var(--accent)]">
                {initials}
              </div>
            )}
          </div>
          <div className="absolute left-1/2 top-[122px] flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full border-4 border-[var(--surface)] bg-[var(--accent)] text-white">
            <Plus size={18} weight="bold" />
          </div>
          <ThemedText as="p" className="px-3 pt-9 text-center text-[14px] font-bold leading-tight text-[var(--text)]">
            Tạo tin
          </ThemedText>
        </button>

        {storyGroups.map((group) => {
          const story = group.latestStory;

          return (
            <button
              className="group relative h-[216px] w-[124px] max-w-[124px] flex-none overflow-hidden rounded-[24px] bg-slate-900 text-left transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
              key={group.authorId}
              onClick={() => onOpenStory(story.id)}
              type="button"
            >
              <img alt={`Tin của ${story.authorName}`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" src={story.mediaUrl} />
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/85 to-transparent" />
              <StoryAvatar story={story} />
              <ThemedText as="p" className="absolute bottom-4 left-3 right-3 text-[14px] font-bold leading-tight text-white">
                {story.authorName}
              </ThemedText>
            </button>
          );
        })}
      </div>
    </section>
  );
}
