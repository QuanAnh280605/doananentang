import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export type ProfilePanelStatData = {
  label: string;
  value: string;
};

export function ProfilePanelStat({ item }: { item: ProfilePanelStatData }) {
  return (
    <View className="rounded-[22px] bg-[#F8FAFC] px-4 py-4">
      <ThemedText className="text-xs font-semibold uppercase tracking-[1.4px] text-slate-400">{item.label}</ThemedText>
      <ThemedText className="mt-2 text-base font-medium text-slate-900">{item.value}</ThemedText>
    </View>
  );
}
