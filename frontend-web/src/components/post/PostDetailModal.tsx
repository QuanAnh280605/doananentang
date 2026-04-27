'use client';

import { useEffect, useState, useRef } from 'react';
import { ThemedText } from '@/components/ui/ThemedText';
import { API_URL, createComment, fetchPostComments, fetchPostDetail, likePost, unlikePost, deleteComment, deletePost, likeComment, unlikeComment } from '@/lib/api';
import { Post, Comment as PostComment } from '@/lib/types';
import { AuthUser } from '@/lib/auth';
import { InteractionsModal } from './InteractionsModal';

function formatTime(isoStr: string) {
    const diff = Date.now() - new Date(isoStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
}

const Avatar = ({ initials, avatarUrl, size = "h-12 w-12" }: { initials: string, avatarUrl: string | null, size?: string }) => (
    <div className={`${size} shrink-0 overflow-hidden rounded-[20px] bg-gradient-to-br from-[#D9ECF8] to-[#F1F5F9] border-2 border-white shadow-sm flex items-center justify-center`}>
        {avatarUrl ? (
            <img 
                src={avatarUrl.startsWith('http') ? avatarUrl : `${API_URL}${avatarUrl}`} 
                alt="Avatar" 
                className="h-full w-full object-cover"
            />
        ) : (
            <span className="text-sm font-bold text-slate-900">{initials}</span>
        )}
    </div>
);

const CommentItem = ({ comment, currentUser, postAuthorId, onReply, onDelete, isReply = false }: { 
    comment: PostComment, 
    currentUser: AuthUser | null,
    postAuthorId: string,
    onReply: (c: PostComment) => void,
    onDelete: (id: string) => void,
    isReply?: boolean
}) => {
    const [liked, setLiked] = useState(comment.is_liked);
    const [count, setCount] = useState(comment.like_count);
    const [loading, setLoading] = useState(false);

    const initials = `${comment.author.first_name?.[0] || ''}${comment.author.last_name?.[0] || ''}`.toUpperCase();
    const isCommentAuthor = currentUser?.id.toString() === String(comment.author_id);
    const isPostAuthor = currentUser?.id.toString() === String(postAuthorId);
    const canDelete = isCommentAuthor || isPostAuthor;

    const handleToggleLike = async () => {
        if (loading) return;
        setLoading(true);
        try {
            const result = liked
                ? await unlikeComment(comment.id)
                : await likeComment(comment.id);
            setLiked(result.liked);
            setCount(result.like_count);
        } catch {
            setLiked(!liked);
            setCount(liked ? count - 1 : count + 1);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-1">
            <div className={`group/comment flex gap-4 p-5 rounded-[28px] hover:bg-[#F8FAFC] transition-all duration-500 border border-transparent hover:border-slate-100 ${isReply ? 'ml-12 scale-95 origin-left' : ''}`}>
                <Avatar initials={initials} avatarUrl={comment.author.avatar_url} size={isReply ? "h-9 w-9" : "h-11 w-11"} />
                <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <ThemedText className={`${isReply ? 'text-[14px]' : 'text-[15.5px]'} font-bold text-slate-950 leading-none`}>{comment.author.first_name} {comment.author.last_name}</ThemedText>
                            <ThemedText className="text-[11px] font-semibold text-slate-400 mt-1.5 uppercase tracking-wider">{formatTime(comment.created_at)}</ThemedText>
                        </div>
                        {canDelete && (
                            <button
                                onClick={() => onDelete(comment.id)}
                                className="h-8 w-8 flex items-center justify-center rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover/comment:opacity-100 transition-all duration-300"
                            >
                                <span className="material-icons text-[18px]">delete_outline</span>
                            </button>
                        )}
                    </div>
                    <ThemedText className={`${isReply ? 'text-[14px]' : 'text-[15.5px]'} leading-relaxed text-slate-700 font-medium`}>{comment.content}</ThemedText>
                    <div className="flex items-center gap-3 pt-1">
                        <button
                            onClick={() => onReply(comment)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100/50 text-[12px] font-bold text-[#4A9FD8] hover:bg-[#EAF4FB] active:scale-95 transition-all"
                        >
                            <span className="material-icons text-[16px]">reply</span>
                            Trả lời
                        </button>
                        <button
                            onClick={handleToggleLike}
                            disabled={loading}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all active:scale-95 ${liked ? 'bg-[#EAF4FB] text-[#4A9FD8]' : 'bg-slate-100/50 text-slate-500 hover:bg-slate-200'}`}
                        >
                            <span className="material-icons text-[16px]">{liked ? 'thumb_up' : 'thumb_up_off_alt'}</span>
                            <span className="text-[12px] font-bold">{liked ? 'Đã thích' : 'Thích'}</span>
                            {count > 0 && <span className="ml-0.5 text-[10px] opacity-70">{count}</span>}
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Render nested replies if they exist */}
            {comment.replies && comment.replies.length > 0 && (
                <div className="space-y-1">
                    {comment.replies.map(reply => (
                        <CommentItem
                            key={reply.id}
                            comment={reply as any}
                            currentUser={currentUser}
                            postAuthorId={postAuthorId}
                            onReply={onReply}
                            onDelete={onDelete}
                            isReply={true}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export function PostDetailModal({
    postId,
    onClose,
    currentUser
}: {
    postId: string;
    onClose: () => void;
    currentUser: AuthUser | null;
}) {
    const [post, setPost] = useState<Post | null>(null);
    const [comments, setComments] = useState<PostComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [commentInput, setCommentInput] = useState('');
    const [replyTo, setReplyTo] = useState<PostComment | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [togglingLike, setTogglingLike] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showLikers, setShowLikers] = useState(false);

    const fetchAllData = async () => {
        if (!postId) return;
        setLoading(true);
        try {
            const [postRes, commentsRes] = await Promise.all([
                fetchPostDetail(postId),
                fetchPostComments(postId),
            ]);
            setPost(postRes);
            // Backend trả về dạng cây sẵn, nên không cần xử lý tree ở frontend
            setComments(commentsRes);
            if (postRes) {
                setLiked(postRes.is_liked);
                setLikeCount(postRes.like_count);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!postId) return;
        document.body.style.overflow = 'hidden';
        fetchAllData();
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [postId]);

    const handlePostComment = async () => {
        if (!commentInput.trim() || isSubmitting || !postId) return;
        setIsSubmitting(true);
        try {
            await createComment(postId, commentInput.trim(), replyTo?.id || null);
            await new Promise(resolve => setTimeout(resolve, 300));
            const commentsRes = await fetchPostComments(postId);
            setComments(commentsRes);
            setCommentInput('');
            setReplyTo(null);
        } catch (err) {
            alert('Không thể gửi bình luận');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!confirm('Bạn có chắc muốn xóa bình luận này?')) return;
        try {
            await deleteComment(commentId);
            const commentsRes = await fetchPostComments(postId);
            setComments(commentsRes);
        } catch (err) {
            alert('Xóa bình luận thất bại');
        }
    };

    const handleToggleLike = async () => {
        if (togglingLike || !postId) return;
        setTogglingLike(true);
        try {
            const result = liked
                ? await unlikePost(postId)
                : await likePost(postId);
            setLiked(result.liked);
            setLikeCount(result.like_count);
        } catch {
            setLiked(!liked);
            setLikeCount(liked ? likeCount - 1 : likeCount + 1);
        } finally {
            setTogglingLike(false);
        }
    };

    const handleShare = async () => {
        const shareUrl = `${window.location.origin}/post/${postId}`;
        try {
            if (navigator.share) {
                await navigator.share({ title: `Bài viết`, url: shareUrl });
            } else {
                await navigator.clipboard.writeText(shareUrl);
                alert("Đã copy link bài viết!");
            }
        } catch (error) {
            console.warn(error);
        }
    };

    if (!postId) return null;

    const initials = post ? `${post.author.first_name?.[0] || ''}${post.author.last_name?.[0] || ''}`.toUpperCase() : '';
    const authorName = post ? `${post.author.first_name} ${post.author.last_name}` : '';
    const firstMediaUrl = post?.media && post.media.length > 0
        ? (post.media[0].file_url.startsWith('http') ? post.media[0].file_url : `${API_URL}${post.media[0].file_url}`)
        : null;
    const isAuthor = currentUser?.id.toString() === String(post?.author_id) || currentUser?.id.toString() === String(post?.author?.id);

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6 lg:p-10">
            {/* Backdrop with ultra-smooth blur */}
            <div
                className="absolute inset-0 bg-slate-950/45 backdrop-blur-[16px] transition-all duration-700"
                onClick={onClose}
            />

            {/* Modal - Premium Container */}
            <div className="relative w-full max-w-[900px] max-h-[92vh] flex flex-col bg-[#FDFDFE] rounded-[40px] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] animate-in fade-in zoom-in-95 duration-500">
                {/* Header - Glassmorphism style */}
                <div className="flex items-center justify-between bg-white/80 backdrop-blur-md px-8 py-5 border-b border-slate-100">
                    <div className="flex items-center gap-5">
                        <button
                            onClick={onClose}
                            className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-slate-50 text-slate-900 hover:bg-slate-100 active:scale-90 transition-all duration-300"
                        >
                            <span className="material-icons text-[24px]">close</span>
                        </button>
                        <div className="flex flex-col gap-0.5">
                            <ThemedText as="h2" className="text-[19px] font-bold text-slate-950 tracking-tight leading-none">Khám phá bài viết</ThemedText>
                            <ThemedText as="span" className="text-[11px] font-bold text-[#4A9FD8] uppercase tracking-[0.15em]">Verified Content</ThemedText>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    {loading ? (
                        <div className="flex h-[500px] items-center justify-center">
                            <div className="relative h-12 w-12">
                                <div className="absolute inset-0 rounded-full border-[4px] border-slate-100" />
                                <div className="absolute inset-0 rounded-full border-[4px] border-[#4A9FD8] border-t-transparent animate-spin" />
                            </div>
                        </div>
                    ) : post ? (
                        <div className="px-8 py-8 space-y-8">
                            {/* Post Card - Sophisticated Surface */}
                            <section className="rounded-[40px] border border-slate-100 bg-white p-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-5">
                                        <div className="relative">
                                            <Avatar size="h-16 w-16" initials={initials} avatarUrl={post.author.avatar_url} />
                                            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-green-500 border-[3px] border-white shadow-sm" />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <ThemedText as="h2" className="text-[22px] font-bold text-slate-950 tracking-tight">{authorName}</ThemedText>
                                            <div className="flex items-center gap-2">
                                                <ThemedText as="p" className="text-[14px] font-semibold text-slate-400">{formatTime(post.created_at)}</ThemedText>
                                                <span className="h-1 w-1 rounded-full bg-slate-300" />
                                                <span className="material-icons text-[16px] text-slate-400">public</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowMenu(!showMenu)}
                                            className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-950 transition-all duration-300"
                                        >
                                            <span className="material-icons text-[26px]">{showMenu ? 'close' : 'more_horiz'}</span>
                                        </button>
                                        {showMenu && (
                                            <div className="absolute right-0 top-15 z-20 w-56 overflow-hidden rounded-[26px] border border-slate-100 bg-white/95 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-in fade-in zoom-in-95 duration-400">
                                                <div className="p-2 space-y-1">
                                                    {isAuthor && (
                                                        <button
                                                            onClick={async () => {
                                                                if (confirm('Xóa bài viết này?')) {
                                                                    await deletePost(post.id);
                                                                    onClose();
                                                                }
                                                            }}
                                                            className="flex w-full items-center gap-4 px-5 py-4 text-left text-[15px] font-bold text-red-500 hover:bg-red-50 rounded-[18px] transition-all"
                                                        >
                                                            <span className="material-icons text-[22px]">delete_outline</span>
                                                            Xóa bài viết
                                                        </button>
                                                    )}
                                                    <button onClick={() => setShowMenu(false)} className="flex w-full items-center gap-4 px-5 py-4 text-left text-[15px] font-bold text-slate-600 hover:bg-slate-50 rounded-[18px] transition-all">
                                                        <span className="material-icons text-[22px]">report</span>
                                                        Báo cáo nội dung
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <ThemedText as="p" className="mt-9 text-[20px] leading-[1.65] text-slate-800 font-medium tracking-[-0.015em]">{post.content}</ThemedText>

                                {firstMediaUrl && (
                                    <div className="mt-8 overflow-hidden rounded-[36px] bg-slate-50 border border-slate-100/60 shadow-inner">
                                        <img src={firstMediaUrl} alt="Media" className="h-auto max-h-[850px] w-full object-contain" />
                                    </div>
                                )}

                                <div className="mt-9 flex items-center justify-between border-t border-slate-100/80 pt-8">
                                    <div 
                                        className="flex items-center gap-4 cursor-pointer group/stats"
                                        onClick={() => setShowLikers(true)}
                                    >
                                        <div className="flex -space-x-2">
                                            {likeCount > 0 && (
                                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#4A9FD8] text-white ring-[3px] ring-white shadow-md z-[2] transition-transform group-hover/stats:scale-115">
                                                    <span className="material-icons text-[14px]">thumb_up</span>
                                                </div>
                                            )}
                                        </div>
                                        <ThemedText as="p" className="text-[14.5px] font-bold text-slate-500 group-hover/stats:text-[#4A9FD8] transition-colors">
                                            {likeCount > 0 ? `${likeCount} lượt thích` : 'Hãy là người đầu tiên thích'}
                                        </ThemedText>
                                    </div>
                                    <ThemedText as="p" className="text-[14.5px] font-bold text-slate-500">
                                        {comments.length} Bình luận
                                    </ThemedText>
                                </div>

                                {/* Post Actions - Sophisticated Action Bar */}
                                <div className="mt-7 flex gap-4">
                                    <button
                                        onClick={handleToggleLike}
                                        disabled={togglingLike}
                                        className={`flex-1 flex items-center justify-center gap-3.5 rounded-[24px] px-6 py-5 transition-all duration-500 ${liked ? 'bg-[#EAF4FB] shadow-[0_12px_24px_-8px_rgba(74,159,216,0.2)]' : 'bg-[#F8FAFC] text-slate-500 hover:bg-slate-100 active:scale-[0.96]'}`}
                                    >
                                        <span className={`material-icons text-[26px] ${liked ? 'text-[#4A9FD8]' : 'text-slate-400'}`}>
                                            {liked ? 'thumb_up' : 'thumb_up_off_alt'}
                                        </span>
                                        <span className={`text-[16px] font-bold tracking-tight ${liked ? 'text-[#4A9FD8]' : 'text-slate-600'}`}>
                                            Thích
                                        </span>
                                    </button>

                                    <button
                                        onClick={() => document.getElementById('modal-comment-input')?.focus()}
                                        className="flex flex-1 items-center justify-center gap-3.5 rounded-[24px] bg-[#F8FAFC] px-6 py-5 text-slate-600 hover:bg-slate-100 active:scale-[0.96] transition-all duration-500"
                                    >
                                        <span className="material-icons text-[26px] text-slate-400">chat_bubble_outline</span>
                                        <span className="text-[16px] font-bold tracking-tight">Bình luận</span>
                                    </button>

                                    <button
                                        onClick={handleShare}
                                        className="flex flex-1 items-center justify-center gap-3.5 rounded-[24px] bg-[#F8FAFC] px-6 py-5 text-slate-600 hover:bg-slate-100 active:scale-[0.96] transition-all duration-500"
                                    >
                                        <span className="material-icons text-[26px]">shortcut</span>
                                        <span className="text-[16px] font-bold tracking-tight">Chia sẻ</span>
                                    </button>
                                </div>

                                {/* Comments Section - Refined */}
                                <div className="mt-12 space-y-8">
                                    <div className="flex items-center gap-4">
                                        <ThemedText as="h3" className="text-[22px] font-bold text-slate-950 tracking-tight">Bình luận</ThemedText>
                                        <span className="flex h-7.5 items-center justify-center px-3.5 rounded-full bg-[#F1F5F9] text-[13px] font-bold text-slate-500 uppercase tracking-widest">
                                            {comments.length} Bình luận
                                        </span>
                                    </div>
                                    <div className="space-y-4">
                                        {comments.length === 0 ? (
                                            <div className="py-20 flex flex-col items-center justify-center gap-6 opacity-40">
                                                <div className="h-20 w-20 flex items-center justify-center rounded-[30px] bg-slate-50 shadow-inner">
                                                    <span className="material-icons text-[40px] text-slate-300">forum</span>
                                                </div>
                                                <ThemedText className="font-bold text-[16px] text-slate-400">Chưa có bình luận nào. Hãy bắt đầu cuộc trò chuyện!</ThemedText>
                                            </div>
                                        ) : (
                                            comments.map(c => (
                                                <CommentItem
                                                    key={c.id}
                                                    comment={c}
                                                    currentUser={currentUser}
                                                    postAuthorId={post.author_id}
                                                    onReply={(c) => setReplyTo(c)}
                                                    onDelete={handleDeleteComment}
                                                />
                                            ))
                                        )}
                                    </div>
                                </div>
                            </section>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-32 gap-6">
                            <div className="h-24 w-24 flex items-center justify-center rounded-[32px] bg-slate-50 shadow-inner">
                                <span className="material-icons text-slate-200 text-[56px]">error_outline</span>
                            </div>
                            <ThemedText as="p" className="text-2xl font-bold text-slate-400 tracking-tight">Nội dung không khả dụng</ThemedText>
                        </div>
                    )}
                </div>

                {/* Footer Input - Ultra-Refined */}
                {post && (
                    <div className="bg-white/95 backdrop-blur-xl px-8 py-6 border-t border-slate-100 shadow-[0_-12px_48px_rgba(0,0,0,0.05)]">
                        {replyTo && (
                            <div className="flex items-center justify-between bg-[#EAF4FB] px-5 py-3 rounded-[20px] mb-5 border border-[#D9ECF8] animate-in slide-in-from-bottom-3 duration-500">
                                <ThemedText as="span" className="text-[14px] font-bold text-[#4A9FD8]">
                                    Phản hồi <span className="text-slate-950 ml-1.5 font-extrabold">{replyTo.author.first_name} {replyTo.author.last_name}</span>
                                </ThemedText>
                                <button onClick={() => setReplyTo(null)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/60 transition-all">
                                    <span className="material-icons text-[20px] text-slate-400">close</span>
                                </button>
                            </div>
                        )}
                        <div className="flex gap-5 items-end">
                            <div className="flex-1 relative group">
                                <textarea
                                    id="modal-comment-input"
                                    value={commentInput}
                                    onChange={(e) => setCommentInput(e.target.value)}
                                    placeholder={replyTo ? `Phản hồi bình luận...` : "Bình luận của bạn..."}
                                    className="w-full bg-[#F8FAFC] border-2 border-transparent focus:border-[#4A9FD8]/20 focus:bg-white rounded-[26px] px-6 py-5 outline-none resize-none min-h-[66px] text-[16px] transition-all duration-500 placeholder:text-slate-400 font-medium shadow-sm group-hover:shadow-md"
                                    rows={1}
                                    onInput={(e) => {
                                        const target = e.target as HTMLTextAreaElement;
                                        target.style.height = 'auto';
                                        target.style.height = `${Math.min(target.scrollHeight, 180)}px`;
                                    }}
                                />
                            </div>
                            <button
                                onClick={handlePostComment}
                                disabled={isSubmitting || !commentInput.trim()}
                                className={`flex h-16 w-16 items-center justify-center rounded-[26px] bg-slate-950 text-white shadow-2xl transition-all duration-500 ${isSubmitting || !commentInput.trim() ? 'opacity-20 scale-90 grayscale' : 'hover:bg-[#4A9FD8] hover:-translate-y-1 active:scale-95 shadow-[#4A9FD8]/20'}`}
                            >
                                {isSubmitting ? (
                                    <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-white border-t-transparent" />
                                ) : (
                                    <span className="material-icons text-[28px]">send</span>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showLikers && (
                <InteractionsModal 
                    postId={postId} 
                    onClose={() => setShowLikers(false)} 
                />
            )}
        </div>
    );
}
