'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedPage } from '@/components/app/ProtectedPage';
import { AppTopNav } from '@/components/navigation/AppTopNav';
import { ThemedText } from '@/components/ui/ThemedText';
import { ROUTES } from '@/lib/routes';
import { fetchPostDetail, fetchPostComments, createComment, deleteComment, likeComment, unlikeComment, deletePost, API_URL } from '@/lib/api';
import { fetchCurrentUser, type AuthUser } from '@/lib/auth';
import type { Post, Comment } from '@/lib/types';

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

function Avatar({ initials, avatarUrl }: { initials: string; avatarUrl?: string | null }) {
  if (avatarUrl) {
    const uri = avatarUrl.startsWith('http') ? avatarUrl : `${API_URL}${avatarUrl}`;
    return (
      <img 
        src={uri} 
        alt="Avatar"
        className="h-10 w-10 shrink-0 rounded-[14px] object-cover"
      />
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#EAF4FB]">
      <ThemedText as="span" className="text-sm font-semibold tracking-[0.5px] text-slate-900">
        {initials}
      </ThemedText>
    </div>
  );
}

function CommentThread({ 
  comment, 
  currentUser, 
  postAuthorId, 
  onReply, 
  onDelete 
}: { 
  comment: Comment; 
  currentUser: AuthUser | null;
  postAuthorId: string;
  onReply: (parentId: string) => void;
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
            <button onClick={handleLike} className={`text-xs font-medium ${isLiked ? 'text-red-500' : 'text-slate-600'}`}>
              {likeCount > 0 ? `${likeCount} ` : ''}Thích
            </button>
            <button onClick={() => onReply(comment.id)} className="text-xs font-medium text-slate-600">Trả lời</button>
            {canDelete && (
              <button onClick={() => onDelete(comment.id)} className="text-xs font-medium text-red-500">Xóa</button>
            )}
          </div>
        </div>
      </div>
      
      {/* Recursively render replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-10 border-l-2 border-[#E4E8EE] pl-4">
          {comment.replies.map(reply => (
            <CommentThread 
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
  const [replyToId, setReplyToId] = useState<string | null>(null);
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
      const newComment = await createComment(postId, commentInput.trim(), replyToId);
      
      // Rough UI update: re-fetch comments to easily construct the tree
      const updatedComments = await fetchPostComments(postId);
      setComments(updatedComments);
      setCommentInput('');
      setReplyToId(null);
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

  const handleDeletePost = async () => {
    if (!postId || !confirm('Bạn có chắc muốn xóa bài viết này?')) return;
    try {
      await deletePost(postId as string);
      router.push(ROUTES.home);
    } catch (err) {
      alert('Không thể xóa bài viết');
    }
  };

  if (loading) return <ProtectedPage><div className="p-8 text-center">Loading...</div></ProtectedPage>;
  if (!post) return <ProtectedPage><div className="p-8 text-center">Post not found</div></ProtectedPage>;

  const authorName = `${post.author.first_name} ${post.author.last_name}`;
  const initials = `${post.author.first_name?.[0] || ''}${post.author.last_name?.[0] || ''}`.toUpperCase();
  const firstMediaUrl = post.media && post.media.length > 0 
    ? (post.media[0].file_url.startsWith('http') ? post.media[0].file_url : `${API_URL}${post.media[0].file_url}`) 
    : null;
  const isAuthor = currentUser?.id.toString() === String(post.author_id) || currentUser?.id.toString() === String(post.author?.id);

  return (
    <ProtectedPage>
      <main className="min-h-screen bg-[#EDF1F5] pb-8">
        <div className="mx-auto w-full max-w-[800px] px-4 pb-6 pt-4 md:px-6">
          <AppTopNav currentUser={currentUser} />
          
          <button onClick={() => router.back()} className="mb-4 mt-2 font-medium text-slate-500">
            ← Quay lại
          </button>

          <section className={`${surfaceClass} p-5`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar initials={initials} avatarUrl={post.author.avatar_url} />
                <div>
                  <ThemedText as="h2" className="text-[21px] font-semibold text-slate-950">{authorName}</ThemedText>
                  <ThemedText as="p" className="text-sm text-slate-500">{formatTime(post.created_at)}</ThemedText>
                </div>
              </div>
              {isAuthor && (
                <button onClick={handleDeletePost} className="flex h-10 px-4 items-center justify-center rounded-[14px] bg-red-50 text-red-500 font-medium">Xóa bài</button>
              )}
            </div>
            
            <ThemedText as="p" className="mt-6 text-[16px] leading-7 text-slate-700">{post.content}</ThemedText>
            
            {firstMediaUrl && (
              <div className="mt-5 overflow-hidden rounded-[28px] bg-[#F7F8FA]">
                <img 
                  src={firstMediaUrl} 
                  alt="Post media" 
                  style={{ width: '100%', maxHeight: '800px', objectFit: 'contain' }}
                />
              </div>
            )}

            <div className="mt-6 border-t border-[#E4E8EE] pt-6">
              <ThemedText as="h3" className="text-lg font-semibold text-slate-900 mb-4">Bình luận ({comments.length})</ThemedText>
              
              {/* Comment List */}
              <div className="mb-8">
                {comments.length === 0 ? (
                  <ThemedText as="p" className="text-slate-500 text-center py-4">Chưa có bình luận nào. Hãy là người đầu tiên!</ThemedText>
                ) : (
                  comments.map(c => (
                    <CommentThread 
                      key={c.id} 
                      comment={c} 
                      currentUser={currentUser} 
                      postAuthorId={post.author_id}
                      onReply={(id) => setReplyToId(id)}
                      onDelete={handleDeleteComment}
                    />
                  ))
                )}
              </div>

              {/* Comment Input */}
              <div className="flex gap-3 items-start mt-4 bg-[#F7F8FA] p-4 rounded-[20px]">
                <div className="flex-1">
                  {replyToId && (
                    <div className="mb-2 flex items-center justify-between bg-[#EAF4FB] px-3 py-1 rounded-lg">
                      <ThemedText as="span" className="text-xs text-[#4A9FD8]">Đang trả lời một bình luận</ThemedText>
                      <button onClick={() => setReplyToId(null)} className="text-xs font-bold text-slate-500">✕</button>
                    </div>
                  )}
                  <textarea 
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="Viết bình luận của bạn..."
                    className="w-full bg-transparent outline-none resize-none min-h-[40px] text-slate-900"
                    rows={2}
                  />
                </div>
                <button 
                  onClick={handlePostComment}
                  disabled={isSubmitting || !commentInput.trim()}
                  className="rounded-full bg-[#0A0A0A] px-4 py-2 font-medium text-white disabled:opacity-50"
                >
                  Gửi
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </ProtectedPage>
  );
}
