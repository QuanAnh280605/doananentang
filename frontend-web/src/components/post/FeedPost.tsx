'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { API_URL, likePost, unlikePost, deletePost } from '@/lib/api';
import type { Post } from '@/lib/types';
import { ThemedText } from '@/components/ui/ThemedText';

type FeedPostUser = {
    id?: string | number;
} | null;

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

export function FeedPost({ item, currentUser }: { item: Post; currentUser?: FeedPostUser }) {
    const [liked, setLiked] = useState(item.is_liked);
    const [count, setCount] = useState(item.like_count);
    const [loading, setLoading] = useState(false);
    const [isDeleted, setIsDeleted] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

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
        } catch {
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

    return (
        <section className="rounded-[28px] border border-[#E4E8EE] bg-white p-5">
            {/* Header */}
            <div className="relative flex items-start justify-between gap-4">
                <Link href="/profile" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                    {item.author.avatar_url ? (
                        <Image 
                            src={item.author.avatar_url.startsWith('http') ? item.author.avatar_url : `${API_URL}${item.author.avatar_url}`} 
                            className="h-14 w-14 rounded-[22px] object-cover" 
                            alt="Avatar" 
                            width={56}
                            height={56}
                            unoptimized
                        />
                    ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-[#D9ECF8]">
                            <ThemedText as="span" className="text-base font-semibold text-slate-900">{initials}</ThemedText>
                        </div>
                    )}
                    <div>
                        <ThemedText as="h2" className="text-[21px] font-semibold text-slate-950">{authorName}</ThemedText>
                        <ThemedText as="p" className="text-sm text-slate-500">{timeAgo}</ThemedText>
                    </div>
                </Link>
                
                <div className="relative">
                    <button 
                        onClick={() => setShowMenu(!showMenu)} 
                        className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#F7F8FA] text-[#666666] hover:bg-slate-100 transition-colors"
                    >
                        <span className="material-icons">{showMenu ? 'close' : 'more_horiz'}</span>
                    </button>
                    
                    {showMenu && (
                        <div className="absolute right-0 top-14 z-20 w-48 overflow-hidden rounded-[20px] border border-[#E4E8EE] bg-white shadow-xl">
                            {isAuthor && (
                                <button onClick={handleDelete} className="w-full px-5 py-4 text-left font-medium text-red-500 hover:bg-red-50 transition-colors">
                                    Xóa bài viết
                                </button>
                            )}
                            <button onClick={() => setShowMenu(false)} className="w-full px-5 py-4 text-left font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                                Báo cáo
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="mt-6">
                <Link href={`/post/${item.id}`} className="block group">
                    <ThemedText as="p" className="text-[16px] leading-7 text-slate-700 group-hover:text-slate-900 transition-colors">
                        {item.content}
                    </ThemedText>
                </Link>

                {firstMediaUrl && (
                    <div className="mt-5 overflow-hidden rounded-[28px] bg-[#F7F8FA]">
                        <Image
                            src={firstMediaUrl}
                            alt="Post media"
                            className="h-auto max-h-[800px] w-full object-contain cursor-pointer"
                            width={1200}
                            height={800}
                            unoptimized
                        />
                    </div>
                )}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <ThemedText as="p" className="text-sm font-medium text-slate-600">
                        {count > 0 ? `${count} lượt thích` : 'Chưa có lượt thích'}
                    </ThemedText>
                    {item.comment_count > 0 && (
                        <>
                            <div className="h-1 w-1 rounded-full bg-slate-300" />
                            <ThemedText as="p" className="text-sm font-medium text-slate-500">
                                {item.comment_count} bình luận
                            </ThemedText>
                        </>
                    )}
                </div>
                <ThemedText as="p" className="text-sm font-medium text-slate-500">{item.visibility}</ThemedText>
            </div>

            {/* Actions */}
            <div className="mt-4 flex flex-wrap gap-3 border-t border-[#E4E8EE] pt-4">
                <button
                    onClick={handleToggleLike}
                    disabled={loading}
                    className="flex min-w-[140px] flex-1 items-center justify-center gap-2 rounded-[20px] bg-[#F7F8FA] px-4 py-4 transition-opacity hover:bg-slate-100 active:opacity-80"
                >
                    <span className={`material-icons text-[20px] ${liked ? 'text-[#4A9FD8]' : 'text-[#666666]'}`}>{liked ? 'thumb_up' : 'thumb_up_off_alt'}</span>
                    <span className={`text-base font-medium ${liked ? 'text-[#4A9FD8]' : 'text-slate-900'}`}>{liked ? 'Liked' : 'Like'}</span>
                </button>

                <Link href={`/post/${item.id}`} className="flex min-w-[140px] flex-1 items-center justify-center gap-2 rounded-[20px] bg-[#F7F8FA] px-4 py-4 transition-opacity hover:bg-slate-100 active:opacity-80">
                    <span className="material-icons text-[20px] text-[#666666]">chat_bubble_outline</span>
                    <span className="text-base font-medium text-slate-900">Comment</span>
                </Link>

                <button 
                    onClick={handleShare}
                    className="flex min-w-[140px] flex-1 items-center justify-center gap-2 rounded-[20px] bg-[#F7F8FA] px-4 py-4 transition-opacity hover:bg-slate-100 active:opacity-80"
                >
                    <span className="material-icons text-[20px] text-[#666666]">reply</span>
                    <span className="text-base font-medium text-slate-900">Share</span>
                </button>
            </div>
        </section>
    );
}
