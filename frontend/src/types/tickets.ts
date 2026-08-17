export type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Ticket {
  id: string;
  ticketNumber: string;
  customerId: string;
  conversationId?: string | null;
  departmentId?: string | null;
  agentId?: string | null;
  priority: TicketPriority;
  category?: string | null;
  status: TicketStatus;
  dueAt?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
}

export interface TicketComment {
  id: string;
  userId?: string | null;
  body: string;
  isInternal: boolean;
  createdAt: string;
}

export interface TicketWithComments extends Ticket {
  comments: TicketComment[];
}

export interface CreateTicketInput {
  customerId: string;
  description: string;
  category?: string;
  departmentId?: string;
  priority?: TicketPriority;
}

export interface SlaPolicy {
  id: string;
  name: string;
  departmentId?: string | null;
  category?: string | null;
  firstResponseMinutes: number;
  resolutionMinutes: number;
}
