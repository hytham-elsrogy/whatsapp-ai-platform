import { api } from '@/lib/api';
import { Conversation, Message } from '@/types/inbox';

export type ConversationFilter = 'all' | 'unassigned' | 'mine' | 'waiting' | 'resolved';

export const conversationsService = {
  list: (filter: ConversationFilter = 'all') =>
    api.get<Conversation[]>(`/conversations?filter=${filter}`),

  get: (id: string) => api.get<Conversation>(`/conversations/${id}`),

  messages: (id: string) => api.get<Message[]>(`/conversations/${id}/messages`),

  send: (id: string, text: string) =>
    api.post<Message>(`/conversations/${id}/messages`, { text }),

  sendMedia: (id: string, type: 'image' | 'audio' | 'document', file: File | Blob, filename: string, caption?: string) => {
    const formData = new FormData();
    formData.append('type', type);
    if (caption) formData.append('caption', caption);
    formData.append('file', file, filename);
    return api.postForm<Message>(`/conversations/${id}/messages/media`, formData);
  },

  setStatus: (id: string, status: Conversation['status']) =>
    api.patch<Conversation>(`/conversations/${id}/status`, { status }),

  assign: (id: string, agentId: string) =>
    api.post<Conversation>(`/conversations/${id}/assign`, { agentId }),
};
