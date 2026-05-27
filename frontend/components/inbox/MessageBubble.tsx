import { Image, View, Pressable } from 'react-native';
import { API_URL } from '@/lib/api';
import { ThemedText } from '@/components/themed-text';
import { SharedPostPreview } from './SharedPostPreview';

export type MessageBubbleData = {
  id: string;
  body: string | null;
  time: string;
  incoming?: boolean;
  mediaUrl?: string | null;
  mediaType?: string | null;
};

export function MessageBubble({ item }: { item: MessageBubbleData }) {
  const getAbsoluteUrl = (url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${API_URL}${url}`;
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
      <View className={`rounded-[24px] overflow-hidden ${item.incoming ? 'bg-[#F1F5F9]' : 'bg-[#0F172A]'}`}>
        {item.mediaUrl ? (
          <Image
            source={{ uri: getAbsoluteUrl(item.mediaUrl) }}
            style={{ width: 240, height: 180, resizeMode: 'cover' }}
          />
        ) : null}
        
        {displayText ? (
          <View className="px-4 py-3 pb-2">
            <ThemedText className={`text-[15px] leading-6 ${item.incoming ? 'text-slate-700' : 'text-white'}`}>
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
      <ThemedText className={`mt-2 text-xs text-slate-400 ${item.incoming ? 'text-left' : 'text-right'}`}>
        {item.time}
      </ThemedText>
    </View>
  );
}

