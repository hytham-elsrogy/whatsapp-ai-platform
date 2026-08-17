import { api } from '@/lib/api';
import { CreateTemplateInput, Template, TemplateStatus, TemplateWithVariables } from '@/types/templates';

export const templatesService = {
  list: () => api.get<Template[]>('/templates'),
  get: (id: string) => api.get<TemplateWithVariables>(`/templates/${id}`),
  create: (input: CreateTemplateInput) => api.post<Template>('/templates', input),
  submit: (id: string, whatsappNumberId: string) =>
    api.post<Template>(`/templates/${id}/submit`, { whatsappNumberId }),
  setStatus: (id: string, status: TemplateStatus) => api.patch<Template>(`/templates/${id}/status`, { status }),
  sendToConversation: (conversationId: string, templateName: string, language: string, variables: string[]) =>
    api.post(`/conversations/${conversationId}/messages/template`, { templateName, language, variables }),
};
