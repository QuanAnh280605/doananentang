import type { PostMetricsUpdatedEvent } from './types.ts';

type CreatePostMetricsEventHandlerOptions = {
  postId: number;
  initialCommentCount?: number;
  applyMetrics: (metrics: Pick<PostMetricsUpdatedEvent, 'like_count' | 'comment_count'>) => void;
  refetchComments: () => void;
};

function isCommentAction(action: PostMetricsUpdatedEvent['action']): boolean {
  return action === 'comment_created' || action === 'comment_deleted';
}

export function createPostMetricsEventHandler({
  postId,
  initialCommentCount,
  applyMetrics,
  refetchComments,
}: CreatePostMetricsEventHandlerOptions) {
  let currentCommentCount = initialCommentCount;

  return (event: PostMetricsUpdatedEvent): void => {
    if (Number(event.post_id) !== postId) {
      return;
    }

    applyMetrics({
      like_count: event.like_count,
      comment_count: event.comment_count,
    });

    const shouldRefetchComments = isCommentAction(event.action)
      || (event.action == null
        && currentCommentCount !== undefined
        && currentCommentCount !== event.comment_count);

    currentCommentCount = event.comment_count;

    if (shouldRefetchComments) {
      refetchComments();
    }
  };
}
