import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActivityIndicator, Modal, Pressable, ScrollView, View, Image } from 'react-native';

import { API_URL } from '@/lib/api';

import { SearchInput } from '@/components/ui/SearchInput';
import { ThemedText } from '@/components/themed-text';
import type { SearchUser } from '@/lib/auth';

type SearchUsersModalProps = {
  visible: boolean;
  query: string;
  users: SearchUser[];
  isLoading: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSelectUser: (user: SearchUser) => void;
  setQuery: (value: string) => void;
};

function buildInitials(user: SearchUser): string {
  const first = user.first_name.charAt(0);
  const last = user.last_name.charAt(0);
  return `${first}${last}`.toUpperCase() || 'US';
}

export function SearchUsersModal({
  visible,
  query,
  users,
  isLoading,
  errorMessage,
  onClose,
  onSelectUser,
  setQuery,
}: SearchUsersModalProps) {
  const normalizedQuery = query.trim();

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View className="flex-1 items-center justify-center bg-black/35 px-4">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View className="max-h-[72%] w-full max-w-[560px] rounded-[28px] border border-[#DCE4EE] bg-white p-5">
          <View className="flex-row items-center gap-3">
            <SearchInput
              autoFocus
              className="flex-1"
              onChangeText={setQuery}
              value={query}
            />
            <Pressable className="h-9 w-9 items-center justify-center rounded-full bg-[#EEF2F7]" onPress={onClose}>
              <MaterialIcons color="#475569" name="close" size={18} />
            </Pressable>
          </View>

          <ThemedText className="mt-2 text-sm text-slate-500">
            {normalizedQuery.length < 2
              ? 'Nhập ít nhất 2 ký tự để tìm người dùng.'
              : `Kết quả cho "${normalizedQuery}"`}
          </ThemedText>

          <View className="mt-4 min-h-[120px] rounded-[22px] bg-[#F8FAFC] p-3">
            {isLoading ? (
              <View className="items-center justify-center py-8">
                <ActivityIndicator color="#4A9FD8" size="small" />
                <ThemedText className="mt-2 text-sm text-slate-500">Đang tìm người dùng...</ThemedText>
              </View>
            ) : errorMessage ? (
              <View className="rounded-[18px] bg-rose-50 px-4 py-3">
                <ThemedText className="text-sm text-rose-700">{errorMessage}</ThemedText>
              </View>
            ) : normalizedQuery.length < 2 ? null : users.length ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="gap-2">
                  {users.map((user) => (
                    <Pressable
                      key={user.id}
                      className="flex-row items-center gap-3 rounded-[18px] bg-white px-3 py-3 active:opacity-90"
                      onPress={() => onSelectUser(user)}>
                      <View className="h-11 w-11 items-center justify-center rounded-[16px] bg-[#EAF4FB] overflow-hidden">
                        {user.avatar_url ? (
                          <Image 
                            source={{ uri: user.avatar_url.startsWith('http') ? user.avatar_url : `${API_URL}${user.avatar_url}` }} 
                            className="h-full w-full" 
                            style={{ width: 44, height: 44 }} 
                          />
                        ) : (
                          <ThemedText className="text-sm font-semibold text-slate-900">{buildInitials(user)}</ThemedText>
                        )}
                      </View>
                      <View className="min-w-0 flex-1">
                        <ThemedText className="text-base font-medium text-slate-900">{user.full_name}</ThemedText>
                        <ThemedText className="text-sm text-slate-500" numberOfLines={1}>
                          {user.bio || 'No bio available'}
                        </ThemedText>
                      </View>
                      <MaterialIcons color="#94A3B8" name="chevron-right" size={20} />
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <View className="items-center justify-center py-8">
                <ThemedText className="text-sm text-slate-500">Không tìm thấy người dùng phù hợp.</ThemedText>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
