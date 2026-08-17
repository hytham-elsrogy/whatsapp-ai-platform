'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Send, Tag as TagIcon, X } from 'lucide-react';
import { Conversation, ConversationStatus, Message } from '@/types/inbox';
import { templatesService } from '@/services/templates';
import { Template } from '@/types/templates';
import { tagsService } from '@/services/tags';
import { Tag } from '@/types/tags';
import { consentsService } from '@/services/consents';
import { ConsentStatus } from '@/types/consents';
import { attachmentsService } from '@/services/attachments';
import { AttachmentInfo } from '@/types/attachments';
import { StatusBadge } from './status-badge';

const MEDIA_MESSAGE_TYPES = ['image', 'document', 'audio', 'video'];

function formatFileSize(bytes?: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Media messages store a presigned MinIO URL per attachment, fetched
 * on demand rather than embedded in the message payload — presigned URLs
 * are short-lived (5 min, see StorageService.getPresignedUrl), so they're
 * only resolved when actually about to be rendered.
 */
function AttachmentPreview({ messageId }: { messageId: string }) {
  const [attachments, setAttachments] = useState<AttachmentInfo[]>([]);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    attachmentsService
      .listForMessage(messageId)
      .then(setAttachments)
      .finally(() => setChecked(true));
  }, [messageId]);

  if (!checked || attachments.length === 0) {
    // Covers both "still loading" and "Meta media download failed" (e.g. no
    // real credentials in dev, or the media expired) — the message itself
    // still exists even when its attachment couldn't be fetched, so this
    // silently renders nothing rather than an alarming permanent error state.
    return null;
  }

  return (
    <div className="mt-1 space-y-1">
      {attachments.map((a) =>
        a.mimeType?.startsWith('image/') ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={a.id} src={a.url} alt={a.caption ?? 'صورة'} className="max-w-[220px] rounded-lg" />
        ) : (
          <a
            key={a.id}
            href={a.url}
            target="_blank"
            rel="noreferrer"
            className="block rounded border border-current/30 px-2 py-1 text-xs underline"
          >
            {a.caption || a.mimeType || 'ملف مرفق'} {a.size ? `(${formatFileSize(a.size)})` : ''}
          </a>
        ),
      )}
    </div>
  );
}

const CONSENT_LABELS: Record<ConsentStatus, string> = {
  opted_in: 'مُشترك',
  opted_out: 'ملغى الاشتراك',
  unknown: '',
};

const CONSENT_STYLES: Record<ConsentStatus, string> = {
  opted_in: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  opted_out: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  unknown: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

function ConsentControl({ customerId }: { customerId: string }) {
  const [status, setStatus] = useState<ConsentStatus>('unknown');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  function load() {
    consentsService.getLatest(customerId).then((c) => setStatus(c.consentStatus));
  }

  useEffect(load, [customerId]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function handleSetStatus(next: ConsentStatus) {
    await consentsService.record(customerId, next);
    setOpen(false);
    load();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`rounded-full px-2 py-0.5 text-xs ${CONSENT_STYLES[status]}`}
      >
        {CONSENT_LABELS[status] || 'حالة الاشتراك غير معروفة'}
      </button>
      {open && (
        <div className="absolute left-0 z-10 mt-1 w-40 rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-800 dark:bg-gray-900">
          {(['opted_in', 'opted_out'] as ConsentStatus[]).map((value) => (
            <button
              key={value}
              onClick={() => handleSetStatus(value)}
              className="block w-full rounded px-2 py-1 text-right text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              تعيين: {CONSENT_LABELS[value]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TagChips({ conversationId }: { conversationId: string }) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [adding, setAdding] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  useEffect(() => {
    tagsService.listForConversation(conversationId).then(setTags);
  }, [conversationId]);

  async function handleAdd() {
    if (!newTagName.trim()) return;
    const updated = await tagsService.attachToConversation(conversationId, newTagName.trim());
    setTags(updated);
    setNewTagName('');
    setAdding(false);
  }

  async function handleRemove(tagId: string) {
    const updated = await tagsService.detachFromConversation(conversationId, tagId);
    setTags(updated);
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.map((t) => (
        <span
          key={t.id}
          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-white"
          style={{ backgroundColor: t.color }}
        >
          {t.name}
          <button onClick={() => handleRemove(t.id)} className="hover:opacity-70">
            <X size={10} />
          </button>
        </span>
      ))}
      {adding ? (
        <input
          autoFocus
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          onBlur={handleAdd}
          placeholder="اسم الوسم"
          className="w-24 rounded-full border border-gray-300 px-2 py-0.5 text-xs dark:border-gray-700 dark:bg-gray-800"
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-2 py-0.5 text-xs text-gray-500 hover:border-gray-400 dark:border-gray-700"
        >
          <TagIcon size={10} />
          إضافة وسم
        </button>
      )}
    </div>
  );
}

interface Props {
  conversation: Conversation;
  messages: Message[];
  currentUserId: string;
  onSend: (text: string) => Promise<void>;
  onSendTemplate: (templateName: string, language: string, variables: string[]) => Promise<void>;
  onStatusChange: (status: ConversationStatus) => Promise<void>;
  onAssignToMe: () => Promise<void>;
}

function countPlaceholders(body: string): number {
  const matches = body.match(/\{\{\d+\}\}/g);
  return matches ? new Set(matches).size : 0;
}

const SERVICE_WINDOW_HOURS = 24;

function isWithinWindow(lastCustomerMessageAt?: string | null): boolean {
  if (!lastCustomerMessageAt) return false;
  return Date.now() - new Date(lastCustomerMessageAt).getTime() <= SERVICE_WINDOW_HOURS * 60 * 60 * 1000;
}

interface InteractiveOption {
  id: string;
  title: string;
}

interface InboundInteractivePayload {
  type: 'button_reply' | 'list_reply';
  button_reply?: { id: string; title: string };
  list_reply?: { id: string; title: string; description?: string };
}

/**
 * `type === 'interactive'` covers two different content shapes: a bot-sent
 * message has `{body, options}` (built by ChatbotService.sendBotInteractive),
 * while a customer's button/list tap arrives as raw Meta webhook JSON with
 * an `interactive` field — see WhatsAppService.extractContent().
 */
function renderMessageContent(m: Message) {
  if (m.type === 'template') {
    return `[قالب: ${(m.content?.name as string | undefined) ?? m.type}]`;
  }

  if (m.type === 'interactive') {
    const options = m.content?.options as InteractiveOption[] | undefined;
    if (options) {
      return (
        <div>
          {m.content?.body ? <div>{m.content.body as string}</div> : null}
          <div className="mt-1 space-y-1">
            {options.map((o) => (
              <div
                key={o.id}
                className={`rounded border px-2 py-1 text-xs ${
                  m.direction === 'outbound'
                    ? 'border-white/30 text-white/90'
                    : 'border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300'
                }`}
              >
                {o.title}
              </div>
            ))}
          </div>
        </div>
      );
    }

    const interactive = m.content?.interactive as InboundInteractivePayload | undefined;
    const reply = interactive?.button_reply ?? interactive?.list_reply;
    if (reply) return reply.title;
    return `[${m.type}]`;
  }

  if (MEDIA_MESSAGE_TYPES.includes(m.type)) {
    // Meta's raw webhook JSON nests the caption under the type-specific key
    // (e.g. content.image.caption) rather than a top-level `body` — the
    // actual attachment itself renders separately via <AttachmentPreview>.
    const media = m.content?.[m.type] as { caption?: string } | undefined;
    return media?.caption || null;
  }

  return (m.content?.body as string | undefined) ?? `[${m.type}]`;
}

export function ChatWindow({
  conversation,
  messages,
  currentUserId,
  onSend,
  onSendTemplate,
  onStatusChange,
  onAssignToMe,
}: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [approvedTemplates, setApprovedTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateVariables, setTemplateVariables] = useState<string[]>([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const windowOpen = isWithinWindow(conversation.lastCustomerMessageAt);

  useEffect(() => {
    if (windowOpen) return;
    templatesService.list().then((all) => setApprovedTemplates(all.filter((t) => t.status === 'approved')));
  }, [windowOpen]);

  const selectedTemplate = approvedTemplates.find((t) => t.id === selectedTemplateId);

  function handleSelectTemplate(id: string) {
    setSelectedTemplateId(id);
    const template = approvedTemplates.find((t) => t.id === id);
    setTemplateVariables(template ? Array(countPlaceholders(template.body)).fill('') : []);
  }

  async function handleSendTemplate() {
    if (!selectedTemplate) return;
    setSending(true);
    setError(null);
    try {
      await onSendTemplate(selectedTemplate.name, selectedTemplate.language, templateVariables);
      setSelectedTemplateId('');
      setTemplateVariables([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل إرسال القالب');
    } finally {
      setSending(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError(null);
    try {
      await onSend(text.trim());
      setText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل إرسال الرسالة');
    } finally {
      setSending(false);
    }
  }

  const isMine = conversation.assignedAgentId === currentUserId;

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-gray-200 p-4 dark:border-gray-800">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">
            {conversation.customer.name || conversation.customer.whatsappNumber}
          </div>
          <div className="text-xs text-gray-500">{conversation.customer.whatsappNumber}</div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={conversation.status} />
          <ConsentControl customerId={conversation.customer.id} />
          {!conversation.assignedAgentId && (
            <button
              onClick={() => onAssignToMe()}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
            >
              إسناد لي
            </button>
          )}
          {conversation.status === 'assigned' && isMine && (
            <button
              onClick={() => onStatusChange('in_progress')}
              className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
            >
              بدء المحادثة
            </button>
          )}
          {conversation.status === 'in_progress' && (
            <button
              onClick={() => onStatusChange('resolved')}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
            >
              إنهاء المحادثة
            </button>
          )}
          {conversation.status === 'resolved' && (
            <>
              <button
                onClick={() => onStatusChange('in_progress')}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                إعادة فتح
              </button>
              <button
                onClick={() => onStatusChange('closed')}
                className="rounded-lg bg-gray-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
              >
                إغلاق
              </button>
            </>
          )}
        </div>
      </div>
      <div className="mt-2">
        <TagChips conversationId={conversation.id} />
      </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.direction === 'outbound' ? 'justify-start' : 'justify-end'}`}>
            <div
              className={`max-w-md rounded-2xl px-3 py-2 text-sm ${
                m.direction === 'outbound'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
              }`}
            >
              <div>{renderMessageContent(m)}</div>
              {MEDIA_MESSAGE_TYPES.includes(m.type) && <AttachmentPreview messageId={m.id} />}
              <div
                className={`mt-1 text-[10px] ${
                  m.direction === 'outbound' ? 'text-white/70' : 'text-gray-400'
                }`}
              >
                {new Date(m.sentAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {windowOpen ? (
        <form onSubmit={handleSubmit} className="border-t border-gray-200 p-3 dark:border-gray-800">
          {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={sending}
              placeholder="اكتب رسالة..."
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:disabled:bg-gray-900"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              <Send size={16} />
              إرسال
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-2 border-t border-gray-200 p-3 dark:border-gray-800">
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            انتهت نافذة خدمة العملاء (24 ساعة) — لا يمكن إرسال رسالة حرة إلا عبر قالب معتمد.
          </p>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <select
            value={selectedTemplateId}
            onChange={(e) => handleSelectTemplate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="">اختر قالبًا معتمدًا...</option>
            {approvedTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.language})
              </option>
            ))}
          </select>
          {selectedTemplate && (
            <>
              <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {selectedTemplate.body}
              </p>
              {templateVariables.map((value, i) => (
                <input
                  key={i}
                  value={value}
                  onChange={(e) =>
                    setTemplateVariables((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))
                  }
                  placeholder={`قيمة المتغير {{${i + 1}}}`}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                />
              ))}
              <button
                onClick={handleSendTemplate}
                disabled={sending || templateVariables.some((v) => !v.trim())}
                className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                <Send size={16} />
                إرسال القالب
              </button>
            </>
          )}
          {approvedTemplates.length === 0 && (
            <p className="text-xs text-gray-400">لا توجد قوالب معتمدة بعد.</p>
          )}
        </div>
      )}
    </div>
  );
}
