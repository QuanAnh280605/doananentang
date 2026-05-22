import assert from 'node:assert/strict';
import test from 'node:test';

import type { PostMetricsUpdatedEvent } from './types.ts';
import { createPostMetricsEventHandler } from './postRealtime.ts';

test('createPostMetricsEventHandler applies metrics for matching post once', () => {
  const appliedMetrics: Array<Pick<PostMetricsUpdatedEvent, 'like_count' | 'comment_count'>> = [];
  let refetchCount = 0;

  const handler = createPostMetricsEventHandler({
    postId: 42,
    applyMetrics: (metrics: Pick<PostMetricsUpdatedEvent, 'like_count' | 'comment_count'>) => {
      appliedMetrics.push(metrics);
    },
    refetchComments: () => {
      refetchCount += 1;
    },
  });

  handler({
    post_id: 42,
    like_count: 8,
    comment_count: 3,
  });

  assert.deepEqual(appliedMetrics, [{ like_count: 8, comment_count: 3 }]);
  assert.equal(refetchCount, 0);
});

test('createPostMetricsEventHandler ignores events for a different post id', () => {
  const appliedMetrics: Array<Pick<PostMetricsUpdatedEvent, 'like_count' | 'comment_count'>> = [];
  let refetchCount = 0;

  const handler = createPostMetricsEventHandler({
    postId: 42,
    applyMetrics: (metrics: Pick<PostMetricsUpdatedEvent, 'like_count' | 'comment_count'>) => {
      appliedMetrics.push(metrics);
    },
    refetchComments: () => {
      refetchCount += 1;
    },
  });

  handler({
    post_id: 99,
    like_count: 8,
    comment_count: 3,
    action: 'comment_created',
  });

  assert.deepEqual(appliedMetrics, []);
  assert.equal(refetchCount, 0);
});

test('createPostMetricsEventHandler refetches comments once for comment create and delete actions', () => {
  for (const action of ['comment_created', 'comment_deleted'] as const) {
    const appliedMetrics: Array<Pick<PostMetricsUpdatedEvent, 'like_count' | 'comment_count'>> = [];
    let refetchCount = 0;

    const handler = createPostMetricsEventHandler({
      postId: 42,
      applyMetrics: (metrics: Pick<PostMetricsUpdatedEvent, 'like_count' | 'comment_count'>) => {
        appliedMetrics.push(metrics);
      },
      refetchComments: () => {
        refetchCount += 1;
      },
    });

    handler({
      post_id: 42,
      like_count: 8,
      comment_count: 4,
      action,
    });

    assert.deepEqual(appliedMetrics, [{ like_count: 8, comment_count: 4 }]);
    assert.equal(refetchCount, 1);
  }
});

test('createPostMetricsEventHandler does not refetch comments for non-comment like events', () => {
  const appliedMetrics: Array<Pick<PostMetricsUpdatedEvent, 'like_count' | 'comment_count'>> = [];
  let refetchCount = 0;

  const handler = createPostMetricsEventHandler({
    postId: 42,
    applyMetrics: (metrics: Pick<PostMetricsUpdatedEvent, 'like_count' | 'comment_count'>) => {
      appliedMetrics.push(metrics);
    },
    refetchComments: () => {
      refetchCount += 1;
    },
  });

  handler({
    post_id: 42,
    like_count: 9,
    comment_count: 3,
    action: 'post_liked',
  });

  assert.deepEqual(appliedMetrics, [{ like_count: 9, comment_count: 3 }]);
  assert.equal(refetchCount, 0);
});

test('createPostMetricsEventHandler refetches comments when comment count changes and action is absent', () => {
  const appliedMetrics: Array<Pick<PostMetricsUpdatedEvent, 'like_count' | 'comment_count'>> = [];
  let refetchCount = 0;

  const handler = createPostMetricsEventHandler({
    postId: 42,
    initialCommentCount: 2,
    applyMetrics: (metrics: Pick<PostMetricsUpdatedEvent, 'like_count' | 'comment_count'>) => {
      appliedMetrics.push(metrics);
    },
    refetchComments: () => {
      refetchCount += 1;
    },
  });

  handler({
    post_id: 42,
    like_count: 8,
    comment_count: 5,
  });

  assert.deepEqual(appliedMetrics, [{ like_count: 8, comment_count: 5 }]);
  assert.equal(refetchCount, 1);
});
