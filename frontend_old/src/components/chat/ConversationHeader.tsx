'use client';
import { useState } from 'react';
import {
  Phone, MoreVertical, Star, StarOff, UserPlus, ArrowRightLeft,
  CheckCircle, XCircle, StickyNote, Info, User,
} from 'lucide-react';
import { Conversation, ConversationStatus } from '@/types';
import { conversationsApi } from '@/services/api';
import { useConversationsStore } from '@/store/conversations.store';
import { CONVERSATION_STATUS_LABELS, CONVERSATION_STATUS_COLORS } from '@/utils/format';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface ConversationHeaderProps {
  conversation: Conversation;
  onShowInfo: () => void;
}

const statusOptions = [
  { value: ConversationStatus.IN_PROGRESS, label: 'قيد المعالجة' },
  { value: ConversationStatus.PENDING_CUSTOMER, label: 'بانتظار العميل' },
  { value: ConversationStatus.RESOLVED, label: 'تم الحل' },
  { value: ConversationStatus.CLOSED, label: 'مغلقة' },
];

export function ConversationHeader({ conversation, onShowInfo }: ConversationHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const { updateConversation } = useConversationsStore();
  const contact = conversation.contact;

  const toggleStar = async () => {
    try {
      await conversationsApi.update(conversation.id, { starred: !conversation.starred });
      updateConversation(conversation.id, { starred: !conversation.starred });
      toast.success(conversation.starred ? 'تم إزالة النجمة' : 'تم إضافة نجمة');
    } catch {
      toast.error('حدث خطأ');
    }
  };

  const changeStatus = async (status: ConversationStatus) => {
    try {
      await conversationsApi.update(conversation.id, { status });
      updateConversation(conversation.id, { status });
      setShowMenu(false);
      toast.success(`تم تغيير الحالة إلى: ${CONVERSATION_STATUS_LABELS[status]}`);
    } catch {
      toast.error('حدث خطأ');
    }
  };

  return (
    <div className="h-14 bg-white dark:bg-[#1f2c33] border-b border-gray-200 dark:border-[#2a3942] flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center text-white font-semibold">
          {contact?.avatarUrl ? (
            <img src={contact.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            contact?.name?.charAt(0)?.toUpperCase() || contact?.phone?.slice(-2) || '?'
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold dark:text-white flex items-center gap-2">
            {contact?.name || contact?.phone}
            {conversation.starred && <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />}
          </h3>
          <div className="flex items-center gap-2">
            <span className={clsx('status-badge text-[10px]', CONVERSATION_STATUS_COLORS[conversation.status])}>
              {CONVERSATION_STATUS_LABELS[conversation.status]}
            </span>
            {conversation.assignedTo && (
              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                {conversation.assignedTo.name}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 relative">
        <button
          onClick={toggleStar}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2a3942] transition-colors"
          title={conversation.starred ? 'إزالة النجمة' : 'إضافة نجمة'}
        >
          {conversation.starred ? (
            <StarOff className="w-4 h-4 text-yellow-500" />
          ) : (
            <Star className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          )}
        </button>

        <button
          onClick={onShowInfo}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2a3942] transition-colors"
          title="معلومات المحادثة"
        >
          <Info className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2a3942] transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>

          {showMenu && (
            <div className="absolute left-0 top-full mt-1 w-48 bg-white dark:bg-[#233138] rounded-xl shadow-2xl border border-gray-200 dark:border-[#2a3942] z-50 py-1 animate-fade-in">
              <p className="text-xs text-gray-400 px-3 py-2 font-medium">تغيير الحالة</p>
              {statusOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => changeStatus(opt.value)}
                  className={clsx(
                    'w-full text-right px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-[#2a3942] transition-colors flex items-center gap-2',
                    conversation.status === opt.value ? 'text-[#25D366]' : 'dark:text-gray-200',
                  )}
                >
                  {opt.label}
                  {conversation.status === opt.value && <CheckCircle className="w-3.5 h-3.5 ms-auto" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
