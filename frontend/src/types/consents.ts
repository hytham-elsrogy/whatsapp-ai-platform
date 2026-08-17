export type ConsentStatus = 'opted_in' | 'opted_out' | 'unknown';

export interface CustomerConsent {
  consentStatus: ConsentStatus;
  consentDate?: string | null;
  optOutDate?: string | null;
}
