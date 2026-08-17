import { api } from '@/lib/api';
import { Tag } from '@/types/tags';

export const tagsService = {
  list: (scope?: 'conversation' | 'customer') =>
    api.get<Tag[]>(`/tags${scope ? `?scope=${scope}` : ''}`),
  listForConversation: (conversationId: string) => api.get<Tag[]>(`/conversations/${conversationId}/tags`),
  attachToConversation: (conversationId: string, name: string) =>
    api.post<Tag[]>(`/conversations/${conversationId}/tags`, { name }),
  detachFromConversation: (conversationId: string, tagId: string) =>
    api.delete<Tag[]>(`/conversations/${conversationId}/tags/${tagId}`),
};
