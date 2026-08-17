import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000';

let socket: Socket | null = null;

export const getSocket = (): Socket | null => socket;

export const initSocket = (token: string): Socket => {
  if (socket?.connected) return socket;

  socket = io(WS_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.warn('Socket connection error:', err.message);
  });

  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinConversation = (conversationId: string): void => {
  socket?.emit('join-conversation', conversationId);
};

export const leaveConversation = (conversationId: string): void => {
  socket?.emit('leave-conversation', conversationId);
};

export const sendTyping = (conversationId: string): void => {
  socket?.emit('typing', { conversationId });
};

export const onNewMessage = (callback: (data: any) => void) => {
  socket?.on('new-message', callback);
  return () => socket?.off('new-message', callback);
};

export const onConversationUpdated = (callback: (data: any) => void) => {
  socket?.on('conversation-updated', callback);
  return () => socket?.off('conversation-updated', callback);
};

export const onNotification = (callback: (data: any) => void) => {
  socket?.on('notification', callback);
  return () => socket?.off('notification', callback);
};

export const onTyping = (callback: (data: any) => void) => {
  socket?.on('typing', callback);
  return () => socket?.off('typing', callback);
};

export const onMessage = (callback: (data: any) => void) => {
  socket?.on('message', callback);
  return () => socket?.off('message', callback);
};
