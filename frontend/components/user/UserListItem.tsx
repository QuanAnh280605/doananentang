import React from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { ThemedText } from '@/components/themed-text';
import { surfaceClass } from '@/components/ui/core';
import { API_URL } from '@/lib/api';

export type UserListItemData = {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_following?: boolean;
};

type UserListItemProps = {
  user: UserListItemData;
  onPress: (user: UserListItemData) => void;
  showFollowButton?: boolean;
  onFollowPress?: (user: UserListItemData) => void;
};

export function UserListItem({ 
  user, 
  onPress, 
  showFollowButton = false,
  onFollowPress 
}: UserListItemProps) {
  const initials = `${user.first_name?.charAt(0) || ''}${user.last_name?.charAt(0) || ''}`.toUpperCase() || 'US';

  return (
    <Pressable
      className={`flex-row items-center gap-4 p-4 rounded-2xl border border-[#E4E8EE] bg-white active:bg-slate-50 ${surfaceClass}`}
      onPress={() => onPress(user)}
    >
      <View className="h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[#EAF4FB]">
        {user.avatar_url ? (
          <Image
            source={{ uri: user.avatar_url.startsWith('http') ? user.avatar_url : `${API_URL}${user.avatar_url}` }}
            className="h-full w-full"
            style={{ width: 56, height: 56 }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <ThemedText className="text-lg font-semibold text-[#4A9FD8]">
            {initials}
          </ThemedText>
        )}
      </View>
      
      <View className="flex-1">
        <ThemedText className="text-base font-semibold text-slate-900" numberOfLines={1}>
          {user.full_name}
        </ThemedText>
        <ThemedText className="text-sm text-slate-500 mt-0.5" numberOfLines={1}>
          {user.bio || 'Joined recently'}
        </ThemedText>
      </View>

      {showFollowButton && onFollowPress ? (
        <Pressable
          onPress={() => onFollowPress(user)}
          className={`px-4 py-2 rounded-full ${user.is_following ? 'bg-slate-100' : 'bg-[#4A9FD8]'}`}
        >
          <ThemedText className={`text-xs font-bold ${user.is_following ? 'text-slate-600' : 'text-white'}`}>
            {user.is_following ? 'Following' : 'Follow'}
          </ThemedText>
        </Pressable>
      ) : (
        <View className="h-9 w-9 items-center justify-center rounded-full bg-[#EAF4FB]">
          <MaterialIcons name="chevron-right" size={20} color="#4A9FD8" />
        </View>
      )}
    </Pressable>
  );
}
