import { PropsWithChildren, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ThemedView className="rounded-3xl border border-slate-200 bg-white px-4 py-4">
      <Pressable
        style={styles.heading}
        onPress={() => setIsOpen((value) => !value)}
        android_ripple={{ color: '#E2E8F0' }}>
        <IconSymbol
          name="chevron.right"
          size={18}
          weight="medium"
          color="#64748B"
          style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}
        />

        <ThemedText type="defaultSemiBold">{title}</ThemedText>
      </Pressable>
      {isOpen && <ThemedView className="mt-3 ml-6" style={styles.content}>{children}</ThemedView>}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  content: {
    gap: 8,
  },
});
