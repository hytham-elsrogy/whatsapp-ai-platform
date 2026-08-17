import { create } from 'zustand';
import { Conversation, Message, ConversationStatus } from '@/types';
import { conversationsApi, messagesApi } from '@/services/api';

interface ConversationsStore {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  totalConversations: number;
  filter: {
    status?: ConversationStatus;
    search?: string;
    assignedToId?: string;
    departmentId?: string;
    starred?: boolean;
  };

  fetchConversations: (params?: any) => Promise<void>;
  fetchMessages: (conversationId: string, reset?: boolean) => Promise<void>;
  setActiveConversation: (conversation: Conversation | null) => void;
  addMessage: (message: Message) => void;
  updateConversation: (id: string, data: Partial<Conversation>) => void;
  setFilter: (filter: any) => void;
  sendMessage: (data: any) => Promise<Message>;
  refreshActiveConversation: () => Promise<void>;
}

export const useConversationsStore = create<ConversationsStore>((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  isLoadingConversations: false,
  isLoadingMessages: false,
  totalConversations: 0,
  filter: {},

  fetchConversations: async (params) => {
    set({ isLoadingConversations: true });
    try {
      const filter = get().filter;
      const response = await conversationsApi.list({ ...filter, ...params });
      set({
        conversations: response.data,
        totalConversations: response.total,
        isLoadingConversations: false,
      });
    } catch {
      set({ isLoadingConversations: false });
    }
  },

  fetchMessages: async (conversationId, reset = false) => {
    set({ isLoadingMessages: true });
    try {
      const response = await messagesApi.getByConversation(conversationId, { limit: 50 });
      set({
        messages: reset ? response.data : [...response.data],
        isLoadingMessages: false,
      });
    } catch {
      set({ isLoadingMessages: false });
    }
  },

  setActiveConversation: (conversation) => {
    set({ activeConversation: conversation, messages: [] });
    if (conversation) {
      get().fetchMessages(conversation.id, true);
    }
  },

  addMessage: (message) => {
    const { messages, conversations, activeConversation } = get();

    if (activeConversation?.id === message.conversationId) {
      const exists = messages.find(m => m.id === message.id);
      if (!exists) set({ messages: [...messages, message] });
    }

    set({
      conversations: conversations.map(c =>
        c.id === message.conversationId
          ? {
              ...c,
              lastMessageContent: message.content || `[${message.type}]`,
              lastMessageAt: message.createdAt,
              unreadCount: activeConversation?.id === c.id ? 0 : (c.unreadCount || 0) + 1,
            }
          : c,
      ).sort((a, b) => {
        const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return bTime - aTime;
      }),
    });
  },

  updateConversation: (id, data) => {
    const { conversations, activeConversation } = get();
    const updated = conversations.map(c => c.id === id ? { ...c, ...data } : c);
    set({ conversations: updated });
    if (activeConversation?.id === id) {
      set({ activeConversation: { ...activeConversation, ...data } });
    }
  },

  setFilter: (filter) => {
    set({ filter: { ...get().filter, ...filter } });
    get().fetchConversations();
  },

  sendMessage: async (data) => {
    const message = await messagesApi.send(data);
    get().addMessage(message);
    return message;
  },

  refreshActiveConversation: async () => {
    const { activeConversation } = get();
    if (!activeConversation) return;
    const updated = await conversationsApi.get(activeConversation.id);
    set({ activeConversation: updated });
    get().updateConversation(activeConversation.id, updated);
  },
}));
