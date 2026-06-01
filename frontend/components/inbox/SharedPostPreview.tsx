import { useEffect, useState } from 'react';
import { View, Image, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { fetchPostDetail, API_URL } from '@/lib/api';
import type { Post } from '@/lib/types';
import { Avatar } from '@/components/ui/core';

export function SharedPostPreview({ postId }: { postId: string }) {
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        fetchPostDetail(postId)
            .then(data => {
                if (mounted) {
                    setPost(data);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (mounted) setLoading(false);
            });
        return () => { mounted = false; };
    }, [postId]);

    if (loading) {
        return (
            <View className="p-4 items-center justify-center bg-slate-50 rounded-xl border border-slate-200 mt-2">
                <ActivityIndicator size="small" color="#4A9FD8" />
            </View>
        );
    }

    if (!post) {
        return (
            <View className="p-3 items-center justify-center bg-slate-50 rounded-xl border border-slate-200 mt-2">
                <ThemedText className="text-xs text-slate-500 italic">Bài viết không tồn tại hoặc đã bị xóa.</ThemedText>
            </View>
        );
    }

    const firstMediaUrl = post.media && post.media.length > 0
        ? (post.media[0].file_url.startsWith('http') ? post.media[0].file_url : `${API_URL}${post.media[0].file_url}`)
        : null;

    const authorName = `${post.author.first_name} ${post.author.last_name}`;
    const initials = `${post.author.first_name?.[0] || ''}${post.author.last_name?.[0] || ''}`.toUpperCase();
    const avatarUrl = post.author.avatar_url ? (post.author.avatar_url.startsWith('http') ? post.author.avatar_url : `${API_URL}${post.author.avatar_url}`) : null;

    return (
        <Pressable 
            onPress={() => router.push(`/(post)/${post.id}`)}
            className="mt-2 overflow-hidden rounded-[16px] border border-slate-200 bg-white"
        >
            <View className="p-3 flex-row items-center gap-2 border-b border-slate-100">
                <Avatar initials={initials} soft avatarUrl={avatarUrl} />
                <View className="flex-1">
                    <ThemedText className="text-sm font-semibold text-slate-900" numberOfLines={1}>{authorName}</ThemedText>
                    <ThemedText className="text-[11px] text-slate-500">Bài viết</ThemedText>
                </View>
            </View>
            
            {post.content ? (
                <View className="p-3 pb-2">
                    <ThemedText className="text-sm text-slate-700 leading-5" numberOfLines={3}>
                        {post.content}
                    </ThemedText>
                </View>
            ) : null}

            {firstMediaUrl && (
                <View className="w-full aspect-[4/3] bg-slate-100 border-t border-slate-100 mt-1">
                    <Image 
                        source={{ uri: firstMediaUrl }} 
                        className="w-full h-full"
                        resizeMode="cover"
                    />
                </View>
            )}
        </Pressable>
    );
}
