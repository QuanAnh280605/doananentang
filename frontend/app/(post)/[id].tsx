import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    TextInput,
    View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { FeedPost } from '@/components/post/FeedPost';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar, surfaceClass } from '@/components/ui/core';
import { createComment, deleteComment, fetchComments, fetchPostDetail, likeComment, unlikeComment } from '@/lib/api';
import type { Comment, Post } from '@/lib/types';

/** Tính initials từ tên tác giả comment */
function getCommentInitials(author: Comment['author']): string {
    const first = author.first_name?.[0] ?? '';
    const last = author.last_name?.[0] ?? '';
    return (first + last).toUpperCase() || '??';
}

/** Format thời gian */
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

function CommentItem({ 
    comment, 
    onReply, 
    onDelete, 
    canDelete 
}: { 
    comment: Comment; 
    onReply?: (comment: Comment) => void;
    onDelete?: (commentId: string) => void;
    canDelete?: boolean;
}) {
    const [liked, setLiked] = useState(comment.is_liked);
    const [likeCount, setLikeCount] = useState(comment.like_count);
    const [loading, setLoading] = useState(false);

    const handleLike = async () => {
        if (loading) return;
        setLoading(true);
        try {
            if (liked) {
                const res = await unlikeComment(String(comment.id));
                setLiked(false);
                setLikeCount(res.like_count);
            } else {
                const res = await likeComment(String(comment.id));
                setLiked(true);
                setLikeCount(res.like_count);
            }
        } catch (err) {
            console.error('Like comment error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        try {
            await deleteComment(String(comment.id));
            onDelete?.(String(comment.id));
        } catch (err) {
            alert('Không thể xóa bình luận');
        }
    };

    return (
        <View className="gap-3">
            <View className="flex-row gap-3">
                <Avatar initials={getCommentInitials(comment.author)} soft avatarUrl={comment.author.avatar_url} />
                <View className="flex-1 rounded-2xl bg-[#F7F8FA] p-4">
                    <View className="mb-1 flex-row items-center justify-between">
                        <ThemedText className="font-semibold text-slate-900">
                            {comment.author.first_name} {comment.author.last_name}
                        </ThemedText>
                        <ThemedText className="text-xs text-slate-500">
                            {formatTime(comment.created_at)}
                        </ThemedText>
                    </View>
                    <ThemedText className="leading-6 text-slate-700">
                        {comment.content}
                    </ThemedText>

                    <View className="mt-3 flex-row items-center gap-4">
                        <Pressable 
                            onPress={handleLike}
                            className="flex-row items-center gap-1 active:opacity-60"
                        >
                            <MaterialIcons 
                                color={liked ? '#4A9FD8' : '#94A3B8'} 
                                name={liked ? 'thumb-up' : 'thumb-up-off-alt'} 
                                size={14} 
                            />
                            <ThemedText className={`text-xs font-medium ${liked ? 'text-[#4A9FD8]' : 'text-slate-500'}`}>
                                {likeCount > 0 ? `${likeCount} Thích` : 'Thích'}
                            </ThemedText>
                        </Pressable>
                        <Pressable 
                            onPress={() => onReply?.(comment)}
                            className="flex-row items-center gap-1 active:opacity-60"
                        >
                            <MaterialIcons color="#94A3B8" name="reply" size={14} />
                            <ThemedText className="text-xs font-medium text-slate-500">Trả lời</ThemedText>
                        </Pressable>
                        {canDelete && (
                            <Pressable 
                                onPress={handleDelete}
                                className="flex-row items-center gap-1 active:opacity-60"
                            >
                                <MaterialIcons color="#D05B5B" name="delete-outline" size={14} />
                                <ThemedText className="text-xs font-medium text-[#D05B5B]">Xóa</ThemedText>
                            </Pressable>
                        )}
                    </View>
                </View>
            </View>

            {/* Render replies */}
            {comment.replies && comment.replies.length > 0 && (
                <View className="ml-12 gap-3 border-l-2 border-[#E4E8EE] pl-4">
                    {comment.replies.map(reply => (
                        <CommentItem 
                            key={String(reply.id)} 
                            comment={reply} 
                            canDelete={canDelete} // Giả định tác giả post xóa được cả reply
                            onDelete={onDelete}
                        />
                    ))}
                </View>
            )}
        </View>
    );
}

export default function PostDetailScreen() {
    const { id } = useLocalSearchParams();
    const postId = String(id);

    const [post, setPost] = useState<Post | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [replyTo, setReplyTo] = useState<Comment | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [postData, commentsData] = await Promise.all([
                fetchPostDetail(postId),
                fetchComments(postId),
            ]);
            setPost(postData);
            setComments(commentsData);
        } catch (err: any) {
            setError(err.message ?? 'Không thể tải bài viết');
        } finally {
            setLoading(false);
        }
    }, [postId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSendComment = async () => {
        if (!newComment.trim() || sending) return;
        setSending(true);
        try {
            await createComment(postId, newComment.trim(), replyTo?.id);
            setNewComment('');
            setReplyTo(null);
            loadData(); // Refresh to show new comment/reply correctly
        } catch (err) {
            console.error('Send comment error:', err);
        } finally {
            setSending(false);
        }
    };

    const headerTitle = post
        ? `${post.author.first_name} ${post.author.last_name}`
        : 'Bài viết';

    return (
        <ThemedView className="flex-1 bg-[#EDF1F5]">
            <StatusBar style="dark" />
            <Stack.Screen options={{ title: headerTitle }} />

            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={90}
            >
                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#4A9FD8" />
                        <ThemedText className="mt-3 text-sm text-slate-500">Đang tải...</ThemedText>
                    </View>
                ) : error || !post ? (
                    <View className="flex-1 items-center justify-center p-8">
                        <MaterialIcons color="#D05B5B" name="error-outline" size={40} />
                        <ThemedText className="mt-4 text-center text-base text-slate-600">
                            {error ?? 'Không tìm thấy bài viết'}
                        </ThemedText>
                        <Pressable onPress={loadData} className="mt-5 rounded-[20px] bg-[#0A0A0A] px-6 py-3 active:opacity-80">
                            <ThemedText className="text-sm font-medium text-white">Thử lại</ThemedText>
                        </Pressable>
                    </View>
                ) : (
                    <>
                        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                            <View className="mx-auto w-full max-w-[800px] px-4 py-6">
                                {/* Bài viết gốc */}
                                <FeedPost item={post} />

                                {/* Phần bình luận */}
                                <View className="mt-6">
                                    <ThemedText className="mb-4 px-2 text-lg font-semibold text-slate-900">
                                        Bình luận ({comments.length})
                                    </ThemedText>

                                    {comments.length === 0 ? (
                                        <ThemedView className={`${surfaceClass} items-center p-8`}>
                                            <MaterialIcons color="#94A3B8" name="chat-bubble-outline" size={28} />
                                            <ThemedText className="mt-3 text-center text-sm text-slate-500">
                                                Chưa có bình luận. Hãy là người đầu tiên!
                                            </ThemedText>
                                        </ThemedView>
                                    ) : (
                                        <ThemedView className={`${surfaceClass} gap-6 p-5`}>
                                            {comments.map((comment) => (
                                                <CommentItem 
                                                    key={String(comment.id)} 
                                                    comment={comment} 
                                                    onReply={(c) => setReplyTo(c)}
                                                    onDelete={() => loadData()}
                                                    canDelete={post?.author_id === comment.author_id || post?.author_id === 'ME_PLACEHOLDER'} // Sẽ check thật ở Backend
                                                />
                                            ))}
                                        </ThemedView>
                                    )}
                                </View>
                            </View>
                        </ScrollView>

                        {/* Thanh nhập bình luận cố định ở cuối */}
                        <View className="border-t border-[#E4E8EE] bg-white px-4 py-3">
                            {replyTo && (
                                <View className="mx-auto mb-2 w-full max-w-[800px] flex-row items-center justify-between rounded-xl bg-[#F7F8FA] px-4 py-2">
                                    <ThemedText className="text-sm text-slate-500">
                                        Đang trả lời <ThemedText className="font-semibold text-slate-900">{replyTo.author.first_name}</ThemedText>
                                    </ThemedText>
                                    <Pressable onPress={() => setReplyTo(null)}>
                                        <MaterialIcons color="#94A3B8" name="close" size={16} />
                                    </Pressable>
                                </View>
                            )}
                            <View className="mx-auto w-full max-w-[800px] flex-row items-center gap-3">
                                <Avatar initials="BN" soft />
                                <TextInput
                                    className="flex-1 rounded-[22px] bg-[#F7F8FA] px-5 py-3 text-base text-slate-900"
                                    cursorColor="#0F172A"
                                    placeholder="Viết bình luận..."
                                    placeholderTextColor="#94A3B8"
                                    selectionColor="rgba(15, 23, 42, 0.24)"
                                    value={newComment}
                                    onChangeText={setNewComment}
                                    onSubmitEditing={handleSendComment}
                                    returnKeyType="send"
                                    underlineColorAndroid="transparent"
                                    editable={!sending}
                                />
                                <Pressable
                                    onPress={handleSendComment}
                                    disabled={!newComment.trim() || sending}
                                    className={`h-11 w-11 items-center justify-center rounded-full ${newComment.trim() && !sending ? 'bg-[#0A0A0A]' : 'bg-[#F7F8FA]'}`}
                                >
                                    {sending ? (
                                        <ActivityIndicator size="small" color="#94A3B8" />
                                    ) : (
                                        <MaterialIcons
                                            color={newComment.trim() ? '#FFFFFF' : '#94A3B8'}
                                            name="send"
                                            size={20}
                                        />
                                    )}
                                </Pressable>
                            </View>
                        </View>
                    </>
                )}
            </KeyboardAvoidingView>
        </ThemedView>
    );
}
