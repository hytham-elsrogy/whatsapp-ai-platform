import { formatDistanceToNow, format, isToday, isYesterday, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';

export function formatMessageTime(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return `أمس ${format(date, 'HH:mm')}`;
  return format(date, 'dd/MM/yyyy HH:mm');
}

export function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return '';
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: ar });
  } catch {
    return dateStr;
  }
}

export function formatDate(dateStr: string, fmt = 'dd/MM/yyyy'): string {
  if (!dateStr) return '';
  try {
    return format(parseISO(dateStr), fmt, { locale: ar });
  } catch {
    return dateStr;
  }
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatPhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return `0${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  return `+${cleaned}`;
}

export function truncate(str: string, max = 50): string {
  if (!str) return '';
  return str.length > max ? `${str.slice(0, max)}...` : str;
}

export const CONVERSATION_STATUS_LABELS: Record<string, string> = {
  new: 'جديدة',
  in_progress: 'قيد المعالجة',
  pending_customer: 'بانتظار العميل',
  resolved: 'تم الحل',
  closed: 'مغلقة',
};

export const CONVERSATION_STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  pending_customer: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  closed: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

export const USER_ROLE_LABELS: Record<string, string> = {
  super_admin: 'مدير النظام',
  admin: 'مدير',
  supervisor: 'مشرف',
  agent: 'موظف خدمة عملاء',
  observer: 'مراقب',
};
