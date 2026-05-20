import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, FlatList, ActivityIndicator, Pressable, Keyboard, Platform } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';

import { SearchInput } from '@/components/ui/SearchInput';
import { ThemedText } from '@/components/themed-text';
import { FeedPost } from '@/components/post/FeedPost';
import { UserListItem } from '@/components/user/UserListItem';

import { searchUsers, type SearchUser } from '@/lib/auth';
import { searchPosts } from '@/lib/api';
import type { Post } from '@/lib/types';

const PAGE_SIZE = 10;

type SearchTab = 'all' | 'users' | 'posts';

export default function ExploreScreen() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('all');

  // States for Users
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const [isUsersLoading, setIsUsersLoading] = useState(false);

  // States for Posts
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsPage, setPostsPage] = useState(1);
  const [postsTotalPages, setPostsTotalPages] = useState(1);
  const [postsTotal, setPostsTotal] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [isPostsLoading, setIsPostsLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Track if initial search has been done for this query
  const initialFetchDoneRef = useRef(false);

  // Debounce logic
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setDebouncedQuery('');
      setUsers([]);
      setPosts([]);
      setHasMoreUsers(true);
      setHasMorePosts(true);
      setUsersTotal(0);
      setPostsTotal(0);
      setErrorMessage(null);
      initialFetchDoneRef.current = false;
      return;
    }

    const handler = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 500);

    return () => clearTimeout(handler);
  }, [query]);

  // Fetch data when debounced query changes
  useEffect(() => {
    if (!debouncedQuery) return;

    initialFetchDoneRef.current = false;

    // Reset pagination
    setUsersPage(1);
    setPostsPage(1);

    // Fetch both users and posts simultaneously
    fetchUsers(debouncedQuery, 1, true);
    fetchPosts(debouncedQuery, 1, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  const fetchUsers = useCallback(async (searchQuery: string, page: number, isRefresh = false) => {
    if (isUsersLoading && !isRefresh) return;

    setIsUsersLoading(true);
    setErrorMessage(null);
    try {
      const res = await searchUsers(searchQuery, page, PAGE_SIZE);
      if (isRefresh) {
        setUsers(res.items);
      } else {
        setUsers(prev => [...prev, ...res.items]);
      }
      setUsersTotal(res.total);
      setUsersTotalPages(res.total_pages);
      setHasMoreUsers(page < res.total_pages);
      setUsersPage(page);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to load user search results.';
      setErrorMessage(message);
    } finally {
      setIsUsersLoading(false);
      initialFetchDoneRef.current = true;
    }
  }, [isUsersLoading]);

  const fetchPosts = useCallback(async (searchQuery: string, page: number, isRefresh = false) => {
    if (isPostsLoading && !isRefresh) return;

    setIsPostsLoading(true);
    setErrorMessage(null);

    try {
      const res = await searchPosts(searchQuery, page, PAGE_SIZE);
      if (isRefresh) {
        setPosts(res.items);
      } else {
        setPosts(prev => [...prev, ...res.items]);
      }
      setPostsTotal(res.total);
      setPostsTotalPages(res.total_pages);
      setHasMorePosts(page < res.total_pages);
      setPostsPage(page);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to load post search results.';
      setErrorMessage(message);
    } finally {
      setIsPostsLoading(false);
      initialFetchDoneRef.current = true;
    }
  }, [isPostsLoading]);

  const loadMoreUsers = useCallback(() => {
    if (!isUsersLoading && hasMoreUsers && debouncedQuery) {
      fetchUsers(debouncedQuery, usersPage + 1);
    }
  }, [isUsersLoading, hasMoreUsers, debouncedQuery, usersPage, fetchUsers]);

  const loadMorePosts = useCallback(() => {
    if (!isPostsLoading && hasMorePosts && debouncedQuery) {
      fetchPosts(debouncedQuery, postsPage + 1);
    }
  }, [isPostsLoading, hasMorePosts, debouncedQuery, postsPage, fetchPosts]);

  const handleSelectUser = useCallback((user: SearchUser) => {
    router.push({
      pathname: '/profile/[userId]',
      params: {
        userId: String(user.id),
        name: user.full_name,
        initials: `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase(),
        preview: user.bio || 'Opened from search results.',
        bio: user.bio || 'Opened from search results.',
      },
    });
  }, []);

  const handleTabChange = useCallback((tab: SearchTab) => {
    setActiveTab(tab);
  }, []);

  // ─── Tab bar component ───────────────────────────────────────
  const renderTabBar = () => {
    if (!debouncedQuery) return null;

    const tabs: { key: SearchTab; label: string; count: number }[] = [
      { key: 'all', label: 'All', count: usersTotal + postsTotal },
      { key: 'users', label: 'People', count: usersTotal },
      { key: 'posts', label: 'Posts', count: postsTotal },
    ];

    return (
      <View className="bg-white border-b border-[#E4E8EE]">
        <View className="flex-row px-4 gap-1">
          {tabs.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => handleTabChange(tab.key)}
                className={`flex-1 items-center py-3 rounded-t-xl ${isActive ? 'border-b-2 border-[#4A9FD8]' : ''}`}
              >
                <ThemedText
                  className={`text-sm font-semibold ${isActive ? 'text-[#4A9FD8]' : 'text-slate-500'}`}
                >
                  {tab.label}
                </ThemedText>
                {tab.count > 0 && (
                  <View
                    className={`mt-1 px-2 py-0.5 rounded-full ${isActive ? 'bg-[#EAF4FB]' : 'bg-slate-100'}`}
                  >
                    <ThemedText
                      className={`text-xs font-medium ${isActive ? 'text-[#4A9FD8]' : 'text-slate-500'}`}
                    >
                      {tab.count}
                    </ThemedText>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  // ─── User card component ─────────────────────────────────────
  const renderUserItem = useCallback(({ item: user }: { item: SearchUser }) => (
    <View className="mx-4 mb-2">
      <UserListItem 
        user={user} 
        onPress={handleSelectUser} 
      />
    </View>
  ), [handleSelectUser]);

  // ─── Post item component ─────────────────────────────────────
  const renderPostItem = useCallback(({ item: post }: { item: Post }) => (
    <View className="mb-2">
      <FeedPost item={post} />
    </View>
  ), []);

  // ─── Pagination info component ──────────────────────────────
  const renderPaginationInfo = (currentPage: number, totalPages: number, total: number, label: string) => {
    if (total === 0) return null;
    return (
      <View className="flex-row items-center justify-center py-3 gap-2">
        <ThemedText className="text-xs text-slate-400">
          Page {currentPage}/{totalPages} · {total} {label}
        </ThemedText>
      </View>
    );
  };

  // ─── Loading footer ──────────────────────────────────────────
  const renderLoadingFooter = (isLoading: boolean) => {
    if (!isLoading) return null;
    return (
      <View className="py-6 items-center">
        <ActivityIndicator color="#4A9FD8" size="small" />
        <ThemedText className="text-xs text-slate-400 mt-2">Loading more...</ThemedText>
      </View>
    );
  };

  // ─── Empty state ─────────────────────────────────────────────
  const renderEmptyForType = (type: 'users' | 'posts') => {
    const isLoading = type === 'users' ? isUsersLoading : isPostsLoading;
    if (isLoading) return null;

    const icon = type === 'users' ? 'person-search' : 'article';
    const title = type === 'users' ? 'No users found' : 'No posts found';
    const subtitle = type === 'users'
      ? `No users matching "${debouncedQuery}".`
      : `No posts matching "${debouncedQuery}".`;

    return (
      <View className="items-center justify-center py-16 px-4">
        <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-slate-100">
          <MaterialIcons name={icon} size={28} color="#94A3B8" />
        </View>
        <ThemedText className="text-center text-base font-medium text-slate-700">{title}</ThemedText>
        <ThemedText className="mt-2 text-center text-sm text-slate-500">{subtitle}</ThemedText>
      </View>
    );
  };

  // ─── Error state ─────────────────────────────────────────────
  const renderErrorState = () => (
    <View className="m-4 rounded-2xl bg-rose-50 px-4 py-3 flex-row items-center gap-3">
      <MaterialIcons name="error-outline" size={20} color="#E11D48" />
      <ThemedText className="text-sm text-rose-700 flex-1">{errorMessage}</ThemedText>
      <Pressable
        onPress={() => {
          setErrorMessage(null);
          if (debouncedQuery) {
            fetchUsers(debouncedQuery, 1, true);
            fetchPosts(debouncedQuery, 1, true);
          }
        }}
        className="px-3 py-1.5 rounded-lg bg-rose-100 active:opacity-70"
      >
        <ThemedText className="text-xs font-medium text-rose-700">Retry</ThemedText>
      </Pressable>
    </View>
  );

  // ─── TAB: All — combined view ────────────────────────────────
  const renderAllTab = () => {
    // Both empty
    if (users.length === 0 && posts.length === 0 && !isUsersLoading && !isPostsLoading) {
      return (
        <View className="items-center justify-center py-20 px-4">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <MaterialIcons name="search-off" size={32} color="#94A3B8" />
          </View>
          <ThemedText className="text-center text-base font-medium text-slate-700">No results found</ThemedText>
          <ThemedText className="mt-2 text-center text-sm text-slate-500">
            No users or posts matching &quot;{debouncedQuery}&quot;.
          </ThemedText>
        </View>
      );
    }

    // Combined: users section + posts section with load more
    const allData: { type: 'users-section' | 'posts-header' | 'post'; data?: Post }[] = [];

    // Add users section marker if any
    if (users.length > 0) {
      allData.push({ type: 'users-section' });
    }

    // Add posts header + items
    if (posts.length > 0) {
      allData.push({ type: 'posts-header' });
      posts.forEach(post => {
        allData.push({ type: 'post', data: post });
      });
    }

    return (
      <FlatList
        data={allData}
        keyExtractor={(item, index) => {
          if (item.type === 'post' && item.data) return `post-${item.data.id}`;
          return `${item.type}-${index}`;
        }}
        renderItem={({ item }) => {
          if (item.type === 'users-section') {
            return renderUsersPreviewSection();
          }
          if (item.type === 'posts-header') {
            return (
              <View className="px-4 py-3 bg-white border-b border-[#E4E8EE] flex-row items-center justify-between">
                <ThemedText className="text-lg font-bold text-slate-900">Posts</ThemedText>
                {postsTotal > 0 && (
                  <Pressable
                    onPress={() => handleTabChange('posts')}
                    className="flex-row items-center gap-1 active:opacity-70"
                  >
                    <ThemedText className="text-sm font-medium text-[#4A9FD8]">
                      See all ({postsTotal})
                    </ThemedText>
                    <MaterialIcons name="chevron-right" size={16} color="#4A9FD8" />
                  </Pressable>
                )}
              </View>
            );
          }
          if (item.type === 'post' && item.data) {
            return (
              <View className="mb-2">
                <FeedPost item={item.data} />
              </View>
            );
          }
          return null;
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => Keyboard.dismiss()}
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() => renderLoadingFooter(isPostsLoading)}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    );
  };

  // ─── Preview section for users in "All" tab ──────────────────
  const renderUsersPreviewSection = () => {
    // Show top 5 users in "all" tab, with a "see all" button
    const previewUsers = users.slice(0, 5);

    return (
      <View className="bg-white py-4 mb-2 border-b border-[#E4E8EE]">
        <View className="px-4 flex-row items-center justify-between mb-3">
          <ThemedText className="text-lg font-bold text-slate-900">People</ThemedText>
          {usersTotal > 5 && (
            <Pressable
              onPress={() => handleTabChange('users')}
              className="flex-row items-center gap-1 active:opacity-70"
            >
              <ThemedText className="text-sm font-medium text-[#4A9FD8]">
                See all ({usersTotal})
              </ThemedText>
              <MaterialIcons name="chevron-right" size={16} color="#4A9FD8" />
            </Pressable>
          )}
        </View>
        <View className="px-4">
          {previewUsers.map(user => (
            <View key={user.id} className="mb-2">
              <UserListItem 
                user={user} 
                onPress={handleSelectUser} 
              />
            </View>
          ))}
        </View>
      </View>
    );
  };

  // ─── TAB: Users — full list with pagination ──────────────────
  const renderUsersTab = () => {
    if (users.length === 0 && !isUsersLoading) {
      return renderEmptyForType('users');
    }

    return (
      <FlatList
        data={users}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderUserItem}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => Keyboard.dismiss()}
        onEndReached={loadMoreUsers}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={() => renderPaginationInfo(usersPage, usersTotalPages, usersTotal, 'users')}
        ListFooterComponent={() => renderLoadingFooter(isUsersLoading)}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 20 }}
      />
    );
  };

  // ─── TAB: Posts — full list with pagination ──────────────────
  const renderPostsTab = () => {
    if (posts.length === 0 && !isPostsLoading) {
      return renderEmptyForType('posts');
    }

    return (
      <FlatList
        data={posts}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderPostItem}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => Keyboard.dismiss()}
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={() => renderPaginationInfo(postsPage, postsTotalPages, postsTotal, 'posts')}
        ListFooterComponent={() => renderLoadingFooter(isPostsLoading)}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    );
  };

  // ─── Main content logic ──────────────────────────────────────
  let content = null;

  if (query.trim().length > 0 && query.trim().length < 2) {
    content = (
      <View className="items-center justify-center py-10">
        <ThemedText className="text-sm text-slate-500">Type at least 2 characters to search.</ThemedText>
      </View>
    );
  } else if (!debouncedQuery) {
    content = (
      <View className="items-center justify-center py-20 px-4">
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <MaterialIcons name="search" size={32} color="#94A3B8" />
        </View>
        <ThemedText className="text-center text-base font-medium text-slate-700">Discover content</ThemedText>
        <ThemedText className="mt-2 text-center text-sm text-slate-500">
          Search for friends and interesting posts on the platform.
        </ThemedText>
      </View>
    );
  } else if (errorMessage) {
    content = renderErrorState();
  } else if (isUsersLoading && isPostsLoading && users.length === 0 && posts.length === 0) {
    // Initial loading state
    content = (
      <View className="items-center justify-center py-20">
        <ActivityIndicator color="#4A9FD8" size="large" />
        <ThemedText className="text-sm text-slate-500 mt-4">Searching...</ThemedText>
      </View>
    );
  } else {
    // Render active tab content
    content = (
      <View className="flex-1">
        {activeTab === 'all' && renderAllTab()}
        {activeTab === 'users' && renderUsersTab()}
        {activeTab === 'posts' && renderPostsTab()}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      {/* Header Search Area */}
      <View className="bg-white px-4 pb-4 border-b border-[#E4E8EE] flex-row items-center gap-3" style={{ paddingTop: Platform.OS === 'ios' ? 60 : 48 }}>
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 active:opacity-70">
          <MaterialIcons name="arrow-back" size={24} color="#64748B" />
        </Pressable>
        <View className="flex-1">
          <SearchInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search people, posts..."
            autoFocus={true}
          />
        </View>
      </View>

      {/* Tab bar */}
      {renderTabBar()}

      {/* Content */}
      {content}
    </View>
  );
}
