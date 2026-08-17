import { api } from '@/lib/api';
import { AiAgent, CreateAiAgentInput } from '@/types/ai-agents';

export const aiAgentsService = {
  list: () => api.get<AiAgent[]>('/ai-agents'),
  get: (id: string) => api.get<AiAgent>(`/ai-agents/${id}`),
  create: (input: CreateAiAgentInput) => api.post<AiAgent>('/ai-agents', input),
  update: (id: string, input: Partial<CreateAiAgentInput>) =>
    api.patch<AiAgent>(`/ai-agents/${id}`, input),
};
