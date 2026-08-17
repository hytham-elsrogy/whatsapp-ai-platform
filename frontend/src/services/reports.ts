import { api } from '@/lib/api';
import { AgentPerformanceRow, AiAnalyticsReport, OverviewReport, SlaComplianceRow } from '@/types/reports';

export const reportsService = {
  overview: () => api.get<OverviewReport>('/reports/overview'),
  agents: () => api.get<AgentPerformanceRow[]>('/reports/agents'),
  ai: () => api.get<AiAnalyticsReport>('/reports/ai'),
  sla: () => api.get<SlaComplianceRow[]>('/reports/sla'),
};
