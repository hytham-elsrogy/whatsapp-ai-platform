export interface AppNotification {
  id: string;
  type: 'new_conversation' | 'new_assignment' | 'sla_breach' | 'ai_escalation';
  payload: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}
