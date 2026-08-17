export type ChatbotNodeType =
  | 'start'
  | 'message'
  | 'question'
  | 'button'
  | 'list'
  | 'condition'
  | 'department'
  | 'agent'
  | 'ai'
  | 'api_call'
  | 'db_query'
  | 'delay'
  | 'tag'
  | 'end';

export interface ChatbotFlowSummary {
  id: string;
  name: string;
  status: 'draft' | 'published' | 'archived';
  departmentId?: string | null;
  updatedAt: string;
}

export interface ChatbotNodeDto {
  id: string;
  type: ChatbotNodeType;
  config: Record<string, unknown>;
  positionX: number;
  positionY: number;
}

export interface ChatbotEdgeDto {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  condition?: { equals?: string } | null;
}

export interface ChatbotFlowWithGraph extends ChatbotFlowSummary {
  nodes: ChatbotNodeDto[];
  edges: ChatbotEdgeDto[];
}
