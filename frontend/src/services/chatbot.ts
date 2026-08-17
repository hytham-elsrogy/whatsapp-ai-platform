import { api } from '@/lib/api';
import { ChatbotFlowSummary, ChatbotFlowWithGraph } from '@/types/chatbot';

interface GraphNodeInput {
  clientId: string;
  type: string;
  config: Record<string, unknown>;
  positionX: number;
  positionY: number;
}

interface GraphEdgeInput {
  sourceClientId: string;
  targetClientId: string;
  condition?: { equals?: string } | null;
}

export const chatbotService = {
  listFlows: () => api.get<ChatbotFlowSummary[]>('/chatbot-flows'),

  getFlow: (id: string) => api.get<ChatbotFlowWithGraph>(`/chatbot-flows/${id}`),

  createFlow: (name: string, departmentId?: string) =>
    api.post<ChatbotFlowSummary>('/chatbot-flows', { name, departmentId }),

  saveGraph: (id: string, nodes: GraphNodeInput[], edges: GraphEdgeInput[]) =>
    api.put<ChatbotFlowWithGraph>(`/chatbot-flows/${id}/graph`, { nodes, edges }),

  publish: (id: string) => api.post<ChatbotFlowSummary>(`/chatbot-flows/${id}/publish`),
};
