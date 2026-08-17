import { api } from '@/lib/api';
import { AttachmentInfo } from '@/types/attachments';

export const attachmentsService = {
  listForMessage: (messageId: string) => api.get<AttachmentInfo[]>(`/messages/${messageId}/attachments`),
};
