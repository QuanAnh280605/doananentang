import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { AppTopNav } from '@/components/navigation/AppTopNav';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fetchFollowStatus, followUser, type FollowStatus, unfollowUser } from '@/lib/auth';

const surfaceClass = 'rounded-[28px] border border-[#E4E8EE] bg-white';

function getSingleParam(value: string | string[] | undefined, fallback: string): string {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

export default function UserProfileScreen() {
  const params = useLocalSearchParams<{ userId?: string; name?: string; initials?: string; preview?: string; bio?: string }>();
  const userId = getSingleParam(params.userId, 'unknown');
  const displayName = getSingleParam(params.name, 'Guest profile');
  const initials = getSingleParam(params.initials, displayName.slice(0, 2).toUpperCase() || 'GP');
  const preview = getSingleParam(params.preview, 'Opened from search results.');
  const bio = getSingleParam(params.bio, preview);
  const numericUserId = useMemo(() => {
    const parsed = Number(userId);
    return Number.isFinite(parsed) ? parsed : null;
  }, [userId]);
  const [followStatus, setFollowStatus] = useState<FollowStatus | null>(null);
  const [isLoadingFollowStatus, setIsLoadingFollowStatus] = useState(false);
  const [isSubmittingFollow, setIsSubmittingFollow] = useState(false);
  const [followErrorMessage, setFollowErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (numericUserId === null) {
      setFollowStatus(null);
      return;
    }

    let isActive = true;
    setIsLoadingFollowStatus(true);
    setFollowErrorMessage(null);

    fetchFollowStatus(numericUserId)
      .then((status) => {
        if (isActive) {
          setFollowStatus(status);
        }
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }
        const message = error instanceof Error ? error.message : 'Cannot load follow status right now.';
        setFollowErrorMessage(message);
        setFollowStatus(null);
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingFollowStatus(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [numericUserId]);

  const handleFollowToggle = () => {
    if (numericUserId === null || isSubmittingFollow) {
      return;
    }

    setIsSubmittingFollow(true);
    setFollowErrorMessage(null);

    const request = followStatus?.is_following ? unfollowUser(numericUserId) : followUser(numericUserId);
    request
      .then((status) => {
        setFollowStatus(status);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Cannot update follow status right now.';
        setFollowErrorMessage(message);
      })
      .finally(() => {
        setIsSubmittingFollow(false);
      });
  };

  return (
    <>
      <StatusBar style="dark" />
      <ThemedView className="flex-1 bg-[#F8FAFC]">
        <ScrollView bounces={false} className="flex-1" contentContainerClassName="pb-8">
          <ThemedView className="mx-auto w-full max-w-[1720px] gap-4 px-4 pb-6 pt-4 md:px-6">
            <AppTopNav isTablet searchPlaceholder="Search profile highlights, media, or posts" />

            <ThemedView className={`${surfaceClass} mt-4 overflow-hidden`}>
              <View className="h-[210px] bg-[#D9ECF8]" />
              <View className="px-5 pb-5">
                <View className="-mt-12 flex items-end gap-4">
                  <View className="flex h-[92px] w-[92px] items-center justify-center rounded-[28px] bg-[#EAF4FB]">
                    <ThemedText className="text-[28px] font-semibold tracking-[0.5px] text-slate-900">{initials}</ThemedText>
                  </View>
                </View>

                <View className="mt-5 gap-5">
                  <View>
                    <View className="self-start rounded-full bg-white/90 px-3 py-2">
                      <ThemedText className="text-sm font-semibold text-slate-700">Search result profile</ThemedText>
                    </View>
                    <ThemedText className="mt-4 text-[34px] font-semibold leading-[42px] text-slate-950">{displayName}</ThemedText>
                    <ThemedText className="mt-3 text-[16px] leading-7 text-slate-600">{bio}</ThemedText>
                  </View>

                  <View className="flex-row flex-wrap gap-3">
                    <Pressable
                      className="rounded-[20px] bg-[#0A0A0A] px-4 py-4 active:opacity-90"
                      disabled={numericUserId === null || isLoadingFollowStatus || isSubmittingFollow}
                      onPress={handleFollowToggle}>
                      <ThemedText className="text-base font-medium text-white">
                        {isLoadingFollowStatus || isSubmittingFollow
                          ? 'Please wait...'
                          : followStatus?.is_following
                            ? 'Following'
                            : 'Follow'}
                      </ThemedText>
                    </Pressable>
                    <View className="rounded-[20px] bg-[#F7F8FA] px-4 py-4">
                      <ThemedText className="text-base font-medium text-slate-900">Message</ThemedText>
                    </View>
                  </View>
                  {followErrorMessage ? <ThemedText className="text-sm text-rose-600">{followErrorMessage}</ThemedText> : null}
                </View>
              </View>
            </ThemedView>

            <View className="gap-4 lg:flex-row">
              <ThemedView className={`${surfaceClass} flex-1 p-5`}>
                <ThemedText className="text-[24px] font-semibold text-slate-950">About</ThemedText>
                <ThemedText className="mt-1 text-sm text-slate-500">Profile details from the selected search result</ThemedText>

                <View className="mt-5 gap-3">
                  <View className="flex-row items-center gap-3 rounded-[24px] bg-[#F7F8FA] px-4 py-4">
                    <MaterialIcons color="#64748B" name="badge" size={20} />
                    <ThemedText className="flex-1 text-base font-medium text-slate-800">User ID · {userId}</ThemedText>
                  </View>
                  <View className="flex-row items-center gap-3 rounded-[24px] bg-[#F7F8FA] px-4 py-4">
                    <MaterialIcons color="#64748B" name="groups" size={20} />
                    {isLoadingFollowStatus ? (
                      <ActivityIndicator color="#4A9FD8" size="small" />
                    ) : (
                      <ThemedText className="flex-1 text-base font-medium text-slate-800">
                        Followers {followStatus?.followers_count ?? 0} · Following {followStatus?.following_count ?? 0}
                      </ThemedText>
                    )}
                  </View>
                  <View className="flex-row items-center gap-3 rounded-[24px] bg-[#F7F8FA] px-4 py-4">
                    <MaterialIcons color="#64748B" name="chat-bubble-outline" size={20} />
                    <ThemedText className="flex-1 text-base font-medium text-slate-800">{preview}</ThemedText>
                  </View>
                </View>
              </ThemedView>

              <ThemedView className={`${surfaceClass} flex-1 p-5`}>
                <ThemedText className="text-[24px] font-semibold text-slate-950">Notes</ThemedText>
                <ThemedText className="mt-1 text-sm text-slate-500">A lightweight detail screen that keeps the current-user profile tab unchanged.</ThemedText>

                <View className="mt-5 rounded-[24px] bg-[#F7F8FA] px-4 py-4">
                  <ThemedText className="text-base leading-7 text-slate-700">
                    This profile is rendered from the selected search item snapshot, so navigation feels immediate even before a dedicated public profile API exists.
                  </ThemedText>
                </View>
              </ThemedView>
            </View>
          </ThemedView>
        </ScrollView>
      </ThemedView>
    </>
  );
}
