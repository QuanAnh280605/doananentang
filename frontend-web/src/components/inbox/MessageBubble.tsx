'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState, useRef, useEffect } from 'react';

import { ThemedText } from '@/components/ui/ThemedText';
import { API_URL, resolveAvatarUrl } from '@/lib/api';

export type MessageBubbleData = {
  id: string;
  body: string;
  time: string;
  incoming?: boolean;
  senderName?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  isRead?: boolean;
  pending?: boolean;
  isDeleted?: boolean;
};

type MessageBubbleProps = {
  item: MessageBubbleData;
  showTimeSeparator?: boolean;
  timeSeparatorLabel?: string;
  isLastRead?: boolean;
  recipientAvatarUrl?: string | null;
  recipientName?: string;
  isGroup?: boolean;
  onDelete?: (messageId: string) => void;
};

function resolveMediaSrc(url: string): string {
  if (!url) return url;
  return url.startsWith('http') ? url : `${API_URL}${url}`;
}

/**
 * Parse message body to detect shared post link.
 * Returns { postId, displayText } if a post link is found, otherwise null.
 */
function parseSharedPostLink(body: string | null | undefined): { postId: string; displayText: string } | null {
  if (!body) return null;
  const postMatch = body.match(/\/post\/(\d+)/);
  if (!postMatch) return null;
  const postId = postMatch[1];
  // Remove the share template text, keep any custom message
  const displayText = body.replace(/\[Bài viết\].*?\/post\/\d+/, '').trim();
  return { postId, displayText };
}

/**
 * Read receipt icon: single check = sent, double check blue = read.
 * Only shown for outgoing (non-incoming) messages.
 */
function ReadReceiptIcon({ isRead, pending, avatarUrl }: { isRead?: boolean; pending?: boolean; avatarUrl?: string | null }) {
  if (isRead) {
    // Avatar for read receipt
    return (
      <img
        src={resolveAvatarUrl(avatarUrl) as string}
        alt="Đã xem"
        className="inline-block shrink-0 h-[14px] w-[14px] rounded-full object-cover"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }
}

type MessageOptionsProps = {
  messageId: string;
  onDelete: (messageId: string) => void;
};

function MessageOptions({ messageId, onDelete }: MessageOptionsProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`flex h-8 w-8 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 active:scale-95 shadow-sm transition-all duration-200 ${
          showMenu ? 'opacity-100 bg-slate-100 text-slate-800' : 'opacity-0 group-hover:opacity-100'
        }`}
        title="Lựa chọn"
        type="button"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm7 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm7 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/>
        </svg>
      </button>

      {showMenu && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-white border border-slate-100 rounded-xl shadow-lg py-1 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <button
            onClick={() => {
              onDelete(messageId);
              setShowMenu(false);
            }}
            className="w-full px-3 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors flex items-center gap-2 font-medium"
            type="button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
            Thu hồi
          </button>
        </div>
      )}
    </div>
  );
}

export function MessageBubble({ item, showTimeSeparator, timeSeparatorLabel, isLastRead, recipientAvatarUrl, recipientName, isGroup, onDelete }: MessageBubbleProps) {
  const router = useRouter();
  const hasMedia = !item.isDeleted && Boolean(item.mediaUrl);
  const isVideo = hasMedia && (
    item.mediaType?.toLowerCase().includes('video') ||
    item.mediaUrl?.toLowerCase().endsWith('.mp4') ||
    item.mediaUrl?.toLowerCase().endsWith('.webm') ||
    item.mediaUrl?.toLowerCase().endsWith('.mov') ||
    item.mediaUrl?.toLowerCase().endsWith('.avi') ||
    item.mediaUrl?.toLowerCase().endsWith('.mkv')
  );
  const sharedPost = !item.isDeleted ? parseSharedPostLink(item.body) : null;
  const displayText = item.isDeleted
    ? 'Tin nhắn đã bị thu hồi'
    : (sharedPost ? sharedPost.displayText : item.body);
  const hasText = Boolean(displayText?.trim());
  const isOutgoing = !item.incoming;

  const handleOpenPost = useCallback((postId: string) => {
    router.push(`/?postId=${postId}`);
  }, [router]);

  return (
    <>
      {/* Time separator: shown when messages are > 15 min apart */}
      {showTimeSeparator && timeSeparatorLabel && (
        <div className="flex items-center gap-3 py-2">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="shrink-0 text-xs font-medium text-slate-400">
            {timeSeparatorLabel}
          </span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>
      )}

      <div className={`group relative max-w-[78%] flex items-center gap-2 ${item.incoming ? 'self-start' : 'self-end flex-row-reverse'}`}>
        <div className="flex flex-col">
          {/* Sender name for group chat incoming messages */}
          {isGroup && item.incoming && item.senderName ? (
            <p className="text-xs font-semibold text-[#4A9FD8] mb-1 ml-3">
              {item.senderName}
            </p>
          ) : null}
          <div
            className={`overflow-hidden rounded-[24px] ${
              hasMedia && !hasText && !sharedPost
                ? 'p-0'
                : item.isDeleted
                  ? 'bg-slate-100 border border-slate-200 mt-1'
                  : item.incoming
                    ? 'bg-[#F1F5F9] mt-1'
                    : 'bg-[#0F172A]'
            }`}
          >
            {/* Media preview */}
            {hasMedia && item.mediaUrl && (
              <div className={`${hasText || sharedPost ? 'mb-2.5' : ''} overflow-hidden ${hasMedia && !hasText && !sharedPost ? 'rounded-[24px]' : 'rounded-[16px]'}`}>
                {isVideo ? (
                  <video
                    src={resolveMediaSrc(item.mediaUrl)}
                    controls
                    className="block max-h-[320px] w-full bg-black object-contain"
                  />
                ) : (
                  <img
                    src={resolveMediaSrc(item.mediaUrl)}
                    alt="Ảnh đính kèm"
                    className="block max-h-[320px] w-full object-cover"
                  />
                )}
              </div>
            )}

            {/* Text body */}
            {hasText && (
              <ThemedText
                as="p"
                className={`text-[15px] leading-6 px-4 py-3 ${
                  item.isDeleted
                    ? 'text-slate-400 italic font-medium'
                    : item.incoming
                      ? 'text-slate-700'
                      : 'text-white'
                }`}
              >
                {displayText}
              </ThemedText>
            )}

            {/* Shared post card */}
            {sharedPost && (
              <button
                onClick={() => handleOpenPost(sharedPost.postId)}
                className={`mx-2 mb-2 block w-[calc(100%-16px)] rounded-[16px] border text-left transition-colors ${
                  item.incoming
                    ? 'border-slate-200/60 bg-white hover:bg-slate-50'
                    : 'border-white/10 bg-white/10 hover:bg-white/20'
                }`}
              >
                <div className="flex items-center gap-2.5 px-3.5 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#4A9FD8]/10">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={item.incoming ? '#4A9FD8' : '#fff'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <ThemedText
                      as="p"
                      className={`text-[13px] font-semibold truncate ${item.incoming ? 'text-slate-700' : 'text-white/90'}`}
                    >
                      Bài viết được chia sẻ
                    </ThemedText>
                    <ThemedText
                      as="p"
                      className={`text-[12px] truncate ${item.incoming ? 'text-slate-400' : 'text-white/50'}`}
                    >
                      Nhấn để xem bài viết
                    </ThemedText>
                  </div>
                </div>
              </button>
            )}
          </div>
          {/* Read receipt (outgoing only), no per-message time */}
          {isOutgoing && (
            <div className="mt-1 flex items-center justify-end">
              {(isLastRead || (!item.isRead && !item.pending) || item.pending) && (
                <ReadReceiptIcon isRead={isLastRead} pending={item.pending} avatarUrl={recipientAvatarUrl} />
              )}
            </div>
          )}
        </div>

        {/* Nút tùy chọn tin nhắn khi hover (chỉ với tin nhắn gửi đi của bản thân, chưa bị xóa và không ở trạng thái đang gửi) */}
        {isOutgoing && !item.isDeleted && !item.pending && onDelete && (
          <MessageOptions messageId={item.id} onDelete={onDelete} />
        )}
      </div>
    </>
  );
}
