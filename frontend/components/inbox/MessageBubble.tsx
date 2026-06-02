import { View, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { API_URL } from '@/lib/api';
import { ThemedText } from '@/components/themed-text';
import { SharedPostPreview } from './SharedPostPreview';

export type MessageBubbleData = {
  id: string;
  body: string | null;
  time: string;
  incoming?: boolean;
  senderName?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
};

export function MessageBubble({ item, isGroup }: { item: MessageBubbleData; isGroup?: boolean }) {
  const getAbsoluteUrl = (url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const api = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${api}${path}`;
  };

  let sharedPostId: string | null = null;
  let displayText = item.body;

  if (item.body) {
    const postMatch = item.body.match(/\/post\/(\d+)/);
    if (postMatch) {
      sharedPostId = postMatch[1];
      // Thay thế phần text rập khuôn bằng một câu tự nhiên hơn hoặc để trống nếu muốn chỉ hiện Card
      // Xóa các mẫu "[Bài viết] Xem bài viết của..." cũ và mới
      displayText = item.body.replace(/\[Bài viết\].*?\/post\/\d+/, '').trim();
    }
  }

  return (
    <View className={`max-w-[88%] ${item.incoming ? 'self-start' : 'self-end'}`}>
      {/* Sender name for group chat incoming messages */}
      {isGroup && item.incoming && item.senderName ? (
        <ThemedText className="text-xs font-semibold text-[#4A9FD8] mb-1 ml-3">
          {item.senderName}
        </ThemedText>
      ) : null}
      <View className={`rounded-[24px] overflow-hidden ${item.incoming ? 'bg-[#F1F5F9]' : 'bg-[#4A9FD8]'}`}>
        {item.mediaUrl ? (
          <Image
            source={{ uri: getAbsoluteUrl(item.mediaUrl) }}
            style={{ width: 260, height: 195 }}
            contentFit="cover"
          />
        ) : null}
        
        {displayText ? (
          <View className="px-4 py-3">
            <ThemedText className={`text-[15px] leading-6 font-medium ${item.incoming ? 'text-slate-800' : 'text-white'}`}>
              {displayText}
            </ThemedText>
          </View>
        ) : null}

        {sharedPostId && (
          <View className={`px-2 pb-2 pt-1 ${!displayText ? 'pt-2' : ''}`}>
            <SharedPostPreview postId={sharedPostId} />
          </View>
        )}
      </View>
      <ThemedText className={`mt-1.5 text-[10px] font-bold text-slate-400 px-1 ${item.incoming ? 'text-left' : 'text-right'}`}>
        {item.time}
      </ThemedText>
    </View>
  );
}

