import { api } from '@/lib/api';
import { CreateTicketInput, SlaPolicy, Ticket, TicketStatus, TicketWithComments } from '@/types/tickets';

export const ticketsService = {
  list: () => api.get<Ticket[]>('/tickets'),
  get: (id: string) => api.get<TicketWithComments>(`/tickets/${id}`),
  create: (input: CreateTicketInput) => api.post<Ticket>('/tickets', input),
  addComment: (id: string, body: string, isInternal = true) =>
    api.post(`/tickets/${id}/comments`, { body, isInternal }),
  setStatus: (id: string, status: TicketStatus) => api.patch<Ticket>(`/tickets/${id}/status`, { status }),
};

export const slaPoliciesService = {
  list: () => api.get<SlaPolicy[]>('/sla-policies'),
  create: (input: Omit<SlaPolicy, 'id'>) => api.post<SlaPolicy>('/sla-policies', input),
};
