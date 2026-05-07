'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedPage } from '@/components/app/ProtectedPage';
import { FeedPost } from '@/components/post/FeedPost';
import { ThemedText } from '@/components/ui/ThemedText';
import { ROUTES } from '@/lib/routes';
import { fetchPostDetail, fetchPostComments, createComment, deleteComment, likeComment, unlikeComment, deletePost, likePost, unlikePost, API_URL } from '@/lib/api';
import { fetchCurrentUser, type AuthUser } from '@/lib/auth';
import type { Post, Comment } from '@/lib/types';
import Link from 'next/link';
import Image from 'next/image';

const surfaceClass = 'rounded-[28px] border border-[#E4E8EE] bg-white';

function formatTime(isoStr: string) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

function getInitials(firstName?: string | null, lastName?: string | null) {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '??';
}

function Avatar({ initials, avatarUrl, size = 'h-14 w-14' }: { initials: string; avatarUrl?: string | null; size?: string }) {
  if (avatarUrl) {
    const uri = avatarUrl.startsWith('http') ? avatarUrl : `${API_URL}${avatarUrl}`;
    return (
      <Image 
        src={uri} 
        alt="Avatar"
        width={100}
        height={100}
        className={`${size} shrink-0 rounded-[22px] object-cover`}
      />
    );
  }
  return (
    <div className={`flex ${size} shrink-0 items-center justify-center rounded-[22px] bg-[#D9ECF8]`}>
      <ThemedText as="span" className="text-base font-semibold tracking-[0.5px] text-slate-900">
        {initials}
      </ThemedText>
    </div>
  );
}

function CommentItem({ 
  comment, 
  currentUser, 
  postAuthorId, 
  onReply, 
  onDelete 
}: { 
  comment: Comment; 
  currentUser: AuthUser | null;
  postAuthorId: string;
  onReply: (comment: Comment) => void;
  onDelete: (commentId: string) => void;
}) {
  const [isLiked, setIsLiked] = useState(comment.is_liked);
  const [likeCount, setLikeCount] = useState(comment.like_count);

  const authorName = `${comment.author.first_name} ${comment.author.last_name}`;
  const initials = getInitials(comment.author.first_name, comment.author.last_name);
  const canDelete = currentUser && (currentUser.id.toString() === comment.author_id || currentUser.id.toString() === postAuthorId);

  const handleLike = async () => {
    try {
      if (isLiked) {
        setIsLiked(false);
        setLikeCount(c => Math.max(0, c - 1));
        await unlikeComment(comment.id);
      } else {
        setIsLiked(true);
        setLikeCount(c => c + 1);
        await likeComment(comment.id);
      }
    } catch {
      setIsLiked(comment.is_liked);
      setLikeCount(comment.like_count);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <Avatar initials={initials} avatarUrl={comment.author.avatar_url} />
        <div className="flex-1 rounded-2xl bg-[#F7F8FA] p-4">
          <div className="mb-1 flex items-center justify-between gap-3">
            <ThemedText as="p" className="font-semibold text-slate-900">{authorName}</ThemedText>
            <ThemedText as="p" className="shrink-0 text-xs text-slate-500">{formatTime(comment.created_at)}</ThemedText>
          </div>
          <ThemedText as="p" className="leading-6 text-slate-700">{comment.content}</ThemedText>

          <div className="mt-3 flex items-center gap-4">
            <button 
              onClick={handleLike} 
              className={`flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70 active:opacity-60 ${isLiked ? 'text-[#4A9FD8]' : 'text-slate-500'}`}
            >
              <span className="material-icons text-[14px]">{isLiked ? 'thumb_up' : 'thumb_up_off_alt'}</span>
              <span>{likeCount > 0 ? `${likeCount} Thích` : 'Thích'}</span>
            </button>
            <button 
              onClick={() => onReply(comment)} 
              className="flex items-center gap-1 text-xs font-medium text-slate-500 transition-opacity hover:opacity-70 active:opacity-60"
            >
              <span className="material-icons text-[14px]">reply</span>
              Trả lời
            </button>
            {canDelete && (
              <button 
                onClick={() => onDelete(comment.id)} 
                className="flex items-center gap-1 text-xs font-medium text-[#D05B5B] transition-opacity hover:opacity-70 active:opacity-60"
              >
                <span className="material-icons text-[14px]">delete_outline</span>
                Xóa
              </button>
            )}
          </div>
        </div>
      </div>
      
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-12 space-y-3 border-l-2 border-[#E4E8EE] pl-4">
          {comment.replies.map(reply => (
            <CommentItem 
              key={reply.id} 
              comment={reply} 
              currentUser={currentUser} 
              postAuthorId={postAuthorId} 
              onReply={onReply} 
              onDelete={onDelete} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const [commentInput, setCommentInput] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [togglingLike, setTogglingLike] = useState(false);

  useEffect(() => {
    if (!postId) return;

    let mounted = true;

    Promise.all([
      fetchCurrentUser().catch(() => null),
      fetchPostDetail(postId).catch(() => null),
      fetchPostComments(postId).catch(() => []),
    ]).then(([userRes, postRes, commentsRes]) => {
      if (mounted) {
        setCurrentUser(userRes);
        setPost(postRes);
        setComments(commentsRes);
        if (postRes) {
          setLiked(postRes.is_liked);
          setLikeCount(postRes.like_count);
        }
        setLoading(false);
      }
    });

    return () => { mounted = false; };
  }, [postId]);

  const handlePostComment = async () => {
    if (!commentInput.trim() || isSubmitting || !postId) return;
    
    setIsSubmitting(true);
    try {
      await createComment(postId, commentInput.trim(), replyTo?.id || null);
      
      const updatedComments = await fetchPostComments(postId);
      setComments(updatedComments);
      setCommentInput('');
      setReplyTo(null);
    } catch {
      alert('Không thể gửi bình luận');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Bạn có chắc muốn xóa bình luận này?')) return;
    try {
      await deleteComment(commentId);
      const updatedComments = await fetchPostComments(postId as string);
      setComments(updatedComments);
    } catch {
      alert('Xóa bình luận thất bại');
    }
  };

  const handleToggleLike = async () => {
    if (togglingLike || !postId) return;
    setTogglingLike(true);
    try {
      const result = liked
        ? await unlikePost(postId as string)
        : await likePost(postId as string);
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
    const shareUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Bài viết từ Northfeed`, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert("Đã copy link bài viết!");
      }
    } catch (error) {
      console.warn(error);
    }
  };

  if (loading) return (
    <ProtectedPage>
      <div className="flex h-screen items-center justify-center bg-[#EDF1F5]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#4A9FD8] border-t-transparent" />
      </div>
    </ProtectedPage>
  );
  
  if (!post) return (
    <ProtectedPage>
      <div className="flex h-screen flex-col items-center justify-center bg-[#EDF1F5] gap-4">
        <span className="material-icons text-slate-300 text-[64px]">error_outline</span>
        <ThemedText as="p" className="text-xl font-semibold text-slate-900">Không tìm thấy bài viết</ThemedText>
        <Link href={ROUTES.home} className="rounded-2xl bg-[#0A0A0A] px-6 py-3 text-white font-medium">Quay lại trang chủ</Link>
      </div>
    </ProtectedPage>
  );

  const initials = getInitials(post.author?.first_name, post.author?.last_name) || 'U';
  const authorName = `${post.author?.first_name || ''} ${post.author?.last_name || ''}`.trim() || 'Người dùng';
  const isAuthor = currentUser?.id != null && post.author?.id != null && String(currentUser.id) === String(post.author.id);
  const firstMediaUrl = post.media?.[0]?.file_url ? 
    (post.media[0].file_url.startsWith('http') ? post.media[0].file_url : `${API_URL}${post.media[0].file_url}`) 
    : null;

  const currentUserInitials = getInitials(currentUser?.first_name, currentUser?.last_name);

  return (
    <ProtectedPage>
      <main className="min-h-screen bg-[#EDF1F5] pb-32">
        <div className="mx-auto w-full max-w-[860px] px-4 pb-6 pt-4 md:px-6">
          {/* Back header - Premium Sticky Style */}
          <div className="sticky top-4 z-30 mb-6 flex items-center justify-between gap-3 rounded-[28px] border border-[#E4E8EE] bg-white/80 px-5 py-4 shadow-sm backdrop-blur-md">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => router.back()} 
                className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#F7F8FA] text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <span className="material-icons">arrow_back</span>
              </button>
              <div className="flex flex-col">
                <ThemedText as="h1" className="text-base font-bold text-slate-950">Bài viết</ThemedText>
                <ThemedText as="span" className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Chi tiết nội dung</ThemedText>
              </div>
            </div>
          </div>

          <section className={`${surfaceClass} p-6 shadow-sm`}>
            {/* Post Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar size="h-14 w-14" initials={initials} avatarUrl={post.author.avatar_url} />
                <div>
                  <ThemedText as="h2" className="text-[22px] font-bold text-slate-950">{authorName}</ThemedText>
                  <ThemedText as="p" className="text-sm font-medium text-slate-500">{formatTime(post.created_at)}</ThemedText>
                </div>
              </div>

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
                      <button 
                        onClick={async () => {
                          if (confirm('Xóa bài viết này?')) {
                            await deletePost(post.id);
                            router.push(ROUTES.home);
                          }
                        }} 
                        className="w-full px-5 py-4 text-left font-medium text-red-500 hover:bg-red-50 transition-colors"
                      >
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
            
            {/* Post Content */}
            <ThemedText as="p" className="mt-8 text-[18px] leading-8 text-slate-800">{post.content}</ThemedText>
            
            {firstMediaUrl && (
              <div className="mt-6 overflow-hidden rounded-[28px] bg-[#F7F8FA]">
                <img 
                  src={firstMediaUrl} 
                  alt="Post media" 
                  className="h-auto max-h-[800px] w-full object-contain"
                />
              </div>
            )}

            {/* Post Stats */}
            <div className="mt-6 flex items-center justify-between border-b border-[#E4E8EE] pb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#4A9FD8] text-white">
                  <span className="material-icons text-[14px]">thumb_up</span>
                </div>
                <ThemedText as="p" className="text-sm font-medium text-slate-600">
                  {likeCount > 0 ? `${likeCount} lượt thích` : 'Chưa có lượt thích'}
                </ThemedText>
              </div>
              <ThemedText as="p" className="text-sm font-medium text-slate-500">
                {comments.length} bình luận
              </ThemedText>
            </div>

            {/* Post Actions */}
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={handleToggleLike}
                disabled={togglingLike}
                className={`flex flex-1 min-w-[130px] items-center justify-center gap-2 rounded-[20px] px-4 py-4 transition-colors ${liked ? 'bg-[#EAF4FB] text-[#4A9FD8]' : 'bg-[#F7F8FA] text-slate-600 hover:bg-slate-100'}`}
              >
                <span className="material-icons text-[20px]">{liked ? 'thumb_up' : 'thumb_up_off_alt'}</span>
                <span className="text-base font-medium">{liked ? 'Liked' : 'Like'}</span>
              </button>

              <button 
                onClick={() => document.getElementById('comment-input')?.focus()}
                className="flex flex-1 min-w-[130px] items-center justify-center gap-2 rounded-[20px] bg-[#F7F8FA] px-4 py-4 text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <span className="material-icons text-[20px]">chat_bubble_outline</span>
                <span className="text-base font-medium">Comment</span>
              </button>

              <button 
                onClick={handleShare}
                className="flex flex-1 min-w-[130px] items-center justify-center gap-2 rounded-[20px] bg-[#F7F8FA] px-4 py-4 text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <span className="material-icons text-[20px]">reply</span>
                <span className="text-base font-medium">Share</span>
              </button>
            </div>

            {/* Comment Section */}
            <div className="mt-10 border-t border-[#E4E8EE] pt-8">
              <div className="flex items-center justify-between mb-6">
                <ThemedText as="h3" className="text-[22px] font-bold text-slate-900">
                  Bình luận ({comments.length})
                </ThemedText>
              </div>
              {comments.length === 0 ? (
              <div className={`${surfaceClass} flex flex-col items-center p-8`}>
                <span className="material-icons text-[28px] text-[#94A3B8]">chat_bubble_outline</span>
                <ThemedText as="p" className="mt-3 text-center text-sm text-slate-500">
                  Chưa có bình luận. Hãy là người đầu tiên!
                </ThemedText>
              </div>
            ) : (
              <div className={`${surfaceClass} space-y-6 p-5`}>
                {comments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    currentUser={currentUser}
                    postAuthorId={post.author_id}
                    onReply={(selectedComment) => setReplyTo(selectedComment)}
                    onDelete={handleDeleteComment}
                  />
                ))}
              </div>
            )}

              {/* Sticky Comment Input */}
              <div className="sticky bottom-4 z-10 flex flex-col gap-3 bg-white border border-[#E4E8EE] p-4 rounded-[24px] shadow-lg mt-4">
                {replyTo && (
                  <div className="flex items-center justify-between bg-[#EAF4FB] px-4 py-2 rounded-xl">
                    <ThemedText as="span" className="text-sm font-semibold text-[#4A9FD8]">
                      Đang trả lời {replyTo.author.first_name}
                    </ThemedText>
                    <button onClick={() => setReplyTo(null)} className="text-slate-400 hover:text-slate-600">
                      <span className="material-icons text-[18px]">close</span>
                    </button>
                  </div>
                )}
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <textarea 
                      id="comment-input"
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      placeholder={replyTo ? "Viết câu trả lời..." : "Viết bình luận của bạn..."}
                      className="w-full bg-[#F7F8FA] rounded-2xl px-5 py-4 outline-none resize-none min-h-[56px] text-slate-900 placeholder:text-slate-400"
                      rows={commentInput.split('\n').length > 3 ? 4 : 2}
                    />
                  </div>
                  <button 
                    onClick={handlePostComment}
                    disabled={isSubmitting || !commentInput.trim()}
                    className={`flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#0A0A0A] text-white transition-all ${isSubmitting || !commentInput.trim() ? 'opacity-50' : 'hover:bg-slate-800'}`}
                  >
                    {isSubmitting ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <span className="material-icons">send</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#E4E8EE] bg-white px-4 py-3">
          {replyTo && (
            <div className="mx-auto mb-2 flex w-full max-w-[800px] items-center justify-between rounded-xl bg-[#F7F8FA] px-4 py-2">
              <ThemedText as="p" className="text-sm text-slate-500">
                Đang trả lời <span className="font-semibold text-slate-900">{replyTo.author.first_name}</span>
              </ThemedText>
              <button onClick={() => setReplyTo(null)} className="flex h-6 w-6 items-center justify-center text-[#94A3B8] transition-colors hover:text-slate-600">
                <span className="material-icons text-[16px]">close</span>
              </button>
            </div>
          )}
          <div className="mx-auto flex w-full max-w-[800px] items-center gap-3">
            <Avatar initials={currentUserInitials} avatarUrl={currentUser?.avatar_url} />
            <input
              value={commentInput}
              onChange={(event) => setCommentInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handlePostComment();
                }
              }}
              disabled={isSubmitting}
              placeholder="Viết bình luận..."
              className="no-focus-ring min-h-11 flex-1 rounded-[22px] border border-transparent bg-[#F7F8FA] px-5 py-3 text-base text-slate-900 outline-none placeholder:text-[#94A3B8] transition-colors focus:border-slate-200 focus:outline-none focus:shadow-none focus:ring-0 [box-shadow:none!important] [outline:none!important]"
            />
            <button
              onClick={handlePostComment}
              disabled={isSubmitting || !commentInput.trim()}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${commentInput.trim() && !isSubmitting ? 'bg-[#0A0A0A] text-white hover:bg-slate-800' : 'bg-[#F7F8FA] text-[#94A3B8]'}`}
            >
              {isSubmitting ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#94A3B8] border-t-transparent" />
              ) : (
                <span className="material-icons text-[20px]">send</span>
              )}
            </button>
          </div>
        </div>
      </main>
    </ProtectedPage>
  );
}
