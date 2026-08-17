export type TemplateCategory = 'utility' | 'marketing' | 'authentication';
export type TemplateStatus = 'pending' | 'approved' | 'rejected';

export interface TemplateVariable {
  id: string;
  position: number;
  exampleValue?: string | null;
  description?: string | null;
}

export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  language: string;
  body: string;
  metaTemplateId?: string | null;
  status: TemplateStatus;
  createdAt: string;
}

export interface TemplateWithVariables extends Template {
  variables: TemplateVariable[];
}

export interface CreateTemplateInput {
  name: string;
  category: TemplateCategory;
  language: string;
  body: string;
  variables?: { exampleValue?: string; description?: string }[];
}
