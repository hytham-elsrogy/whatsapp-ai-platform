import { api } from '@/lib/api';
import { CustomerConsent } from '@/types/consents';

export const consentsService = {
  getLatest: (customerId: string) => api.get<CustomerConsent>(`/customers/${customerId}/consent`),
  record: (customerId: string, status: CustomerConsent['consentStatus']) =>
    api.post<CustomerConsent>(`/customers/${customerId}/consent`, { status }),
};
