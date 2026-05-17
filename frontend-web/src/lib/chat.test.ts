import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyMessagePreviewToThreads,
  createSingleFlightMessageSender,
  normalizeMessageContent,
  replaceOptimisticMessage,
  runOptimisticMessageSend,
} from './chat';

type InboxThreadLike = {
  id: string;
  chatId: string | null;
  preview: string;
  time: string;
  activityLabel: string;
};

type ChatMessageLike = {
  id: string;
  chatId: string;
  body: string;
  time: string;
  incoming?: boolean;
  pending?: boolean;
  senderUserId?: number | null;
  createdAt?: string;
};

test('normalizeMessageContent rejects whitespace-only content', () => {
  assert.throws(
    () => normalizeMessageContent('   \n\t  '),
    /nội dung tin nhắn không được để trống/i,
  );
});

test('createSingleFlightMessageSender does not call send twice while first request is pending', async () => {
  let callCount = 0;
  let resolveFirstRequest: ((value: ChatMessageLike) => void) | null = null;
  const firstResponse = new Promise<ChatMessageLike>((resolve) => {
    resolveFirstRequest = resolve;
  });

  const guardedSend = createSingleFlightMessageSender(async (body: string) => {
    callCount += 1;

    if (callCount === 1) {
      return firstResponse;
    }

    return {
      id: `server-${callCount}`,
      body,
      time: '10:15',
    };
  });

  const firstPromise = guardedSend?.('Tin nhắn đầu tiên');
  const secondPromise = guardedSend?.('Tin nhắn thứ hai');

  assert.equal(callCount, 1);
  assert.strictEqual(secondPromise, firstPromise);

  resolveFirstRequest?.({
    id: 'server-1',
    body: 'Tin nhắn đầu tiên',
    time: '10:14',
  });

  await firstPromise;

  const thirdPromise = guardedSend?.('Tin nhắn thứ ba');

  assert.equal(callCount, 2);
  await thirdPromise;
});

test('replaceOptimisticMessage swaps the optimistic item with the server payload', () => {
  const messages: ChatMessageLike[] = [
    {
      id: 'message-1',
      body: 'Tin nhắn cũ',
      time: '09:10',
      incoming: true,
    },
    {
      id: 'optimistic-1',
      body: 'Đang gửi...',
      time: '09:12',
      pending: true,
    },
  ];

  const serverMessage: ChatMessageLike = {
    id: 'message-2',
    body: 'Đã gửi xong',
    time: '09:12',
  };

  const nextMessages = replaceOptimisticMessage(messages, 'optimistic-1', serverMessage);

  assert.deepEqual(nextMessages, [messages[0], serverMessage]);
});

test('runOptimisticMessageSend emits optimistic state, then replaces with server payload, then returns refreshed messages', async () => {
  const eventLog: string[] = [];
  const currentMessages: ChatMessageLike[] = [
    {
      id: 'message-1',
      chatId: 'direct-101',
      body: 'Tin nhắn cũ',
      time: '09:10',
      incoming: true,
      senderUserId: 101,
      createdAt: '2026-01-01T09:10:00.000Z',
    },
  ];

  const result = await runOptimisticMessageSend({
    chatId: 'direct-101',
    content: '  Đã gửi xong  ',
    currentMessages,
    buildOptimisticMessage: (chatId, body) => ({
      id: 'optimistic-1',
      chatId,
      body,
      time: '09:12',
      pending: true,
      senderUserId: null,
      createdAt: '2026-01-01T09:12:00.000Z',
    }),
    send: async (chatId, content) => {
      eventLog.push(`send:${chatId}:${content}`);
      return {
        id: 'message-2',
        chatId,
        body: content,
        time: '09:12',
        senderUserId: null,
        createdAt: '2026-01-01T09:12:01.000Z',
      };
    },
    reloadMessages: async (chatId) => {
      eventLog.push(`reload:${chatId}`);
      return [
        currentMessages[0],
        {
          id: 'message-2',
          chatId,
          body: 'Đã gửi xong',
          time: '09:12',
          senderUserId: null,
          createdAt: '2026-01-01T09:12:01.000Z',
        },
      ];
    },
    onOptimisticApplied: (messages) => {
      eventLog.push(`optimistic:${messages[messages.length - 1]?.id}`);
    },
    onServerApplied: (messages) => {
      eventLog.push(`server:${messages[messages.length - 1]?.id}`);
    },
  });

  assert.equal(result.normalizedContent, 'Đã gửi xong');
  assert.deepEqual(eventLog, [
    'optimistic:optimistic-1',
    'send:direct-101:Đã gửi xong',
    'server:message-2',
    'reload:direct-101',
  ]);
  assert.equal(result.optimisticMessages[1]?.id, 'optimistic-1');
  assert.equal(result.replacedMessages[1]?.id, 'message-2');
  assert.equal(result.finalMessages[1]?.id, 'message-2');
});

test('applyMessagePreviewToThreads updates the matching thread preview with the newest sent message', () => {
  const threads: InboxThreadLike[] = [
    {
      id: 'thread-1',
      chatId: 'chat-1',
      preview: 'Tin nhắn cũ',
      time: '09:10',
      activityLabel: 'Tin nhắn trước đó',
    },
    {
      id: 'thread-2',
      chatId: 'chat-2',
      preview: 'Thread khác',
      time: '09:00',
      activityLabel: 'Không đổi',
    },
  ];

  const nextThreads = applyMessagePreviewToThreads(threads, {
    id: 'message-99',
    chatId: 'chat-1',
    body: 'Preview mới từ server',
    time: '10:45',
    senderUserId: null,
    createdAt: '2026-01-01T10:45:00.000Z',
  });

  assert.deepEqual(nextThreads[0], {
    id: 'thread-1',
    chatId: 'chat-1',
    preview: 'Preview mới từ server',
    time: '10:45',
    activityLabel: 'Updated 10:45',
  });
  assert.deepEqual(nextThreads[1], threads[1]);
});
