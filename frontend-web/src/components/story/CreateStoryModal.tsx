'use client';

/* eslint-disable @next/next/no-img-element */

import { ImageSquare, Plus, TextAa, X } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';

import { ThemedText } from '@/components/ui/ThemedText';
import { API_URL, createStory, resolveAvatarUrl, uploadStoryMedia } from '@/lib/api';
import type { AuthUser } from '@/lib/auth';

import { mapApiStoryToStoryItem, type StoryItem } from './storyState';

type CreateStoryModalProps = {
  currentUser: AuthUser | null;
  onClose: () => void;
  onCreateStory: (story: StoryItem) => void;
};

function getAuthorName(user: AuthUser | null): string {
  if (!user) return 'Người dùng';

  return `${user.first_name} ${user.last_name}`.trim() || 'Người dùng';
}

function getInitials(user: AuthUser | null): string {
  if (!user) return 'US';

  return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'US';
}

export function CreateStoryModal({ currentUser, onClose, onCreateStory }: CreateStoryModalProps) {
  const [text, setText] = useState('Một buổi sáng chậm, đủ cà phê và đủ ánh nắng.');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const authorName = getAuthorName(currentUser);
  const authorInitials = getInitials(currentUser);
  const avatarUrl = resolveAvatarUrl(currentUser?.avatar_url);
  const previewMediaUrl = mediaUrl ?? 'https://picsum.photos/seed/story-local-preview/720/1280';
  const canCreate = text.trim().length > 0 || Boolean(selectedFile);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (mediaUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(mediaUrl);
      }
    };
  }, [mediaUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (mediaUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(mediaUrl);
    }

    setMediaUrl(URL.createObjectURL(file));
    setSelectedFile(file);
    setError(null);
  };

  const handleCreateStory = async () => {
    if (!canCreate || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const uploadedMedia = selectedFile ? await uploadStoryMedia(selectedFile) : { file_url: previewMediaUrl };
      const story = await createStory({
        file_url: uploadedMedia.file_url,
        caption: text.trim() || 'Tin mới vừa được chia sẻ.',
        type: 'image',
        visibility: 'public',
      });

      onCreateStory(mapApiStoryToStoryItem(story, API_URL));
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tạo tin. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[var(--background)]">
      <header className="flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-5">
        <div className="flex items-center gap-3">
          <button
            aria-label="Đóng tạo tin"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text)] transition-colors hover:bg-[var(--accent-soft)] active:scale-[0.98]"
            onClick={onClose}
            type="button"
          >
            <X size={20} weight="bold" />
          </button>
          <ThemedText as="h1" className="text-[22px] font-bold text-[var(--text)]">
            Tạo tin
          </ThemedText>
        </div>
        <button
          className="h-11 rounded-[18px] bg-[var(--accent)] px-5 text-[15px] font-bold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canCreate || isSubmitting}
          onClick={handleCreateStory}
          type="button"
        >
          {isSubmitting ? 'Đang chia sẻ...' : 'Chia sẻ lên tin'}
        </button>
      </header>

      <div className="grid h-[calc(100dvh-4rem)] grid-cols-1 gap-6 overflow-y-auto p-4 lg:grid-cols-[360px_minmax(0,1fr)] lg:p-8">
        <aside className="rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img alt="Ảnh đại diện của bạn" className="h-11 w-11 rounded-full object-cover" src={avatarUrl} />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[14px] font-bold text-[var(--accent)]">
                {authorInitials}
              </div>
            )}
            <ThemedText as="p" className="text-[16px] font-bold text-[var(--text)]">
              {authorName}
            </ThemedText>
          </div>

          <div className="mt-6 space-y-3">
            <ThemedText as="p" className="text-[14px] font-bold text-[var(--text)]">
              Chọn loại tin
            </ThemedText>

            <button
              className="flex w-full items-center gap-4 rounded-[24px] bg-[var(--surface-muted)] p-4 text-left transition-colors hover:bg-[var(--accent-soft)] active:scale-[0.99]"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-white">
                <ImageSquare size={24} weight="bold" />
              </span>
              <span>
                <ThemedText as="span" className="block text-[15px] font-bold text-[var(--text)]">
                  Tạo tin ảnh
                </ThemedText>
                <ThemedText as="span" className="block text-[13px] font-medium text-[var(--text-muted)]">
                  Tải ảnh lên để làm nền story
                </ThemedText>
              </span>
            </button>

            <button
              className="flex w-full items-center gap-4 rounded-[24px] bg-[var(--surface-muted)] p-4 text-left transition-colors hover:bg-[var(--accent-soft)] active:scale-[0.99]"
              onClick={() => setText('Bạn muốn kể điều gì hôm nay?')}
              type="button"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--text)] text-white">
                <TextAa size={24} weight="bold" />
              </span>
              <span>
                <ThemedText as="span" className="block text-[15px] font-bold text-[var(--text)]">
                  Tạo tin văn bản
                </ThemedText>
                <ThemedText as="span" className="block text-[13px] font-medium text-[var(--text-muted)]">
                  Viết nội dung với nền có sẵn
                </ThemedText>
              </span>
            </button>
          </div>

          <label className="mt-6 block">
            <ThemedText as="span" className="mb-2 block text-[14px] font-bold text-[var(--text)]">
              Nội dung
            </ThemedText>
            <textarea
              className="min-h-28 w-full resize-none rounded-[18px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-[15px] font-medium text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:bg-[var(--surface)]"
              onChange={(event) => setText(event.target.value)}
              placeholder="Viết nội dung story"
              value={text}
            />
          </label>

          {error ? (
            <ThemedText as="p" className="mt-3 rounded-[18px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-[14px] font-semibold text-[var(--danger)]">
              {error}
            </ThemedText>
          ) : null}

          <input accept="image/*" className="hidden" onChange={handleFileChange} ref={fileInputRef} type="file" />
        </aside>

        <main className="flex min-h-[820px] items-center justify-center rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)] lg:p-6">
          <div className="relative h-[768px] w-[432px] max-w-full overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <img alt="Xem trước tin" className="h-full w-full object-cover" src={previewMediaUrl} />
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-slate-950/75 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-slate-950/85 to-transparent" />
            {/*
            <div className="absolute left-4 right-4 top-4 flex gap-2">
              <div className="h-1 flex-1 rounded-full bg-white" />
              <div className="h-1 flex-1 rounded-full bg-white/45" />
            </div>
            */}
            <div className="absolute left-4 right-4 top-4 flex items-center gap-3">
              {avatarUrl ? (
                <img alt="Ảnh đại diện của bạn" className="h-10 w-10 rounded-full object-cover ring-4 ring-[var(--accent)]" src={avatarUrl} />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[12px] font-bold text-[var(--accent)] ring-4 ring-[var(--accent)]">
                  {authorInitials}
                </div>
              )}
              <ThemedText as="p" className="text-[14px] font-bold text-white">
                {authorName}
              </ThemedText>
            </div>
            <div className="absolute bottom-16 left-7 right-7 rounded-[18px] bg-slate-950/70 p-4 text-center backdrop-blur-md">
              <ThemedText as="p" className="text-[20px] font-bold leading-tight text-white">
                {text.trim() || 'Tin mới vừa được chia sẻ.'}
              </ThemedText>
            </div>
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-white backdrop-blur-md">
              <Plus size={16} weight="bold" />
              <span className="text-[13px] font-bold">Xem trước</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
