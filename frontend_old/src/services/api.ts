import axios, { AxiosInstance } from 'axios';
import toast from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const message = error?.response?.data?.message;

    if (status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    } else if (status >= 400 && status < 500) {
      toast.error(message || 'حدث خطأ في الطلب');
    } else if (status >= 500) {
      toast.error('حدث خطأ في الخادم، يرجى المحاولة لاحقاً');
    }

    return Promise.reject(error);
  },
);

export const authApi = {
  login: (data: { email: string; password: string; twoFactorCode?: string }) =>
    apiClient.post('/auth/login', data).then(r => r.data),
  logout: () => apiClient.post('/auth/logout').then(r => r.data),
  me: () => apiClient.get('/auth/me').then(r => r.data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.patch('/auth/change-password', data).then(r => r.data),
  setup2FA: () => apiClient.post('/auth/2fa/setup').then(r => r.data),
  enable2FA: (token: string) => apiClient.post('/auth/2fa/enable', { token }).then(r => r.data),
  disable2FA: (token: string) => apiClient.post('/auth/2fa/disable', { token }).then(r => r.data),
};

export const conversationsApi = {
  list: (params?: any) => apiClient.get('/conversations', { params }).then(r => r.data),
  get: (id: string) => apiClient.get(`/conversations/${id}`).then(r => r.data),
  create: (data: any) => apiClient.post('/conversations', data).then(r => r.data),
  update: (id: string, data: any) => apiClient.patch(`/conversations/${id}`, data).then(r => r.data),
  transfer: (id: string, data: any) => apiClient.post(`/conversations/${id}/transfer`, data).then(r => r.data),
  addNote: (id: string, content: string) => apiClient.post(`/conversations/${id}/notes`, { content }).then(r => r.data),
  getNotes: (id: string) => apiClient.get(`/conversations/${id}/notes`).then(r => r.data),
  getTransfers: (id: string) => apiClient.get(`/conversations/${id}/transfers`).then(r => r.data),
  rate: (id: string, data: any) => apiClient.post(`/conversations/${id}/rate`, data).then(r => r.data),
  stats: () => apiClient.get('/conversations/stats').then(r => r.data),
};

export const messagesApi = {
  getByConversation: (conversationId: string, params?: any) =>
    apiClient.get(`/messages/conversation/${conversationId}`, { params }).then(r => r.data),
  send: (data: any) => apiClient.post('/messages/send', data).then(r => r.data),
  search: (q: string, conversationId?: string) =>
    apiClient.get('/messages/search', { params: { q, conversationId } }).then(r => r.data),
};

export const contactsApi = {
  list: (params?: any) => apiClient.get('/contacts', { params }).then(r => r.data),
  get: (id: string) => apiClient.get(`/contacts/${id}`).then(r => r.data),
  create: (data: any) => apiClient.post('/contacts', data).then(r => r.data),
  update: (id: string, data: any) => apiClient.patch(`/contacts/${id}`, data).then(r => r.data),
  delete: (id: string) => apiClient.delete(`/contacts/${id}`).then(r => r.data),
};

export const usersApi = {
  list: (params?: any) => apiClient.get('/users', { params }).then(r => r.data),
  get: (id: string) => apiClient.get(`/users/${id}`).then(r => r.data),
  create: (data: any) => apiClient.post('/users', data).then(r => r.data),
  update: (id: string, data: any) => apiClient.patch(`/users/${id}`, data).then(r => r.data),
  delete: (id: string) => apiClient.delete(`/users/${id}`).then(r => r.data),
  stats: () => apiClient.get('/users/stats').then(r => r.data),
  getPermissionsConfig: () => apiClient.get('/users/permissions-config').then(r => r.data),
};

export const departmentsApi = {
  list: (includeInactive?: boolean) =>
    apiClient.get('/departments', { params: { includeInactive } }).then(r => r.data),
  create: (data: any) => apiClient.post('/departments', data).then(r => r.data),
  update: (id: string, data: any) => apiClient.patch(`/departments/${id}`, data).then(r => r.data),
  delete: (id: string) => apiClient.delete(`/departments/${id}`).then(r => r.data),
};

export const templatesApi = {
  list: (params?: any) => apiClient.get('/templates', { params }).then(r => r.data),
  create: (data: any) => apiClient.post('/templates', data).then(r => r.data),
  update: (id: string, data: any) => apiClient.patch(`/templates/${id}`, data).then(r => r.data),
  delete: (id: string) => apiClient.delete(`/templates/${id}`).then(r => r.data),
  use: (id: string) => apiClient.post(`/templates/${id}/use`).then(r => r.data),
  categories: () => apiClient.get('/templates/categories').then(r => r.data),
};

export const reportsApi = {
  dashboard: (params?: any) => apiClient.get('/reports/dashboard', { params }).then(r => r.data),
  agents: (params?: any) => apiClient.get('/reports/agents', { params }).then(r => r.data),
  exportExcel: (params?: any) =>
    apiClient.get('/reports/export/excel', { params, responseType: 'blob' }).then(r => r.data),
};

export const notificationsApi = {
  list: (params?: any) => apiClient.get('/notifications', { params }).then(r => r.data),
  markRead: (id: string) => apiClient.patch(`/notifications/${id}/read`).then(r => r.data),
  markAllRead: () => apiClient.patch('/notifications/read-all').then(r => r.data),
};

export const uploadsApi = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
};

export const settingsApi = {
  get: (group?: string) => apiClient.get('/settings', { params: { group } }).then(r => r.data),
  update: (data: Record<string, string>) => apiClient.patch('/settings', data).then(r => r.data),
};

export const auditLogsApi = {
  list: (params?: any) => apiClient.get('/audit-logs', { params }).then(r => r.data),
};
