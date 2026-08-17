'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ticketsService } from '@/services/tickets';
import { TicketStatus, TicketWithComments } from '@/types/tickets';

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'مفتوحة',
  pending: 'قيد الانتظار',
  resolved: 'محلولة',
  closed: 'مغلقة',
};

const NEXT_STATUS: Record<TicketStatus, TicketStatus[]> = {
  open: ['pending', 'resolved'],
  pending: ['open', 'resolved'],
  resolved: ['closed', 'open'],
  closed: [],
};

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const ticketId = params.id;

  const [ticket, setTicket] = useState<TicketWithComments | null>(null);
  const [commentBody, setCommentBody] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    ticketsService.get(ticketId).then(setTicket);
  }

  useEffect(load, [ticketId]);

  async function handleAddComment() {
    if (!commentBody) return;
    setSaving(true);
    try {
      await ticketsService.addComment(ticketId, commentBody, true);
      setCommentBody('');
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleTransition(status: TicketStatus) {
    await ticketsService.setStatus(ticketId, status);
    load();
  }

  if (!ticket) return <div className="text-gray-400">جارٍ التحميل...</div>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{ticket.ticketNumber}</h1>
          <p className="text-sm text-gray-500">
            الحالة: {STATUS_LABELS[ticket.status]}
            {ticket.dueAt && ` — الموعد النهائي: ${new Date(ticket.dueAt).toLocaleString('ar-EG')}`}
          </p>
        </div>
        <div className="flex gap-2">
          {NEXT_STATUS[ticket.status].map((s) => (
            <button
              key={s}
              onClick={() => handleTransition(s)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900"
            >
              نقل إلى: {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {ticket.comments.map((c) => (
          <div
            key={c.id}
            className={`rounded-lg border p-3 text-sm ${
              c.isInternal
                ? 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30'
                : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'
            }`}
          >
            <div className="mb-1 text-xs text-gray-400">
              {c.isInternal ? 'ملاحظة داخلية' : 'رد للعميل'} — {new Date(c.createdAt).toLocaleString('ar-EG')}
              {!c.userId && ' (الذكاء الاصطناعي)'}
            </div>
            {c.body}
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        <textarea
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
          placeholder="أضف ملاحظة..."
          value={commentBody}
          onChange={(e) => setCommentBody(e.target.value)}
        />
        <button
          onClick={handleAddComment}
          disabled={saving || !commentBody}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          إضافة ملاحظة
        </button>
      </div>
    </div>
  );
}
