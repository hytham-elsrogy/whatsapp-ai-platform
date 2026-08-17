import { api } from '@/lib/api';
import { DocumentWithChunks, KbDocument, KnowledgeBase } from '@/types/knowledge-base';

export const knowledgeBaseService = {
  list: () => api.get<KnowledgeBase[]>('/knowledge-bases'),
  get: (id: string) => api.get<KnowledgeBase>(`/knowledge-bases/${id}`),
  create: (name: string, departmentId?: string) =>
    api.post<KnowledgeBase>('/knowledge-bases', { name, departmentId }),
  listDocuments: (knowledgeBaseId: string) =>
    api.get<KbDocument[]>(`/knowledge-bases/${knowledgeBaseId}/documents`),
  createDocument: (knowledgeBaseId: string, title: string, sourceType: string, content: string) =>
    api.post<KbDocument>(`/knowledge-bases/${knowledgeBaseId}/documents`, { title, sourceType, content }),
  createDocumentFromUrl: (knowledgeBaseId: string, title: string, sourceUri: string) =>
    api.post<KbDocument>(`/knowledge-bases/${knowledgeBaseId}/documents`, { title, sourceType: 'url', sourceUri }),
  uploadPdf: (knowledgeBaseId: string, title: string, file: File) => {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('file', file);
    return api.postForm<KbDocument>(`/knowledge-bases/${knowledgeBaseId}/documents/pdf`, formData);
  },
  getDocument: (id: string) => api.get<DocumentWithChunks>(`/documents/${id}`),
};
