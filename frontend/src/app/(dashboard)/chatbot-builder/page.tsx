'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { chatbotService } from '@/services/chatbot';
import { ChatbotFlowSummary } from '@/types/chatbot';

const STATUS_LABELS: Record<string, string> = {
  draft: 'مسودة',
  published: 'منشورة',
  archived: 'مؤرشفة',
};

export default function ChatbotBuilderListPage() {
  const router = useRouter();
  const [flows, setFlows] = useState<ChatbotFlowSummary[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    chatbotService.listFlows().then(setFlows);
  }, []);

  async function handleCreate() {
    const name = window.prompt('اسم الـ Flow الجديد:');
    if (!name) return;
    setCreating(true);
    try {
      const flow = await chatbotService.createFlow(name);
      router.push(`/chatbot-builder/${flow.id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">الشات بوت</h1>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          <Plus size={16} />
          Flow جديد
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-right dark:bg-gray-900">
            <tr>
              <th className="p-3 font-medium">الاسم</th>
              <th className="p-3 font-medium">الحالة</th>
              <th className="p-3 font-medium">آخر تحديث</th>
            </tr>
          </thead>
          <tbody>
            {flows.map((f) => (
              <tr
                key={f.id}
                onClick={() => router.push(`/chatbot-builder/${f.id}`)}
                className="cursor-pointer border-t border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
              >
                <td className="p-3 font-medium">{f.name}</td>
                <td className="p-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      f.status === 'published'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                    }`}
                  >
                    {STATUS_LABELS[f.status]}
                  </span>
                </td>
                <td className="p-3 text-gray-500">
                  {new Date(f.updatedAt).toLocaleString('ar-EG')}
                </td>
              </tr>
            ))}
            {flows.length === 0 && (
              <tr>
                <td colSpan={3} className="p-6 text-center text-gray-400">
                  لا توجد Flows بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
