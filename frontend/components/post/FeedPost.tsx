import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ActionBubble, Avatar, surfaceClass } from '@/components/ui/core';
import { API_URL, likePost, unlikePost } from '@/lib/api';
import type { Post } from '@/lib/types';

/** Tính initials từ tên tác giả */
function getInitials(author: Post['author']): string {
    const first = author.first_name?.[0] ?? '';
    const last = author.last_name?.[0] ?? '';
    return (first + last).toUpperCase() || '??';
}

/** Format thời gian từ ISO string */
function formatTime(isoString: string): string {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
}

export function FeedPost({ item }: { item: Post }) {
    const [liked, setLiked] = useState(item.is_liked);
    const [count, setCount] = useState(item.like_count);
    const [loading, setLoading] = useState(false);
    const [isViewerVisible, setIsViewerVisible] = useState(false);
    const [aspectRatio, setAspectRatio] = useState(1.5); // Mặc định 3:2

    const authorName = `${item.author.first_name} ${item.author.last_name}`;
    const initials = getInitials(item.author);
    const timeAgo = formatTime(item.created_at);

    const firstMediaUrl = item.media && item.media.length > 0
        ? (item.media[0].file_url.startsWith('http')
            ? item.media[0].file_url
            : `${API_URL}${item.media[0].file_url}`)
        : null;

    // Lấy kích thước thật của ảnh để resize khung linh hoạt
    useEffect(() => {
        if (firstMediaUrl) {
            Image.getSize(firstMediaUrl, (width, height) => {
                if (width && height) {
                    setAspectRatio(width / height);
                }
            }, (err) => console.warn('Get image size error:', err));
        }
    }, [firstMediaUrl]);

    const handleToggleLike = async () => {
        if (loading) return;
        setLoading(true);
        try {
            const result = liked
                ? await unlikePost(String(item.id))
                : await likePost(String(item.id));
            setLiked(result.liked);
            setCount(result.like_count);
        } catch {
            // Nếu lỗi (chưa đăng nhập...), toggle UI local thôi
            setLiked(!liked);
            setCount(liked ? count - 1 : count + 1);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ThemedView className={`${surfaceClass} p-5`}>
            {/* Header */}
            <View className="flex-row items-start justify-between gap-4">
                <View className="flex-row items-center gap-4">
                    <Avatar initials={initials} soft />
                    <View>
                        <ThemedText className="text-[21px] font-semibold text-slate-950">{authorName}</ThemedText>
                        <ThemedText className="text-sm text-slate-500">{timeAgo}</ThemedText>
                    </View>
                </View>
                <ActionBubble icon="more-horiz" />
            </View>

            {/* Nội dung — bấm vào text chuyển sang detail, bấm vào ảnh mở viewer */}
            <View>
                {item.content ? (
                    <Link href={`/(post)/${item.id}`} asChild>
                        <Pressable>
                            <ThemedText className="mt-6 text-[16px] leading-7 text-slate-700">
                                {item.content}
                            </ThemedText>
                        </Pressable>
                    </Link>
                ) : null}

                {firstMediaUrl ? (
                    <Pressable onPress={() => setIsViewerVisible(true)} className="mt-5 active:opacity-95">
                        <Image
                            source={{ uri: firstMediaUrl }}
                            onLoad={(event) => {
                                // Sửa lỗi destructure trên Web
                                const source = event?.nativeEvent?.source;
                                if (source?.width && source?.height) {
                                    setAspectRatio(source.width / source.height);
                                }
                            }}
                            style={{ aspectRatio, maxHeight: 800 }}
                            className="w-full rounded-[28px]"
                            resizeMode="contain"
                        />
                    </Pressable>
                ) : null}
            </View>

            {/* Trình xem ảnh toàn màn hình */}
            <Modal
                visible={isViewerVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsViewerVisible(false)}
            >
                <View className="flex-1 bg-black/90 justify-center items-center">
                    <Pressable
                        className="absolute inset-0 z-0"
                        onPress={() => setIsViewerVisible(false)}
                    />
                    <Pressable
                        className="absolute top-12 right-6 z-10 h-10 w-10 items-center justify-center rounded-full bg-white/20"
                        onPress={() => setIsViewerVisible(false)}
                    >
                        <MaterialIcons name="close" size={24} color="white" />
                    </Pressable>
                    {firstMediaUrl && (
                        <Image
                            source={{ uri: firstMediaUrl }}
                            className="w-full h-full"
                            pointerEvents="none"
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>

            {/* Stats */}
            <View className="mt-4 flex-row items-center justify-between gap-3">
                <View className="flex-row items-center gap-3">
                    <ThemedText className="text-sm text-slate-500">
                        {count > 0 ? `${count} lượt thích` : 'Chưa có lượt thích'}
                    </ThemedText>
                    {item.comment_count > 0 && (
                        <>
                            <View className="h-1 w-1 rounded-full bg-slate-300" />
                            <ThemedText className="text-sm text-slate-500">
                                {item.comment_count} bình luận
                            </ThemedText>
                        </>
                    )}
                </View>
                <ThemedText className="text-sm text-slate-500">{item.visibility}</ThemedText>
            </View>

            {/* Thanh hành động */}
            <View className="mt-4 flex-row flex-wrap gap-3 border-t border-[#E4E8EE] pt-4">
                {/* Like */}
                <Pressable
                    onPress={handleToggleLike}
                    disabled={loading}
                    className="min-w-[140px] flex-1 flex-row items-center justify-center gap-2 rounded-[20px] bg-[#F7F8FA] px-4 py-4 active:opacity-80"
                >
                    <MaterialIcons
                        color={liked ? '#4A9FD8' : '#666666'}
                        name={liked ? 'thumb-up' : 'thumb-up-off-alt'}
                        size={20}
                    />
                    <ThemedText className={`text-base font-medium ${liked ? 'text-[#4A9FD8]' : 'text-slate-900'}`}>
                        {liked ? 'Liked' : 'Like'}
                    </ThemedText>
                </Pressable>

                {/* Comment */}
                <Link href={`/(post)/${item.id}`} asChild>
                    <Pressable className="min-w-[140px] flex-1 flex-row items-center justify-center gap-2 rounded-[20px] bg-[#F7F8FA] px-4 py-4 active:opacity-80">
                        <MaterialIcons color="#666666" name="chat-bubble-outline" size={20} />
                        <ThemedText className="text-base font-medium text-slate-900">Comment</ThemedText>
                    </Pressable>
                </Link>

                {/* Share */}
                <Pressable className="min-w-[140px] flex-1 flex-row items-center justify-center gap-2 rounded-[20px] bg-[#F7F8FA] px-4 py-4 active:opacity-80">
                    <MaterialIcons color="#666666" name="reply" size={20} />
                    <ThemedText className="text-base font-medium text-slate-900">Share</ThemedText>
                </Pressable>
            </View>
        </ThemedView>
    );
}
