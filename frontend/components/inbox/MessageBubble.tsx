import { Image, View } from 'react-native';
import { API_URL } from '@/lib/api';

import { ThemedText } from '@/components/themed-text';

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
    // Ghép với API_URL của backend
    return `${API_URL}${url}`;
  };

  return (
    <View className={`max-w-[88%] ${item.incoming ? 'self-start' : 'self-end'}`}>
      <View className={`rounded-[24px] overflow-hidden ${item.incoming ? 'bg-[#F1F5F9]' : 'bg-[#4A9FD8]'}`}>
        {item.mediaUrl ? (
          <Image
            source={{ uri: getAbsoluteUrl(item.mediaUrl) }}
            style={{ width: 240, height: 180, resizeMode: 'cover' }}
          />
        ) : null}
        {item.body ? (
          <View className="px-4 py-3">
            <ThemedText className={`text-[15px] leading-6 ${item.incoming ? 'text-slate-700' : 'text-white'}`}>
              {item.body}
            </ThemedText>
          </View>
        ) : null}
      </View>
      <ThemedText className={`mt-2 text-xs text-slate-400 ${item.incoming ? 'text-left' : 'text-right'}`}>
        {item.time}
      </ThemedText>
    </View>
  );
}

