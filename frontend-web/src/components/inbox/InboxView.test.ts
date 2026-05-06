import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const inboxViewPath = path.join(import.meta.dirname, 'InboxView.tsx');

async function readInboxViewSource(): Promise<string> {
  return readFile(inboxViewPath, 'utf8');
}

test('InboxView loads real inbox threads from chat API instead of hardcoded placeholders', async () => {
  const source = await readInboxViewSource();

  assert.match(source, /listDirectChats/);
  assert.doesNotMatch(source, /const threads:\s*InboxThreadData\[]\s*=\s*\[/);
  assert.doesNotMatch(source, /seedMessages\(/);
});

test('InboxView keeps current conversation context when clearing follow search', async () => {
  const source = await readInboxViewSource();
  const clearSearchBlockMatch = source.match(/if \(trimmedValue.length === 0\) \{([\s\S]*?)return;\n    \}/);

  assert.ok(clearSearchBlockMatch);
  assert.doesNotMatch(clearSearchBlockMatch[1], /setSelectedChat\(null\)/);
  assert.doesNotMatch(clearSearchBlockMatch[1], /setMessages\(\[\]\)/);
});

test('InboxView ignores selecting the already active conversation', async () => {
  const source = await readInboxViewSource();
  const selectUserBlockMatch = source.match(/const handleSelectUser = \(user: SearchUser\) => \{([\s\S]*?)\n  \};/);

  assert.ok(selectUserBlockMatch);
  assert.match(selectUserBlockMatch[1], /if \(selectedUserId === user\.id\) \{\s*return;\s*\}/);
});

test('InboxView keeps the profile sidebar minimal', async () => {
  const source = await readInboxViewSource();

  assert.doesNotMatch(source, /quickActions/);
  assert.doesNotMatch(source, /ProfilePanelStat/);
  assert.doesNotMatch(source, /Context and quick actions/);
});

test('InboxView fits the conversation layout to the viewport and scrolls messages', async () => {
  const source = await readInboxViewSource();

  assert.match(source, /min-h-\[100dvh\]/);
  assert.match(source, /xl:h-\[calc\(100dvh-112px\)\]/);
  assert.match(source, /flex min-h-0 flex-col/);
  assert.match(source, /flex-1 overflow-y-auto/);
  assert.doesNotMatch(source, /min-h-\[360px\]/);
});
