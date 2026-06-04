import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
import {
  Pressable,
  ScrollView,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SearchInput } from '@/components/ui/SearchInput';
import { createGroupChat, API_URL } from '@/lib/api';
import { searchUsers, type SearchUser } from '@/lib/auth';
import { useToast } from '@/hooks/useToast';

function AvatarPill({ initials, muted = false }: { initials: string; muted?: boolean }) {
  return (
    <View
      className={`h-10 w-10 items-center justify-center rounded-[14px] ${muted ? 'bg-[#E2E8F0]' : 'bg-[#DBEAFE]'}`}>
      <ThemedText className="text-xs font-semibold tracking-[0.6px] text-slate-900">{initials}</ThemedText>
    </View>
  );
}

function getInitials(user: SearchUser): string {
  const first = user.first_name ? user.first_name[0] : '';
  const last = user.last_name ? user.last_name[0] : '';
  return (first + last).toUpperCase() || user.full_name.slice(0, 2).toUpperCase();
}

function getAbsoluteAvatarUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_URL}${url}`;
}

export default function CreateGroupScreen() {
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const delayDebounceFn = setTimeout(() => {
      searchUsers(searchQuery, 1, 20)
        .then((res) => setSearchResults(res.items))
        .catch((err) => console.error('Search users failed:', err))
        .finally(() => setIsSearching(false));
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const toggleUser = (userId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      toast.error('Vui lòng nhập tên nhóm.');
      return;
    }
    if (selectedUserIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 thành viên.');
      return;
    }

    setIsCreating(true);
    try {
      const chat = await createGroupChat(groupName.trim(), selectedUserIds);
      toast.success('Đã tạo nhóm thành công!');
      // Navigate back to inbox and open the new chat
      router.replace({ pathname: '/(tabs)/inbox', params: { openChatId: chat.chat_id.toString() } });
    } catch (err: any) {
      toast.error('Tạo nhóm thất bại: ' + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const canCreate = groupName.trim() && selectedUserIds.length > 0 && !isCreating;

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar style="dark" />
      <ThemedView
        className="flex-1 bg-[#F8FAFC]"
        style={{ paddingTop: Math.max(insets.top, 0) }}
      >
        {/* Header */}
        <View className="flex-row items-center gap-3 px-5 py-4 bg-white border-b border-slate-100">
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 active:opacity-80"
            onPress={() => router.back()}>
            <MaterialIcons color="#475569" name="arrow-back" size={20} />
          </Pressable>
          <View className="flex-1">
            <ThemedText className="text-lg font-bold text-slate-900">Tạo nhóm chat</ThemedText>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Group name input */}
          <View className="mb-4">
            <ThemedText className="text-xs font-semibold text-slate-500 mb-1.5 ml-1">
              Tên nhóm chat
            </ThemedText>
            <TextInput
              className="w-full text-[15px] leading-5 text-slate-900 px-4 py-3 bg-slate-50 rounded-[18px] border border-slate-100"
              cursorColor="#4A9FD8"
              onChangeText={setGroupName}
              placeholder="Nhập tên nhóm..."
              placeholderTextColor="#94A3B8"
              selectionColor="rgba(74, 159, 216, 0.24)"
              value={groupName}
            />
          </View>

          {/* Search members */}
          <View className="mb-4">
            <SearchInput
              onChangeText={setSearchQuery}
              placeholder="Tìm thành viên..."
              value={searchQuery}
            />
          </View>

          {/* Selected members count */}
          {selectedUserIds.length > 0 && (
            <View className="flex-row items-center gap-2 mb-3">
              <ThemedText className="text-xs font-medium text-[#4A9FD8] bg-[#EAF4FB] px-2 py-0.5 rounded-full">
                {selectedUserIds.length} đã chọn
              </ThemedText>
            </View>
          )}

          {/* Search results */}
          <View className="mb-4">
            {isSearching ? (
              <View className="py-6 justify-center items-center">
                <ActivityIndicator color="#4A9FD8" size="small" />
              </View>
            ) : searchResults.length > 0 ? (
              searchResults.map((user) => {
                const isSelected = selectedUserIds.includes(user.id);
                const initials = getInitials(user);
                const avatarUrl = getAbsoluteAvatarUrl(user.avatar_url);

                return (
                  <Pressable
                    key={user.id}
                    className={`flex-row items-center justify-between rounded-[22px] px-4 py-3.5 mb-2 border active:bg-slate-100 ${
                      isSelected ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-100'
                    }`}
                    onPress={() => toggleUser(user.id)}>
                    <View className="flex-row items-center gap-3 flex-1 mr-3">
                      {avatarUrl ? (
                        <Image
                          source={{ uri: avatarUrl }}
                          className="h-10 w-10 rounded-[14px] bg-slate-200"
                        />
                      ) : (
                        <AvatarPill initials={initials} muted />
                      )}
                      <View className="flex-1">
                        <ThemedText className="text-[15px] font-semibold text-slate-900 truncate">
                          {user.full_name}
                        </ThemedText>
                        <ThemedText className="text-xs text-slate-500 truncate mt-0.5">
                          {user.bio || 'Chưa cập nhật giới thiệu.'}
                        </ThemedText>
                      </View>
                    </View>

                    <View
                      className={`h-6 w-6 items-center justify-center rounded-full border ${
                        isSelected ? 'bg-[#4A9FD8] border-[#4A9FD8]' : 'border-slate-300'
                      }`}>
                      {isSelected && <MaterialIcons color="#FFFFFF" name="check" size={14} />}
                    </View>
                  </Pressable>
                );
              })
            ) : searchQuery.trim().length >= 2 ? (
              <View className="py-6 items-center justify-center">
                <ThemedText className="text-slate-400 text-sm">Không tìm thấy người dùng.</ThemedText>
              </View>
            ) : (
              <View className="py-6 items-center justify-center">
                <ThemedText className="text-slate-400 text-sm">
                  Nhập ít nhất 2 ký tự để tìm.
                </ThemedText>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Create button - fixed at bottom */}
        <View className="px-5 pb-6 bg-white border-t border-slate-100" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
          <Pressable
            className={`w-full h-12 rounded-[18px] items-center justify-center flex-row gap-2 ${
              canCreate ? 'bg-[#4A9FD8] active:opacity-90' : 'bg-slate-200'
            }`}
            disabled={!canCreate}
            onPress={handleCreate}>
            {isCreating ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <MaterialIcons color="#FFFFFF" name="group-add" size={18} />
                <ThemedText className="text-sm font-semibold text-white">
                  Tạo nhóm ({selectedUserIds.length + 1} thành viên)
                </ThemedText>
              </>
            )}
          </Pressable>
        </View>
      </ThemedView>
    </View>
  );
}
