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
  REACTION = 'reaction',
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

export enum NotificationType {
  NEW_MESSAGE = 'new_message',
  CONVERSATION_ASSIGNED = 'conversation_assigned',
  CONVERSATION_TRANSFERRED = 'conversation_transferred',
  SLA_BREACH = 'sla_breach',
  SYSTEM = 'system',
}

export enum Permission {
  // المحادثات
  CONVERSATIONS_VIEW = 'conversations.view',
  CONVERSATIONS_CREATE = 'conversations.create',
  CONVERSATIONS_ASSIGN = 'conversations.assign',
  CONVERSATIONS_TRANSFER = 'conversations.transfer',
  CONVERSATIONS_CLOSE = 'conversations.close',
  CONVERSATIONS_DELETE = 'conversations.delete',

  // الرسائل
  MESSAGES_VIEW = 'messages.view',
  MESSAGES_SEND = 'messages.send',

  // جهات الاتصال
  CONTACTS_VIEW = 'contacts.view',
  CONTACTS_CREATE = 'contacts.create',
  CONTACTS_EDIT = 'contacts.edit',
  CONTACTS_DELETE = 'contacts.delete',

  // المستخدمين
  USERS_VIEW = 'users.view',
  USERS_CREATE = 'users.create',
  USERS_EDIT = 'users.edit',
  USERS_DELETE = 'users.delete',

  // التقارير
  REPORTS_VIEW = 'reports.view',
  REPORTS_EXPORT = 'reports.export',

  // القوالب
  TEMPLATES_VIEW = 'templates.view',
  TEMPLATES_CREATE = 'templates.create',
  TEMPLATES_EDIT = 'templates.edit',
  TEMPLATES_DELETE = 'templates.delete',

  // الأقسام
  DEPARTMENTS_VIEW = 'departments.view',
  DEPARTMENTS_MANAGE = 'departments.manage',

  // الإعدادات
  SETTINGS_VIEW = 'settings.view',
  SETTINGS_EDIT = 'settings.edit',

  // سجل المراجعة
  AUDIT_VIEW = 'audit.view',
}

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: Object.values(Permission),
  [UserRole.ADMIN]: Object.values(Permission),
  [UserRole.SUPERVISOR]: [
    Permission.CONVERSATIONS_VIEW, Permission.CONVERSATIONS_CREATE,
    Permission.CONVERSATIONS_ASSIGN, Permission.CONVERSATIONS_TRANSFER, Permission.CONVERSATIONS_CLOSE,
    Permission.MESSAGES_VIEW, Permission.MESSAGES_SEND,
    Permission.CONTACTS_VIEW, Permission.CONTACTS_CREATE, Permission.CONTACTS_EDIT,
    Permission.USERS_VIEW,
    Permission.REPORTS_VIEW, Permission.REPORTS_EXPORT,
    Permission.TEMPLATES_VIEW, Permission.TEMPLATES_CREATE, Permission.TEMPLATES_EDIT,
    Permission.DEPARTMENTS_VIEW,
    Permission.SETTINGS_VIEW,
  ],
  [UserRole.AGENT]: [
    Permission.CONVERSATIONS_VIEW, Permission.CONVERSATIONS_CREATE,
    Permission.CONVERSATIONS_TRANSFER,
    Permission.MESSAGES_VIEW, Permission.MESSAGES_SEND,
    Permission.CONTACTS_VIEW, Permission.CONTACTS_CREATE, Permission.CONTACTS_EDIT,
    Permission.TEMPLATES_VIEW,
  ],
  [UserRole.OBSERVER]: [
    Permission.CONVERSATIONS_VIEW,
    Permission.MESSAGES_VIEW,
    Permission.CONTACTS_VIEW,
    Permission.REPORTS_VIEW,
    Permission.TEMPLATES_VIEW,
    Permission.DEPARTMENTS_VIEW,
  ],
};

export const PERMISSION_GROUPS: Record<string, { label: string; permissions: { key: Permission; label: string }[] }> = {
  conversations: {
    label: 'المحادثات',
    permissions: [
      { key: Permission.CONVERSATIONS_VIEW, label: 'عرض المحادثات' },
      { key: Permission.CONVERSATIONS_CREATE, label: 'إنشاء محادثة' },
      { key: Permission.CONVERSATIONS_ASSIGN, label: 'تعيين محادثة' },
      { key: Permission.CONVERSATIONS_TRANSFER, label: 'تحويل محادثة' },
      { key: Permission.CONVERSATIONS_CLOSE, label: 'إغلاق محادثة' },
      { key: Permission.CONVERSATIONS_DELETE, label: 'حذف محادثة' },
    ],
  },
  messages: {
    label: 'الرسائل',
    permissions: [
      { key: Permission.MESSAGES_VIEW, label: 'عرض الرسائل' },
      { key: Permission.MESSAGES_SEND, label: 'إرسال رسالة' },
    ],
  },
  contacts: {
    label: 'جهات الاتصال',
    permissions: [
      { key: Permission.CONTACTS_VIEW, label: 'عرض جهات الاتصال' },
      { key: Permission.CONTACTS_CREATE, label: 'إنشاء جهة اتصال' },
      { key: Permission.CONTACTS_EDIT, label: 'تعديل جهة اتصال' },
      { key: Permission.CONTACTS_DELETE, label: 'حذف جهة اتصال' },
    ],
  },
  users: {
    label: 'المستخدمين',
    permissions: [
      { key: Permission.USERS_VIEW, label: 'عرض المستخدمين' },
      { key: Permission.USERS_CREATE, label: 'إنشاء مستخدم' },
      { key: Permission.USERS_EDIT, label: 'تعديل مستخدم' },
      { key: Permission.USERS_DELETE, label: 'حذف مستخدم' },
    ],
  },
  reports: {
    label: 'التقارير',
    permissions: [
      { key: Permission.REPORTS_VIEW, label: 'عرض التقارير' },
      { key: Permission.REPORTS_EXPORT, label: 'تصدير التقارير' },
    ],
  },
  templates: {
    label: 'القوالب',
    permissions: [
      { key: Permission.TEMPLATES_VIEW, label: 'عرض القوالب' },
      { key: Permission.TEMPLATES_CREATE, label: 'إنشاء قالب' },
      { key: Permission.TEMPLATES_EDIT, label: 'تعديل قالب' },
      { key: Permission.TEMPLATES_DELETE, label: 'حذف قالب' },
    ],
  },
  departments: {
    label: 'الأقسام',
    permissions: [
      { key: Permission.DEPARTMENTS_VIEW, label: 'عرض الأقسام' },
      { key: Permission.DEPARTMENTS_MANAGE, label: 'إدارة الأقسام' },
    ],
  },
  settings: {
    label: 'الإعدادات',
    permissions: [
      { key: Permission.SETTINGS_VIEW, label: 'عرض الإعدادات' },
      { key: Permission.SETTINGS_EDIT, label: 'تعديل الإعدادات' },
    ],
  },
  audit: {
    label: 'سجل المراجعة',
    permissions: [
      { key: Permission.AUDIT_VIEW, label: 'عرض السجل' },
    ],
  },
};

export enum AuditAction {
  LOGIN = 'login',
  LOGOUT = 'logout',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  ASSIGN = 'assign',
  TRANSFER = 'transfer',
  SEND_MESSAGE = 'send_message',
  EXPORT = 'export',
  SETTINGS_CHANGE = 'settings_change',
}
