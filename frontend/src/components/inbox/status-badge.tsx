import { ConversationStatus } from '@/types/inbox';

const STATUS_LABELS: Record<ConversationStatus, string> = {
  new: 'جديدة',
  bot: 'بوت',
  ai: 'ذكاء اصطناعي',
  waiting: 'قيد الانتظار',
  assigned: 'مُسندة',
  in_progress: 'جارية',
  pending_customer: 'بانتظار العميل',
  escalated: 'مُصعّدة',
  resolved: 'محلولة',
  closed: 'مغلقة',
};

const STATUS_COLORS: Record<ConversationStatus, string> = {
  new: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  bot: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  ai: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  waiting: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  assigned: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  in_progress: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  pending_customer: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  escalated: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  resolved: 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  closed: 'bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
};

export function StatusBadge({ status }: { status: ConversationStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
