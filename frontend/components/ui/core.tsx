import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { View, Image } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { API_URL } from '@/lib/api';

export const surfaceClass = 'rounded-[28px] border border-[#E4E8EE] bg-white';

export function Avatar({ initials, soft = false, avatarUrl }: { initials: string; soft?: boolean; avatarUrl?: string | null }) {
  if (avatarUrl) {
    const uri = avatarUrl.startsWith('http') ? avatarUrl : `${API_URL}${avatarUrl}`;
    return (
      <Image 
        source={{ uri }} 
        className="h-14 w-14 rounded-[22px]" 
        style={{ width: 56, height: 56, borderRadius: 22 }}
      />
    );
  }
  return (
    <View className={`h-14 w-14 items-center justify-center rounded-[22px] ${soft ? 'bg-[#D9ECF8]' : 'bg-[#EAF4FB]'}`}>
      <ThemedText className="text-base font-semibold tracking-[0.5px] text-slate-900">{initials}</ThemedText>
    </View>
  );
}

export function ActionBubble({ icon, filled = false }: { icon: keyof typeof MaterialIcons.glyphMap; filled?: boolean }) {
  return (
    <View className={`h-12 w-12 items-center justify-center rounded-[18px] ${filled ? 'bg-[#0A0A0A]' : 'bg-[#F7F8FA]'}`}>
      <MaterialIcons color={filled ? '#FFFFFF' : '#666666'} name={icon} size={21} />
    </View>
  );
}
