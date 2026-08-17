export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  SUPERVISOR = 'supervisor',
  AGENT = 'agent',
  OBSERVER = 'observer',
}

export enum ConversationStatus {
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  PENDING_CUSTOMER = 'pending_customer',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  DOCUMENT = 'document',
  LOCATION = 'location',
  CONTACT = 'contact',
  STICKER = 'sticker',
  INTERACTIVE = 'interactive',
  TEMPLATE = 'template',
  SYSTEM = 'system',
}

export enum MessageDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

export enum MessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: Department;
  departmentId?: string;
  permissions?: string[];
  isActive: boolean;
  isOnline: boolean;
  avatarUrl?: string;
  phone?: string;
  twoFactorEnabled: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface PermissionItem {
  key: string;
  label: string;
}

export interface PermissionGroup {
  label: string;
  permissions: PermissionItem[];
}

export interface PermissionsConfig {
  groups: Record<string, PermissionGroup>;
  defaults: Record<string, string[]>;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  color?: string;
  isActive: boolean;
  agentCount: number;
  createdAt: string;
}

export interface Contact {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  tags?: string[];
  notes?: string;
  label?: string;
  company?: string;
  country?: string;
  isBlocked: boolean;
  lastContactAt?: string;
  conversationCount: number;
  createdAt: string;
}

export interface Conversation {
  id: string;
  contact: Contact;
  contactId: string;
  assignedTo?: User;
  assignedToId?: string;
  department?: Department;
  departmentId?: string;
  status: ConversationStatus;
  starred: boolean;
  lastMessageAt?: string;
  lastMessageContent?: string;
  unreadCount: number;
  resolvedAt?: string;
  closedAt?: string;
  firstResponseAt?: string;
  rating?: number;
  ratingComment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  type: MessageType;
  content?: string;
  mediaUrl?: string;
  mediaType?: string;
  fileName?: string;
  fileSize?: number;
  metadata?: any;
  status: MessageStatus;
  whatsappMessageId?: string;
  sender?: User;
  senderId?: string;
  replyToId?: string;
  caption?: string;
  latitude?: string;
  longitude?: string;
  locationName?: string;
  createdAt: string;
}

export interface Template {
  id: string;
  name: string;
  content: string;
  category?: string;
  isShared: boolean;
  isWhatsappTemplate: boolean;
  createdBy?: User;
  usageCount: number;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  data?: any;
  actionUrl?: string;
  createdAt: string;
}

export interface ConversationNote {
  id: string;
  conversationId: string;
  content: string;
  user?: User;
  createdAt: string;
}

export interface ConversationTransfer {
  id: string;
  conversationId: string;
  fromUser?: User;
  toUser?: User;
  toDepartment?: Department;
  notes?: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface DashboardStats {
  totalConversations: number;
  resolvedConversations: number;
  newConversations: number;
  resolutionRate: number;
  totalMessages: number;
  inboundMessages: number;
  outboundMessages: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  statusBreakdown: { status: string; count: string }[];
  dailyTrend: { date: string; count: string }[];
  topAgents: { id: string; name: string; count: string }[];
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export type SendMessagePayload = {
  conversationId: string;
  type?: MessageType;
  content?: string;
  mediaUrl?: string;
  caption?: string;
  replyToId?: string;
  metadata?: any;
};
