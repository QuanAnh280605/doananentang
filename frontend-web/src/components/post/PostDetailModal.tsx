'use client';

import { ArrowBendUpLeft, ChatCircleDots, DotsThree, GlobeHemisphereWest, Images, PaperPlaneTilt, ShareNetwork, ThumbsUp, Trash, WarningCircle, X } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';

import { ThemedText } from '@/components/ui/ThemedText';
import {
  API_URL,
  createComment,
  deleteComment,
  deletePost,
  fetchPostComments,
  fetchPostDetail,
  likeComment,
  likePost,
  unlikeComment,
  unlikePost,
} from '@/lib/api';
import type { AuthUser } from '@/lib/auth';
import type { Comment as PostComment, Post } from '@/lib/types';

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

function resolveMediaUrl(fileUrl: string) {
  return fileUrl.startsWith('http') ? fileUrl : `${API_URL}${fileUrl}`;
}

function countThreadComments(items: PostComment[]): number {
  return items.reduce((total, item) => total + 1 + countThreadComments(item.replies ?? []), 0);
}

function getInitials(firstName?: string | null, lastName?: string | null) {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
}

function getCommentTargetName(comment: PostComment) {
  return `${comment.author.first_name} ${comment.author.last_name}`.trim();
}

const Avatar = ({ initials, avatarUrl, size = 'h-12 w-12' }: { initials: string; avatarUrl: string | null; size?: string }) => (
  <div className={`${size} shrink-0 overflow-hidden rounded-[20px] border border-white/70 bg-gradient-to-br from-[#D9ECF8] to-[#F1F5F9] shadow-sm flex items-center justify-center`}>
    {avatarUrl ? (
      <img
        src={resolveMediaUrl(avatarUrl)}
        alt="Avatar"
        className="h-full w-full object-cover"
      />
    ) : (
      <span className="text-sm font-bold text-slate-900">{initials}</span>
    )}
  </div>
);

function CommentItem({
  comment,
  currentUser,
  postAuthorId,
  onReply,
  onDelete,
  depth = 0,
}: {
  comment: PostComment;
  currentUser: AuthUser | null;
  postAuthorId: string;
  onReply: (comment: PostComment) => void;
  onDelete: (id: string) => void;
  depth?: number;
}) {
  const [liked, setLiked] = useState(comment.is_liked);
  const [count, setCount] = useState(comment.like_count);
  const [loading, setLoading] = useState(false);

  const isNested = depth > 0;
  const initials = getInitials(comment.author.first_name, comment.author.last_name);
  const isCommentAuthor = currentUser?.id.toString() === String(comment.author_id);
  const isPostAuthor = currentUser?.id.toString() === String(postAuthorId);
  const canDelete = isCommentAuthor || isPostAuthor;

  const handleToggleLike = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = liked ? await unlikeComment(comment.id) : await likeComment(comment.id);
      setLiked(result.liked);
      setCount(result.like_count);
    } catch {
      setLiked(!liked);
      setCount(liked ? Math.max(0, count - 1) : count + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`space-y-3 ${isNested ? 'pl-5 sm:pl-7' : ''}`}>
      <div className="group/comment flex gap-3.5">
        <div className="flex flex-col items-center">
          <Avatar initials={initials} avatarUrl={comment.author.avatar_url} size={isNested ? 'h-9 w-9' : 'h-10 w-10'} />
          {comment.replies && comment.replies.length > 0 ? <div className="mt-3 hidden w-px flex-1 bg-slate-200 sm:block" /> : null}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className={`rounded-[24px] border ${isNested ? 'border-slate-200/80 bg-slate-50/80' : 'border-slate-200/70 bg-white'} px-4 py-3.5`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <ThemedText className={`truncate font-bold text-slate-950 ${isNested ? 'text-[14px]' : 'text-[15px]'}`}>
                  {comment.author.first_name} {comment.author.last_name}
                </ThemedText>
                <ThemedText className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {formatTime(comment.created_at)}
                </ThemedText>
              </div>

              {canDelete ? (
                <button
                  onClick={() => onDelete(comment.id)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-300 transition-all duration-300 hover:bg-red-50 hover:text-red-500 sm:opacity-0 sm:group-hover/comment:opacity-100"
                >
                  <Trash size={17} weight="regular" />
                </button>
              ) : null}
            </div>

            <ThemedText className={`mt-2 whitespace-pre-wrap leading-6 text-slate-700 ${isNested ? 'text-[14px]' : 'text-[15px]'}`}>
              {comment.content}
            </ThemedText>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-1">
            <button
              onClick={handleToggleLike}
              disabled={loading}
              className={`inline-flex items-center gap-1.5 text-[12px] font-bold transition-colors ${liked ? 'text-[#4A9FD8]' : 'text-slate-500 hover:text-slate-900'}`}
            >
              <ThumbsUp size={15} weight={liked ? 'fill' : 'regular'} />
              <span>{liked ? 'Đã thích' : 'Thích'}</span>
              {count > 0 ? <span className="text-slate-400">{count}</span> : null}
            </button>

            <button
              onClick={() => onReply(comment)}
              className="inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-500 transition-colors hover:text-[#4A9FD8]"
            >
              <ArrowBendUpLeft size={15} weight="regular" />
              <span>Trả lời</span>
            </button>
          </div>
        </div>
      </div>

      {comment.replies && comment.replies.length > 0 ? (
        <div className="space-y-3 border-l border-slate-200/80 ml-[18px] pl-4 sm:ml-[20px] sm:pl-5">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUser={currentUser}
              postAuthorId={postAuthorId}
              onReply={onReply}
              onDelete={onDelete}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MediaStage({ post, authorName }: { post: Post; authorName: string }) {
  const firstMedia = post.media?.[0] ?? null;
  const mediaUrl = firstMedia ? resolveMediaUrl(firstMedia.file_url) : null;
  const hasMedia = Boolean(firstMedia && mediaUrl);
  const isVideo = Boolean(firstMedia?.type?.toLowerCase().includes('video'));
  const contentPreview = post.content?.trim() || 'Bài viết này chưa có phần mô tả, hãy xem thảo luận ở panel bên phải.';

  return (
    <section className="relative flex h-full min-h-[280px] flex-col overflow-hidden bg-[#F8FAFC] lg:min-h-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#D9ECF8_0%,transparent_54%),linear-gradient(180deg,#FFFFFF_0%,#F8FAFC_100%)]" />
      <div className="absolute inset-0 opacity-70">
        <div className="absolute left-[-12%] top-[-12%] h-56 w-56 rounded-full bg-[#4A9FD8]/10 blur-3xl" />
        <div className="absolute bottom-[-18%] right-[-10%] h-64 w-64 rounded-full bg-slate-200/70 blur-3xl" />
      </div>

      <div className="relative flex h-full min-h-0 flex-col">
        <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-5 sm:px-6 lg:px-7 lg:pb-4 lg:pt-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 backdrop-blur-md">
            <Images className="text-[#4A9FD8]" size={16} weight="regular" />
            <ThemedText className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
              {hasMedia ? 'Media focus' : 'Text preview'}
            </ThemedText>
          </div>
          <ThemedText className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {authorName}
          </ThemedText>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center px-5 pb-5 sm:px-6 sm:pb-6 lg:px-8 lg:pb-8">
          {hasMedia && mediaUrl ? (
            <div className="relative grid h-full min-h-0 w-full place-items-center overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)] lg:rounded-[32px]">
              {isVideo ? (
                <video
                  src={mediaUrl}
                  controls
                  className="block h-full max-h-full w-full rounded-[28px] bg-black object-contain lg:rounded-[32px]"
                />
              ) : (
                <img
                  src={mediaUrl}
                  alt="Post media"
                  className="block h-full max-h-full w-full object-contain"
                />
              )}
            </div>
          ) : (
            <div className="flex h-full min-h-0 w-full flex-col justify-end rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)] lg:rounded-[32px] lg:p-8">
              <div className="h-full">
                <ThemedText className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#4A9FD8]">
                  Không có media
                </ThemedText>
                <ThemedText className="mt-4 text-[28px] font-bold leading-[1.24] tracking-[-0.04em] text-slate-950 sm:text-[34px] lg:text-[40px]">
                  {contentPreview}
                </ThemedText>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function PostDetailModal({
  postId,
  onClose,
  currentUser,
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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [togglingLike, setTogglingLike] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showLikers, setShowLikers] = useState(false);

  useEffect(() => {
    if (!postId) return;

    let isMounted = true;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    void Promise.all([fetchPostDetail(postId), fetchPostComments(postId)])
      .then(([postRes, commentsRes]) => {
        if (!isMounted) {
          return;
        }

        setPost(postRes);
        setComments(commentsRes);
        setLiked(postRes.is_liked);
        setLikeCount(postRes.like_count);
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, postId]);

  const handlePostComment = async () => {
    if (!commentInput.trim() || isSubmitting || !postId) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await createComment(postId, commentInput.trim(), replyTo?.id || null);
      await new Promise((resolve) => setTimeout(resolve, 300));
      const commentsRes = await fetchPostComments(postId);
      setComments(commentsRes);
      setCommentInput('');
      setReplyTo(null);
    } catch {
      setSubmitError('Không thể gửi bình luận. Vui lòng thử lại.');
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
    } catch {
      alert('Xóa bình luận thất bại');
    }
  };

  const handleToggleLike = async () => {
    if (togglingLike || !postId) return;
    setTogglingLike(true);
    try {
      const result = liked ? await unlikePost(postId) : await likePost(postId);
      setLiked(result.liked);
      setLikeCount(result.like_count);
    } catch {
      setLiked(!liked);
      setLikeCount(liked ? Math.max(0, likeCount - 1) : likeCount + 1);
    } finally {
      setTogglingLike(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/post/${postId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Bài viết', url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert('Đã copy link bài viết!');
      }
    } catch (error) {
      console.warn(error);
    }
  };

  if (!postId) return null;

  const initials = post ? getInitials(post.author.first_name, post.author.last_name) : '';
  const authorName = post ? `${post.author.first_name} ${post.author.last_name}` : '';
  const isAuthor = currentUser?.id.toString() === String(post?.author_id) || currentUser?.id.toString() === String(post?.author?.id);
  const totalComments = countThreadComments(comments);
  const captionText = post?.content?.trim() || 'Bài viết này chưa có caption.';

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 sm:p-4 lg:p-6">
      <div
        className="absolute inset-0 bg-slate-950/35 backdrop-blur-[10px] transition-all duration-500"
        onClick={onClose}
      />

      <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#F8FAFC] shadow-[0_36px_90px_-28px_rgba(15,23,42,0.45)] sm:h-[min(92vh,960px)] sm:w-full sm:max-w-[1360px] sm:rounded-[34px] lg:flex-row">
        {loading ? (
          <div className="flex flex-1 items-center justify-center bg-[#F8FAFC]">
            <div className="flex flex-col items-center gap-4">
              <div className="relative h-12 w-12">
                <div className="absolute inset-0 rounded-full border-[4px] border-slate-200" />
                <div className="absolute inset-0 animate-spin rounded-full border-[4px] border-[#4A9FD8] border-t-transparent" />
              </div>
              <ThemedText className="text-[14px] font-semibold text-slate-500">Đang tải bài viết...</ThemedText>
            </div>
          </div>
        ) : post ? (
          <>
            <div className="min-h-[34vh] lg:min-h-0 lg:flex-[1.3] lg:self-stretch">
              <MediaStage post={post} authorName={authorName} />
            </div>

            <section className="flex min-h-0 flex-1 flex-col border-t border-slate-200/80 bg-[#F8FAFC] lg:max-w-[440px] lg:border-l lg:border-t-0 xl:max-w-[470px]">
              <div className="border-b border-slate-200/80 bg-white px-4 py-4 sm:px-5 lg:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3.5">
                    <Avatar initials={initials} avatarUrl={post.author.avatar_url} size="h-12 w-12" />
                    <div className="min-w-0">
                      <ThemedText as="h2" className="truncate text-[16px] font-bold tracking-tight text-slate-950">
                        {authorName}
                      </ThemedText>
                      <div className="mt-1 flex items-center gap-2">
                        <ThemedText className="text-[12px] font-semibold text-slate-400">
                          {formatTime(post.created_at)}
                        </ThemedText>
                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                        <GlobeHemisphereWest className="text-slate-400" size={15} weight="regular" />
                      </div>
                    </div>
                  </div>

                  <div className="relative flex items-center gap-2">
                    <button
                      onClick={() => setShowMenu((value) => !value)}
                      className="flex h-10 w-10 items-center justify-center rounded-[15px] bg-slate-100 text-slate-500 transition-all duration-300 hover:bg-slate-200 hover:text-slate-950"
                    >
                      <DotsThree size={20} weight="bold" />
                    </button>
                    <button
                      onClick={onClose}
                      className="flex h-10 w-10 items-center justify-center rounded-[15px] bg-slate-100 text-slate-500 transition-all duration-300 hover:bg-slate-950 hover:text-white"
                    >
                      <X size={20} weight="bold" />
                    </button>

                    {showMenu ? (
                      <div className="absolute right-0 top-12 z-20 w-56 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_20px_48px_-18px_rgba(15,23,42,0.28)]">
                        <div className="space-y-1 p-2">
                          {isAuthor ? (
                            <button
                              onClick={async () => {
                                if (confirm('Xóa bài viết này?')) {
                                  await deletePost(post.id);
                                  onClose();
                                }
                              }}
                              className="flex w-full items-center gap-3 rounded-[16px] px-4 py-3 text-left text-[14px] font-bold text-red-500 transition-all hover:bg-red-50"
                            >
                              <Trash size={20} weight="regular" />
                              Xóa bài viết
                            </button>
                          ) : null}
                          <button
                            onClick={() => setShowMenu(false)}
                            className="flex w-full items-center gap-3 rounded-[16px] px-4 py-3 text-left text-[14px] font-bold text-slate-600 transition-all hover:bg-slate-50"
                          >
                            <WarningCircle size={20} weight="regular" />
                            Báo cáo nội dung
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="border-b border-slate-200/80 bg-white px-4 py-4 sm:px-5 lg:px-6">
                <ThemedText className="whitespace-pre-wrap text-[15px] leading-6 text-slate-700">
                  {captionText}
                </ThemedText>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={() => setShowLikers(true)}
                    className="inline-flex items-center gap-2 rounded-full bg-[#EAF4FB] px-3 py-2 text-left transition-colors hover:bg-[#DDEFFC]"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#4A9FD8] text-white">
                      <ThumbsUp size={14} weight="fill" />
                    </span>
                    <ThemedText className="text-[13px] font-bold text-[#2F7FB2]">
                      {likeCount > 0 ? `${likeCount} lượt thích` : 'Chưa có lượt thích'}
                    </ThemedText>
                  </button>

                  {/* <ThemedText className="text-[13px] font-semibold text-slate-500">
                    {totalComments} bình luận
                  </ThemedText> */}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button
                    onClick={handleToggleLike}
                    disabled={togglingLike}
                    className={`inline-flex items-center justify-center gap-2 rounded-[18px] px-3 py-3 text-[13px] font-bold transition-all ${liked ? 'bg-[#EAF4FB] text-[#4A9FD8]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    <ThumbsUp size={18} weight={liked ? 'fill' : 'regular'} />
                    <span>Thích</span>
                  </button>
                  <button
                    onClick={() => document.getElementById('modal-comment-input')?.focus()}
                    className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-slate-100 px-3 py-3 text-[13px] font-bold text-slate-600 transition-all hover:bg-slate-200"
                  >
                    <ChatCircleDots size={18} weight="regular" />
                    <span>Bình luận</span>
                  </button>
                  <button
                    onClick={handleShare}
                    className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-slate-100 px-3 py-3 text-[13px] font-bold text-slate-600 transition-all hover:bg-slate-200"
                  >
                    <ShareNetwork size={18} weight="regular" />
                    <span>Chia sẻ</span>
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 lg:px-6">
                {comments.length === 0 ? (
                  <div className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-slate-100 text-slate-300">
                      <ChatCircleDots size={30} weight="regular" />
                    </div>
                    <ThemedText className="mt-5 text-[16px] font-bold text-slate-700">
                      Chưa có bình luận nào
                    </ThemedText>
                    <ThemedText className="mt-2 max-w-[260px] text-[14px] leading-6 text-slate-400">
                      Hãy mở đầu cuộc trò chuyện bằng một bình luận ngắn gọn và rõ ý.
                    </ThemedText>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {comments.map((comment) => (
                      <CommentItem
                        key={comment.id}
                        comment={comment}
                        currentUser={currentUser}
                        postAuthorId={post.author_id}
                        onReply={(targetComment) => {
                          setReplyTo(targetComment);
                          setSubmitError(null);
                        }}
                        onDelete={handleDeleteComment}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200/80 bg-white px-4 py-4 sm:px-5 lg:px-6">
                {replyTo ? (
                  <div className="mb-3 flex items-center justify-between gap-3 rounded-[20px] border border-[#D9ECF8] bg-[#F3FAFF] px-4 py-3">
                    <div className="min-w-0">
                      <ThemedText className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#4A9FD8]">
                        Đang phản hồi
                      </ThemedText>
                      <ThemedText className="truncate text-[13px] font-semibold text-slate-700">
                        {getCommentTargetName(replyTo)}
                      </ThemedText>
                    </div>
                    <button
                      onClick={() => setReplyTo(null)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white hover:text-slate-900"
                    >
                      <X size={18} weight="bold" />
                    </button>
                  </div>
                ) : null}

                <div className="flex items-end gap-3">
                  <div className="min-w-0 flex-1 rounded-[18px] bg-slate-50 px-4 py-2 focus-within:bg-white">
                    <textarea
                      id="modal-comment-input"
                      value={commentInput}
                      onChange={(event) => {
                        setCommentInput(event.target.value);
                        if (submitError) {
                          setSubmitError(null);
                        }
                      }}
                      placeholder={replyTo ? 'Viết phản hồi của bạn...' : 'Viết bình luận của bạn...'}
                      className="no-focus-ring max-h-[120px] min-h-[30px] w-full resize-none appearance-none border-0 bg-transparent text-[15px] leading-6 text-slate-700 outline-none ring-0 shadow-none focus:border-0 focus:outline-none focus:ring-0 focus:shadow-none focus-visible:border-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none placeholder:text-slate-400 [box-shadow:none!important] [outline:none!important]"
                      rows={1}
                      onInput={(event) => {
                        const target = event.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                      }}
                    />

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="min-h-[20px]">
                        {isSubmitting ? (
                          <ThemedText className="text-[12px] font-semibold text-[#4A9FD8]">
                            Đang gửi bình luận...
                          </ThemedText>
                        ) : submitError ? (
                          <ThemedText className="text-[12px] font-semibold text-red-500">
                            {submitError}
                          </ThemedText>
                        ) : replyTo ? (
                          <ThemedText className="text-[12px] font-semibold text-slate-400">
                            Phản hồi sẽ hiển thị ngay dưới bình luận gốc.
                          </ThemedText>
                        ) : null}
                      </div>

                      <ThemedText className="text-[12px] font-semibold text-slate-400">
                        {commentInput.trim().length} ký tự
                      </ThemedText>
                    </div>
                  </div>

                  <button
                    onClick={handlePostComment}
                    disabled={isSubmitting || !commentInput.trim()}
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] text-white transition-all duration-300 ${isSubmitting || !commentInput.trim() ? 'bg-slate-300' : 'bg-slate-950 hover:bg-[#4A9FD8]'}`}
                  >
                    {isSubmitting ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-[3px] border-white/80 border-t-transparent" />
                    ) : (
                      <PaperPlaneTilt size={22} weight="fill" />
                    )}
                  </button>
                </div>
              </div>
            </section>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center bg-[#F8FAFC] p-6">
            <div className="flex max-w-[420px] flex-col items-center rounded-[32px] border border-slate-200 bg-white px-8 py-10 text-center shadow-[0_18px_44px_-28px_rgba(15,23,42,0.45)]">
              <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-slate-100 text-slate-300">
                <WarningCircle size={40} weight="regular" />
              </div>
              <ThemedText className="mt-5 text-[22px] font-bold tracking-tight text-slate-950">
                Nội dung không khả dụng
              </ThemedText>
              <ThemedText className="mt-3 text-[14px] leading-6 text-slate-500">
                Bài viết có thể đã bị xóa hoặc không còn quyền truy cập.
              </ThemedText>
              <button
                onClick={onClose}
                className="mt-6 rounded-[18px] bg-white px-5 py-3 text-[14px] font-bold text-slate-950 transition-colors hover:bg-[#EAF4FB]"
              >
                Đóng cửa sổ
              </button>
            </div>
          </div>
        )}

        {showLikers ? <InteractionsModal postId={postId} onClose={() => setShowLikers(false)} /> : null}
      </div>
    </div>
  );
}
