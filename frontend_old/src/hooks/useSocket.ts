'use client';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useConversationsStore } from '@/store/conversations.store';
import { useNotificationsStore } from '@/store/notifications.store';
import {
  initSocket, onNewMessage, onConversationUpdated,
  onNotification, joinConversation, leaveConversation,
} from '@/services/socket';
import toast from 'react-hot-toast';

export function useSocket() {
  const { accessToken, isAuthenticated } = useAuthStore();
  const { addMessage, updateConversation, fetchConversations, activeConversation } = useConversationsStore();
  const { addNotification } = useNotificationsStore();

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const socket = initSocket(accessToken);

    const removeNewMessage = onNewMessage((data) => {
      if (data.conversationId) {
        fetchConversations();
      }
    });

    const removeConversationUpdated = onConversationUpdated((data) => {
      fetchConversations();
    });

    const removeMessage = (socket as any)?.on?.('message', (data: any) => {
      if (data.messageId) {
        import('@/services/api').then(({ messagesApi }) => {
          messagesApi.getByConversation(data.conversationId, { limit: 1 }).then(response => {
            if (response.data?.[0]) addMessage(response.data[0]);
          });
        });
      }
    });

    const removeNotification = onNotification((notification) => {
      addNotification(notification);
      toast(notification.title, {
        icon: '🔔',
        duration: 4000,
      });
    });

    return () => {
      removeNewMessage();
      removeConversationUpdated();
      removeNotification();
    };
  }, [isAuthenticated, accessToken]);

  useEffect(() => {
    if (!activeConversation) return;
    joinConversation(activeConversation.id);
    return () => leaveConversation(activeConversation.id);
  }, [activeConversation?.id]);
}

export function useConversationSocket(conversationId: string, onMessage: (data: any) => void) {
  useEffect(() => {
    if (!conversationId) return;
    joinConversation(conversationId);

    import('@/services/socket').then(({ getSocket }) => {
      const socket = getSocket();
      socket?.on('message', onMessage);
    });

    return () => {
      leaveConversation(conversationId);
      import('@/services/socket').then(({ getSocket }) => {
        const socket = getSocket();
        socket?.off('message', onMessage);
      });
    };
  }, [conversationId]);
}
