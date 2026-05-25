import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { API_URL } from '@/lib/api';
import type { AuthUser } from '@/lib/auth';
import type { Story } from '@/lib/types';

export type StoryGroup = {
  authorId: string | number;
  authorName: string;
  authorInitials: string;
  avatarUrl: string | null;
  stories: Story[];
  hasUnviewed: boolean;
  latestStory: Story;
};

export function groupStoriesByAuthor(stories: Story[]): StoryGroup[] {
  const groups = new Map<string | number, StoryGroup>();

  stories.forEach((story) => {
    const authorId = story.user_id;
    const authorName = `${story.author.first_name} ${story.author.last_name}`.trim();
    const authorInitials = `${story.author.first_name?.[0] || ''}${story.author.last_name?.[0] || ''}`.toUpperCase() || 'US';
    const avatarUrl = story.author.avatar_url;

    const existing = groups.get(authorId);
    if (existing) {
      existing.stories.push(story);
      if (!story.is_viewed) {
        existing.hasUnviewed = true;
      }
      if (new Date(story.created_at) > new Date(existing.latestStory.created_at)) {
        existing.latestStory = story;
      }
    } else {
      groups.set(authorId, {
        authorId,
        authorName,
        authorInitials,
        avatarUrl,
        stories: [story],
        hasUnviewed: !story.is_viewed,
        latestStory: story,
      });
    }
  });

  return Array.from(groups.values());
}

type StoryStripProps = {
  currentUser: AuthUser | null;
  stories: Story[];
  onImageSelected: (uri: string) => void;
  onOpenStoryGroup: (group: StoryGroup) => void;
};

export function StoryStrip({ currentUser, stories, onImageSelected, onOpenStoryGroup }: StoryStripProps) {
  const storyGroups = groupStoriesByAuthor(stories);

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Quyền truy cập', 'Ứng dụng cần quyền truy cập thư viện ảnh để tạo tin mới.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        onImageSelected(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể mở thư viện ảnh.');
      console.error(error);
    }
  };

  const myInitials = currentUser
    ? `${currentUser.first_name?.[0] || ''}${currentUser.last_name?.[0] || ''}`.toUpperCase()
    : 'US';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <ThemedText style={styles.title}>Tin</ThemedText>
          <ThemedText style={styles.subtitle}>Xem nhanh khoảnh khắc từ bạn bè</ThemedText>
        </View>
        <Pressable style={styles.createBtn} onPress={handlePickImage}>
          <ThemedText style={styles.createBtnText}>Tạo tin</ThemedText>
        </Pressable>
      </View>

      <FlatList
        horizontal
        data={storyGroups}
        keyExtractor={(item) => String(item.authorId)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Pressable style={styles.createCard} onPress={handlePickImage}>
            <View style={styles.myAvatarContainer}>
              {currentUser?.avatar_url ? (
                <Image
                  source={{
                    uri: currentUser.avatar_url.startsWith('http')
                      ? currentUser.avatar_url
                      : `${API_URL}${currentUser.avatar_url}`,
                  }}
                  style={styles.myAvatarImage}
                />
              ) : (
                <View style={styles.myAvatarPlaceholder}>
                  <ThemedText style={styles.myAvatarText}>{myInitials}</ThemedText>
                </View>
              )}
            </View>
            <View style={styles.plusIconBg}>
              <MaterialIcons name="add" size={16} color="#FFFFFF" />
            </View>
            <ThemedText style={styles.createCardText}>Tạo tin</ThemedText>
          </Pressable>
        }
        renderItem={({ item }) => {
          const mediaUrl = item.latestStory.file_url.startsWith('http')
            ? item.latestStory.file_url
            : `${API_URL}${item.latestStory.file_url}`;

          const avatarUrl = item.avatarUrl
            ? (item.avatarUrl.startsWith('http') ? item.avatarUrl : `${API_URL}${item.avatarUrl}`)
            : null;

          return (
            <Pressable style={styles.storyCard} onPress={() => onOpenStoryGroup(item)}>
              <Image source={{ uri: mediaUrl }} style={styles.storyBgImage} />
              <View style={styles.cardOverlay} />

              <View
                style={[
                  styles.avatarWrapper,
                  item.hasUnviewed ? styles.avatarWrapperUnviewed : styles.avatarWrapperViewed,
                ]}
              >
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.authorAvatar} />
                ) : (
                  <View style={styles.authorAvatarFallback}>
                    <ThemedText style={styles.fallbackText}>{item.authorInitials}</ThemedText>
                  </View>
                )}
              </View>

              <ThemedText numberOfLines={1} style={styles.authorName}>
                {item.authorName}
              </ThemedText>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#E4E8EE',
    padding: 16,
    marginVertical: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.04,
    shadowRadius: 40,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  createBtn: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(74, 159, 216, 0.12)',
  },
  createBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A9FD8',
  },
  listContent: {
    paddingRight: 16,
    alignItems: 'center',
  },
  createCard: {
    position: 'relative',
    height: 180,
    width: 110,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E4E8EE',
    backgroundColor: '#F1F5F9',
    marginRight: 12,
    overflow: 'hidden',
    alignItems: 'center',
  },
  myAvatarContainer: {
    height: 120,
    width: '100%',
    backgroundColor: '#D9ECF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  myAvatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  myAvatarPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  myAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4A9FD8',
  },
  plusIconBg: {
    position: 'absolute',
    top: 102,
    alignSelf: 'center',
    height: 32,
    width: 32,
    borderRadius: 16,
    backgroundColor: '#4A9FD8',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createCardText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginTop: 22,
  },
  storyCard: {
    position: 'relative',
    height: 180,
    width: 110,
    borderRadius: 24,
    marginRight: 12,
    overflow: 'hidden',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#0F172A',
  },
  storyBgImage: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: 'cover',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
  },
  avatarWrapper: {
    height: 38,
    width: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  avatarWrapperUnviewed: {
    borderColor: '#4A9FD8',
  },
  avatarWrapperViewed: {
    borderColor: '#64748B',
  },
  authorAvatar: {
    height: 32,
    width: 32,
    borderRadius: 16,
  },
  authorAvatarFallback: {
    height: 32,
    width: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(74, 159, 216, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4A9FD8',
  },
  authorName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
