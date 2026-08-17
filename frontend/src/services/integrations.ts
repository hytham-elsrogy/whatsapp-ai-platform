import { api } from '@/lib/api';
import { Integration, IntegrationConfig, IntegrationType, TestConnectionResult } from '@/types/integrations';

export const integrationsService = {
  list: () => api.get<Integration[]>('/integrations'),
  create: (type: IntegrationType, name: string, config: IntegrationConfig) =>
    api.post<Integration>('/integrations', { type, name, config }),
  update: (id: string, patch: Partial<{ status: 'active' | 'inactive'; config: IntegrationConfig }>) =>
    api.patch<Integration>(`/integrations/${id}`, patch),
  testConnection: (id: string, action: string) =>
    api.post<TestConnectionResult>(`/integrations/${id}/test`, { action }),
};
