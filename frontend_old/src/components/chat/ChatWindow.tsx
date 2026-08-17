'use client';
import { useEffect, useRef, useState } from 'react';
import { MessageSquare, StickyNote, ArrowRightLeft, Star, Info } from 'lucide-react';
import { useConversationsStore } from '@/store/conversations.store';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { ConversationHeader } from './ConversationHeader';
import { Message, MessageType } from '@/types';
import { messagesApi } from '@/services/api';
import { getSocket } from '@/services/socket';
import toast from 'react-hot-toast';
import { formatDate } from '@/utils/format';

export function ChatWindow() {
  const { activeConversation, messages, sendMessage, addMessage } = useConversationsStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!activeConversation) return;

    const socket = getSocket();
    if (!socket) return;

    const handler = async (data: any) => {
      if (data.conversationId === activeConversation.id) {
        try {
          const response = await messagesApi.getByConversation(activeConversation.id, { limit: 1 });
          if (response.data?.[0]) addMessage(response.data[0]);
        } catch {}
      }
    };

    socket.on('message', handler);
    socket.on('new-message', handler);
    return () => {
      socket.off('message', handler);
      socket.off('new-message', handler);
    };
  }, [activeConversation?.id]);

  if (!activeConversation) {
    return (
      <div className="flex-1 chat-bg flex flex-col items-center justify-center text-center p-8">
        <div className="w-24 h-24 bg-[#25D366]/20 rounded-full flex items-center justify-center mb-4">
          <MessageSquare className="w-12 h-12 text-[#25D366]" />
        </div>
        <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">
          WhatsApp CRM
        </h3>
        <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs">
          اختر محادثة من القائمة لبدء المراسلة مع العملاء
        </p>
      </div>
    );
  }

  const handleSend = async (data: any) => {
    await sendMessage({
      conversationId: activeConversation.id,
      ...data,
    });
  };

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full">
      <ConversationHeader
        conversation={activeConversation}
        onShowInfo={() => setShowInfo(!showInfo)}
      />

      <div className="flex-1 overflow-y-auto chat-bg py-4 relative">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-400 dark:text-gray-500 bg-white/80 dark:bg-black/20 px-4 py-2 rounded-full">
              لا توجد رسائل بعد
            </p>
          </div>
        ) : (
          <>
            {Object.entries(groupedMessages).map(([date, msgs]) => (
              <div key={date}>
                <div className="flex items-center justify-center my-3">
                  <span className="bg-white/80 dark:bg-[#182229] text-gray-500 dark:text-gray-400 text-xs px-3 py-1 rounded-full shadow-sm">
                    {date}
                  </span>
                </div>
                {(msgs as Message[]).map((message, idx) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    showSender={idx === 0 || (msgs as Message[])[idx - 1]?.senderId !== message.senderId}
                  />
                ))}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <MessageInput
        onSend={handleSend}
        disabled={activeConversation.status === 'closed'}
      />
    </div>
  );
}

function groupMessagesByDate(messages: Message[]): Record<string, Message[]> {
  return messages.reduce((acc, message) => {
    const dateKey = formatDate(message.createdAt);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(message);
    return acc;
  }, {} as Record<string, Message[]>);
}
