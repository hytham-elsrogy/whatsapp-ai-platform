import { api } from '@/lib/api';
import { WhatsappNumber, CreateWhatsappNumberInput, UpdateWhatsappNumberInput } from '@/types/whatsapp-numbers';

export const whatsappNumbersService = {
  list: () => api.get<WhatsappNumber[]>('/whatsapp-numbers'),
  create: (input: CreateWhatsappNumberInput) => api.post<WhatsappNumber>('/whatsapp-numbers', input),
  update: (id: string, input: UpdateWhatsappNumberInput) =>
    api.patch<WhatsappNumber>(`/whatsapp-numbers/${id}`, input),
};
