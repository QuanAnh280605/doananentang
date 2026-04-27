'use client';

import Link from 'next/link';
import { useState } from 'react';
import { API_URL, likePost, unlikePost, deletePost } from '@/lib/api';
import type { Post } from '@/lib/types';
import { ThemedText } from '@/components/ui/ThemedText';
import { InteractionsModal } from './InteractionsModal';

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

export function FeedPost({
    item,
    currentUser,
    onPostClick
}: {
    item: Post;
    currentUser?: any;
    onPostClick?: (id: string) => void;
}) {
    const [liked, setLiked] = useState(item.is_liked);
    const [count, setCount] = useState(item.like_count);
    const [loading, setLoading] = useState(false);
    const [isDeleted, setIsDeleted] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showLikers, setShowLikers] = useState(false);

    const authorName = `${item.author.first_name} ${item.author.last_name}`;
    const initials = `${item.author.first_name?.[0] || ''}${item.author.last_name?.[0] || ''}`.toUpperCase();
    const timeAgo = formatTime(item.created_at);

    const firstMediaUrl = item.media && item.media.length > 0
        ? (item.media[0].file_url.startsWith('http')
            ? item.media[0].file_url
            : `${API_URL}${item.media[0].file_url}`)
        : null;

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
            setLiked(!liked);
            setCount(liked ? count - 1 : count + 1);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Bạn có chắc muốn xóa bài viết này?')) return;
        try {
            await deletePost(String(item.id));
            setIsDeleted(true);
        } catch (err) {
            alert('Không thể xóa bài viết. Vui lòng thử lại.');
        }
    };

    const handleShare = async () => {
        const shareUrl = `${window.location.origin}/post/${item.id}`;
        try {
            if (navigator.share) {
                await navigator.share({ title: `Bài viết của ${authorName}`, url: shareUrl });
            } else {
                await navigator.clipboard.writeText(shareUrl);
                alert("Đã copy link bài viết!");
            }
        } catch (error) {
            console.warn(error);
        }
    };

    const isAuthor = currentUser?.id?.toString() === String(item.author_id) || currentUser?.id?.toString() === String(item.author?.id);

    if (isDeleted) return null;

    const handleItemClick = (e: React.MouseEvent) => {
        if (onPostClick) {
            e.preventDefault();
            onPostClick(String(item.id));
        }
    };

    return (
        <section className="group/post relative rounded-[32px] border border-slate-200/60 bg-white p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_-8px_rgba(0,0,0,0.06)] transition-all duration-500 overflow-hidden">
            {/* Header - Ultra Clean */}
            <div className="relative flex items-start justify-between gap-4">
                <Link href={isAuthor ? "/profile" : "#"} className="flex items-center gap-4.5 group/author transition-all">
                    <div className="relative">
                        {item.author.avatar_url ? (
                            <img
                                src={item.author.avatar_url.startsWith('http') ? item.author.avatar_url : `${API_URL}${item.author.avatar_url}`}
                                className="h-15 w-15 rounded-[22px] object-cover ring-4 ring-transparent group-hover/author:ring-slate-50 transition-all duration-500 shadow-sm"
                                alt="Avatar"
                            />
                        ) : (
                            <div className="flex h-15 w-15 shrink-0 items-center justify-center rounded-[22px] bg-gradient-to-br from-[#D9ECF8] to-[#F1F5F9] shadow-sm group-hover/author:scale-105 transition-transform duration-500">
                                <ThemedText as="span" className="text-[17px] font-bold text-slate-900">{initials}</ThemedText>
                            </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-green-500 border-[3px] border-white shadow-sm" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <ThemedText as="h2" className="text-[20px] font-bold text-slate-950 tracking-tight leading-tight group-hover/author:text-[#4A9FD8] transition-colors">{authorName}</ThemedText>
                        <div className="flex items-center gap-2">
                            <ThemedText as="p" className="text-[13px] font-semibold text-slate-400">{timeAgo}</ThemedText>
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            <span className="material-icons text-[14px] text-slate-400">public</span>
                        </div>
                    </div>
                </Link>

                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900 active:scale-90 transition-all duration-300"
                    >
                        <span className="material-icons text-[24px]">{showMenu ? 'close' : 'more_horiz'}</span>
                    </button>

                    {showMenu && (
                        <div className="absolute right-0 top-14 z-20 w-56 overflow-hidden rounded-[24px] border border-slate-200/60 bg-white/95 backdrop-blur-xl shadow-[0_16px_48px_-12px_rgba(0,0,0,0.12)] animate-in fade-in zoom-in-95 duration-300">
                            <div className="p-2 space-y-1">
                                {isAuthor && (
                                    <button onClick={handleDelete} className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left text-[15px] font-bold text-red-500 hover:bg-red-50 rounded-[16px] transition-all">
                                        <span className="material-icons text-[20px]">delete_outline</span>
                                        Xóa bài viết
                                    </button>
                                )}
                                <button onClick={() => setShowMenu(false)} className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left text-[15px] font-bold text-slate-600 hover:bg-slate-50 rounded-[16px] transition-all">
                                    <span className="material-icons text-[20px]">report</span>
                                    Báo cáo nội dung
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Content Section */}
            <div className="mt-7">
                <button onClick={handleItemClick} className="block text-left w-full group/content">
                    <ThemedText as="p" className="text-[18px] leading-[1.65] text-slate-800 font-medium tracking-[-0.01em] group-hover/content:text-slate-950 transition-colors">
                        {item.content}
                    </ThemedText>
                </button>

                {firstMediaUrl && (
                    <div className="mt-6 overflow-hidden rounded-[30px] bg-slate-50 border border-slate-100/80 shadow-inner group/media">
                        <img
                            onClick={handleItemClick}
                            src={firstMediaUrl}
                            alt="Post media"
                            className="h-auto max-h-[850px] w-full object-contain cursor-pointer hover:scale-[1.015] transition-transform duration-700"
                        />
                    </div>
                )}
            </div>

            {/* Stats - Refined Interaction area */}
            <div className="mt-8 flex items-center justify-between border-t border-slate-100/80 pt-7">
                <div
                    className="flex items-center gap-3.5 cursor-pointer group/stats"
                    onClick={() => setShowLikers(true)}
                >
                    <div className="flex -space-x-2">
                        {count > 0 && (
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#4A9FD8] text-white ring-[3px] ring-white shadow-md z-[2] transition-transform group-hover/stats:scale-115 duration-300">
                                <span className="material-icons text-[14px]">thumb_up</span>
                            </div>
                        )}
                    </div>
                    <ThemedText as="p" className="text-[14px] font-bold text-slate-500 group-hover/stats:text-[#4A9FD8] transition-colors">
                        {count > 0 ? `${count} lượt thích` : 'Hãy là người đầu tiên thích'}
                    </ThemedText>
                </div>
                <button onClick={handleItemClick} className="flex items-center gap-2 group/comments">
                    <ThemedText as="p" className="text-[14px] font-bold text-slate-500 group-hover/comments:text-slate-900 transition-colors">
                        {item.comment_count} bình luận
                    </ThemedText>
                    <span className="material-icons text-[18px] text-slate-300 group-hover/comments:text-[#4A9FD8] transition-all">chevron_right</span>
                </button>
            </div>

            {/* Actions - Ultra Premium Action Bar */}
            <div className="mt-7 flex gap-3.5">
                <button
                    onClick={handleToggleLike}
                    disabled={loading}
                    className={`flex-1 flex items-center justify-center gap-3 rounded-[22px] px-5 py-4.5 transition-all duration-500 ${liked ? 'bg-[#EAF4FB] shadow-[0_8px_20px_-4px_rgba(74,159,216,0.15)]' : 'bg-[#F8FAFC] text-slate-500 hover:bg-slate-100 active:scale-[0.96]'}`}
                >
                    <span className={`material-icons text-[24px] ${liked ? 'text-[#4A9FD8] animate-bounce-short' : 'text-slate-400 group-hover/post:rotate-12 transition-transform'}`}>
                        {liked ? 'thumb_up' : 'thumb_up_off_alt'}
                    </span>
                    <span className={`text-[16px] font-bold tracking-tight ${liked ? 'text-[#4A9FD8]' : 'text-slate-600'}`}>
                        Thích
                    </span>
                </button>

                <button
                    onClick={handleItemClick}
                    className="flex flex-1 items-center justify-center gap-3 rounded-[22px] bg-[#F8FAFC] px-5 py-4.5 text-slate-600 hover:bg-slate-100 active:scale-[0.96] transition-all duration-500"
                >
                    <span className="material-icons text-[24px] text-slate-400">chat_bubble_outline</span>
                    <span className="text-[16px] font-bold tracking-tight">Bình luận</span>
                </button>

                <button
                    onClick={handleShare}
                    className="flex flex-1 items-center justify-center gap-3 rounded-[22px] bg-[#F8FAFC] px-5 py-4.5 text-slate-600 hover:bg-slate-100 active:scale-[0.96] transition-all duration-500"
                >
                    <span className="material-icons text-[24px]">shortcut</span>
                    <span className="text-[16px] font-bold tracking-tight">Chia sẻ</span>
                </button>
            </div>

            {showLikers && (
                <InteractionsModal
                    postId={String(item.id)}
                    onClose={() => setShowLikers(false)}
                />
            )}
        </section>
    )
}
