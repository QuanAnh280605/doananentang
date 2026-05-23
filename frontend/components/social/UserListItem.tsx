import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View, ActivityIndicator, Alert } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { followUser, unfollowUser, type FollowUser } from '@/lib/auth';

interface UserListItemProps {
  user: FollowUser;
}

export function UserListItem({ user }: UserListItemProps) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(user.is_following);
  const [isLoading, setIsLoading] = useState(false);

  const handlePressRow = () => {
    router.push({
      pathname: '/profile/[userId]',
      params: { userId: user.id, name: user.full_name, bio: user.bio || '' },
    });
  };

  const handleToggleFollow = async () => {
    if (isLoading) return;
    
    // Optimistic update
    const previousState = isFollowing;
    setIsFollowing(!previousState);
    setIsLoading(true);

    try {
      if (previousState) {
        await unfollowUser(user.id);
      } else {
        await followUser(user.id);
      }
    } catch (error) {
      // Revert if error
      setIsFollowing(previousState);
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái theo dõi lúc này.');
    } finally {
      setIsLoading(false);
    }
  };

  const initials = (user.full_name || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <Pressable
      onPress={handlePressRow}
      className="flex-row items-center justify-between gap-3 bg-app-surface px-4 py-3 active:bg-slate-50"
    >
      <View className="flex-row flex-1 items-center gap-3">
        {/* Avatar */}
        <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#EAF4FB]">
          {user.avatar_url ? (
            <Image
              source={{ uri: user.avatar_url }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          ) : (
            <ThemedText className="text-lg font-semibold tracking-[0.5px] text-slate-900">
              {initials}
            </ThemedText>
          )}
        </View>

        {/* Info */}
        <View className="flex-1 justify-center">
          <ThemedText className="text-[16px] font-semibold text-slate-950" numberOfLines={1}>
            {user.full_name}
          </ThemedText>
          {user.bio ? (
            <ThemedText className="mt-0.5 text-[14px] text-slate-500" numberOfLines={1}>
              {user.bio}
            </ThemedText>
          ) : null}
        </View>
      </View>

      {/* Action Button */}
      <Pressable
        onPress={handleToggleFollow}
        disabled={isLoading}
        className={`min-w-[100px] h-9 flex-row items-center justify-center rounded-[18px] px-3 active:opacity-80 ${
          isFollowing ? 'bg-[#F1F5F9]' : 'bg-[#0A0A0A]'
        } ${isLoading ? 'opacity-70' : ''}`}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={isFollowing ? '#0F172A' : '#FFFFFF'} />
        ) : (
          <ThemedText
            className={`text-[14px] font-medium ${
              isFollowing ? 'text-slate-900' : 'text-white'
            }`}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </ThemedText>
        )}
      </Pressable>
    </Pressable>
  );
}
