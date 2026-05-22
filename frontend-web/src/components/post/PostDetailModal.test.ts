import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const postDetailModalPath = path.join(import.meta.dirname, 'PostDetailModal.tsx');

async function readPostDetailModalSource(): Promise<string> {
  return readFile(postDetailModalPath, 'utf8');
}

test('PostDetailModal wires realtime post room lifecycle helpers', async () => {
  const source = await readPostDetailModalSource();

  assert.match(source, /joinPostRoom/);
  assert.match(source, /leavePostRoom/);
  assert.match(source, /socket\.off/);
  assert.match(source, /POST_METRICS_UPDATED_EVENT/);
  assert.match(source, /createPostMetricsEventHandler/);
});

test('PostDetailModal exposes parent metrics callbacks in modal contract', async () => {
  const source = await readPostDetailModalSource();

  assert.match(source, /onPostMetricsChange/);
  assert.match(source, /onPostMetricsSettled/);
});

test('PostDetailModal cleans up every post metrics subscription', async () => {
  const source = await readPostDetailModalSource();
  const subscriptionCount = (source.match(/socket\.on\(POST_METRICS_UPDATED_EVENT/g) ?? []).length;
  const cleanupCount = (source.match(/socket\.off\(POST_METRICS_UPDATED_EVENT/g) ?? []).length;

  assert.ok(subscriptionCount > 0);
  assert.ok(cleanupCount >= subscriptionCount);
});

test('PostDetailModal does not refetch parent feed after comment create or delete', async () => {
  const source = await readPostDetailModalSource();
  const createCommentBlock = source.match(/const handlePostComment = async \(\) => \{([\s\S]*?)\n  \};/);
  const deleteCommentBlock = source.match(/const handleDeleteComment = async \(commentId: string\) => \{([\s\S]*?)\n  \};/);

  assert.ok(createCommentBlock);
  assert.ok(deleteCommentBlock);
  assert.match(createCommentBlock[1], /syncPostMetrics\(\{ comment_count: optimisticCommentCount \}\)/);
  assert.match(createCommentBlock[1], /await loadComments\(\)/);
  assert.doesNotMatch(createCommentBlock[1], /onPostMetricsSettled/);
  assert.match(deleteCommentBlock[1], /syncPostMetrics\(\{ comment_count: optimisticCommentCount \}\)/);
  assert.match(deleteCommentBlock[1], /await loadComments\(\)/);
  assert.doesNotMatch(deleteCommentBlock[1], /onPostMetricsSettled/);
});
