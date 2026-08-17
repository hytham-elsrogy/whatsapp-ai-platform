import { api } from '@/lib/api';
import { AppNotification } from '@/types/notifications';

export const notificationsService = {
  list: (unreadOnly = false) => api.get<AppNotification[]>(`/notifications?unreadOnly=${unreadOnly}`),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};
