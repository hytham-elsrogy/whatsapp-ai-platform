import { Conversation } from '@/types/inbox';
import { StatusBadge } from './status-badge';

const FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'unassigned', label: 'غير مسندة' },
  { key: 'mine', label: 'محادثاتي' },
  { key: 'waiting', label: 'قيد الانتظار' },
  { key: 'resolved', label: 'منتهية' },
];

interface Props {
  conversations: Conversation[];
  filter: string;
  selectedId: string | null;
  onFilterChange: (filter: string) => void;
  onSelect: (id: string) => void;
}

export function ConversationList({ conversations, filter, selectedId, onFilterChange, onSelect }: Props) {
  return (
    <div className="flex w-80 flex-shrink-0 flex-col border-l border-gray-200 dark:border-gray-800">
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 p-2 dark:border-gray-800">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => onFilterChange(f.key)}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${
              filter === f.key
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 && (
          <p className="p-4 text-center text-sm text-gray-400">لا توجد محادثات</p>
        )}
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`flex w-full flex-col gap-1 border-b border-gray-100 p-3 text-right transition dark:border-gray-800 ${
              selectedId === c.id
                ? 'bg-primary/10'
                : 'hover:bg-gray-50 dark:hover:bg-gray-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{c.customer.name || c.customer.whatsappNumber}</span>
              <StatusBadge status={c.status} />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{c.department?.name ?? 'بدون قسم'}</span>
              <span>{c.assignedAgent?.name ?? 'غير مسندة'}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
