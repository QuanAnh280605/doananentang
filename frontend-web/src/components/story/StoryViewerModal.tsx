'use client';

/* eslint-disable @next/next/no-img-element */

import { CaretLeft, CaretRight, Heart, PaperPlaneTilt, X } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';

import { ThemedText } from '@/components/ui/ThemedText';
import type { AuthUser } from '@/lib/auth';
import { getOrCreateDirectChat, sendMessage } from '@/lib/chat';

import type { StoryGroup, StoryItem } from './storyState';
import { getNextStoryId, getPreviousStoryId, groupStoriesByAuthor } from './storyState';

type StoryViewerModalProps = {
  currentUser: AuthUser | null;
  stories: StoryItem[];
  selectedStoryId: string;
  onClose: () => void;
  onSelectStory: (storyId: string) => void;
};

function StoryListItem({ active, group, onSelect }: { active: boolean; group: StoryGroup; onSelect: () => void }) {
  const story = group.latestStory;

  return (
    <button
      className={`flex w-full items-center gap-3 rounded-[18px] p-3 text-left transition-colors ${active ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--surface-muted)]'}`}
      onClick={onSelect}
      type="button"
    >
      <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-white ring-4 ${story.ringClass}`}>
        {story.avatarUrl ? (
          <img alt={`Ảnh đại diện của ${story.authorName}`} className="h-10 w-10 rounded-full object-cover" src={story.avatarUrl} />
        ) : (
          <span className="text-[13px] font-bold text-[var(--accent)]">{story.authorInitials}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <ThemedText as="p" className="truncate text-[15px] font-bold text-[var(--text)]">
          {story.authorName}
        </ThemedText>
        <ThemedText as="p" className="truncate text-[13px] font-medium text-[var(--text-muted)]">
          {group.stories.length > 1 ? `${group.stories.length} tin` : story.timeLabel}
        </ThemedText>
      </div>
    </button>
  );
}

function StoryProgress({ activeIndex, total }: { activeIndex: number; total: number }) {
  return (
    <div className="absolute left-4 right-4 top-4 flex gap-2">
      {Array.from({ length: total }).map((_, index) => (
        <div
          className={`h-1 flex-1 rounded-full ${index === activeIndex ? 'bg-white' : 'bg-white/45'}`}
          key={index}
        />
      ))}
    </div>
  );
}

export function StoryViewerModal({ currentUser, stories, selectedStoryId, onClose, onSelectStory }: StoryViewerModalProps) {
  const selectedStory = stories.find((story) => story.id === selectedStoryId) ?? stories[0];
  const storyGroups = groupStoriesByAuthor(stories);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isSendingLike, setIsSendingLike] = useState(false);
  const [likedStoryIds, setLikedStoryIds] = useState<Set<string>>(() => new Set());
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!selectedStory) return null;

  const nextStoryId = getNextStoryId(stories, selectedStory.id);
  const previousStoryId = getPreviousStoryId(stories, selectedStory.id);
  const selectedStoryGroup = storyGroups.find((group) => group.authorId === selectedStory.authorId);
  const selectedStoryIndex = selectedStoryGroup?.stories.findIndex((story) => story.id === selectedStory.id) ?? 0;
  const targetUserId = Number(selectedStory.authorId);
  const canMessageStoryAuthor = Number.isFinite(targetUserId) && currentUser?.id !== targetUserId;
  const normalizedReply = replyText.trim();
  const isLiked = likedStoryIds.has(selectedStory.id);

  const handleSendReply = async () => {
    if (!canMessageStoryAuthor || !normalizedReply || isSendingReply) return;

    setIsSendingReply(true);
    setSendError(null);

    try {
      const chat = await getOrCreateDirectChat(targetUserId);
      await sendMessage(chat.id, normalizedReply);
      setReplyText('');
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : 'Không thể gửi trả lời tin lúc này.');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleLikeStory = async () => {
    if (isSendingLike) return;

    if (isLiked) {
      setLikedStoryIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.delete(selectedStory.id);
        return nextIds;
      });
      return;
    }

    setIsSendingLike(true);
    setSendError(null);

    try {
      if (canMessageStoryAuthor) {
        const chat = await getOrCreateDirectChat(targetUserId);
        await sendMessage(chat.id, '❤️');
      }

      setLikedStoryIds((currentIds) => new Set(currentIds).add(selectedStory.id));
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : 'Không thể thích tin lúc này.');
    } finally {
      setIsSendingLike(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[var(--background)] text-[var(--text)]">
      <aside className="absolute inset-y-0 left-0 hidden w-[360px] border-r border-[var(--border)] bg-[var(--surface)] p-4 lg:block">
        <div className="mb-5 flex items-center gap-3">
          <button
            aria-label="Đóng trình xem tin"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text)] transition-colors hover:bg-[var(--accent-soft)] active:scale-[0.98]"
            onClick={onClose}
            type="button"
          >
            <X size={20} weight="bold" />
          </button>
          <ThemedText as="h2" className="text-[22px] font-bold text-[var(--text)]">
            Tin
          </ThemedText>
        </div>

        <div className="space-y-2">
          {storyGroups.map((group) => (
            <StoryListItem
              active={group.authorId === selectedStory.authorId}
              group={group}
              key={group.authorId}
              onSelect={() => onSelectStory(group.latestStory.id)}
            />
          ))}
        </div>
      </aside>

      <button
        aria-label="Đóng trình xem tin"
        className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--text)] shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition-colors hover:bg-[var(--surface-muted)] lg:hidden"
        onClick={onClose}
        type="button"
      >
        <X size={20} weight="bold" />
      </button>

      <div className="relative mx-auto flex h-full max-w-[820px] flex-col items-center justify-center gap-4 px-16 pt-6 lg:ml-[360px] lg:max-w-none">
        <button
          aria-label="Tin trước"
          className="absolute left-3 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition-colors hover:bg-[var(--surface-muted)] active:scale-[0.98]"
          onClick={() => previousStoryId && onSelectStory(previousStoryId)}
          type="button"
        >
          <CaretLeft size={24} weight="bold" />
        </button>

        <article className="relative h-[calc(100dvh-8.5rem)] max-h-[868px] w-full max-w-[488px] overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <img alt={`Tin của ${selectedStory.authorName}`} className="h-full w-full object-cover" src={selectedStory.mediaUrl} />
          <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-slate-950/80 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-slate-950/85 to-transparent" />

          <StoryProgress activeIndex={selectedStoryIndex} total={selectedStoryGroup?.stories.length ?? 1} />

          <div className="absolute left-4 right-4 top-8 flex items-center gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-full bg-white ring-4 ${selectedStory.ringClass}`}>
              {selectedStory.avatarUrl ? (
                <img alt={`Ảnh đại diện của ${selectedStory.authorName}`} className="h-9 w-9 rounded-full object-cover" src={selectedStory.avatarUrl} />
              ) : (
                <span className="text-[12px] font-bold text-[var(--accent)]">{selectedStory.authorInitials}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <ThemedText as="p" className="truncate text-[15px] font-bold text-white">
                {selectedStory.authorName}
              </ThemedText>
              <ThemedText as="p" className="text-[13px] font-semibold text-white/75">
                {selectedStory.timeLabel}
              </ThemedText>
            </div>
          </div>

          <div className="absolute bottom-20 left-8 right-8 rounded-[18px] bg-slate-950/70 p-4 text-center backdrop-blur-md">
            <ThemedText as="p" className="text-[22px] font-bold leading-tight text-white">
              {selectedStory.text}
            </ThemedText>
          </div>
        </article>

        <button
          aria-label="Tin tiếp theo"
          className="absolute right-3 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition-colors hover:bg-[var(--surface-muted)] active:scale-[0.98]"
          onClick={() => nextStoryId && onSelectStory(nextStoryId)}
          type="button"
        >
          <CaretRight size={24} weight="bold" />
        </button>

        <div className="flex w-full max-w-[488px] items-center gap-3">
          <input
            aria-label="Trả lời tin"
            className="h-12 min-w-0 flex-1 rounded-[18px] bg-[var(--surface)] px-4 text-[14px] font-semibold text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none"
            disabled={!canMessageStoryAuthor || isSendingReply}
            onChange={(event) => setReplyText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void handleSendReply();
              }
            }}
            placeholder={canMessageStoryAuthor ? `Trả lời ${selectedStory.authorName}...` : 'Không thể trả lời tin này'}
            value={replyText}
          />
          <button
            aria-pressed={isLiked}
            className={`flex h-12 w-12 items-center justify-center rounded-[18px] border border-[var(--border)] bg-[var(--surface)] transition-colors hover:bg-[var(--surface-muted)] ${isLiked ? 'text-[var(--danger)]' : 'text-[var(--text)]'}`}
            disabled={isSendingLike}
            onClick={handleLikeStory}
            type="button"
          >
            <Heart size={23} weight={isLiked ? 'fill' : 'regular'} />
          </button>
          <button
            className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[var(--accent)] text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canMessageStoryAuthor || !normalizedReply || isSendingReply}
            onClick={handleSendReply}
            type="button"
          >
            <PaperPlaneTilt size={22} weight="bold" />
          </button>
        </div>
        {sendError ? (
          <ThemedText as="p" className="w-full max-w-[488px] text-[13px] font-semibold text-[var(--danger)]">
            {sendError}
          </ThemedText>
        ) : null}
      </div>
    </div>
  );
}
