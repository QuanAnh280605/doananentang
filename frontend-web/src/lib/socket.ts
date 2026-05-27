import { io, type Socket } from 'socket.io-client';

import { API_URL } from '@/lib/api';
import { getAccessToken } from '@/lib/session';

const SOCKET_PATH = '/socket.io';

let appSocket: Socket | null = null;

function getAppSocket(): Socket {
  if (appSocket === null) {
    appSocket = io(API_URL, {
      autoConnect: false,
      path: SOCKET_PATH,
    });
  }

  return appSocket;
}

function waitForSocketConnection(socket: Socket): Promise<Socket> {
  if (socket.connected) {
    return Promise.resolve(socket);
  }

  return new Promise((resolve, reject) => {
    const handleConnect = () => {
      socket.off('connect_error', handleConnectError);
      resolve(socket);
    };

    const handleConnectError = (error: Error) => {
      socket.off('connect', handleConnect);
      reject(error);
    };

    socket.once('connect', handleConnect);
    socket.once('connect_error', handleConnectError);
  });
}

export function connectAppSocket() {
  const token = getAccessToken();

  if (!token) {
    disconnectAppSocket();
    return null;
  }

  const socket = getAppSocket();
  socket.auth = { token };

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

export const POST_METRICS_UPDATED_EVENT = 'post-metrics-updated';

export function disconnectAppSocket() {
  if (appSocket === null) {
    return;
  }

  appSocket.disconnect();
}

export function getConnectedAppSocket(): Socket | null {
  if (!appSocket?.connected) {
    return null;
  }

  return appSocket;
}

export async function joinChatRoom(chatId: string) {
  const socket = connectAppSocket();

  if (!socket) {
    return;
  }

  await waitForSocketConnection(socket);
  await socket.emitWithAck('chat:join', { chat_id: chatId });
}

export async function leaveChatRoom(chatId: string) {
  const socket = appSocket;

  if (!socket) {
    return;
  }

  await waitForSocketConnection(socket);
  await socket.emitWithAck('chat:leave', { chat_id: chatId });
}

export function joinPostRoom(postId: number): void {
  const socket = connectAppSocket();

  if (!socket) {
    return;
  }

  socket.emit('post:join', { post_id: postId });
}

export function leavePostRoom(postId: number): void {
  const socket = appSocket;

  if (!socket) {
    return;
  }

  socket.emit('post:leave', { post_id: postId });
}
