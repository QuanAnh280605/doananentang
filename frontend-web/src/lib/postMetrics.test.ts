import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clampMetricCount,
  patchPostMetrics,
  runOptimisticPostLike,
} from './postMetrics.ts';
import type { Post } from './types.ts';

function createPost(overrides: Partial<Post> = {}): Post {
  return {
    id: 'post-1',
    author_id: 'author-1',
    content: 'Hello',
    visibility: 'public',
    reported_count: 0,
    is_deleted: false,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    media: [],
    author: {
      id: 'author-1',
      first_name: 'Ada',
      last_name: 'Lovelace',
      avatar_url: null,
    },
    like_count: 0,
    comment_count: 0,
    is_liked: false,
    ...overrides,
  };
}

test('patchPostMetrics ignores non-matching post ids', () => {
  const posts = [createPost(), createPost({ id: 'post-2', like_count: 4 })];

  const nextPosts = patchPostMetrics(posts, 'missing-post', {
    like_count: 9,
    is_liked: true,
  });

  assert.deepEqual(nextPosts, posts);
  assert.notStrictEqual(nextPosts, posts);
  assert.strictEqual(nextPosts[0], posts[0]);
  assert.strictEqual(nextPosts[1], posts[1]);
});

test('patchPostMetrics matches numeric runtime post ids with string patch ids', () => {
  const numericIdPost = createPost({
    id: 42 as unknown as string,
    comment_count: 1,
  });

  const nextPosts = patchPostMetrics([numericIdPost], '42', {
    comment_count: 2,
  });

  assert.equal(nextPosts[0].comment_count, 2);
  assert.notStrictEqual(nextPosts[0], numericIdPost);
});

test('clampMetricCount never returns a negative value', () => {
  assert.equal(clampMetricCount(3), 3);
  assert.equal(clampMetricCount(0), 0);
  assert.equal(clampMetricCount(-4), 0);
});

test('runOptimisticPostLike patches liked state and increments like_count before REST resolves', async () => {
  const post = createPost({ like_count: 2, is_liked: false });
  const eventLog: string[] = [];
  let resolveMutation: ((value: { post_id: string; liked: boolean; like_count: number }) => void) | null = null;

  const mutationPromise = new Promise<{ post_id: string; liked: boolean; like_count: number }>((resolve) => {
    resolveMutation = resolve;
  });

  const runPromise = runOptimisticPostLike({
    post,
    applyPatch: (patch) => {
      eventLog.push(`patch:${String(patch.is_liked)}:${String(patch.like_count)}`);
    },
    mutate: async () => {
      eventLog.push('mutate');
      return mutationPromise;
    },
    refetch: async () => {
      eventLog.push('refetch');
    },
  });

  await Promise.resolve();

  assert.deepEqual(eventLog, ['patch:true:3', 'mutate']);

  resolveMutation?.({
    post_id: 'post-1',
    liked: true,
    like_count: 7,
  });

  await runPromise;
});

test('runOptimisticPostLike reconciles server count and refetches exactly once after settle', async () => {
  const post = createPost({ like_count: 1, is_liked: false });
  const eventLog: string[] = [];

  const result = await runOptimisticPostLike({
    post,
    applyPatch: (patch) => {
      eventLog.push(`patch:${String(patch.is_liked)}:${String(patch.like_count)}`);
    },
    mutate: async () => {
      eventLog.push('mutate');
      return {
        post_id: 'post-1',
        liked: true,
        like_count: 5,
      };
    },
    refetch: async () => {
      eventLog.push('refetch');
    },
  });

  assert.deepEqual(eventLog, ['patch:true:2', 'mutate', 'patch:true:5', 'refetch']);
  assert.equal(result.optimisticPatch.like_count, 2);
  assert.equal(result.serverPatch.like_count, 5);
});

test('runOptimisticPostLike rolls back failure and never creates a negative like count', async () => {
  const post = createPost({ like_count: 0, is_liked: true });
  const eventLog: string[] = [];

  await assert.rejects(
    () => runOptimisticPostLike({
      post,
      applyPatch: (patch) => {
        eventLog.push(`patch:${String(patch.is_liked)}:${String(patch.like_count)}`);
      },
      mutate: async () => {
        eventLog.push('mutate');
        throw new Error('request failed');
      },
      refetch: async () => {
        eventLog.push('refetch');
      },
    }),
    /request failed/,
  );

  assert.deepEqual(eventLog, ['patch:false:0', 'mutate', 'patch:true:0', 'refetch']);
});
