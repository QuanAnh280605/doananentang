import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';

import { UserListItem } from './UserListItem';
import { ThemedText } from '@/components/themed-text';
import type { PaginatedFollowUsers, FollowUser } from '@/lib/auth';

interface UserListProps {
  userId: number;
  fetchData: (userId: number, page: number) => Promise<PaginatedFollowUsers>;
  emptyMessage?: string;
}

export function UserList({ userId, fetchData, emptyMessage = 'Không có người dùng nào.' }: UserListProps) {
  const [items, setItems] = useState<FollowUser[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else if (page === 1) {
        setIsInitialLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      
      setError(null);
      
      const targetPage = isRefresh ? 1 : page;
      const response = await fetchData(userId, targetPage);
      
      if (isRefresh || targetPage === 1) {
        setItems(response.items);
      } else {
        setItems(prev => [...prev, ...response.items]);
      }
      
      setHasMore(targetPage < response.total_pages);
      if (isRefresh) {
        setPage(2);
      } else {
        setPage(targetPage + 1);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đã có lỗi xảy ra.';
      setError(msg);
    } finally {
      setIsRefreshing(false);
      setIsInitialLoading(false);
      setIsLoadingMore(false);
    }
  }, [fetchData, userId, page]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => {
    loadData(true);
  };

  const handleEndReached = () => {
    if (!hasMore || isLoadingMore || isInitialLoading || isRefreshing) return;
    loadData();
  };

  if (isInitialLoading) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <ActivityIndicator size="large" color="#4A9FD8" />
        <ThemedText className="mt-4 text-slate-500">Đang tải...</ThemedText>
      </View>
    );
  }

  if (error && items.length === 0) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <ThemedText className="mb-4 text-center text-[16px] text-rose-600">{error}</ThemedText>
        <Pressable 
          onPress={() => loadData(true)}
          className="rounded-[18px] bg-slate-900 px-6 py-3 active:opacity-80"
        >
          <ThemedText className="font-medium text-white">Thử lại</ThemedText>
        </Pressable>
      </View>
    );
  }

  if (!isInitialLoading && items.length === 0) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <ThemedText className="text-2xl">👤</ThemedText>
        </View>
        <ThemedText className="text-center text-[16px] text-slate-500">{emptyMessage}</ThemedText>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <UserListItem user={item} />}
      contentContainerClassName="pb-safe"
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl 
          refreshing={isRefreshing} 
          onRefresh={handleRefresh}
          tintColor="#4A9FD8"
        />
      }
      ListFooterComponent={() => 
        isLoadingMore ? (
          <View className="py-4 items-center">
            <ActivityIndicator size="small" color="#4A9FD8" />
          </View>
        ) : null
      }
    />
  );
}
