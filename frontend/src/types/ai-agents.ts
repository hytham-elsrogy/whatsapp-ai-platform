export interface GuardrailRules {
  forbidden_topics?: string[];
  force_escalation_keywords?: string[];
  escalation_department?: string;
  escalation_priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface AiAgent {
  id: string;
  name: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  confidenceThreshold: number;
  allowedActions: string[];
  guardrailRules: GuardrailRules;
  language: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAiAgentInput {
  name: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  confidenceThreshold: number;
  allowedActions: string[];
  guardrailRules: GuardrailRules;
  language: string;
  isActive: boolean;
}

export const AVAILABLE_ACTIONS = [
  { name: 'getDepartment', label: 'البحث عن قسم' },
  { name: 'assignDepartment', label: 'تحويل لقسم' },
  { name: 'assignAgent', label: 'تحويل لموظف' },
  { name: 'checkAppointment', label: 'فحص موعد (يتطلب ربط نظام HIS)' },
  { name: 'getDoctorSchedule', label: 'جدول طبيب (يتطلب ربط نظام HIS)' },
  { name: 'getPatientInfo', label: 'بيانات مريض (يتطلب ربط نظام HIS)' },
  { name: 'createAppointmentRequest', label: 'طلب حجز موعد (يتطلب ربط نظام HIS)' },
  { name: 'sendTemplate', label: 'إرسال قالب رسالة' },
  { name: 'createTicket', label: 'إنشاء تذكرة' },
];
