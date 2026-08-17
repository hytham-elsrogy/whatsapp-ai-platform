import { api } from '@/lib/api';
import { Department, UpdateDepartmentInput } from '@/types/departments';

export const departmentsService = {
  list: () => api.get<Department[]>('/departments'),
  create: (name: string, description?: string) =>
    api.post<Department>('/departments', { name, description }),
  update: (id: string, input: UpdateDepartmentInput) =>
    api.patch<Department>(`/departments/${id}`, input),
};
