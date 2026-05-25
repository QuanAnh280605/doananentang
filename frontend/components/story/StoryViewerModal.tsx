import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { API_URL, markStoryViewed } from '@/lib/api';
import type { Story } from '@/lib/types';
import type { StoryGroup } from './StoryStrip';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type StoryViewerModalProps = {
  visible: boolean;
  onClose: () => void;
  initialGroup: StoryGroup | null;
  allGroups: StoryGroup[];
  onStoryViewed: (storyId: string | number) => void;
};

export function StoryViewerModal({
  visible,
  onClose,
  initialGroup,
  allGroups,
  onStoryViewed,
}: StoryViewerModalProps) {
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  const progressAnim = useRef(new Animated.Value(0)).current;

  // Đồng bộ index khi mở modal với group được chọn
  useEffect(() => {
    if (visible && initialGroup) {
      const idx = allGroups.findIndex((g) => String(g.authorId) === String(initialGroup.authorId));
      if (idx !== -1) {
        setCurrentGroupIndex(idx);
        setCurrentStoryIndex(0);
      }
    }
  }, [visible, initialGroup, allGroups]);

  const activeGroup = allGroups[currentGroupIndex];
  const stories = activeGroup?.stories || [];
  const currentStory: Story | undefined = stories[currentStoryIndex];

  // Tự động gọi API đánh dấu đã xem khi story xuất hiện
  useEffect(() => {
    if (currentStory && visible) {
      if (!currentStory.is_viewed) {
        markStoryViewed(currentStory.id)
          .then(() => {
            onStoryViewed(currentStory.id);
          })
          .catch((err) => console.error('Lỗi khi đánh dấu đã xem story:', err));
      }
    }
  }, [currentStory, visible, onStoryViewed]);

  const handleNext = React.useCallback(() => {
    if (currentStoryIndex < stories.length - 1) {
      // Chuyển sang story tiếp theo trong cùng group
      setCurrentStoryIndex(currentStoryIndex + 1);
    } else if (currentGroupIndex < allGroups.length - 1) {
      // Hết story trong group, chuyển sang group tiếp theo
      setCurrentGroupIndex(currentGroupIndex + 1);
      setCurrentStoryIndex(0);
    } else {
      // Hết tất cả story, đóng viewer
      onClose();
    }
  }, [currentStoryIndex, stories.length, currentGroupIndex, allGroups.length, onClose]);

  const handlePrev = React.useCallback(() => {
    if (currentStoryIndex > 0) {
      // Quay lại story trước trong cùng group
      setCurrentStoryIndex(currentStoryIndex - 1);
    } else if (currentGroupIndex > 0) {
      // Hết story, quay lại group trước đó
      const prevGroupIndex = currentGroupIndex - 1;
      const prevGroupStories = allGroups[prevGroupIndex].stories;
      setCurrentGroupIndex(prevGroupIndex);
      setCurrentStoryIndex(prevGroupStories.length - 1);
    } else {
      // Đầu danh sách, reset lại tin hiện tại
      progressAnim.setValue(0);
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 5000,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) {
          handleNext();
        }
      });
    }
  }, [currentStoryIndex, currentGroupIndex, allGroups, progressAnim, handleNext]);

  // Chạy animation thanh tiến trình
  useEffect(() => {
    if (!visible || !currentStory) return;

    progressAnim.setValue(0);
    const animation = Animated.timing(progressAnim, {
      toValue: 1,
      duration: 5000, // 5 giây
      useNativeDriver: false,
    });

    animation.start(({ finished }) => {
      if (finished) {
        handleNext();
      }
    });

    return () => {
      animation.stop();
    };
  }, [currentGroupIndex, currentStoryIndex, visible, currentStory, handleNext, progressAnim]);

  if (!visible || !activeGroup || !currentStory) return null;

  const mediaUrl = currentStory.file_url.startsWith('http')
    ? currentStory.file_url
    : `${API_URL}${currentStory.file_url}`;

  const avatarUrl = activeGroup.avatarUrl
    ? (activeGroup.avatarUrl.startsWith('http') ? activeGroup.avatarUrl : `${API_URL}${activeGroup.avatarUrl}`)
    : null;

  // Tính toán nhãn thời gian đăng
  const formatTimeLabel = (createdAt: string) => {
    const diffMs = new Date().getTime() - new Date(createdAt).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    return `${Math.floor(diffHours / 24)} ngày trước`;
  };

  return (
    <Modal animationType="fade" transparent={false} visible={visible} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Ảnh Story nền */}
        <Image source={{ uri: mediaUrl }} style={styles.storyImage} />

        {/* Lớp phủ đen mờ */}
        <View style={styles.overlay} />

        {/* Nội dung bên trên */}
        <SafeAreaView style={styles.contentSafeArea}>
          <View style={styles.header}>
            {/* Hệ thống thanh tiến trình */}
            <View style={styles.progressContainer}>
              {stories.map((story, index) => {
                let widthPercent: any = '0%';
                if (index < currentStoryIndex) {
                  widthPercent = '100%';
                } else if (index === currentStoryIndex) {
                  widthPercent = progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  });
                }

                return (
                  <View key={String(story.id)} style={styles.progressBarBackground}>
                    <Animated.View style={[styles.progressBarActive, { width: widthPercent }]} />
                  </View>
                );
              })}
            </View>

            {/* Thông tin tác giả và nút đóng */}
            <View style={styles.authorRow}>
              <View style={styles.authorInfo}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <ThemedText style={styles.avatarFallbackText}>{activeGroup.authorInitials}</ThemedText>
                  </View>
                )}
                <View style={styles.authorText}>
                  <ThemedText style={styles.authorName}>{activeGroup.authorName}</ThemedText>
                  <ThemedText style={styles.timeText}>{formatTimeLabel(currentStory.created_at)}</ThemedText>
                </View>
              </View>
              <Pressable style={styles.closeButton} onPress={onClose}>
                <MaterialIcons name="close" size={24} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          {/* Vùng chạm điều hướng trái/phải */}
          <View style={styles.navigationArea}>
            <Pressable style={styles.navLeft} onPress={handlePrev} />
            <Pressable style={styles.navRight} onPress={handleNext} />
          </View>

          {/* Caption ở dưới cùng */}
          {currentStory.caption ? (
            <View style={styles.captionContainer}>
              <ThemedText style={styles.captionText}>{currentStory.caption}</ThemedText>
            </View>
          ) : null}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  storyImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    resizeMode: 'cover',
    position: 'absolute',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  contentSafeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 24,
  },
  progressContainer: {
    flexDirection: 'row',
    height: 3,
    gap: 4,
    marginBottom: 16,
  },
  progressBarBackground: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarActive: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(74, 159, 216, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  avatarFallbackText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A9FD8',
  },
  authorText: {
    justifyContent: 'center',
  },
  authorName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  timeText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navigationArea: {
    flex: 1,
    flexDirection: 'row',
  },
  navLeft: {
    flex: 1,
    height: '100%',
  },
  navRight: {
    flex: 1,
    height: '100%',
  },
  captionContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 24,
    marginHorizontal: 16,
    marginBottom: Platform.OS === 'ios' ? 16 : 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  captionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    textAlign: 'center',
  },
});
