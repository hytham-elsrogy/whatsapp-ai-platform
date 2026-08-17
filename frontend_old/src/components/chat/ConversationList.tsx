'use client';
import { useState, useEffect } from 'react';
import { Search, Filter, Plus, Star, MessageSquare } from 'lucide-react';
import { useConversationsStore } from '@/store/conversations.store';
import { Conversation, ConversationStatus } from '@/types';
import { formatRelativeTime, truncate, CONVERSATION_STATUS_LABELS, CONVERSATION_STATUS_COLORS } from '@/utils/format';
import clsx from 'clsx';

const statusFilters = [
  { value: '', label: 'الكل' },
  { value: ConversationStatus.NEW, label: 'جديدة' },
  { value: ConversationStatus.IN_PROGRESS, label: 'قيد المعالجة' },
  { value: ConversationStatus.PENDING_CUSTOMER, label: 'بانتظار العميل' },
  { value: ConversationStatus.RESOLVED, label: 'محلولة' },
  { value: ConversationStatus.CLOSED, label: 'مغلقة' },
];

interface ConversationListProps {
  onSelect: (conversation: Conversation) => void;
  selectedId?: string;
}

export function ConversationList({ onSelect, selectedId }: ConversationListProps) {
  const { conversations, isLoadingConversations, setFilter, filter, fetchConversations } = useConversationsStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleSearch = (value: string) => {
    setSearch(value);
    setFilter({ search: value || undefined });
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setFilter({ status: status as ConversationStatus || undefined });
  };

  return (
    <div className="w-80 lg:w-96 h-full flex flex-col bg-white dark:bg-[#111b21] border-l border-gray-200 dark:border-[#2a3942] shrink-0">
      <div className="p-3 border-b border-gray-200 dark:border-[#2a3942]">
        <div className="relative mb-2">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="بحث في المحادثات..."
            className="w-full pr-9 pl-4 py-2 text-sm bg-gray-100 dark:bg-[#202c33] rounded-lg outline-none focus:ring-1 focus:ring-[#25D366] dark:text-white dark:placeholder-gray-500 transition"
          />
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => handleStatusFilter(f.value)}
              className={clsx(
                'px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0',
                statusFilter === f.value
                  ? 'bg-[#25D366] text-white'
                  : 'bg-gray-100 dark:bg-[#202c33] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2a3942]',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoadingConversations ? (
          <div className="flex justify-center items-center h-32">
            <div className="w-6 h-6 border-2 border-[#25D366] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400 gap-2">
            <MessageSquare className="w-8 h-8 opacity-50" />
            <p className="text-sm">لا توجد محادثات</p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isSelected={conversation.id === selectedId}
              onClick={() => onSelect(conversation)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ConversationItem({ conversation, isSelected, onClick }: {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}) {
  const contact = conversation.contact;
  const initials = contact?.name?.charAt(0)?.toUpperCase() || contact?.phone?.slice(-2) || '?';

  return (
    <div
      onClick={onClick}
      className={clsx(
        'flex items-center gap-3 p-3 cursor-pointer border-b border-gray-100 dark:border-[#2a3942]/50 transition-colors hover:bg-gray-50 dark:hover:bg-[#202c33]',
        isSelected && 'bg-[#25D366]/10 dark:bg-[#25D366]/5 border-r-2 border-r-[#25D366]',
      )}
    >
      <div className="relative shrink-0">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center text-white font-semibold text-base">
          {contact?.avatarUrl ? (
            <img src={contact.avatarUrl} alt={contact.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            initials
          )}
        </div>
        {conversation.unreadCount > 0 && (
          <div className="absolute -bottom-0.5 -left-0.5 w-4 h-4 bg-[#25D366] rounded-full flex items-center justify-center">
            <span className="text-white text-[9px] font-bold">
              {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={clsx(
              'text-sm font-medium truncate',
              conversation.unreadCount > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300',
            )}>
              {contact?.name || contact?.phone}
            </span>
            {conversation.starred && <Star className="w-3 h-3 text-yellow-500 shrink-0 fill-current" />}
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 ms-2">
            {conversation.lastMessageAt ? formatRelativeTime(conversation.lastMessageAt) : ''}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className={clsx(
            'text-xs truncate',
            conversation.unreadCount > 0 ? 'text-gray-700 dark:text-gray-300 font-medium' : 'text-gray-400 dark:text-gray-500',
          )}>
            {truncate(conversation.lastMessageContent || 'لا توجد رسائل', 45)}
          </p>

          <span className={clsx('status-badge text-[10px] shrink-0', CONVERSATION_STATUS_COLORS[conversation.status])}>
            {CONVERSATION_STATUS_LABELS[conversation.status]}
          </span>
        </div>

        {conversation.assignedTo && (
          <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5 truncate">
            {conversation.assignedTo.name}
          </p>
        )}
      </div>
    </div>
  );
}
