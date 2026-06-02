import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    DeviceEventEmitter,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeedPost } from '@/components/post/FeedPost';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar, surfaceClass } from '@/components/ui/core';
import {
    createComment,
    deleteComment,
    fetchComments,
    fetchPostDetail,
    likeComment,
    unlikeComment,
    searchUsersForMention,
    fetchFollowingUsers,
} from '@/lib/api';
import type { MentionUser } from '@/lib/api';
import { fetchCurrentUser } from '@/lib/auth';
import type { AuthUser } from '@/lib/auth';
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

/** Render nội dung bình luận, parse @[Tên Đầy Đủ](userId) thành link clickable */
function CommentContent({ content }: { content: string }) {
    // Định dạng mention: @[Tên Đầy Đủ](userId)
    const parts = content.split(/(@\[[^\]]+\]\(\d+\))/g);

    return (
        <ThemedText className="leading-6 text-slate-700">
            {parts.map((part, i) => {
                const match = part.match(/^@\[([^\]]+)\]\((\d+)\)$/);
                if (match) {
                    const displayName = match[1];
                    const userId = match[2];
                    return (
                        <Text
                            key={i}
                            style={{ color: '#4A9FD8', fontWeight: '600' }}
                            onPress={() =>
                                router.push({
                                    pathname: '/profile/[userId]',
                                    params: { userId, name: displayName },
                                })
                            }
                        >
                            {`@${displayName}`}
                        </Text>
                    );
                }
                return part;
            })}
        </ThemedText>
    );
}

function CommentItem({
    comment,
    onReply,
    onDelete,
    canDelete,
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
        } catch {
            alert('Không thể xóa bình luận');
        }
    };

    if (comment.is_deleted) {
        return null;
    }

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
                    <CommentContent content={comment.content} />

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
                            canDelete={canDelete}
                            onDelete={onDelete}
                        />
                    ))}
                </View>
            )}
        </View>
    );
}

export default function PostDetailScreen() {
    const { id, focusComment } = useLocalSearchParams();
    const postId = String(id);
    const insets = useSafeAreaInsets();

    const [post, setPost] = useState<Post | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [replyTo, setReplyTo] = useState<Comment | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const commentInputRef = useRef<TextInput | null>(null);

    // ─── @mention state ─────────────────────────
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [mentionSuggestions, setMentionSuggestions] = useState<MentionUser[]>([]);
    const [loadingMentions, setLoadingMentions] = useState(false);
    const mentionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Vị trí ký tự '@' trong chuỗi để thay thế khi chọn
    const mentionAtIndexRef = useRef<number>(-1);
    // Map tên hiển thị → userId để embed khi gửi
    const pendingMentionsRef = useRef<Map<string, number>>(new Map());

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [postData, commentsData, me] = await Promise.all([
                fetchPostDetail(postId),
                fetchComments(postId),
                fetchCurrentUser(),
            ]);
            setPost(postData);
            setComments(commentsData);
            setCurrentUser(me);
            setCurrentUserId(me.id);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Không thể tải bài viết');
        } finally {
            setLoading(false);
        }
    }, [postId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (!loading && post && focusComment === 'true') {
            const timer = setTimeout(() => {
                commentInputRef.current?.focus();
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [loading, post, focusComment]);

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            const [postData, commentsData] = await Promise.all([
                fetchPostDetail(postId),
                fetchComments(postId),
            ]);
            setPost(postData);
            setComments(commentsData);
        } catch (err) {
            console.error('Refresh error:', err);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (post) {
            DeviceEventEmitter.emit('postUpdated', {
                postId: String(post.id),
                is_liked: post.is_liked,
                like_count: post.like_count,
                comment_count: comments.length,
                reaction_type: post.user_reaction ?? null,
            });
        }
    }, [post, comments.length]);

    // ─── Xử lý thay đổi text input ─────────────────────────
    const handleCommentChange = (text: string) => {
        setNewComment(text);

        // Tìm vị trí '@' gần nhất chưa có khoảng trắng phía sau
        const atIndex = text.lastIndexOf('@');
        if (atIndex !== -1) {
            const afterAt = text.slice(atIndex + 1);
            // Trigger khi không có khoảng trắng sau @ và không quá dài
            if (!afterAt.includes(' ') && afterAt.length <= 30) {
                mentionAtIndexRef.current = atIndex;
                setMentionQuery(afterAt);

                if (mentionDebounceRef.current) clearTimeout(mentionDebounceRef.current);
                
                mentionDebounceRef.current = setTimeout(async () => {
                    setLoadingMentions(true);
                    try {
                        if (afterAt.length > 0) {
                            const res = await searchUsersForMention(afterAt, 8);
                            setMentionSuggestions(res.items);
                        } else if (currentUserId) {
                            const res = await fetchFollowingUsers(currentUserId, 1, 8);
                            // FollowUser và MentionUser có cấu trúc tương đồng
                            setMentionSuggestions(res.items as MentionUser[]);
                        } else {
                            setMentionSuggestions([]);
                        }
                    } catch {
                        setMentionSuggestions([]);
                    } finally {
                        setLoadingMentions(false);
                    }
                }, afterAt.length > 0 ? 250 : 0); // Không delay khi mới gõ @
                return;
            }
        }

        // Không có @ hợp lệ → đóng dropdown
        setMentionQuery(null);
        setMentionSuggestions([]);
        mentionAtIndexRef.current = -1;
    };

    // ─── Chọn người dùng từ dropdown ─────────────────────────
    const handleSelectMention = (user: MentionUser) => {
        const atIndex = mentionAtIndexRef.current;
        if (atIndex === -1) return;

        const displayName = (user.full_name || `${user.first_name} ${user.last_name}`).trim();
        // Chỉ chèn @Tên sạch trong TextInput (không có brackets/id)
        const mentionText = `@${displayName} `;
        const before = newComment.slice(0, atIndex);
        const after = newComment.slice(atIndex + 1 + (mentionQuery?.length ?? 0));
        setNewComment(before + mentionText + after);

        // Lưu map name → userId để dùng khi gửi
        pendingMentionsRef.current.set(displayName, user.id);

        setMentionQuery(null);
        setMentionSuggestions([]);
        mentionAtIndexRef.current = -1;
    };

    const handleSendComment = async () => {
        if (!newComment.trim() || sending) return;
        setSending(true);
        setMentionQuery(null);
        setMentionSuggestions([]);
        try {
            // Transform @Tên thành @[Tên](userId) trước khi gửi
            let contentToSend = newComment.trim();
            pendingMentionsRef.current.forEach((userId, name) => {
                contentToSend = contentToSend.replace(
                    new RegExp(`@${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'),
                    `@[${name}](${userId})`
                );
            });

            const createdComment = await createComment(postId, contentToSend, replyTo?.id);
            setNewComment('');
            setReplyTo(null);
            pendingMentionsRef.current.clear();
            
            // Cập nhật local state mượt mà, không cần tải lại toàn bộ trang từ server!
            setComments((prevComments) => {
                if (createdComment.parent_comment_id) {
                    // Nếu là reply cấp 2, chèn vào comment cha
                    return prevComments.map((c) => {
                        if (String(c.id) === String(createdComment.parent_comment_id)) {
                            return {
                                ...c,
                                replies: [...(c.replies || []), createdComment],
                            };
                        }
                        return c;
                    });
                } else {
                    // Nếu là bình luận chính cấp 1, append vào danh sách
                    return [...prevComments, createdComment];
                }
            });

            // Đồng thời tăng comment_count của post ngay lập tức để đồng bộ UI
            setPost((prevPost) => {
                if (!prevPost) return null;
                return {
                    ...prevPost,
                    comment_count: prevPost.comment_count + 1,
                };
            });
        } catch (err) {
            console.error('Send comment error:', err);
        } finally {
            setSending(false);
        }
    };

    const headerTitle = 'Trở lại';

    const showMentionDropdown = mentionQuery !== null && (loadingMentions || mentionSuggestions.length > 0);

    return (
        <ThemedView className="flex-1 bg-[#EDF1F5]">
            <StatusBar style="dark" />
            <Stack.Screen options={{ headerShown: false }} />

            {/* Custom Premium Header with Back Button */}
            <View 
                className="flex-row items-center gap-4 bg-white px-4 pb-3.5 border-b border-slate-100 shadow-sm"
                style={{ paddingTop: Math.max(insets.top, 0) + 8 }}
            >
                <Pressable
                    onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
                    className="h-10 w-10 items-center justify-center rounded-full bg-slate-50 border border-slate-100 active:opacity-80"
                >
                    <MaterialIcons name="arrow-back" size={20} color="#475569" />
                </Pressable>
                <View className="flex-1">
                    <ThemedText className="text-base font-bold text-slate-900" numberOfLines={1}>
                        {headerTitle}
                    </ThemedText>
                </View>
            </View>

            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
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
                        <ScrollView
                            className="flex-1"
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={handleRefresh}
                                    tintColor="#4A9FD8"
                                    colors={['#4A9FD8']}
                                />
                            }
                        >
                            <View className="mx-auto w-full max-w-[800px] px-4 py-6">
                                {/* Bài viết gốc */}
                                <FeedPost item={post} onDeleteSuccess={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} />

                                {/* Phần bình luận */}
                                <View className="mt-6">
                                    <ThemedText className="mb-4 px-2 text-lg font-semibold text-slate-900">
                                        Bình luận ({comments.length})
                                    </ThemedText>

                                    {comments.length === 0 ? (
                                        <ThemedView className={`${surfaceClass} items-center p-8`}>
                                            {post.comment_count > 0 ? (
                                                <>
                                                    <MaterialIcons color="#94A3B8" name="visibility-off" size={28} />
                                                    <ThemedText className="mt-3 text-center text-sm text-slate-500 leading-6">
                                                        Một số bình luận đã bị ẩn do cài đặt quyền riêng tư hoặc đã bị xóa.
                                                    </ThemedText>
                                                </>
                                            ) : (
                                                <>
                                                    <MaterialIcons color="#94A3B8" name="chat-bubble-outline" size={28} />
                                                    <ThemedText className="mt-3 text-center text-sm text-slate-500">
                                                        Chưa có bình luận. Hãy là người đầu tiên!
                                                    </ThemedText>
                                                </>
                                            )}
                                        </ThemedView>
                                    ) : (
                                        <ThemedView className={`${surfaceClass} gap-6 p-5`}>
                                            {comments.map((comment) => (
                                                <CommentItem
                                                    key={String(comment.id)}
                                                    comment={comment}
                                                    onReply={(c) => setReplyTo(c)}
                                                    onDelete={(commentId) => {
                                                        // Xử lý xoá comment local không reload
                                                        setComments((prevComments) => {
                                                            return prevComments
                                                                .filter((c) => String(c.id) !== String(commentId))
                                                                .map((c) => {
                                                                    if (c.replies) {
                                                                        return {
                                                                            ...c,
                                                                            replies: c.replies.filter((r) => String(r.id) !== String(commentId)),
                                                                        };
                                                                    }
                                                                    return c;
                                                                });
                                                        });
                                                        setPost((prevPost) => {
                                                            if (!prevPost) return null;
                                                            return {
                                                                ...prevPost,
                                                                comment_count: Math.max(0, prevPost.comment_count - 1),
                                                            };
                                                        });
                                                    }}
                                                    canDelete={
                                                        currentUserId !== null && (
                                                            String(comment.author_id) === String(currentUserId) ||
                                                            String(post?.author_id) === String(currentUserId)
                                                        )
                                                    }
                                                />
                                            ))}
                                        </ThemedView>
                                    )}
                                </View>
                            </View>
                        </ScrollView>

                        {/* Thanh nhập bình luận cố định ở cuối */}
                        <View className="border-t border-[#E4E8EE] bg-white px-4 py-3">
                            {/* Banner trả lời */}
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

                            {/* Dropdown gợi ý @mention */}
                            {showMentionDropdown && (
                                <View
                                    className="mx-auto w-full max-w-[800px] mb-2 rounded-2xl bg-white border border-[#E4E8EE] overflow-hidden"
                                    style={{
                                        boxShadow: '0px -4px 12px rgba(0, 0, 0, 0.08)',
                                        maxHeight: 240,
                                    }}
                                >
                                    {/* Header gợi ý */}
                                    <View className="flex-row items-center gap-2 px-4 py-2 border-b border-[#F1F5F9]">
                                        <MaterialIcons color="#4A9FD8" name="alternate-email" size={14} />
                                        <ThemedText className="text-xs font-medium text-slate-500">
                                            Gắn thẻ người dùng
                                        </ThemedText>
                                    </View>

                                    {loadingMentions ? (
                                        <View className="items-center py-4">
                                            <ActivityIndicator size="small" color="#4A9FD8" />
                                        </View>
                                    ) : mentionSuggestions.length === 0 ? (
                                        <View className="items-center py-4">
                                            <ThemedText className="text-sm text-slate-400">Không tìm thấy người dùng</ThemedText>
                                        </View>
                                    ) : (
                                        <ScrollView
                                            keyboardShouldPersistTaps="always"
                                            style={{ maxHeight: 200 }}
                                            showsVerticalScrollIndicator={false}
                                        >
                                            {mentionSuggestions.map((user) => {
                                                const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();
                                                const displayName = user.full_name || `${user.first_name} ${user.last_name}`;
                                                return (
                                                    <Pressable
                                                        key={user.id}
                                                        onPress={() => handleSelectMention(user)}
                                                        className="flex-row items-center gap-3 px-4 py-3 active:bg-[#F7F8FA] border-b border-[#F8FAFC]"
                                                    >
                                                        <Avatar initials={initials} soft avatarUrl={user.avatar_url} />
                                                        <View className="flex-1">
                                                            <ThemedText className="text-sm font-semibold text-slate-900">
                                                                {displayName}
                                                            </ThemedText>
                                                            {user.bio ? (
                                                                <ThemedText className="text-xs text-slate-500" numberOfLines={1}>
                                                                    {user.bio}
                                                                </ThemedText>
                                                            ) : null}
                                                        </View>
                                                        <MaterialIcons color="#CBD5E1" name="add" size={16} />
                                                    </Pressable>
                                                );
                                            })}
                                        </ScrollView>
                                    )}
                                </View>
                            )}

                            {/* Row nhập & gửi */}
                            <View className="mx-auto w-full max-w-[800px] flex-row items-center gap-3">
                                <Avatar
                                    initials={currentUser ? `${currentUser.first_name?.[0] || ''}${currentUser.last_name?.[0] || ''}`.toUpperCase() : 'ME'}
                                    soft
                                    avatarUrl={currentUser?.avatar_url}
                                />
                                <TextInput
                                    ref={commentInputRef}
                                    className="flex-1 rounded-[22px] bg-[#F7F8FA] px-5 py-3 text-base text-slate-900"
                                    cursorColor="#0F172A"
                                placeholder={replyTo ? `Trả lời ${replyTo.author.first_name}...` : 'Viết bình luận...'}
                                    placeholderTextColor="#94A3B8"
                                    selectionColor="rgba(15, 23, 42, 0.24)"
                                    value={newComment}
                                    onChangeText={handleCommentChange}
                                    onSubmitEditing={handleSendComment}
                                    returnKeyType="send"
                                    underlineColorAndroid="transparent"
                                    editable={!sending}
                                    blurOnSubmit={false}
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
