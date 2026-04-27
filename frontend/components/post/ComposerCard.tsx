import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar, surfaceClass } from '@/components/ui/core';
import { createPost, uploadPostMedia } from '@/lib/api';

import type { AuthUser } from '@/lib/auth';

export function ComposerCard({ onPostCreated, currentUser }: { onPostCreated?: () => void; currentUser?: AuthUser | null }) {
    const [text, setText] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [isPosting, setIsPosting] = useState(false);

    const handlePickPhoto = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            setSelectedImage(result.assets[0].uri);
        }
    };

    const handlePost = async () => {
        if (isPosting) return;
        setIsPosting(true);
        try {
            let mediaUrls: string[] = [];
            if (selectedImage) {
                const uploadRes = await uploadPostMedia(selectedImage);
                mediaUrls = uploadRes.data;
            }

            await createPost(text, mediaUrls);
            
            // Reset composer
            setText('');
            setSelectedImage(null);
            setIsFocused(false);
            
            // Thông báo cho parent cập nhật feed
            onPostCreated?.();
        } catch (error: any) {
            console.error('Failed to post:', error);
            alert(error.message ?? 'Không thể đăng bài viết');
        } finally {
            setIsPosting(false);
        }
    };

    const canPost = text.trim().length > 0 || selectedImage;

    const initials = currentUser 
      ? `${currentUser.first_name?.[0] || ''}${currentUser.last_name?.[0] || ''}`.toUpperCase()
      : 'LC';

    return (
        <ThemedView className={`${surfaceClass} p-5`}>
            <View className="flex-row items-start gap-4">
                <Avatar initials={initials} soft avatarUrl={currentUser?.avatar_url} />
                <View className="flex-1">
                    <TextInput
                        className="rounded-[24px] bg-[#F7F8FA] px-5 py-4 text-base text-slate-900"
                        placeholder="Share a project update, a photo, or a thought"
                        placeholderTextColor="#94A3B8"
                        value={text}
                        onChangeText={setText}
                        onFocus={() => setIsFocused(true)}
                        multiline
                        style={{ minHeight: isFocused ? 80 : 48 }}
                    />
                </View>
            </View>

            {/* Preview ảnh đã chọn */}
            {selectedImage && (
                <View className="mt-4 overflow-hidden rounded-[24px]">
                    <Image
                        source={{ uri: selectedImage }}
                        className="h-[300px] w-full rounded-[24px]"
                        resizeMode="cover"
                    />
                    <Pressable
                        onPress={() => setSelectedImage(null)}
                        className="absolute right-3 top-3 h-8 w-8 items-center justify-center rounded-full bg-black/50"
                    >
                        <MaterialIcons color="#FFFFFF" name="close" size={18} />
                    </Pressable>
                </View>
            )}

            {/* Thanh hành động: Live / Photo / Write note + nút Post */}
            <View className="mt-4 flex-row flex-wrap items-center gap-3 border-t border-[#E4E8EE] pt-4">
                {[
                    ['videocam', 'Live', '#D05B5B', undefined] as const,
                    ['image', 'Photo', '#41A36D', handlePickPhoto] as const,
                    ['edit-note', 'Write note', '#4A9FD8', undefined] as const,
                ].map(([icon, label, color, onPress]) => (
                    <Pressable
                        key={label}
                        onPress={onPress}
                        className="min-w-[130px] flex-1 flex-row items-center justify-center gap-2 rounded-[20px] bg-[#F7F8FA] px-4 py-4 active:opacity-80"
                    >
                        <MaterialIcons color={color} name={icon as keyof typeof MaterialIcons.glyphMap} size={20} />
                        <ThemedText className="text-base font-medium text-slate-900">{label}</ThemedText>
                    </Pressable>
                ))}

                {/* Nút Post hiển thị khi có nội dung */}
                {canPost && (
                    <Pressable
                        onPress={handlePost}
                        disabled={isPosting}
                        className={`flex-row items-center justify-center gap-2 rounded-[20px] bg-[#0A0A0A] px-6 py-4 active:opacity-80 ${isPosting ? 'opacity-70' : ''}`}
                    >
                        {isPosting ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <MaterialIcons color="#FFFFFF" name="send" size={18} />
                                <ThemedText className="text-base font-medium text-white">Post</ThemedText>
                            </>
                        )}
                    </Pressable>
                )}
            </View>
        </ThemedView>
    );
}
