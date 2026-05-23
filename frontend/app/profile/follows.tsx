import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { UserList } from '@/components/social/UserList';
import { ThemedText } from '@/components/themed-text';
import { fetchFollowers, fetchFollowing } from '@/lib/auth';

type TabType = 'followers' | 'following';

export default function FollowsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string; type?: TabType }>();
  const userId = params.userId ? parseInt(params.userId, 10) : NaN;
  
  // Default to followers, but respect the type param if provided
  const [activeTab, setActiveTab] = useState<TabType>(params.type || 'followers');

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View className="flex-1">
        {/* Header */}
        <View className="flex-row items-center gap-4 bg-white px-5 pt-3 pb-2">
          <Pressable 
            onPress={() => router.back()} 
            className="h-10 w-10 items-center justify-center rounded-full bg-slate-50 active:bg-slate-100"
          >
            <ThemedText className="text-xl">←</ThemedText>
          </Pressable>
          <ThemedText className="text-[18px] font-bold text-slate-900">{activeTab === 'followers' ? 'Người theo dõi' : 'Đang theo dõi'}</ThemedText>
        </View>

        {/* Custom Tabs */}
        <View className="flex-row border-b border-slate-100 bg-white">
          <Pressable
            onPress={() => setActiveTab('followers')}
            className={`flex-1 items-center border-b-2 py-3 ${
              activeTab === 'followers' ? 'border-[#4A9FD8]' : 'border-transparent'
            }`}
          >
            <ThemedText
              className={`text-[15px] font-semibold ${
                activeTab === 'followers' ? 'text-[#4A9FD8]' : 'text-slate-500'
              }`}
            >
              Người theo dõi
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('following')}
            className={`flex-1 items-center border-b-2 py-3 ${
              activeTab === 'following' ? 'border-[#4A9FD8]' : 'border-transparent'
            }`}
          >
            <ThemedText
              className={`text-[15px] font-semibold ${
                activeTab === 'following' ? 'text-[#4A9FD8]' : 'text-slate-500'
              }`}
            >
              Đang theo dõi
            </ThemedText>
          </Pressable>
        </View>

        {/* List Content */}
        {!isNaN(userId) ? (
          activeTab === 'followers' ? (
            <UserList 
              key="followers"
              userId={userId} 
              fetchData={fetchFollowers} 
              emptyMessage="Chưa có ai theo dõi." 
            />
          ) : (
            <UserList 
              key="following"
              userId={userId} 
              fetchData={fetchFollowing} 
              emptyMessage="Chưa theo dõi ai." 
            />
          )
        ) : (
          <View className="flex-1 items-center justify-center p-8">
            <ThemedText className="text-center text-slate-500">Người dùng không tồn tại.</ThemedText>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
