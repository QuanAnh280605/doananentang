import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { View } from 'react-native';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { API_URL } from '@/lib/api';

export const surfaceClass = 'rounded-[32px] border border-app-border bg-app-surface';
export const elevatedSurfaceClass = 'rounded-[32px] border border-app-border bg-app-surface shadow-sm';
export const mutedSurfaceClass = 'rounded-[32px] bg-app-muted';

export function Avatar({ initials, soft = false, avatarUrl }: { initials: string; soft?: boolean; avatarUrl?: string | null }) {
  if (avatarUrl) {
    const uri = avatarUrl.startsWith('http') ? avatarUrl : `${API_URL}${avatarUrl}`;
    return (
      <Image 
        source={{ uri }} 
        className="h-14 w-14 rounded-full" 
        style={{ width: 56, height: 56, borderRadius: 28 }}
      />
    );
  }
  return (
    <View className={`h-14 w-14 items-center justify-center rounded-full ${soft ? 'bg-app-accent/20' : 'bg-app-accent-soft'}`}>
      <ThemedText className="text-base font-semibold tracking-[0.5px] text-slate-900">{initials}</ThemedText>
    </View>
  );
}

export function ActionBubble({ icon, filled = false }: { icon: keyof typeof MaterialIcons.glyphMap; filled?: boolean }) {
  return (
    <View className={`h-12 w-12 items-center justify-center rounded-full ${filled ? 'bg-app-text' : 'bg-app-muted'}`}>
      <MaterialIcons color={filled ? '#FFFFFF' : '#666666'} name={icon} size={21} />
    </View>
  );
}
