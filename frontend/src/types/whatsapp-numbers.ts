export interface WhatsappNumber {
  id: string;
  phoneNumberId: string;
  wabaId: string;
  displayNumber: string;
  label: string;
  accessTokenSecretRef: string;
  departmentId?: string | null;
  chatbotFlowId?: string | null;
  aiAgentId?: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface CreateWhatsappNumberInput {
  phoneNumberId: string;
  wabaId: string;
  displayNumber: string;
  label: string;
  accessTokenSecretRef: string;
  departmentId?: string;
}

export interface UpdateWhatsappNumberInput {
  label?: string;
  accessTokenSecretRef?: string;
  departmentId?: string | null;
  chatbotFlowId?: string | null;
  aiAgentId?: string | null;
  status?: 'active' | 'inactive';
}
