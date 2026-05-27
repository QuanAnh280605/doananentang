'use client';

import { ThemedText } from '@/components/ui/ThemedText';
import { API_URL, resolveAvatarUrl } from '@/lib/api';

export type MessageBubbleData = {
  id: string;
  body: string;
  time: string;
  incoming?: boolean;
  mediaUrl?: string | null;
  mediaType?: string | null;
  isRead?: boolean;
  pending?: boolean;
};

type MessageBubbleProps = {
  item: MessageBubbleData;
  showTimeSeparator?: boolean;
  timeSeparatorLabel?: string;
  isLastRead?: boolean;
  recipientAvatarUrl?: string | null;
  recipientName?: string;
};

function resolveMediaSrc(url: string): string {
  if (!url) return url;
  return url.startsWith('http') ? url : `${API_URL}${url}`;
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

export function MessageBubble({ item, showTimeSeparator, timeSeparatorLabel, isLastRead, recipientAvatarUrl, recipientName }: MessageBubbleProps) {
  const hasMedia = Boolean(item.mediaUrl);
  const isVideo = hasMedia && (
    item.mediaType?.toLowerCase().includes('video') ||
    item.mediaUrl?.toLowerCase().endsWith('.mp4') ||
    item.mediaUrl?.toLowerCase().endsWith('.webm') ||
    item.mediaUrl?.toLowerCase().endsWith('.mov') ||
    item.mediaUrl?.toLowerCase().endsWith('.avi') ||
    item.mediaUrl?.toLowerCase().endsWith('.mkv')
  );
  const hasText = Boolean(item.body?.trim());
  const isOutgoing = !item.incoming;

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

      <div className={`max-w-[78%] ${item.incoming ? 'self-start' : 'self-end'}`}>
        <div
          className={`overflow-hidden rounded-[24px] ${
            hasMedia && !hasText
              ? 'p-0'
              : item.incoming
                ? 'bg-[#F1F5F9] px-4 py-3 mt-1'
                : 'bg-[#0F172A] px-4 py-3'
          }`}
        >
          {/* Media preview */}
          {hasMedia && item.mediaUrl && (
            <div className={`${hasText ? 'mb-2.5' : ''} overflow-hidden ${hasMedia && !hasText ? 'rounded-[24px]' : 'rounded-[16px]'}`}>
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
              className={`text-[15px] leading-6 ${item.incoming ? 'text-slate-700' : 'text-white'}`}
            >
              {item.body}
            </ThemedText>
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
    </>
  );
}
