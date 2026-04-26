import { ThemedText } from '@/components/ui/ThemedText';

export type ProfilePanelStatData = {
  label: string;
  value: string;
};

export function ProfilePanelStat({ item }: { item: ProfilePanelStatData }) {
  return (
    <div className="rounded-[22px] bg-[#F8FAFC] px-4 py-4">
      <ThemedText as="p" className="text-xs font-semibold uppercase tracking-[1.4px] text-slate-400">{item.label}</ThemedText>
      <ThemedText as="p" className="mt-2 text-base font-medium text-slate-900">{item.value}</ThemedText>
    </div>
  );
}
