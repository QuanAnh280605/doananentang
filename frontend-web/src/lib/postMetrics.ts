import type { LikeStatus, Post } from './types.ts';

export type PostMetricsPatch = Pick<Post, 'like_count' | 'comment_count' | 'is_liked'>;

type PostMetricsLikeTarget = Pick<Post, 'id' | 'like_count' | 'is_liked'>;

type RunOptimisticPostLikeOptions = {
  post: PostMetricsLikeTarget;
  mutate: () => Promise<LikeStatus>;
  refetch: () => Promise<void>;
  applyPatch: (patch: Pick<PostMetricsPatch, 'like_count' | 'is_liked'>) => void;
};

export function clampMetricCount(value: number): number {
  return Math.max(0, value);
}

export function patchPostMetrics<TPost extends Post>(
  posts: readonly TPost[],
  postId: string | number,
  patch: Partial<PostMetricsPatch>,
): TPost[] {
  const normalizedPostId = String(postId);

  return posts.map((post) => (String(post.id) === normalizedPostId ? { ...post, ...patch } : post));
}

export async function runOptimisticPostLike({
  post,
  mutate,
  refetch,
  applyPatch,
}: RunOptimisticPostLikeOptions): Promise<{
  optimisticPatch: Pick<PostMetricsPatch, 'like_count' | 'is_liked'>;
  serverPatch: Pick<PostMetricsPatch, 'like_count' | 'is_liked'> | null;
}> {
  const optimisticPatch = {
    is_liked: !post.is_liked,
    like_count: clampMetricCount(post.like_count + (post.is_liked ? -1 : 1)),
  };

  applyPatch(optimisticPatch);

  let serverPatch: Pick<PostMetricsPatch, 'like_count' | 'is_liked'> | null = null;

  try {
    const response = await mutate();
    serverPatch = {
      is_liked: response.liked,
      like_count: clampMetricCount(response.like_count),
    };
    applyPatch(serverPatch);
    return { optimisticPatch, serverPatch };
  } catch (error) {
    applyPatch({
      is_liked: post.is_liked,
      like_count: clampMetricCount(post.like_count),
    });
    throw error;
  } finally {
    await refetch();
  }
}
