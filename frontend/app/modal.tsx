import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export default function ModalScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-slate-50 px-6">
      <View className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6">
        <ThemedText type="eyebrow">Preview</ThemedText>
        <ThemedText type="title" className="mt-3">
          Modal da san sang cho flow moi.
        </ThemedText>
        <ThemedText className="mt-3 text-slate-600">
          Ban co the dung modal nay cho create post, filter, hoac preview profile nho.
        </ThemedText>
        <Link href="/" dismissTo asChild>
          <Pressable className="mt-6">
            <ThemedText type="link">Quay ve man hinh chinh</ThemedText>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}
