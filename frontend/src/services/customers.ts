import { api } from '@/lib/api';
import { Customer } from '@/types/customers';

export const customersService = {
  list: () => api.get<Customer[]>('/customers'),
};
