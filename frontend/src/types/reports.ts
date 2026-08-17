export interface OverviewReport {
  openConversations: number;
  todayConversations: number;
  resolvedToday: number;
  avgFirstResponseMinutesToday: number | null;
}

export interface AgentPerformanceRow {
  agentId: string;
  agentName: string;
  openCount: number;
  resolvedCount: number;
  avgFirstResponseMinutes: number | null;
}

export interface AiAnalyticsReport {
  total: number;
  resolved: number;
  escalated: number;
  active: number;
  resolutionRate: number | null;
  avgConfidence: number | null;
  totalTokensUsed: number;
  topIntents: { intent: string; count: number }[];
}

export interface SlaComplianceRow {
  type: string;
  count: number;
}
