import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createLocalStory,
  getDefaultStories,
  getNextStoryId,
  getPreviousStoryId,
  groupStoriesByAuthor,
  mapApiStoryToStoryItem,
} from './storyState.ts';

test('getDefaultStories uses system accent token for unread story rings', () => {
  const stories = getDefaultStories();

  assert.ok(stories.length >= 4);
  assert.ok(stories.every((story) => story.ringClass === 'ring-[var(--accent)]'));
});

test('createLocalStory prepends a temporary story with current user metadata', () => {
  const existingStories = getDefaultStories();
  const nextStories = createLocalStory(existingStories, {
    authorId: 'current-user',
    authorName: 'Quang Phạm',
    authorInitials: 'QP',
    avatarUrl: null,
    mediaUrl: 'blob:story-image',
    text: 'Một buổi sáng chậm',
  });

  assert.equal(nextStories.length, existingStories.length + 1);
  assert.equal(nextStories[0]?.authorId, 'current-user');
  assert.equal(nextStories[0]?.authorName, 'Quang Phạm');
  assert.equal(nextStories[0]?.authorInitials, 'QP');
  assert.equal(nextStories[0]?.mediaUrl, 'blob:story-image');
  assert.equal(nextStories[0]?.text, 'Một buổi sáng chậm');
  assert.equal(nextStories[0]?.ringClass, 'ring-[var(--accent)]');
});

test('story navigation wraps around the available stories', () => {
  const stories = getDefaultStories();

  assert.equal(getNextStoryId(stories, stories[stories.length - 1]?.id ?? ''), stories[0]?.id);
  assert.equal(getPreviousStoryId(stories, stories[0]?.id ?? ''), stories[stories.length - 1]?.id);
});

test('mapApiStoryToStoryItem maps backend story into UI story shape', () => {
  const story = mapApiStoryToStoryItem({
    id: 42,
    user_id: 7,
    file_url: '/static/stories/morning.webp',
    caption: 'Morning coffee',
    type: 'image',
    visibility: 'public',
    expired_at: '2026-05-14T10:00:00.000Z',
    created_at: '2026-05-13T09:45:00.000Z',
    view_count: 3,
    is_viewed: true,
    author: {
      id: 7,
      first_name: 'Mai',
      last_name: 'Linh',
      avatar_url: '/static/avatars/mai.webp',
    },
  });

  assert.equal(story.id, '42');
  assert.equal(story.authorId, '7');
  assert.equal(story.authorName, 'Mai Linh');
  assert.equal(story.authorInitials, 'ML');
  assert.equal(story.avatarUrl, 'http://localhost:8000/static/avatars/mai.webp');
  assert.equal(story.mediaUrl, 'http://localhost:8000/static/stories/morning.webp');
  assert.equal(story.text, 'Morning coffee');
  assert.equal(story.ringClass, 'ring-[var(--accent)]');
});

test('groupStoriesByAuthor combines multiple stories from the same author', () => {
  const stories = [
    {
      id: 'story-new',
      authorId: 'author-1',
      authorName: 'Mai Linh',
      authorInitials: 'ML',
      avatarUrl: null,
      mediaUrl: '/story-new.webp',
      text: 'Story mới',
      timeLabel: 'Mới cập nhật',
      ringClass: 'ring-[var(--accent)]',
    },
    {
      id: 'story-other',
      authorId: 'author-2',
      authorName: 'Bảo An',
      authorInitials: 'BA',
      avatarUrl: null,
      mediaUrl: '/story-other.webp',
      text: 'Story khác',
      timeLabel: 'Mới cập nhật',
      ringClass: 'ring-[var(--accent)]',
    },
    {
      id: 'story-old',
      authorId: 'author-1',
      authorName: 'Mai Linh',
      authorInitials: 'ML',
      avatarUrl: null,
      mediaUrl: '/story-old.webp',
      text: 'Story cũ',
      timeLabel: 'Đã xem',
      ringClass: 'ring-[var(--accent)]',
    },
  ];

  const groups = groupStoriesByAuthor(stories);

  assert.equal(groups.length, 2);
  assert.equal(groups[0]?.authorId, 'author-1');
  assert.equal(groups[0]?.latestStory.id, 'story-new');
  assert.deepEqual(groups[0]?.stories.map((story) => story.id), ['story-new', 'story-old']);
  assert.equal(groups[1]?.authorId, 'author-2');
});
