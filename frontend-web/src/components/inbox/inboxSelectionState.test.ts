import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  ensureThreadStaysInInboxContext,
  resolveInboxSelectionAfterSearchClears,
  resolveInboxSelectionAfterThreadRefresh,
} from './inboxSelectionState.ts';

type InboxSelectableUser = {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
};

type InboxThreadLike = {
  id: string;
  user: InboxSelectableUser;
  preview: string;
};

const staticUser: InboxSelectableUser = {
  id: 101,
  first_name: 'Lena',
  last_name: 'Evere',
  full_name: 'Lena Evere',
  avatar_url: null,
  bio: 'Static inbox thread',
};

const followedUser: InboxSelectableUser = {
  id: 205,
  first_name: 'Kai',
  last_name: 'Nguyen',
  full_name: 'Kai Nguyen',
  avatar_url: null,
  bio: 'Followed inbox search result',
};

const staticThread: InboxThreadLike = {
  id: 'thread-1',
  user: staticUser,
  preview: 'Static preview',
};

const followedThread: InboxThreadLike = {
  id: 'followed-205',
  user: followedUser,
  preview: 'Followed preview',
};

test('resolveInboxSelectionAfterSearchClears keeps the current selection when search is cleared', () => {
  const selectedUser = resolveInboxSelectionAfterSearchClears(followedUser);

  assert.deepEqual(selectedUser, followedUser);
});

test('resolveInboxSelectionAfterSearchClears keeps inbox empty when no conversation is selected', () => {
  const selectedUser = resolveInboxSelectionAfterSearchClears<InboxSelectableUser>(null);

  assert.equal(selectedUser, null);
});

test('ensureThreadStaysInInboxContext prepends the selected thread when it is not already visible', () => {
  const visibleThreads = ensureThreadStaysInInboxContext([staticThread], followedThread);

  assert.deepEqual(visibleThreads, [followedThread, staticThread]);
});

test('ensureThreadStaysInInboxContext avoids duplicating a thread that is already visible', () => {
  const visibleThreads = ensureThreadStaysInInboxContext([followedThread, staticThread], followedThread);

  assert.deepEqual(visibleThreads, [followedThread, staticThread]);
});

test('resolveInboxSelectionAfterThreadRefresh keeps the current chat selected after API refresh', () => {
  const refreshedThread: InboxThreadLike = {
    ...followedThread,
    preview: 'Preview vừa được cập nhật từ API',
  };

  const selectedUser = resolveInboxSelectionAfterThreadRefresh(followedUser, [refreshedThread, staticThread]);

  assert.deepEqual(selectedUser, refreshedThread.user);
});

test('resolveInboxSelectionAfterThreadRefresh keeps inbox empty when no conversation is selected', () => {
  const selectedUser = resolveInboxSelectionAfterThreadRefresh(null, [staticThread, followedThread]);

  assert.equal(selectedUser, null);
});

test('InboxView keeps inbox list selection in place instead of passing profile navigation href into InboxListItem', async () => {
  const inboxViewPath = path.join(import.meta.dirname, 'InboxView.tsx');
  const inboxViewSource = await readFile(inboxViewPath, 'utf8');

  assert.doesNotMatch(
    inboxViewSource,
    /<InboxListItem[\s\S]*?href=\{buildProfileHref\(item\.user, item\.preview\)\}/,
  );
});
