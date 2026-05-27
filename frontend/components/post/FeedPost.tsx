import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Image, Modal, Pressable, ScrollView, View, Alert, Share, TextInput, ActivityIndicator, DeviceEventEmitter } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ActionBubble, Avatar } from '@/components/ui/core';
import { API_URL, likePost, unlikePost, deletePost, updatePost, fetchPostLikers, listDirectChats, sendChatMessage, createPost } from '@/lib/api';
import type { PostLiker } from '@/lib/api';
import { fetchCurrentUser } from '@/lib/auth';
import type { Post, ReactionType } from '@/lib/types';

type VisibilityOption = {
    value: string;
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

function getVisibilityConfig(visibility: string): VisibilityOption {
    return VISIBILITY_OPTIONS.find((o) => o.value === visibility) ?? { value: visibility, label: visibility, icon: 'public', color: '#64748B', description: '' };
}

const REACTIONS = [
    { type: 'like', icon: '👍', color: '#4A9FD8', name: 'Like' },
    { type: 'love', icon: '❤️', color: '#F43F5E', name: 'Love' },
    { type: 'haha', icon: '😆', color: '#F59E0B', name: 'Haha' },
    { type: 'wow', icon: '😲', color: '#F59E0B', name: 'Wow' },
    { type: 'sad', icon: '😢', color: '#F59E0B', name: 'Sad' },
    { type: 'angry', icon: '😡', color: '#EF4444', name: 'Angry' }
] as const;

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

export function FeedPost({ item, onDeleteSuccess, isNested }: { item: Post; onDeleteSuccess?: () => void; isNested?: boolean }) {
    const [liked, setLiked] = useState(item.is_liked);
    const [reactionType, setReactionType] = useState<ReactionType | null | undefined>(item.user_reaction);
    const [count, setCount] = useState(item.like_count);
    const [topReactions, setTopReactions] = useState<ReactionType[]>(item.top_reactions || (item.like_count > 0 ? (item.user_reaction ? [item.user_reaction] : ['like']) : []));
    const [loading, setLoading] = useState(false);
    const [showReactions, setShowReactions] = useState(false);
    const [isDeleted, setIsDeleted] = useState(false);
    const [isViewerVisible, setIsViewerVisible] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);
    const [aspectRatio, setAspectRatio] = useState(1.5); // Mặc định 3:2

    // Edit states
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [displayContent, setDisplayContent] = useState(item.content);
    const [isSaving, setIsSaving] = useState(false);
    const [displayVisibility, setDisplayVisibility] = useState(item.visibility);
    const [editVisibility, setEditVisibility] = useState(item.visibility);
    const [showVisibilityPicker, setShowVisibilityPicker] = useState(false);

    // Likers modal
    const [isLikersVisible, setIsLikersVisible] = useState(false);
    const [likers, setLikers] = useState<PostLiker[]>([]);
    const [loadingLikers, setLoadingLikers] = useState(false);

    // Share modal state
    const [isShareModalVisible, setIsShareModalVisible] = useState(false);
    const [shareChats, setShareChats] = useState<any[]>([]);
    const [loadingShareChats, setLoadingShareChats] = useState(false);
    const [sendingChatIds, setSendingChatIds] = useState<Record<number, boolean>>({});
    const [isReposting, setIsReposting] = useState(false);

    const handleRepost = async () => {
        setIsReposting(true);
        try {
            await createPost('', [], 'public', undefined, undefined, undefined, undefined, undefined, undefined, String(item.id));
            if (Platform.OS === 'web') {
                window.alert('Đã chia sẻ lên bảng tin!');
            } else {
                Alert.alert('Thành công', 'Đã chia sẻ bài viết lên bảng tin của bạn!');
            }
            setIsShareModalVisible(false);
            DeviceEventEmitter.emit('postCreated'); // Giả sử có event này để báo reload feed
        } catch (error) {
            console.error(error);
            if (Platform.OS === 'web') {
                window.alert('Lỗi: Không thể chia sẻ bài viết');
            } else {
                Alert.alert('Lỗi', 'Không thể chia sẻ bài viết');
            }
        } finally {
            setIsReposting(false);
        }
    };

    useEffect(() => {
        setLiked(item.is_liked);
    }, [item.is_liked]);

    useEffect(() => {
        setCount(item.like_count);
    }, [item.like_count]);

    useEffect(() => {
        setReactionType(item.user_reaction);
    }, [item.user_reaction]);

    useEffect(() => {
        setDisplayContent(item.content);
    }, [item.content]);

    const authorName = `${item.author.first_name} ${item.author.last_name}`;
    const initials = getInitials(item.author);
    const timeAgo = formatTime(item.created_at);

    const mediaUrls = item.media?.map(m => m.file_url.startsWith('http') ? m.file_url : `${API_URL}${m.file_url}`) || [];
    const singleMediaUrl = mediaUrls.length === 1 ? mediaUrls[0] : null;

    // Lấy kích thước thật của ảnh để resize khung linh hoạt
    useEffect(() => {
        if (singleMediaUrl) {
            Image.getSize(singleMediaUrl, (width, height) => {
                if (width && height) {
                    setAspectRatio(width / height);
                }
            }, (err) => console.warn('Get image size error:', err));
        }
    }, [singleMediaUrl]);

    const updateTopReactionsAfterChange = (
        newReactionType: ReactionType | null,
        oldReactionType: ReactionType | null | undefined,
        newLikeCount: number,
        prevTop: ReactionType[]
    ): ReactionType[] => {
        if (newLikeCount === 0) return [];
        if (newLikeCount === 1 && newReactionType) return [newReactionType];

        let updated = [...prevTop];
        // Xóa reaction cũ khỏi top nếu có
        if (oldReactionType && oldReactionType !== newReactionType) {
            updated = updated.filter(r => r !== oldReactionType);
        }
        // Thêm reaction mới lên đầu nếu chưa có
        if (newReactionType && !updated.includes(newReactionType)) {
            updated = [newReactionType, ...updated];
        } else if (newReactionType) {
            // Đưa reaction mới lên đầu
            updated = [newReactionType, ...updated.filter(r => r !== newReactionType)];
        }
        return updated.slice(0, 3);
    };

    const handleToggleLike = async (rType?: ReactionType) => {
        if (loading) return;
        setShowReactions(false);

        const targetReaction: ReactionType = rType ?? 'like';
        // Bấm nút Like chính (không từ bubble): nếu đang liked bất kỳ → unlike luôn
        // Bấm từ bubble (rType có giá trị): chỉ unlike nếu đúng reaction đang có, khác thì cập nhật
        const isUnliking = rType !== undefined
            ? (liked && reactionType === targetReaction)
            : liked;

        setLoading(true);
        const prevReactionType = reactionType;
        try {
            const result = isUnliking
                ? await unlikePost(String(item.id))
                : await likePost(String(item.id), targetReaction);

            setLiked(result.liked);
            setCount(result.like_count);
            const newReaction = result.reaction_type ?? null;
            setReactionType(newReaction);
            setTopReactions(prev =>
                updateTopReactionsAfterChange(newReaction, prevReactionType, result.like_count, prev)
            );
        } catch {
            // Revert on error — không làm gì, state giữ nguyên
        } finally {
            setLoading(false);
        }
    };

    const handleOpenLikers = async () => {
        if (count === 0) return;
        setIsLikersVisible(true);
        setLoadingLikers(true);
        try {
            const res = await fetchPostLikers(String(item.id));
            setLikers(res.users);
        } catch {
            setLikers([]);
        } finally {
            setLoadingLikers(false);
        }
    };

    const [showMenu, setShowMenu] = useState(false);
    const [isAuthor, setIsAuthor] = useState(false);

    const handleOptionsClick = async () => {
        if (showMenu) {
            setShowMenu(false);
            return;
        }
        try {
            const user = await fetchCurrentUser();
            setIsAuthor(user.id.toString() === String(item.author_id) || user.id.toString() === String(item.author?.id));
            setShowMenu(true);
        } catch {
            setShowMenu(true); // Still show menu, but they won't see "Xóa bài"
        }
    };

    const handleSaveEdit = async () => {
        if (!editContent.trim() || isSaving) return;
        setIsSaving(true);
        try {
            await updatePost(String(item.id), editContent.trim(), editVisibility as import('@/lib/types').VisibilityLevel);
            setDisplayContent(editContent.trim());
            setDisplayVisibility(editVisibility);
            setIsEditing(false);
        } catch (err) {
            console.error("Update post error:", err);
            if (Platform.OS === 'web') {
                window.alert("Lỗi: Không thể cập nhật bài viết.");
            } else {
                Alert.alert("Lỗi", "Không thể cập nhật bài viết.");
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteConfirm = async () => {
        setShowMenu(false);
        if (Platform.OS === 'web') {
            if (window.confirm("Bạn có chắc chắn muốn xóa bài viết này không?")) {
                try {
                    await deletePost(String(item.id));
                    setIsDeleted(true);
                    onDeleteSuccess?.();
                    DeviceEventEmitter.emit('postDeleted', { postId: String(item.id) });
                } catch {
                    window.alert("Lỗi: Không thể xóa bài viết.");
                }
            }
        } else {
            Alert.alert("Xác nhận xóa", "Bạn có chắc chắn muốn xóa bài viết này không?", [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xóa",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deletePost(String(item.id));
                            setIsDeleted(true);
                            onDeleteSuccess?.();
                            DeviceEventEmitter.emit('postDeleted', { postId: String(item.id) });
                        } catch {
                            Alert.alert("Lỗi", "Không thể xóa bài viết.");
                        }
                    }
                }
            ]);
        }
    };

    const handleShare = async () => {
        setIsShareModalVisible(true);
        setLoadingShareChats(true);
        try {
            const res = await listDirectChats(1, 20);
            setShareChats(res.items || []);
        } catch (error) {
            console.warn("Failed to fetch chats for sharing", error);
        } finally {
            setLoadingShareChats(false);
        }
    };

    const handleSendToChat = async (chatId: number) => {
        if (sendingChatIds[chatId]) return;
        setSendingChatIds(prev => ({ ...prev, [chatId]: true }));
        try {
            const shareText = `[Bài viết] Xem bài viết của ${authorName} tại đây: doananentang://post/${item.id}`;
            await sendChatMessage(chatId, shareText);
            if (Platform.OS === 'web') {
                window.alert("Đã gửi tin nhắn!");
            } else {
                Alert.alert("Thành công", "Đã gửi bài viết qua tin nhắn!");
            }
        } catch (error) {
            if (Platform.OS === 'web') {
                window.alert("Lỗi khi gửi tin nhắn.");
            } else {
                Alert.alert("Lỗi", "Không thể gửi tin nhắn.");
            }
        } finally {
            setSendingChatIds(prev => ({ ...prev, [chatId]: false }));
        }
    };

    if (isDeleted) return null;

    return (
        <ThemedView className="bg-white mb-2 px-4 py-4" style={{ zIndex: showMenu ? 10 : 1 }}>
            {/* Header */}
            <View className="flex-row items-start justify-between gap-4 relative" style={{ zIndex: showMenu ? 50 : 1 }}>
                <Link href="/(tabs)/profile" asChild>
                    <Pressable className="flex-row items-center gap-3 active:opacity-70 flex-1">
                        <Avatar initials={initials} soft avatarUrl={item.author.avatar_url} />
                        <View className="flex-1 pr-2">
                            <ThemedText className="text-[17px] font-semibold text-slate-950 leading-6">
                                {authorName}
                                {item.feeling && (
                                    <ThemedText className="text-[16px] font-normal text-slate-500">
                                        {' '}đang cảm thấy {item.feeling}
                                    </ThemedText>
                                )}
                                {item.tagged_users && item.tagged_users.length > 0 && (
                                    <ThemedText className="text-[16px] font-normal text-slate-500">
                                        {' '}cùng với{' '}
                                        {item.tagged_users.map((t: any, idx: number) => {
                                            const tName = `${t.user.first_name} ${t.user.last_name}`;
                                            const tInitials = (t.user.first_name?.[0] || '') + (t.user.last_name?.[0] || '');
                                            return (
                                                <ThemedText key={t.user.id}>
                                                    <ThemedText
                                                        className="font-semibold text-slate-900"
                                                        onPress={(e) => {
                                                            e.stopPropagation();
                                                            e.preventDefault();
                                                            router.push({
                                                                pathname: '/profile/[userId]',
                                                                params: { userId: t.user.id, name: tName, initials: tInitials }
                                                            });
                                                        }}
                                                    >
                                                        {tName}
                                                    </ThemedText>
                                                    {idx < item.tagged_users!.length - 1 ? ', ' : ''}
                                                </ThemedText>
                                            );
                                        })}
                                    </ThemedText>
                                )}
                            </ThemedText>
                            <ThemedText className="text-sm text-slate-500 mt-0.5">{timeAgo}</ThemedText>
                        </View>
                    </Pressable>
                </Link>

                {!isNested && (
                    <View style={{ position: 'relative', zIndex: 100 }}>
                        <Pressable onPress={handleOptionsClick} className="active:opacity-70">
                            {showMenu ? (
                                <View className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#F7F8FA]">
                                    <MaterialIcons name="close" size={24} color="#666666" />
                                </View>
                            ) : (
                                <ActionBubble icon="more-horiz" />
                            )}
                        </Pressable>

                        {showMenu && (
                            <View
                                style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: 50,
                                    backgroundColor: 'white',
                                    borderRadius: 24,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.1,
                                    shadowRadius: 12,
                                    elevation: 5,
                                    width: 160,
                                    zIndex: 999
                                }}
                            >
                            <View className="overflow-hidden rounded-[24px] border border-slate-100">
                                {isAuthor && (
                                    <>
                                        <Pressable
                                            onPress={() => {
                                                setShowMenu(false);
                                                setEditContent(item.content || '');
                                                setEditVisibility(item.visibility);
                                                setIsEditing(true);
                                            }}
                                            className="flex-row items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-white active:bg-slate-50"
                                        >
                                            <MaterialIcons name="edit" size={20} color="#64748B" />
                                            <ThemedText className="text-[15px] font-semibold text-slate-700">Sửa bài viết</ThemedText>
                                        </Pressable>
                                        <Pressable onPress={handleDeleteConfirm} className="flex-row items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-white active:bg-red-50">
                                            <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
                                            <ThemedText className="text-[15px] font-semibold text-red-500">Xóa bài viết</ThemedText>
                                        </Pressable>
                                    </>
                                )}
                                <Pressable onPress={() => setShowMenu(false)} className="px-4 py-3.5 active:bg-slate-50">
                                    <ThemedText className="text-[15px] text-slate-500 font-medium">Báo cáo</ThemedText>
                                </Pressable>
                            </View>
                        </View>
                    )}
                </View>
                )}
            </View>

            {/* Nội dung — bấm vào text chuyển sang detail, bấm vào ảnh mở viewer */}
            <View>
                {isEditing ? (
                    <View className="mt-4">
                        <TextInput
                            className="rounded-[24px] bg-[#F7F8FA] px-5 py-4 text-base text-slate-900"
                            multiline
                            value={editContent}
                            onChangeText={setEditContent}
                            placeholder="Chỉnh sửa nội dung..."
                            style={{ minHeight: 80 }}
                            autoFocus
                        />
                        {/* Visibility chip trong edit mode */}
                        <Pressable
                            onPress={() => setShowVisibilityPicker(true)}
                            disabled={isSaving}
                            style={{ alignSelf: 'flex-start', marginTop: 10 }}
                        >
                            {(() => {
                                const vc = getVisibilityConfig(editVisibility);
                                return (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: `${vc.color}14`, borderWidth: 1, borderColor: vc.color }}>
                                        <MaterialIcons name={vc.icon} size={14} color={vc.color} />
                                        <ThemedText style={{ fontSize: 13, fontWeight: '600', color: vc.color }}>{vc.label}</ThemedText>
                                        <MaterialIcons name="arrow-drop-down" size={16} color={vc.color} />
                                    </View>
                                );
                            })()}
                        </Pressable>
                        <View className="mt-3 flex-row justify-end gap-3">
                            <Pressable
                                onPress={() => setIsEditing(false)}
                                disabled={isSaving}
                                className="rounded-full bg-[#E4E8EE] px-5 py-2 active:opacity-80"
                            >
                                <ThemedText className="font-medium text-slate-900">Hủy</ThemedText>
                            </Pressable>
                            <Pressable
                                onPress={handleSaveEdit}
                                disabled={isSaving || !editContent.trim()}
                                className={`flex-row items-center justify-center rounded-full bg-[#0A0A0A] px-5 py-2 active:opacity-80 ${isSaving || !editContent.trim() ? 'opacity-70' : ''}`}
                            >
                                {isSaving ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <ThemedText className="font-medium text-white">Lưu</ThemedText>
                                )}
                            </Pressable>
                        </View>
                    </View>
                ) : (
                    displayContent ? (
                        <Link href={`/(post)/${item.id}`} asChild>
                            <Pressable>
                                <ThemedText className="mt-6 text-[16px] leading-7 text-slate-700">
                                    {displayContent}
                                </ThemedText>
                            </Pressable>
                        </Link>
                    ) : null
                )}

                {mediaUrls.length > 0 && (
                    <View className="mt-4 flex-row flex-wrap justify-between gap-y-2">
                        {mediaUrls.map((url, index) => {
                            let itemClass = "relative overflow-hidden rounded-[24px] ";
                            if (mediaUrls.length === 1) {
                                itemClass += "w-full";
                            } else if (mediaUrls.length === 2 || mediaUrls.length === 4) {
                                itemClass += "w-[49%] aspect-square";
                            } else if (mediaUrls.length === 3) {
                                itemClass += index === 0 ? "w-full aspect-[2/1] mb-1" : "w-[49%] aspect-square";
                            }

                            return (
                                <Pressable
                                    key={index}
                                    onPress={() => {
                                        setViewerIndex(index);
                                        setIsViewerVisible(true);
                                    }}
                                    className={`${itemClass} active:opacity-95`}
                                    style={mediaUrls.length === 1 ? { aspectRatio, maxHeight: 800 } : {}}
                                >
                                    <Image
                                        source={{ uri: url }}
                                        className="h-full w-full rounded-[24px]"
                                        resizeMode="cover"
                                        onLoad={(event) => {
                                            if (mediaUrls.length === 1) {
                                                const source = event?.nativeEvent?.source;
                                                if (source?.width && source?.height) {
                                                    setAspectRatio(source.width / source.height);
                                                }
                                            }
                                        }}
                                    />
                                </Pressable>
                            );
                        })}
                    </View>
                )}

                {item.shared_post && (
                    <View className="mt-4 overflow-hidden rounded-[20px] border border-[#E4E8EE] bg-white">
                        <FeedPost item={item.shared_post} isNested />
                    </View>
                )}
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
                    {mediaUrls[viewerIndex] && (
                        <Image
                            source={{ uri: mediaUrls[viewerIndex] }}
                            className="w-full h-full"
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>

            {!isNested && (
                <>
                    {/* Stats — bấm vào lượt thích mở modal */}
                    <View className="mt-4 flex-row items-center justify-between gap-3">
                        <View className="flex-row items-center gap-3">
                            <Pressable onPress={handleOpenLikers} disabled={count === 0} className="active:opacity-70 flex-row items-center gap-1.5">
                                {count > 0 ? (
                                    <>
                                        <View className="flex-row items-center">
                                            {topReactions.slice(0, 3).map((rType, index) => {
                                                const icon = REACTIONS.find(r => r.type === rType)?.icon || '👍';
                                                return (
                                                    <View
                                                        key={rType}
                                                        className="h-[22px] w-[22px] items-center justify-center rounded-full bg-white border-2 border-white"
                                                        style={{ marginLeft: index > 0 ? -6 : 0, zIndex: 3 - index }}
                                                    >
                                                        <ThemedText style={{ fontSize: 13, lineHeight: 14, marginTop: Platform.OS === 'android' ? -2 : 0 }}>{icon}</ThemedText>
                                                    </View>
                                                );
                                            })}
                                        </View>
                                        <ThemedText className="text-sm font-medium text-slate-700 ml-1">
                                            {count} lượt tương tác
                                        </ThemedText>
                                    </>
                                ) : (
                                    <ThemedText className="text-sm font-medium text-slate-400">
                                        Chưa có lượt tương tác
                                    </ThemedText>
                                )}
                            </Pressable>
                            {item.comment_count > 0 && (
                                <>
                                    <View className="h-1 w-1 rounded-full bg-slate-300" />
                                    <ThemedText className="text-sm text-slate-500">
                                        {item.comment_count} bình luận
                                    </ThemedText>
                                </>
                            )}
                        </View>
                        {/* Visibility chip */}
                        {(() => {
                            const vc = getVisibilityConfig(displayVisibility);
                            return (
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 4,
                                        borderRadius: 14,
                                        paddingHorizontal: 10,
                                        paddingVertical: 4,
                                        backgroundColor: `${vc.color}14`,
                                    }}
                                >
                                    <MaterialIcons name={vc.icon} size={13} color={vc.color} />
                                    <ThemedText style={{ fontSize: 12, fontWeight: '600', color: vc.color }}>
                                        {vc.label}
                                    </ThemedText>
                                </View>
                            );
                        })()}
                    </View>

                    {/* Thanh hành động */}
                    <View className="mt-4 flex-row gap-2 border-t border-[#E4E8EE] pt-4 relative">
                        {/* Overlay bắt tap ra ngoài để đóng bubble */}
                {showReactions && (
                    <Pressable
                        style={{ position: 'absolute', top: -200, left: -200, right: -200, bottom: -200, zIndex: 50 }}
                        onPress={() => setShowReactions(false)}
                    />
                )}

                {/* Bubble chọn cảm xúc - hiện khi long press */}
                {showReactions && (
                    <View
                        style={{
                            position: 'absolute',
                            left: 0,
                            bottom: '100%',
                            marginBottom: 8,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            backgroundColor: 'white',
                            borderRadius: 999,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderWidth: 1,
                            borderColor: '#E4E8EE',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.12,
                            shadowRadius: 12,
                            elevation: 8,
                            zIndex: 100,
                        }}
                    >
                        {REACTIONS.map((r) => (
                            <Pressable
                                key={r.type}
                                onPress={() => handleToggleLike(r.type as ReactionType)}
                                style={[{
                                    padding: 6,
                                    borderRadius: 999,
                                }, reactionType === r.type && liked ? {
                                    backgroundColor: `${r.color}20`,
                                    transform: [{ scale: 1.15 }],
                                } : {}]}
                            >
                                <ThemedText style={{ fontSize: 26 }}>{r.icon}</ThemedText>
                            </Pressable>
                        ))}
                    </View>
                )}

                {/* Like */}
                <Pressable
                    onPress={() => handleToggleLike()}
                    onLongPress={() => setShowReactions(true)}
                    disabled={loading}
                    className="flex-1 flex-row items-center justify-center gap-1.5 rounded-[20px] bg-[#F7F8FA] py-3 px-1 active:opacity-80"
                    style={{ zIndex: 60 }}
                >
                    {liked ? (() => {
                        const rx = REACTIONS.find(r => r.type === reactionType);
                        return (
                            <>
                                <ThemedText style={{ fontSize: 20 }}>{rx?.icon ?? '👍'}</ThemedText>
                                <ThemedText style={{ color: rx?.color ?? '#4A9FD8' }} className="text-base font-semibold">
                                    {rx?.name ?? 'Like'}
                                </ThemedText>
                            </>
                        );
                    })() : (
                        <>
                            <MaterialIcons color="#666666" name="thumb-up-off-alt" size={20} />
                            <ThemedText className="text-base font-medium text-slate-500">Like</ThemedText>
                        </>
                    )}
                </Pressable>

                {/* Comment */}
                <Link href={`/(post)/${item.id}`} asChild>
                    <Pressable className="flex-1 flex-row items-center justify-center gap-1.5 rounded-[20px] bg-[#F7F8FA] py-3 px-1 active:opacity-80">
                        <MaterialIcons color="#666666" name="chat-bubble-outline" size={20} />
                        <ThemedText className="text-base font-medium text-slate-500">Comment</ThemedText>
                    </Pressable>
                </Link>

                {/* Share */}
                <Pressable onPress={handleShare} className="flex-1 flex-row items-center justify-center gap-1.5 rounded-[20px] bg-[#F7F8FA] py-3 px-1 active:opacity-80">
                    <MaterialIcons color="#666666" name="reply" size={20} />
                    <ThemedText className="text-base font-medium text-slate-500">Share</ThemedText>
                </Pressable>
            </View>
            </>
            )}

            {/* Modal danh sách người đã like */}
            <Modal
                visible={isLikersVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsLikersVisible(false)}
            >
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <Pressable style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} onPress={() => setIsLikersVisible(false)} />
                    <View style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: 'white', paddingBottom: 32, maxHeight: '75%' }}>
                        {/* Handle bar */}
                        <View className="mx-auto mt-3 h-1 w-10 rounded-full bg-slate-200" />

                        {/* Header */}
                        <View className="flex-row items-center justify-between px-5 py-4 border-b border-[#E4E8EE]">
                            <ThemedText className="text-lg font-semibold text-slate-900">
                                {count} cảm xúc
                            </ThemedText>
                            <Pressable
                                onPress={() => setIsLikersVisible(false)}
                                className="h-8 w-8 items-center justify-center rounded-full bg-[#F7F8FA]"
                            >
                                <MaterialIcons name="close" size={18} color="#64748B" />
                            </Pressable>
                        </View>

                        {/* Body */}
                        {loadingLikers ? (
                            <View className="items-center py-10">
                                <ActivityIndicator size="large" color="#4A9FD8" />
                                <ThemedText className="mt-3 text-sm text-slate-500">Đang tải...</ThemedText>
                            </View>
                        ) : likers.length === 0 ? (
                            <View className="items-center py-10">
                                <MaterialIcons name="thumb-up-off-alt" size={36} color="#CBD5E1" />
                                <ThemedText className="mt-3 text-sm text-slate-500">Chưa có ai tương tác với bài viết này</ThemedText>
                            </View>
                        ) : (
                            <View className="px-5 pt-2">
                                {likers.map((liker) => {
                                    const likerInitials = `${liker.first_name?.[0] || ''}${liker.last_name?.[0] || ''}`.toUpperCase();
                                    const likerAvatarUrl = liker.avatar_url
                                        ? (liker.avatar_url.startsWith('http') ? liker.avatar_url : `${API_URL}${liker.avatar_url}`)
                                        : null;
                                    return (
                                        <Pressable 
                                            key={liker.id} 
                                            className="flex-row items-center gap-4 py-3 border-b border-[#F1F5F9] active:opacity-70"
                                            onPress={() => {
                                                setIsLikersVisible(false);
                                                router.push({
                                                    pathname: '/profile/[userId]',
                                                    params: { userId: liker.id, name: `${liker.first_name} ${liker.last_name}`.trim() }
                                                });
                                            }}
                                        >
                                            <Avatar initials={likerInitials} soft avatarUrl={likerAvatarUrl} />
                                            <View className="flex-1">
                                                <ThemedText className="font-semibold text-slate-900">
                                                    {liker.first_name} {liker.last_name}
                                                </ThemedText>
                                            </View>
                                            <ThemedText className="text-xl">
                                                {REACTIONS.find(r => r.type === liker.reaction_type)?.icon || '👍'}
                                            </ThemedText>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Modal chọn/đổi quyền riêng tư */}
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
                    <View style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: 'white', paddingBottom: 36 }}>
                        {/* Handle bar */}
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
                        <ScrollView style={{ paddingHorizontal: 16, paddingTop: 12 }} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
                            {VISIBILITY_OPTIONS.map((option) => {
                                const isSelected = editVisibility === option.value;
                                return (
                                    <Pressable
                                        key={option.value}
                                        onPress={() => {
                                            setEditVisibility(option.value);
                                            setShowVisibilityPicker(false);
                                        }}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 16,
                                            borderRadius: 18,
                                            paddingHorizontal: 16,
                                            paddingVertical: 14,
                                            marginBottom: 8,
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
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Share Modal */}
            <Modal
                visible={isShareModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsShareModalVisible(false)}
            >
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <Pressable style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} onPress={() => setIsShareModalVisible(false)} />
                    <View style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: 'white', paddingBottom: 32, maxHeight: '75%' }}>
                        <View className="mx-auto mt-3 h-1 w-10 rounded-full bg-slate-200" />
                        
                        <View className="flex-row items-center justify-between px-5 py-4 border-b border-[#E4E8EE]">
                            <ThemedText className="text-lg font-semibold text-slate-900">
                                Chia sẻ
                            </ThemedText>
                            <Pressable
                                onPress={() => setIsShareModalVisible(false)}
                                className="h-8 w-8 items-center justify-center rounded-full bg-[#F7F8FA]"
                            >
                                <MaterialIcons name="close" size={18} color="#64748B" />
                            </Pressable>
                        </View>

                        <Pressable 
                            onPress={handleRepost}
                            disabled={isReposting}
                            className="flex-row items-center gap-3 px-5 py-4 border-b border-[#E4E8EE] active:bg-slate-50"
                        >
                            <View className="h-10 w-10 items-center justify-center rounded-full bg-[#EAF4FB]">
                                {isReposting ? (
                                    <ActivityIndicator size="small" color="#4A9FD8" />
                                ) : (
                                    <MaterialIcons name="add-to-photos" size={20} color="#4A9FD8" />
                                )}
                            </View>
                            <View>
                                <ThemedText className="font-semibold text-slate-900">Chia sẻ lên bảng tin</ThemedText>
                                <ThemedText className="text-sm text-slate-500">Đăng lại bài viết này trên trang của bạn</ThemedText>
                            </View>
                        </Pressable>

                        <ThemedText className="px-5 pt-4 pb-2 text-[13px] font-bold text-slate-500 uppercase tracking-wider">
                            Gửi qua tin nhắn
                        </ThemedText>

                        {loadingShareChats ? (
                            <View className="items-center py-10">
                                <ActivityIndicator size="large" color="#4A9FD8" />
                                <ThemedText className="mt-3 text-sm text-slate-500">Đang tải...</ThemedText>
                            </View>
                        ) : shareChats.length === 0 ? (
                            <View className="items-center py-10">
                                <MaterialIcons name="chat-bubble-outline" size={36} color="#CBD5E1" />
                                <ThemedText className="mt-3 text-sm text-slate-500">Chưa có cuộc trò chuyện nào</ThemedText>
                            </View>
                        ) : (
                            <ScrollView className="px-5 pt-2">
                                {shareChats.map((chat) => {
                                    const participant = chat.participant;
                                    const initials = `${participant.first_name?.[0] || ''}${participant.last_name?.[0] || ''}`.toUpperCase();
                                    const avatarUrl = participant.avatar_url
                                        ? (participant.avatar_url.startsWith('http') ? participant.avatar_url : `${API_URL}${participant.avatar_url}`)
                                        : null;
                                    
                                    const isSending = sendingChatIds[chat.chat_id];

                                    return (
                                        <View key={chat.chat_id} className="flex-row items-center justify-between gap-4 py-3 border-b border-[#F1F5F9]">
                                            <View className="flex-row items-center gap-3 flex-1">
                                                <Avatar initials={initials} soft avatarUrl={avatarUrl} />
                                                <ThemedText className="font-semibold text-slate-900 flex-1" numberOfLines={1}>
                                                    {participant.full_name}
                                                </ThemedText>
                                            </View>
                                            <Pressable
                                                disabled={isSending}
                                                onPress={() => handleSendToChat(chat.chat_id)}
                                                className={`rounded-[14px] px-4 py-2 ${isSending ? 'bg-slate-200' : 'bg-[#4A9FD8]'} active:opacity-80`}
                                            >
                                                {isSending ? (
                                                    <ActivityIndicator size="small" color="#4A9FD8" />
                                                ) : (
                                                    <ThemedText className="text-sm font-semibold text-white">Gửi</ThemedText>
                                                )}
                                            </Pressable>
                                        </View>
                                    );
                                })}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </ThemedView>
    );
}
