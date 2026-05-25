import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { 
  DotsThree, 
  X, 
  ThumbsUp, 
  ChatCircleDots, 
  ShareNetwork, 
  GlobeHemisphereWest, 
  Users, 
  Sliders, 
  Lock, 
  CheckCircle,
  CaretDown
} from 'phosphor-react-native';
import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Image, Modal, Pressable, ScrollView, View, Alert, Share, TextInput, ActivityIndicator, DeviceEventEmitter } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar, surfaceClass } from '@/components/ui/core';
import { API_URL, likePost, unlikePost, deletePost, updatePost, fetchPostLikers } from '@/lib/api';
import type { PostLiker } from '@/lib/api';
import { fetchCurrentUser } from '@/lib/auth';
import type { Post } from '@/lib/types';

type VisibilityOption = {
  value: string;
  label: string;
  icon: React.ComponentType<any>;
  color: string;
  description: string;
};

const VISIBILITY_OPTIONS: VisibilityOption[] = [
  { value: 'public', label: 'Công khai', icon: GlobeHemisphereWest, color: '#41A36D', description: 'Mọi người đều có thể xem' },
  { value: 'followersonly', label: 'Người theo dõi', icon: Users, color: '#4A9FD8', description: 'Chỉ người theo dõi bạn' },
  { value: 'custom', label: 'Tùy chỉnh', icon: Sliders, color: '#F59E0B', description: 'Chọn người xem cụ thể' },
  { value: 'onlyme', label: 'Chỉ mình tôi', icon: Lock, color: '#64748B', description: 'Chỉ bạn mới thấy bài này' },
];

function getVisibilityConfig(visibility: string): VisibilityOption {
  return VISIBILITY_OPTIONS.find((o) => o.value === visibility) ?? { value: visibility, label: visibility, icon: GlobeHemisphereWest, color: '#64748B', description: '' };
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

export function FeedPost({ item, onDeleteSuccess }: { item: Post; onDeleteSuccess?: () => void }) {
    const [liked, setLiked] = useState(item.is_liked);
    const [count, setCount] = useState(item.like_count);
    const [loading, setLoading] = useState(false);
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

    useEffect(() => {
        setLiked(item.is_liked);
    }, [item.is_liked]);

    useEffect(() => {
        setCount(item.like_count);
    }, [item.like_count]);



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

    const handleToggleLike = async () => {
        if (loading) return;
        setLoading(true);
        try {
            const isUnliking = liked;
            const result = isUnliking
                ? await unlikePost(String(item.id))
                : await likePost(String(item.id), 'like');
            setLiked(result.liked);
            setCount(result.like_count);
        } catch {
            // Revert on error
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
        const shareUrl = `${API_URL}/post/${item.id}`;
        try {
            if (Platform.OS === 'web' && navigator.share) {
                await navigator.share({
                    title: `Bài viết của ${authorName}`,
                    url: shareUrl
                });
            } else if (Platform.OS === 'web') {
                // Clipboard fallback on web
                await navigator.clipboard.writeText(shareUrl);
                window.alert("Đã copy link bài viết!");
            } else {
                await Share.share({
                    message: `Xem bài viết của ${authorName}: ${shareUrl}`,
                });
            }
        } catch (error) {
            console.warn(error);
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

                <View style={{ position: 'relative', zIndex: 100 }}>
                    <Pressable onPress={handleOptionsClick} className="active:opacity-70">
                        {showMenu ? (
                            <View className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#F7F8FA]">
                                <X size={24} color="#666666" weight="bold" />
                            </View>
                        ) : (
                            <View className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#F7F8FA]">
                                <DotsThree size={24} color="#666666" weight="bold" />
                            </View>
                        )}
                    </Pressable>

                    {showMenu && (
                        <View
                            style={{
                                position: 'absolute',
                                right: 0,
                                top: 50,
                                backgroundColor: 'white',
                                borderRadius: 16,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.1,
                                shadowRadius: 12,
                                elevation: 5,
                                width: 160,
                                zIndex: 999
                            }}
                            className="border border-[#E4E8EE] overflow-hidden"
                        >
                            {isAuthor ? (
                                <>
                                    <Pressable onPress={() => { setShowMenu(false); setIsEditing(true); setEditContent(displayContent || ''); setEditVisibility(displayVisibility); }} className="px-4 py-4 active:bg-slate-50 border-b border-[#E4E8EE]">
                                        <ThemedText className="text-slate-900 font-medium">Chỉnh sửa bài viết</ThemedText>
                                    </Pressable>
                                    <Pressable onPress={handleDeleteConfirm} className="px-4 py-4 active:bg-slate-50 border-b border-[#E4E8EE]">
                                        <ThemedText className="text-red-500 font-medium">Xóa bài viết</ThemedText>
                                    </Pressable>
                                </>
                            ) : null}
                            <Pressable onPress={() => setShowMenu(false)} className="px-4 py-4 active:bg-slate-50">
                                <ThemedText className="text-slate-500 font-medium">Báo cáo</ThemedText>
                            </Pressable>
                        </View>
                    )}
                </View>
            </View>

            {/* Nội dung — bấm vào text chuyển sang detail, bấm vào ảnh mở viewer */}
            <View>
                {isEditing ? (
                    <View className="mt-4">
                        <TextInput
                            className="rounded-[20px] bg-[#F7F8FA] px-5 py-4 text-base text-slate-900"
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
                                        <vc.icon size={14} color={vc.color} weight="regular" />
                                        <ThemedText style={{ fontSize: 13, fontWeight: '600', color: vc.color }}>{vc.label}</ThemedText>
                                        <CaretDown size={16} color={vc.color} weight="bold" />
                                    </View>
                                );
                            })()}
                        </Pressable>
                        <View className="mt-3 flex-row justify-end gap-3">
                            <Pressable
                                onPress={() => setIsEditing(false)}
                                disabled={isSaving}
                                className="rounded-[20px] bg-[#E4E8EE] px-4 py-2 active:opacity-80"
                            >
                                <ThemedText className="font-medium text-slate-900">Hủy</ThemedText>
                            </Pressable>
                            <Pressable
                                onPress={handleSaveEdit}
                                disabled={isSaving || !editContent.trim()}
                                className={`flex-row items-center justify-center rounded-[20px] bg-[#0A0A0A] px-4 py-2 active:opacity-80 ${isSaving || !editContent.trim() ? 'opacity-70' : ''}`}
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
                            let itemClass = "relative overflow-hidden rounded-[16px] ";
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
                                        className="h-full w-full rounded-[16px]"
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
                        <X size={24} color="white" weight="bold" />
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

            {/* Stats — bấm vào lượt thích mở modal */}
            <View className="mt-4 flex-row items-center justify-between gap-3">
                <View className="flex-row items-center gap-3">
                    <Pressable onPress={handleOpenLikers} disabled={count === 0} className="active:opacity-70 flex-row items-center gap-1.5">
                        {count > 0 ? (
                            <>
                                <View className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#4A9FD8] border-2 border-white">
                                    <ThumbsUp color="#FFFFFF" size={12} weight="fill" />
                                </View>
                                <ThemedText className="text-sm font-semibold text-slate-700 ml-1">
                                    {count} lượt thích
                                </ThemedText>
                            </>
                        ) : (
                            <ThemedText className="text-sm font-medium text-slate-400">
                                Chưa có lượt thích
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
                            <vc.icon size={13} color={vc.color} weight="regular" />
                            <ThemedText style={{ fontSize: 12, fontWeight: '600', color: vc.color }}>
                                {vc.label}
                            </ThemedText>
                        </View>
                    );
                })()}
            </View>

            {/* Thanh hành động (Modern Iconic Style) */}
            <View className="mt-3 flex-row flex-wrap items-center justify-between pt-2 relative">
                <View className="flex-row items-center gap-4">
                    {/* Like */}
                    <Pressable
                        onPress={() => handleToggleLike()}
                        disabled={loading}
                        className="flex-row items-center gap-1.5 active:opacity-60 p-1"
                    >
                        <ThumbsUp color={liked ? "#4A9FD8" : "#0F172A"} size={26} weight={liked ? "fill" : "regular"} />
                    </Pressable>

                    {/* Comment */}
                    <Link href={`/(post)/${item.id}`} asChild>
                        <Pressable className="flex-row items-center gap-1.5 active:opacity-60 p-1">
                            <ChatCircleDots color="#0F172A" size={26} weight="regular" />
                        </Pressable>
                    </Link>

                    {/* Share */}
                    <Pressable onPress={handleShare} className="flex-row items-center gap-1.5 active:opacity-60 p-1">
                        <ShareNetwork color="#0F172A" size={26} weight="regular" />
                    </Pressable>
                </View>
                
                <Pressable className="p-1 active:opacity-60">
                    <MaterialIcons color="#0F172A" name="bookmark-border" size={26} />
                </Pressable>
            </View>

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
                                {count} lượt thích
                            </ThemedText>
                            <Pressable
                                onPress={() => setIsLikersVisible(false)}
                                className="h-8 w-8 items-center justify-center rounded-full bg-[#F7F8FA]"
                            >
                                <X size={18} color="#64748B" weight="bold" />
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
                                <ThemedText className="mt-3 text-sm text-slate-500">Chưa có ai thích bài viết này</ThemedText>
                            </View>
                        ) : (
                            <View className="px-5 pt-2">
                                {likers.map((liker) => {
                                    const likerInitials = `${liker.first_name?.[0] || ''}${liker.last_name?.[0] || ''}`.toUpperCase();
                                    const likerAvatarUrl = liker.avatar_url
                                        ? (liker.avatar_url.startsWith('http') ? liker.avatar_url : `${API_URL}${liker.avatar_url}`)
                                        : null;
                                    return (
                                        <View key={liker.id} className="flex-row items-center gap-4 py-3 border-b border-[#F1F5F9]">
                                            <Avatar initials={likerInitials} soft avatarUrl={likerAvatarUrl} />
                                            <View className="flex-1">
                                                <ThemedText className="font-semibold text-slate-900">
                                                    {liker.first_name} {liker.last_name}
                                                </ThemedText>
                                            </View>
                                            <ThemedText className="text-xl">
                                                {REACTIONS.find(r => r.type === liker.reaction_type)?.icon || '👍'}
                                            </ThemedText>
                                        </View>
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
                                <X size={18} color="#64748B" weight="bold" />
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
                                            <option.icon size={22} color={option.color} weight="regular" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <ThemedText style={{ fontSize: 15, fontWeight: '600', color: isSelected ? option.color : '#0F172A' }}>
                                                {option.label}
                                            </ThemedText>
                                            <ThemedText style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
                                                {option.description}
                                            </ThemedText>
                                        </View>
                                        {isSelected && <CheckCircle size={22} color={option.color} weight="fill" />}
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </ThemedView>
    );
}
