'use client';

import { useCallback, useEffect, useState } from 'react';
import { conversationsService, ConversationFilter } from '@/services/conversations';
import { templatesService } from '@/services/templates';
import { Conversation, ConversationStatus, Message } from '@/types/inbox';
import { useAuthStore } from '@/store/auth-store';
import { connectSocket } from '@/lib/socket';
import { ConversationList } from '@/components/inbox/conversation-list';
import { ChatWindow } from '@/components/inbox/chat-window';

// Real-time push (see EventsGateway) is the primary update path now — these
// polls are just a resync safety net, so the interval can be much longer
// than the old 4s pure-polling approach.
const LIST_POLL_MS = 30_000;
const SELECTED_POLL_MS = 20_000;

export default function InboxPage() {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [filter, setFilter] = useState<ConversationFilter>('all');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const refreshList = useCallback(async () => {
    const data = await conversationsService.list(filter);
    setConversations(data);
  }, [filter]);

  const refreshSelected = useCallback(async () => {
    if (!selectedId) return;
    const [conversation, msgs] = await Promise.all([
      conversationsService.get(selectedId),
      conversationsService.messages(selectedId),
    ]);
    setSelectedConversation(conversation);
    setMessages(msgs);
  }, [selectedId]);

  useEffect(() => {
    refreshList();
    const interval = setInterval(refreshList, LIST_POLL_MS);
    return () => clearInterval(interval);
  }, [refreshList]);

  useEffect(() => {
    refreshSelected();
    if (!selectedId) return;
    const interval = setInterval(refreshSelected, SELECTED_POLL_MS);
    return () => clearInterval(interval);
  }, [selectedId, refreshSelected]);

  // Live updates: join the selected conversation's room so 'message:new'
  // only arrives for what's actually open, and listen tenant-wide for
  // 'conversation:updated' to keep the list in sync without polling.
  useEffect(() => {
    if (!accessToken) return;
    const socket = connectSocket(accessToken);

    const handleConversationUpdated = () => refreshList();
    socket.on('conversation:updated', handleConversationUpdated);

    if (!selectedId) return () => socket.off('conversation:updated', handleConversationUpdated);

    socket.emit('conversation:join', selectedId);
    const handleMessageNew = () => refreshSelected();
    socket.on('message:new', handleMessageNew);

    return () => {
      socket.off('conversation:updated', handleConversationUpdated);
      socket.off('message:new', handleMessageNew);
      socket.emit('conversation:leave', selectedId);
    };
  }, [accessToken, selectedId, refreshList, refreshSelected]);

  async function handleSend(text: string) {
    if (!selectedId) return;
    await conversationsService.send(selectedId, text);
    await refreshSelected();
  }

  async function handleSendMedia(type: 'image' | 'audio' | 'document', file: File | Blob, filename: string, caption?: string) {
    if (!selectedId) return;
    await conversationsService.sendMedia(selectedId, type, file, filename, caption);
    await refreshSelected();
  }

  async function handleSendTemplate(templateName: string, language: string, variables: string[]) {
    if (!selectedId) return;
    await templatesService.sendToConversation(selectedId, templateName, language, variables);
    await refreshSelected();
  }

  async function handleStatusChange(status: ConversationStatus) {
    if (!selectedId) return;
    await conversationsService.setStatus(selectedId, status);
    await Promise.all([refreshSelected(), refreshList()]);
  }

  async function handleAssignToMe() {
    if (!selectedId || !user) return;
    await conversationsService.assign(selectedId, user.id);
    await Promise.all([refreshSelected(), refreshList()]);
  }

  return (
    <div className="-m-6 flex h-[calc(100vh-3.5rem)] overflow-hidden border border-gray-200 dark:border-gray-800">
      <ConversationList
        conversations={conversations}
        filter={filter}
        selectedId={selectedId}
        onFilterChange={(f) => setFilter(f as ConversationFilter)}
        onSelect={setSelectedId}
      />
      {selectedConversation && user ? (
        <ChatWindow
          conversation={selectedConversation}
          messages={messages}
          currentUserId={user.id}
          onSend={handleSend}
          onSendMedia={handleSendMedia}
          onSendTemplate={handleSendTemplate}
          onStatusChange={handleStatusChange}
          onAssignToMe={handleAssignToMe}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
          اختر محادثة لعرضها
        </div>
      )}
    </div>
  );
}
