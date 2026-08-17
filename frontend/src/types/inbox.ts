export type ConversationStatus =
  | 'new'
  | 'bot'
  | 'ai'
  | 'waiting'
  | 'assigned'
  | 'in_progress'
  | 'pending_customer'
  | 'escalated'
  | 'resolved'
  | 'closed';

export interface Customer {
  id: string;
  name?: string;
  whatsappNumber: string;
}

export interface AgentRef {
  id: string;
  name: string;
}

export interface DepartmentRef {
  id: string;
  name: string;
}

export interface Conversation {
  id: string;
  status: ConversationStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  customer: Customer;
  assignedAgent?: AgentRef | null;
  assignedAgentId?: string | null;
  department?: DepartmentRef | null;
  lastCustomerMessageAt?: string | null;
  updatedAt: string;
}

export interface Message {
  id: string;
  direction: 'inbound' | 'outbound';
  senderType: 'customer' | 'agent' | 'ai' | 'system' | 'bot';
  type: string;
  content: { body?: string; [key: string]: unknown };
  status: string;
  sentAt: string;
}
