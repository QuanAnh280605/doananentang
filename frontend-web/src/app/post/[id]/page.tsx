'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedPage } from '@/components/app/ProtectedPage';
import { FeedPost } from '@/components/post/FeedPost';
import { ThemedText } from '@/components/ui/ThemedText';
import { ROUTES } from '@/lib/routes';
import { fetchPostDetail, fetchPostComments, createComment, deleteComment, likeComment, unlikeComment, API_URL } from '@/lib/api';
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
        unoptimized
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

  const currentUserInitials = getInitials(currentUser?.first_name, currentUser?.last_name);

  return (
    <ProtectedPage>
      <main className="min-h-screen bg-[#EDF1F5] pb-32">
        <div className="mx-auto w-full max-w-[860px] px-4 pb-6 pt-4 md:px-6">
          <button 
            onClick={() => router.back()} 
            className="mb-4 mt-6 flex items-center gap-2 font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <span className="material-icons">arrow_back</span>
            Quay lại
          </button>

          <FeedPost item={post} currentUser={currentUser} />

          <section className="mt-6">
            <ThemedText as="h3" className="mb-4 px-2 text-lg font-semibold text-slate-900">
              Bình luận ({comments.length})
            </ThemedText>

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
              className="min-h-11 flex-1 rounded-[22px] bg-[#F7F8FA] px-5 py-3 text-base text-slate-900 placeholder:text-[#94A3B8]"
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
