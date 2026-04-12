import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export type MessageBubbleData = {
  id: string;
  body: string;
  time: string;
  incoming?: boolean;
};

export function MessageBubble({ item }: { item: MessageBubbleData }) {
  return (
    <View className={`max-w-[88%] ${item.incoming ? 'self-start' : 'self-end'}`}>
      <View className={`rounded-[24px] px-4 py-3 ${item.incoming ? 'bg-[#F1F5F9]' : 'bg-[#0F172A]'}`}>
        <ThemedText className={`text-[15px] leading-6 ${item.incoming ? 'text-slate-700' : 'text-white'}`}>
          {item.body}
        </ThemedText>
      </View>
      <ThemedText className={`mt-2 text-xs text-slate-400 ${item.incoming ? 'text-left' : 'text-right'}`}>
        {item.time}
      </ThemedText>
    </View>
  );
}
