'use client';
import { useEffect } from 'react';
import { ConversationList } from '@/components/chat/ConversationList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { useConversationsStore } from '@/store/conversations.store';
import { Conversation } from '@/types';

export default function ConversationsPage() {
  const { setActiveConversation, activeConversation } = useConversationsStore();

  const handleSelectConversation = (conversation: Conversation) => {
    setActiveConversation(conversation);
  };

  return (
    <div className="flex h-full overflow-hidden">
      <ConversationList
        onSelect={handleSelectConversation}
        selectedId={activeConversation?.id}
      />
      <ChatWindow />
    </div>
  );
}
