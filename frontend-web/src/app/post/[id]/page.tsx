'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedPage } from '@/components/app/ProtectedPage';
import { AppTopNav } from '@/components/navigation/AppTopNav';
import { ThemedText } from '@/components/ui/ThemedText';
import { ROUTES } from '@/lib/routes';
import { fetchPostDetail, fetchPostComments, createComment, deleteComment, likeComment, unlikeComment, deletePost, likePost, unlikePost, API_URL } from '@/lib/api';
import { fetchCurrentUser, type AuthUser } from '@/lib/auth';
import type { Post, Comment } from '@/lib/types';
import Link from 'next/link';

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

function Avatar({ initials, avatarUrl, size = 'h-10 w-10' }: { initials: string; avatarUrl?: string | null; size?: string }) {
  if (avatarUrl) {
    const uri = avatarUrl.startsWith('http') ? avatarUrl : `${API_URL}${avatarUrl}`;
    return (
      <img 
        src={uri} 
        alt="Avatar"
        className={`${size} shrink-0 rounded-[14px] object-cover`}
      />
    );
  }
  return (
    <div className={`flex ${size} shrink-0 items-center justify-center rounded-[14px] bg-[#EAF4FB]`}>
      <ThemedText as="span" className="text-sm font-semibold tracking-[0.5px] text-slate-900">
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
  const initials = `${comment.author.first_name?.[0] || ''}${comment.author.last_name?.[0] || ''}`.toUpperCase();
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
    } catch (err) {
      setIsLiked(comment.is_liked);
      setLikeCount(comment.like_count);
    }
  };

  return (
    <div className="mt-4">
      <div className="flex items-start gap-3">
        <Avatar initials={initials} avatarUrl={comment.author.avatar_url} />
        <div className="flex-1">
          <div className="rounded-[20px] bg-[#F7F8FA] px-4 py-3">
            <ThemedText as="p" className="font-semibold text-slate-900">{authorName}</ThemedText>
            <ThemedText as="p" className="mt-1 text-slate-700">{comment.content}</ThemedText>
          </div>
          <div className="mt-2 flex items-center gap-4 px-2">
            <ThemedText as="p" className="text-xs text-slate-500">{formatTime(comment.created_at)}</ThemedText>
            <button 
              onClick={handleLike} 
              className={`flex items-center gap-1 text-xs font-bold ${isLiked ? 'text-[#4A9FD8]' : 'text-slate-500'} hover:opacity-70 transition-opacity`}
            >
              <span className="material-icons text-[14px]">{isLiked ? 'thumb_up' : 'thumb_up_off_alt'}</span>
              {likeCount > 0 && <span>{likeCount}</span>}
              <span>Thích</span>
            </button>
            <button 
              onClick={() => onReply(comment)} 
              className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:opacity-70 transition-opacity"
            >
              <span className="material-icons text-[14px]">reply</span>
              Trả lời
            </button>
            {canDelete && (
              <button 
                onClick={() => onDelete(comment.id)} 
                className="flex items-center gap-1 text-xs font-bold text-red-400 hover:text-red-600 transition-colors"
              >
                <span className="material-icons text-[14px]">delete_outline</span>
                Xóa
              </button>
            )}
          </div>
        </div>
      </div>
      
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-5 border-l-2 border-[#E4E8EE] pl-5">
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
      const updatedComments = await fetchPostComments(postId as string);
      setComments(updatedComments);
    } catch (err) {
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

  const authorName = `${post.author.first_name} ${post.author.last_name}`;
  const initials = `${post.author.first_name?.[0] || ''}${post.author.last_name?.[0] || ''}`.toUpperCase();
  const firstMediaUrl = post.media && post.media.length > 0 
    ? (post.media[0].file_url.startsWith('http') ? post.media[0].file_url : `${API_URL}${post.media[0].file_url}`) 
    : null;
  const isAuthor = currentUser?.id.toString() === String(post.author_id) || currentUser?.id.toString() === String(post.author?.id);

  return (
    <ProtectedPage>
      <main className="min-h-screen bg-[#EDF1F5] pb-12">
        <div className="mx-auto w-full max-w-[860px] px-4 pb-6 pt-4 md:px-6">
          <AppTopNav currentUser={currentUser} />
          
          <button 
            onClick={() => router.back()} 
            className="mb-4 mt-6 flex items-center gap-2 font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <span className="material-icons">arrow_back</span>
            Quay lại
          </button>

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
              
              {/* Comment List */}
              <div className="space-y-2 mb-10">
                {comments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <span className="material-icons text-slate-200 text-[48px]">chat_bubble_outline</span>
                    <ThemedText as="p" className="text-slate-500 font-medium">Chưa có bình luận nào. Hãy là người đầu tiên!</ThemedText>
                  </div>
                ) : (
                  comments.map(c => (
                    <CommentItem 
                      key={c.id} 
                      comment={c} 
                      currentUser={currentUser} 
                      postAuthorId={post.author_id}
                      onReply={(comment) => setReplyTo(comment)}
                      onDelete={handleDeleteComment}
                    />
                  ))
                )}
              </div>

              {/* Sticky Comment Input */}
              <div className="sticky bottom-4 z-10 flex flex-col gap-3 bg-white border border-[#E4E8EE] p-4 rounded-[24px] shadow-lg">
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
      </main>
    </ProtectedPage>
  );
}
