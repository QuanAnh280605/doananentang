'use client';

import { ChatCircleDots, Copy, ShareNetwork, X } from '@phosphor-icons/react';
import { useCallback, useEffect, useState } from 'react';

import { ThemedText } from '@/components/ui/ThemedText';
import { createPost } from '@/lib/api';
import { listDirectChats, sendMessage } from '@/lib/chat';
import type { InboxThreadData } from '@/lib/chat.types';
import { resolveAvatarUrl } from '@/lib/api';

type ShareModalProps = {
  postId: string;
  authorName: string;
  onClose: () => void;
  onReposted?: () => void;
};

export function ShareModal({ postId, authorName, onClose, onReposted }: ShareModalProps) {
  const [chats, setChats] = useState<InboxThreadData[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [isReposting, setIsReposting] = useState(false);
  const [sendingChatId, setSendingChatId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch direct chats on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const items = await listDirectChats();
        if (!cancelled) setChats(items);
      } catch (err) {
        console.warn('Failed to fetch chats for sharing', err);
      } finally {
        if (!cancelled) setLoadingChats(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Auto-hide toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleRepost = useCallback(async () => {
    if (isReposting) return;
    setIsReposting(true);
    try {
      await createPost('', [], null, null, postId);
      setToast('Đã chia sẻ bài viết lên bảng tin của bạn!');
      onReposted?.();
      setTimeout(onClose, 800);
    } catch (err) {
      console.error(err);
      setToast('Không thể chia sẻ bài viết. Vui lòng thử lại.');
    } finally {
      setIsReposting(false);
    }
  }, [postId, isReposting, onClose, onReposted]);

  const handleSendToChat = useCallback(async (chatId: string) => {
    if (sendingChatId) return;
    setSendingChatId(chatId);
    try {
      const shareText = `[Bài viết] Xem bài viết của ${authorName} tại đây: ${window.location.origin}/post/${postId}`;
      await sendMessage(chatId, shareText);
      setToast('Đã gửi bài viết qua tin nhắn!');
      setTimeout(onClose, 800);
    } catch (err) {
      console.error(err);
      setToast('Không thể gửi tin nhắn. Vui lòng thử lại.');
    } finally {
      setSendingChatId(null);
    }
  }, [sendingChatId, authorName, postId, onClose]);

  const handleCopyLink = useCallback(async () => {
    const shareUrl = `${window.location.origin}/post/${postId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setToast('Đã copy link bài viết!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setToast('Không thể copy link.');
    }
  }, [postId]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[6px]" />

      {/* Modal */}
      <div className="relative w-full max-w-[420px] rounded-t-[28px] bg-white shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.15)] sm:rounded-[28px] sm:shadow-[0_20px_60px_-16px_rgba(0,0,0,0.2)]">
        {/* Drag indicator (mobile) */}
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-slate-200 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <ThemedText as="p" className="text-[17px] font-semibold text-slate-900">
            Chia sẻ
          </ThemedText>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 transition-colors hover:bg-slate-200"
          >
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        {/* Repost option */}
        <button
          onClick={handleRepost}
          disabled={isReposting}
          className="flex w-full items-center gap-3.5 border-b border-slate-100 px-5 py-4 text-left transition-colors hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#EAF4FB]">
            {isReposting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#4A9FD8] border-t-transparent" />
            ) : (
              <ShareNetwork size={18} className="text-[#4A9FD8]" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <ThemedText as="p" className="text-[15px] font-semibold text-slate-900">
              Chia sẻ lên bảng tin
            </ThemedText>
            <ThemedText as="p" className="text-[13px] text-slate-500">
              Đăng lại bài viết này trên trang của bạn
            </ThemedText>
          </div>
        </button>

        {/* Copy link option */}
        <button
          onClick={handleCopyLink}
          className="flex w-full items-center gap-3.5 border-b border-slate-100 px-5 py-4 text-left transition-colors hover:bg-slate-50 active:bg-slate-100"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-slate-100">
            <Copy size={18} className={copied ? 'text-[#16A34A]' : 'text-slate-500'} />
          </div>
          <div className="min-w-0 flex-1">
            <ThemedText as="p" className="text-[15px] font-semibold text-slate-900">
              {copied ? 'Đã copy!' : 'Copy link'}
            </ThemedText>
            <ThemedText as="p" className="text-[13px] text-slate-500">
              Sao chép đường dẫn bài viết
            </ThemedText>
          </div>
        </button>

        {/* Send via chat section */}
        <div className="px-5 pt-4 pb-2">
          <ThemedText as="p" className="text-[12px] font-bold uppercase tracking-wider text-slate-400">
            Gửi qua tin nhắn
          </ThemedText>
        </div>

        <div className="max-h-[280px] overflow-y-auto px-5 pb-5">
          {loadingChats ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4A9FD8] border-t-transparent" />
              <ThemedText as="p" className="ml-3 text-[14px] text-slate-500">
                Đang tải...
              </ThemedText>
            </div>
          ) : chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <ChatCircleDots size={32} className="text-slate-300" />
              <ThemedText as="p" className="mt-3 text-[14px] text-slate-500">
                Chưa có cuộc trò chuyện nào
              </ThemedText>
            </div>
          ) : (
            <div className="space-y-1">
              {chats.map((chat) => {
                const participant = chat.user;
                const initials = `${participant.first_name?.[0] || ''}${participant.last_name?.[0] || ''}`.toUpperCase();
                const avatarUrl = resolveAvatarUrl(participant.avatar_url);
                const isSending = sendingChatId === chat.chatId;

                return (
                  <button
                    key={chat.id}
                    onClick={() => chat.chatId && handleSendToChat(chat.chatId)}
                    disabled={isSending || !chat.chatId}
                    className="flex w-full items-center gap-3 rounded-[18px] px-3 py-2.5 text-left transition-colors hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50"
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl as string}
                        alt={participant.first_name || ''}
                        className="h-9 w-9 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#4A9FD8]/10 text-[13px] font-bold text-[#4A9FD8]">
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <ThemedText as="p" className="truncate text-[14px] font-semibold text-slate-900">
                        {participant.first_name} {participant.last_name}
                      </ThemedText>
                    </div>
                    <div className="shrink-0">
                      {isSending ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#4A9FD8] border-t-transparent" />
                      ) : (
                        <span className="rounded-[14px] bg-[#4A9FD8] px-3.5 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#2F8BC9]">
                          Gửi
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div className="absolute -top-14 left-1/2 -translate-x-1/2">
            <div className="rounded-[18px] bg-slate-900 px-5 py-2.5 shadow-lg">
              <ThemedText as="p" className="whitespace-nowrap text-[14px] font-medium text-white">
                {toast}
              </ThemedText>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
