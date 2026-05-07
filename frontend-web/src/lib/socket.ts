import { io, type Socket } from 'socket.io-client';

import { API_URL } from '@/lib/api';
import { getAccessToken } from '@/lib/session';

const SOCKET_PATH = '/socket.io';

let inboxSocket: Socket | null = null;

function getInboxSocket(): Socket {
  if (inboxSocket === null) {
    inboxSocket = io(API_URL, {
      autoConnect: false,
      path: SOCKET_PATH,
    });
  }

  return inboxSocket;
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

export function connectInboxSocket() {
  const token = getAccessToken();

  if (!token) {
    disconnectInboxSocket();
    return null;
  }

  const socket = getInboxSocket();
  socket.auth = { token };

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

export function disconnectInboxSocket() {
  if (inboxSocket === null) {
    return;
  }

  inboxSocket.disconnect();
}

export async function joinChatRoom(chatId: string) {
  const socket = connectInboxSocket();

  if (!socket) {
    return;
  }

  await waitForSocketConnection(socket);
  await socket.emitWithAck('chat:join', { chat_id: chatId });
}

export async function leaveChatRoom(chatId: string) {
  const socket = inboxSocket;

  if (!socket) {
    return;
  }

  await waitForSocketConnection(socket);
  await socket.emitWithAck('chat:leave', { chat_id: chatId });
}
