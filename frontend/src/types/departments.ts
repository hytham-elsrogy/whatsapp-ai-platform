export interface Department {
  id: string;
  name: string;
  description?: string | null;
  knowledgeBaseId?: string | null;
  aiAgentId?: string | null;
  aiReplyMode: 'auto' | 'suggestion' | 'human_only';
  routingStrategy: 'round_robin' | 'least_active' | 'department_based' | 'manual' | 'skill_based';
  isActive: boolean;
}

export interface UpdateDepartmentInput {
  knowledgeBaseId?: string | null;
  aiAgentId?: string | null;
  aiReplyMode?: Department['aiReplyMode'];
  routingStrategy?: Department['routingStrategy'];
}
