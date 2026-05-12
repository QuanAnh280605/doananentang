'use client';

import { Heart, ThumbsUp, X } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';

import { ThemedText } from '@/components/ui/ThemedText';
import { API_URL, fetchPostLikers } from '@/lib/api';
import type { PostLiker } from '@/lib/types';

function resolveAvatarUrl(avatarUrl: string) {
  return avatarUrl.startsWith('http') ? avatarUrl : `${API_URL}${avatarUrl}`;
}

function getInitials(firstName?: string | null, lastName?: string | null) {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
}

export function InteractionsModal({
  postId,
  onClose,
}: {
  postId: string;
  onClose: () => void;
}) {
  const [likers, setLikers] = useState<PostLiker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPostLikers(postId)
      .then((res) => {
        setLikers(res.users);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [postId]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6">
      <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-[8px]" onClick={onClose} />

      <div className="relative w-full max-w-[460px] overflow-hidden rounded-[32px] border border-slate-200/70 bg-[#F8FAFC] shadow-[0_28px_70px_-28px_rgba(15,23,42,0.5)]">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <ThemedText as="h3" className="text-[18px] font-bold tracking-tight text-slate-950">
              Người đã thích
            </ThemedText>
            <ThemedText className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
              {likers.length} lượt thích
            </ThemedText>
          </div>

          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-slate-100 text-slate-500 transition-all hover:bg-slate-950 hover:text-white"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        <div className="max-h-[500px] overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-[#4A9FD8]" />
              <ThemedText className="text-[14px] font-semibold text-slate-400">Đang tải danh sách...</ThemedText>
            </div>
          ) : likers.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-slate-100 text-slate-300">
                <Heart size={30} weight="regular" />
              </div>
              <ThemedText className="mt-5 text-[15px] font-bold text-slate-700">
                Chưa có ai thích bài viết này
              </ThemedText>
            </div>
          ) : (
            <div className="space-y-2.5">
              {likers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 rounded-[24px] border border-transparent bg-white px-4 py-3.5 transition-all hover:border-slate-200 hover:bg-slate-50"
                >
                  {user.avatar_url ? (
                    <img
                      src={resolveAvatarUrl(user.avatar_url)}
                      className="h-12 w-12 rounded-[18px] object-cover"
                      alt="avatar"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br from-[#D9ECF8] to-[#F1F5F9] text-sm font-bold text-slate-900">
                      {getInitials(user.first_name, user.last_name)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <ThemedText as="p" className="truncate text-[15px] font-bold text-slate-950">
                      {user.first_name} {user.last_name}
                    </ThemedText>
                    <ThemedText className="mt-1 text-[12px] font-semibold text-slate-400">
                      Thành viên cộng đồng
                    </ThemedText>
                  </div>

                  <div className="inline-flex items-center gap-1 rounded-full bg-[#EAF4FB] px-3 py-1.5 text-[12px] font-bold text-[#4A9FD8]">
                    <ThumbsUp size={14} weight="fill" />
                    <span>Đã thích</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
