import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const feedPostPath = path.join(import.meta.dirname, 'FeedPost.tsx');

async function readFeedPostSource(): Promise<string> {
  return readFile(feedPostPath, 'utf8');
}

test('FeedPost wires optimistic post metrics helpers and callback props', async () => {
  const source = await readFeedPostSource();

  assert.match(source, /runOptimisticPostLike/);
  assert.match(source, /onOptimisticMetricsChange/);
  assert.match(source, /onPostMetricsSettled/);
});

test('FeedPost like handler routes through optimistic helper and settles via parent callbacks', async () => {
  const source = await readFeedPostSource();
  const likeHandlerBlockMatch = source.match(/const handleToggleLike = async \(\) => \{([\s\S]*?)\n\s*\};/);

  assert.ok(likeHandlerBlockMatch);
  assert.match(likeHandlerBlockMatch[1], /runOptimisticPostLike/);
  assert.match(likeHandlerBlockMatch[1], /onOptimisticMetricsChange/);
  assert.match(likeHandlerBlockMatch[1], /onPostMetricsSettled/);
  assert.doesNotMatch(likeHandlerBlockMatch[1], /await\s+(likePost|unlikePost)\(/);
});
