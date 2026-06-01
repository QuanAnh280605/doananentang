import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Modal, Pressable, Dimensions, Animated, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { getNextStoryId, getPreviousStoryId, groupStoriesByAuthor, type StoryItem } from './storyState';
import { markStoryViewed } from '@/lib/api';

const { width, height } = Dimensions.get('window');
const STORY_DURATION = 5000;

type StoryViewerModalProps = {
  visible: boolean;
  stories: StoryItem[];
  initialStoryId: string | null;
  onClose: () => void;
  onStoryViewed?: (storyId: string) => void;
};

export function StoryViewerModal({ visible, stories, initialStoryId, onClose, onStoryViewed }: StoryViewerModalProps) {
  const insets = useSafeAreaInsets();
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Initialize when modal opens
  useEffect(() => {
    if (visible && initialStoryId) {
      setCurrentStoryId(initialStoryId);
      progressAnim.setValue(0);
      setIsPaused(false);
    }
  }, [visible, initialStoryId]);

  // Create a flattened array of stories where each group is ordered oldest to newest
  const orderedStories = useMemo(() => {
    const groups = groupStoriesByAuthor(stories);
    const ordered: StoryItem[] = [];
    for (const g of groups) {
      ordered.push(...[...g.stories].reverse());
    }
    return ordered;
  }, [stories]);

  // Derived state
  const currentStory = useMemo(() => 
    orderedStories.find(s => s.id === currentStoryId) || orderedStories[0],
  [orderedStories, currentStoryId]);

  const currentGroup = useMemo(() => {
    if (!currentStory) return null;
    const groups = groupStoriesByAuthor(stories);
    return groups.find(g => g.authorId === currentStory.authorId) || null;
  }, [stories, currentStory]);

  const currentStoryIndexInGroup = useMemo(() => {
    if (!currentGroup || !currentStory) return 0;
    // Assuming stories are ordered newest to oldest in group, we want to view oldest unviewed first, or whatever order.
    // For simplicity, we just find index in the group's stories array.
    // Wait, typically stories are viewed oldest to newest. Let's just use the array order.
    // In web, stories are reversed to show oldest first in viewer if they were fetched newest first.
    // Let's reverse the group stories so we view them chronologically.
    const chronologicalStories = [...currentGroup.stories].reverse();
    return chronologicalStories.findIndex(s => s.id === currentStory.id);
  }, [currentGroup, currentStory]);

  const chronologicalStoriesInGroup = useMemo(() => {
    if (!currentGroup) return [];
    return [...currentGroup.stories].reverse();
  }, [currentGroup]);

  // Animation & Auto-advance
  useEffect(() => {
    if (!visible || !currentStory || isPaused) {
      progressAnim.stopAnimation();
      return;
    }

    // Mark as viewed
    if (!currentStory.isViewed) {
      markStoryViewed(currentStory.id).catch(() => {});
      if (onStoryViewed) {
        onStoryViewed(currentStory.id);
      }
    }

    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false, // width animation doesn't support native driver easily
    }).start(({ finished }) => {
      if (finished) {
        goToNext();
      }
    });

    return () => {
      progressAnim.stopAnimation();
    };
  }, [currentStoryId, visible, isPaused]);

  const goToNext = () => {
    if (!currentStoryId) return;
    const nextId = getNextStoryId(orderedStories, currentStoryId);
    if (nextId === orderedStories[0]?.id && currentStoryId !== orderedStories[0]?.id) {
      // Wrapped around to first story, meaning we reached the end
      onClose();
    } else if (nextId) {
      setCurrentStoryId(nextId);
    } else {
      onClose();
    }
  };

  const goToPrevious = () => {
    if (!currentStoryId) return;
    const prevId = getPreviousStoryId(orderedStories, currentStoryId);
    
    // If it's the very first story being viewed, just restart it or close
    const currentIndex = orderedStories.findIndex(s => s.id === currentStoryId);
    if (currentIndex === 0) {
      progressAnim.setValue(0);
      // Let it restart
    } else if (prevId) {
      setCurrentStoryId(prevId);
    }
  };

  const handlePress = (e: any) => {
    const x = e.nativeEvent.locationX;
    if (x < width * 0.3) {
      goToPrevious();
    } else {
      goToNext();
    }
  };

  const handleLongPress = () => {
    setIsPaused(true);
  };

  const handlePressOut = () => {
    setIsPaused(false);
  };

  if (!currentStory || !currentGroup) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Background media */}
        <Image 
          source={{ uri: currentStory.mediaUrl }} 
          style={StyleSheet.absoluteFillObject} 
          contentFit="cover" 
        />
        
        {/* Overlay gradient top */}
        <View style={styles.gradientTop} />
        {/* Overlay gradient bottom */}
        <View style={styles.gradientBottom} />

        <SafeAreaView style={styles.safeArea}>
          {/* Progress Bars */}
          <View style={[styles.progressContainer, { marginTop: Platform.OS === 'android' ? insets.top + 10 : 10 }]}>
            {chronologicalStoriesInGroup.map((story, index) => {
              const isActive = index === currentStoryIndexInGroup;
              const isPast = index < currentStoryIndexInGroup;
              
              return (
                <View key={story.id} style={styles.progressTrack}>
                  {isPast && <View style={[styles.progressBar, { width: '100%' }]} />}
                  {isActive && (
                    <Animated.View 
                      style={[
                        styles.progressBar, 
                        {
                          width: progressAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          })
                        }
                      ]} 
                    />
                  )}
                </View>
              );
            })}
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.authorInfo}>
              <View style={[styles.avatarContainer, { borderColor: currentStory.ringColor || '#FFF' }]}>
                {currentStory.avatarUrl ? (
                  <Image source={{ uri: currentStory.avatarUrl }} style={styles.avatar} />
                ) : (
                  <ThemedText style={[styles.avatarInitials, { color: currentStory.ringColor || '#000' }]}>
                    {currentStory.authorInitials}
                  </ThemedText>
                )}
              </View>
              <View style={styles.authorText}>
                <ThemedText style={styles.authorName}>{currentStory.authorName}</ThemedText>
                <ThemedText style={styles.timeLabel}>{currentStory.timeLabel}</ThemedText>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={28} color="#FFF" />
            </Pressable>
          </View>

          {/* Tap Areas */}
          <Pressable 
            style={styles.tapArea}
            onPress={handlePress}
            onLongPress={handleLongPress}
            onPressOut={handlePressOut}
          >
            {/* Caption (if any) */}
            <View style={styles.captionContainer}>
              <ThemedText style={styles.captionText}>{currentStory.text}</ThemedText>
            </View>
          </Pressable>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    gap: 4,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFF',
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  authorText: {
    justifyContent: 'center',
  },
  authorName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  timeLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  closeBtn: {
    padding: 4,
  },
  tapArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  captionContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  captionText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    textShadow: '-1px 1px 10px rgba(0, 0, 0, 0.75)',
  } as any,
});
