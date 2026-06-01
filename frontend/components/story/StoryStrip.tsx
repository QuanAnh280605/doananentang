import React from 'react';
import { View, FlatList, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { AuthUser } from '@/lib/auth';
import { groupStoriesByAuthor, type StoryItem } from './storyState';

type StoryStripProps = {
  currentUser: AuthUser | null;
  stories: StoryItem[];
  onCreateStory: () => void;
  onOpenStory: (storyId: string) => void;
};

function getInitials(user: AuthUser | null): string {
  if (!user) return 'US';
  return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'US';
}

export function StoryStrip({ currentUser, stories, onCreateStory, onOpenStory }: StoryStripProps) {
  const userAvatarUrl = currentUser?.avatar_url
    ? currentUser.avatar_url.startsWith('http')
      ? currentUser.avatar_url
      : `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'}${currentUser.avatar_url}`
    : null;
  const initials = getInitials(currentUser);
  const storyGroups = groupStoriesByAuthor(stories);

  return (
    <ThemedView className="mb-2 bg-white py-4 rounded-[24px] border border-slate-200">
      <View className="mb-4 flex-row items-center justify-between px-4">
        <View>
          <ThemedText className="text-[20px] font-bold text-slate-900 tracking-tight">
            Tin
          </ThemedText>
          <ThemedText className="text-[13px] text-slate-500 font-medium">
            Xem nhanh khoảnh khắc từ bạn bè
          </ThemedText>
        </View>
        <Pressable 
          className="bg-blue-50 px-3 py-1.5 rounded-[16px] active:opacity-70"
          onPress={onCreateStory}
        >
          <ThemedText className="text-[14px] font-bold text-[#4A9FD8]">
            Tạo tin
          </ThemedText>
        </Pressable>
      </View>

      <FlatList
        horizontal
        data={storyGroups}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.authorId}
        contentContainerStyle={{ paddingLeft: 16, paddingRight: 16 }}
        ListHeaderComponent={
          <Pressable 
            className="mr-3 h-[200px] w-[116px] overflow-hidden rounded-[20px] border border-slate-200 bg-white active:opacity-90"
            onPress={onCreateStory}
          >
            <View className="h-[130px] bg-[#EAF4FB] items-center justify-center">
              {userAvatarUrl ? (
                <Image source={{ uri: userAvatarUrl }} className="h-full w-full" contentFit="cover" />
              ) : (
                <ThemedText className="text-[28px] font-bold text-[#4A9FD8]">{initials}</ThemedText>
              )}
            </View>
            <View className="absolute left-1/2 top-[112px] ml-[-18px] h-[36px] w-[36px] items-center justify-center rounded-full border-[3px] border-white bg-[#4A9FD8]">
              <MaterialIcons name="add" size={20} color="#FFFFFF" />
            </View>
            <View className="mt-7 items-center px-2">
              <ThemedText className="text-[13px] font-bold text-slate-900 text-center">Tạo tin</ThemedText>
            </View>
          </Pressable>
        }
        renderItem={({ item: group }) => {
          const story = group.latestStory;
          
          // Tìm story cũ nhất chưa xem, hoặc nếu đã xem hết thì lấy story cũ nhất
          const oldestUnviewed = [...group.stories].reverse().find(s => !s.isViewed);
          const oldestStory = group.stories[group.stories.length - 1];
          const storyToOpen = oldestUnviewed || oldestStory;
          
          return (
            <Pressable 
              className="mr-3 h-[200px] w-[116px] overflow-hidden rounded-[20px] bg-slate-900 active:opacity-90"
              onPress={() => onOpenStory(storyToOpen.id)}
            >
              <Image source={{ uri: story.mediaUrl }} className="absolute h-full w-full opacity-90" contentFit="cover" />
              <View className="absolute bottom-0 left-0 right-0 h-28" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} />
              
              <View className="absolute left-2.5 top-2.5 h-11 w-11 items-center justify-center rounded-full bg-white border-[3px]" style={{ borderColor: story.ringColor || '#4A9FD8' }}>
                {story.avatarUrl ? (
                  <Image source={{ uri: story.avatarUrl }} style={{ width: 36, height: 36, borderRadius: 18 }} contentFit="cover" />
                ) : (
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#EAF4FB', alignItems: 'center', justifyContent: 'center' }}>
                    <ThemedText style={{ fontSize: 12, fontWeight: '700', color: story.ringColor || '#4A9FD8' }}>{story.authorInitials}</ThemedText>
                  </View>
                )}
              </View>
              
              <View className="absolute bottom-3 left-2 right-2">
                <ThemedText className="text-[13px] font-bold text-white leading-tight" numberOfLines={2}>
                  {story.authorName}
                </ThemedText>
              </View>
            </Pressable>
          );
        }}
      />
    </ThemedView>
  );
}
