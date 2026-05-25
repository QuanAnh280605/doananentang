import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar, surfaceClass } from '@/components/ui/core';
import { API_URL, createPost, fetchFollowingUsers, uploadPostMedia } from '@/lib/api';
import type { FollowUser } from '@/lib/api';
import type { VisibilityLevel } from '@/lib/types';

import type { AuthUser } from '@/lib/auth';

// ─── Visibility ──────────────────────────────────────────────

type VisibilityOption = {
  value: VisibilityLevel;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  description: string;
};

const VISIBILITY_OPTIONS: VisibilityOption[] = [
  { value: 'public', label: 'Công khai', icon: 'public', color: '#41A36D', description: 'Mọi người đều có thể xem' },
  { value: 'followersonly', label: 'Người theo dõi', icon: 'people', color: '#4A9FD8', description: 'Chỉ người theo dõi bạn' },
  { value: 'custom', label: 'Tùy chỉnh', icon: 'tune', color: '#F59E0B', description: 'Chọn người xem cụ thể' },
  { value: 'onlyme', label: 'Chỉ mình tôi', icon: 'lock', color: '#64748B', description: 'Chỉ bạn mới thấy bài này' },
];

function getVisibilityOption(value: VisibilityLevel): VisibilityOption {
  return VISIBILITY_OPTIONS.find((o) => o.value === value) ?? VISIBILITY_OPTIONS[0]!;
}

// ─── Extra action buttons (bottom bar) ───────────────────────

type ActionItem = {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  color: string;
  onPress?: () => void;
};

// ─── Component ───────────────────────────────────────────────

export function ComposerCard({
  onPostCreated,
  currentUser,
}: {
  onPostCreated?: () => void;
  currentUser?: AuthUser | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [visibility, setVisibility] = useState<VisibilityLevel>('public');
  const [showVisibilityPicker, setShowVisibilityPicker] = useState(false);

  // New states for extra features
  const [feeling, setFeeling] = useState<string | null>(null);
  const [showFeelingPicker, setShowFeelingPicker] = useState(false);
  const [taggedUserIds, setTaggedUserIds] = useState<string[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [followingUsers, setFollowingUsers] = useState<FollowUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const currentVisibility = getVisibilityOption(visibility);

  const canPost = text.trim().length > 0 || selectedImages.length > 0;

  const initials = currentUser
    ? `${currentUser.first_name?.[0] || ''}${currentUser.last_name?.[0] || ''}`.toUpperCase()
    : 'LC';

  // ── handlers ──

  const handlePickPhoto = async () => {
    if (selectedImages.length >= 4) {
      alert('Bạn chỉ được chọn tối đa 4 ảnh.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      selectionLimit: 4 - selectedImages.length,
      quality: 0.8,
    });
    if (!result.canceled) {
      const newUris = result.assets.map((a: any) => a.uri);
      setSelectedImages((prev) => [...prev, ...newUris].slice(0, 4));
    }
  };

  const handleClose = () => {
    if (canPost) {
      // có nội dung → cảnh báo thoát (không dùng Alert để tránh import thêm)
      // trên mobile để đơn giản, đóng luôn
    }
    setIsOpen(false);
    setText('');
    setSelectedImages([]);
    setVisibility('public');
    setFeeling(null);
    setTaggedUserIds([]);
    setShowTagPicker(false);
  };

  const handlePost = async () => {
    if (isPosting) return;
    setIsPosting(true);
    try {
      let mediaUrls: string[] = [];
      if (selectedImages.length > 0) {
        const uploadRes = await uploadPostMedia(selectedImages);
        mediaUrls = uploadRes.data;
      }
      await createPost(
        text, 
        mediaUrls, 
        visibility,
        feeling ?? undefined,
        undefined, // gif
        undefined, // locationName
        undefined, // lat
        undefined, // lng
        taggedUserIds.length > 0 ? taggedUserIds : undefined
      );
      setIsOpen(false);
      setText('');
      setSelectedImages([]);
      setVisibility('public');
      setFeeling(null);
      setTaggedUserIds([]);
      onPostCreated?.();
    } catch (error: any) {
      console.error('Failed to post:', error);
      alert(error.message ?? 'Không thể đăng bài viết');
    } finally {
      setIsPosting(false);
    }
  };

  // ── Extra actions ──
  const handleOpenTagPicker = async () => {
    setShowTagPicker(true);
    if (!currentUser?.id) return;
    setLoadingUsers(true);
    try {
      const res = await fetchFollowingUsers(Number(currentUser.id), 1, 50);
      setFollowingUsers(res.items);
    } catch (err) {
      console.error('Failed to fetch following users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const mainActions: ActionItem[] = [
    { icon: 'photo-library', label: 'Ảnh/Video', color: '#41A36D', onPress: handlePickPhoto },
    { icon: 'emoji-emotions', label: 'Cảm xúc', color: '#F9A825', onPress: () => setShowFeelingPicker(true) },
    { icon: 'person-add', label: 'Gắn thẻ', color: '#4A9FD8', onPress: handleOpenTagPicker },
  ];

  // ── Trigger card ──

  return (
    <>
      {/* ── Trigger card (luôn hiện) ── */}
      <ThemedView className="bg-white mb-2 px-4 py-4">
        <Pressable
          onPress={() => setIsOpen(true)}
          className="flex-row items-center gap-3 active:opacity-90"
        >
          <Avatar initials={initials} soft avatarUrl={currentUser?.avatar_url} />
          <View
            style={{
              flex: 1,
              borderRadius: 99,
              backgroundColor: '#F1F5F9',
              paddingHorizontal: 16,
              paddingVertical: 10,
              justifyContent: 'center',
            }}
          >
            <ThemedText style={{ color: '#64748B', fontWeight: '500', fontSize: 15 }}>
              Chia sẻ suy nghĩ của bạn...
            </ThemedText>
          </View>
          {/* Quick photo button */}
          <Pressable
            onPress={handlePickPhoto}
            className="active:opacity-70"
            style={{
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialIcons name="image" size={26} color="#41A36D" />
          </Pressable>
        </Pressable>
      </ThemedView>

      {/* ── Composer Modal ── */}
      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
          >
            {/* ── Header ── */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: '#F1F5F9',
                backgroundColor: '#FFFFFF',
              }}
            >
              <Pressable
                onPress={handleClose}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 14,
                  backgroundColor: '#F7F8FA',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialIcons name="close" size={20} color="#64748B" />
              </Pressable>

              <ThemedText style={{ fontSize: 19, fontWeight: '700', color: '#0F172A', letterSpacing: -0.3 }}>
                Tạo bài viết mới
              </ThemedText>

              {/* Nút Đăng */}
              <Pressable
                onPress={handlePost}
                disabled={!canPost || isPosting}
                style={{
                  borderRadius: 18,
                  backgroundColor: canPost && !isPosting ? '#0A0A0A' : '#E4E8EE',
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {isPosting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <ThemedText
                    style={{
                      fontSize: 15,
                      fontWeight: '700',
                      color: canPost ? '#FFFFFF' : '#94A3B8',
                    }}
                  >
                    Đăng
                  </ThemedText>
                )}
              </Pressable>
            </View>

            {/* ── Body (scrollable) ── */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 20 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Author row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <Avatar initials={initials} soft avatarUrl={currentUser?.avatar_url} />
                <View style={{ gap: 4 }}>
                  <ThemedText style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>
                    {currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Người dùng'}
                  </ThemedText>
                  {/* Visibility pill */}
                  <Pressable
                    onPress={() => setShowVisibilityPicker(true)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      alignSelf: 'flex-start',
                      borderRadius: 99,
                      backgroundColor: '#F1F5F9',
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                    }}
                  >
                    <MaterialIcons name={currentVisibility.icon} size={12} color={currentVisibility.color} />
                    <ThemedText style={{ fontSize: 11, fontWeight: '700', color: '#475569', letterSpacing: 0.5 }}>
                      {currentVisibility.label.toUpperCase()}
                    </ThemedText>
                    <MaterialIcons name="arrow-drop-down" size={14} color="#94A3B8" />
                  </Pressable>
                </View>
              </View>
              
              {/* Extra states display */}
              {(feeling || taggedUserIds.length > 0) && (
                <View style={{ marginBottom: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {feeling && (
                    <ThemedText style={{ fontSize: 14, color: '#475569', fontWeight: '500' }}>
                      — đang cảm thấy {feeling}
                    </ThemedText>
                  )}
                  {taggedUserIds.length > 0 && (
                    <ThemedText style={{ fontSize: 14, color: '#475569', fontWeight: '500' }}>
                      — cùng với {taggedUserIds.length} người khác
                    </ThemedText>
                  )}
                </View>
              )}

              {/* Textarea */}
              <TextInput
                autoFocus
                multiline
                value={text}
                onChangeText={setText}
                placeholder="Bạn đang nghĩ gì?"
                placeholderTextColor="#94A3B8"
                cursorColor="#0F172A"
                selectionColor="rgba(15,23,42,0.2)"
                underlineColorAndroid="transparent"
                style={{
                  fontSize: 18,
                  color: '#0F172A',
                  lineHeight: 28,
                  minHeight: 120,
                  textAlignVertical: 'top',
                }}
              />

              {/* Image previews */}
              {selectedImages.length > 0 && (
                <View style={{ marginTop: 16, gap: 8 }}>
                  {selectedImages.map((uri, index) => (
                    <View
                      key={index}
                      style={{
                        position: 'relative',
                        borderRadius: 24,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: '#E4E8EE',
                        ...(selectedImages.length > 1
                          ? { aspectRatio: 1 }
                          : { height: 280 }),
                      }}
                    >
                      <Image
                        source={{ uri }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                      <Pressable
                        onPress={() => setSelectedImages((prev) => prev.filter((_, i) => i !== index))}
                        style={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: 'rgba(0,0,0,0.5)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <MaterialIcons name="close" size={18} color="#FFFFFF" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

            </ScrollView>

            {/* ── Footer: action bar ── */}
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: '#F1F5F9',
                backgroundColor: '#FFFFFF',
                paddingHorizontal: 16,
                paddingTop: 12,
                paddingBottom: Platform.OS === 'ios' ? 12 : 16,
              }}
            >
              {/* "Thêm vào bài viết" label + icons */}
              <View
                style={{
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: '#E4E8EE',
                  backgroundColor: '#FDFDFF',
                  padding: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <ThemedText style={{ fontSize: 14, fontWeight: '600', color: '#0F172A', paddingLeft: 4 }}>
                    Thêm vào bài viết
                  </ThemedText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {mainActions.map((action) => (
                      <Pressable
                        key={action.label}
                        onPress={action.onPress}
                        style={{
                          width: 40,
                          height: 40,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 20,
                          backgroundColor: '#F1F5F9',
                        }}
                      >
                        <MaterialIcons name={action.icon} size={22} color={action.color} />
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>

        {/* ── Visibility picker bottom sheet ── */}
        <Modal
          visible={showVisibilityPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowVisibilityPicker(false)}
        >
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
            <Pressable
              style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
              onPress={() => setShowVisibilityPicker(false)}
            />
            <View style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: '#FFFFFF', paddingBottom: 40 }}>
              {/* Handle */}
              <View style={{ width: 40, height: 4, borderRadius: 99, backgroundColor: '#CBD5E1', alignSelf: 'center', marginTop: 12, marginBottom: 4 }} />

              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E4E8EE' }}>
                <ThemedText style={{ fontSize: 17, fontWeight: '700', color: '#0F172A' }}>
                  Ai có thể xem bài viết này?
                </ThemedText>
                <Pressable
                  onPress={() => setShowVisibilityPicker(false)}
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}
                >
                  <MaterialIcons name="close" size={18} color="#64748B" />
                </Pressable>
              </View>

              {/* Options */}
              <View style={{ padding: 16, gap: 8 }}>
                {VISIBILITY_OPTIONS.map((option) => {
                  const isSelected = visibility === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => { setVisibility(option.value); setShowVisibilityPicker(false); }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 16,
                        borderRadius: 18,
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        backgroundColor: isSelected ? `${option.color}14` : '#F7F8FA',
                        borderWidth: isSelected ? 1.5 : 1,
                        borderColor: isSelected ? option.color : '#E4E8EE',
                      }}
                    >
                      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${option.color}1A`, alignItems: 'center', justifyContent: 'center' }}>
                        <MaterialIcons name={option.icon} size={22} color={option.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={{ fontSize: 15, fontWeight: '600', color: isSelected ? option.color : '#0F172A' }}>
                          {option.label}
                        </ThemedText>
                        <ThemedText style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
                          {option.description}
                        </ThemedText>
                      </View>
                      {isSelected && <MaterialIcons name="check-circle" size={22} color={option.color} />}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>
        {/* ── Feeling picker bottom sheet ── */}
        <Modal
          visible={showFeelingPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowFeelingPicker(false)}
        >
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
            <Pressable
              style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
              onPress={() => setShowFeelingPicker(false)}
            />
            <View style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: '#FFFFFF', paddingBottom: 40 }}>
              <View style={{ width: 40, height: 4, borderRadius: 99, backgroundColor: '#CBD5E1', alignSelf: 'center', marginTop: 12, marginBottom: 4 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E4E8EE' }}>
                <ThemedText style={{ fontSize: 17, fontWeight: '700', color: '#0F172A' }}>
                  Bạn đang cảm thấy thế nào?
                </ThemedText>
                <Pressable
                  onPress={() => setShowFeelingPicker(false)}
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}
                >
                  <MaterialIcons name="close" size={18} color="#64748B" />
                </Pressable>
              </View>
              <View style={{ padding: 16, gap: 8, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                {[
                  '😊 Hạnh phúc', '😢 Buồn', '😡 Tức giận', 
                  '🤩 Hào hứng', '😴 Mệt mỏi', '🥳 Vui vẻ', 
                  '😎 Ngầu', '🤔 Trầm ngâm'
                ].map((f) => (
                  <Pressable
                    key={f}
                    onPress={() => { setFeeling(f); setShowFeelingPicker(false); }}
                    style={{
                      width: '48%',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      borderRadius: 16,
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      backgroundColor: feeling === f ? '#4A9FD814' : '#F7F8FA',
                      borderWidth: feeling === f ? 1.5 : 1,
                      borderColor: feeling === f ? '#4A9FD8' : '#E4E8EE',
                    }}
                  >
                    <ThemedText style={{ fontSize: 15, fontWeight: '600', color: feeling === f ? '#4A9FD8' : '#0F172A' }}>
                      {f}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </Modal>

        {/* ── Tag picker bottom sheet ── */}
        <Modal
          visible={showTagPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowTagPicker(false)}
        >
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
            <Pressable
              style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
              onPress={() => setShowTagPicker(false)}
            />
            <View style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: '#FFFFFF', paddingBottom: 40, maxHeight: '80%' }}>
              <View style={{ width: 40, height: 4, borderRadius: 99, backgroundColor: '#CBD5E1', alignSelf: 'center', marginTop: 12, marginBottom: 4 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E4E8EE' }}>
                <ThemedText style={{ fontSize: 17, fontWeight: '700', color: '#0F172A' }}>
                  Gắn thẻ bạn bè
                </ThemedText>
                <Pressable
                  onPress={() => setShowTagPicker(false)}
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}
                >
                  <MaterialIcons name="close" size={18} color="#64748B" />
                </Pressable>
              </View>
              <ScrollView style={{ padding: 16 }}>
                {loadingUsers ? (
                  <ActivityIndicator size="large" color="#4A9FD8" style={{ marginTop: 20 }} />
                ) : followingUsers.length === 0 ? (
                  <ThemedText style={{ textAlign: 'center', color: '#64748B', marginTop: 20 }}>Không tìm thấy người dùng nào.</ThemedText>
                ) : (
                  followingUsers.map(user => {
                    const isSelected = taggedUserIds.includes(String(user.id));
                    const userInitials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();
                    const avatarUrl = user.avatar_url ? (user.avatar_url.startsWith('http') ? user.avatar_url : `${API_URL}${user.avatar_url}`) : null;
                    return (
                      <Pressable
                        key={user.id}
                        onPress={() => {
                          setTaggedUserIds(prev => 
                            isSelected ? prev.filter(id => id !== String(user.id)) : [...prev, String(user.id)]
                          );
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 12,
                          borderBottomWidth: 1,
                          borderBottomColor: '#F1F5F9'
                        }}
                      >
                        <Avatar initials={userInitials} soft avatarUrl={avatarUrl} />
                        <ThemedText style={{ flex: 1, fontSize: 16, fontWeight: '600', color: '#0F172A', marginLeft: 12 }}>
                          {user.first_name} {user.last_name}
                        </ThemedText>
                        <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: isSelected ? 0 : 2, borderColor: '#CBD5E1', backgroundColor: isSelected ? '#4A9FD8' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                          {isSelected && <MaterialIcons name="check" size={16} color="#FFF" />}
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </Modal>
    </>
  );
}
