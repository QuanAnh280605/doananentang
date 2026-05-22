'use client';

import { ThemedText } from '@/components/ui/ThemedText';
import { API_URL } from '@/lib/api';

export type MessageBubbleData = {
  id: string;
  body: string;
  time: string;
  incoming?: boolean;
  mediaUrl?: string | null;
  mediaType?: string | null;
};

function resolveMediaSrc(url: string): string {
  if (!url) return url;
  return url.startsWith('http') ? url : `${API_URL}${url}`;
}

export function MessageBubble({ item }: { item: MessageBubbleData }) {
  const hasMedia = Boolean(item.mediaUrl);
  const isVideo = hasMedia && item.mediaType?.startsWith('video/');
  const hasText = Boolean(item.body?.trim());

  return (
    <div className={`max-w-[78%] ${item.incoming ? 'self-start' : 'self-end'}`}>
      <div
        className={`overflow-hidden rounded-[24px] ${
          hasMedia && !hasText
            ? 'p-0'
            : item.incoming
              ? 'bg-[#F1F5F9] px-4 py-3'
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
      <ThemedText
        as="p"
        className={`mt-2 text-xs text-slate-400 ${item.incoming ? 'text-left' : 'text-right'}`}
      >
        {item.time}
      </ThemedText>
    </div>
  );
}
