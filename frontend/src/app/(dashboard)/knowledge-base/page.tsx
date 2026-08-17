'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { knowledgeBaseService } from '@/services/knowledge-base';
import { KnowledgeBase } from '@/types/knowledge-base';

export default function KnowledgeBaseListPage() {
  const router = useRouter();
  const [items, setItems] = useState<KnowledgeBase[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    knowledgeBaseService.list().then(setItems);
  }, []);

  async function handleCreate() {
    const name = window.prompt('اسم قاعدة المعرفة الجديدة:');
    if (!name) return;
    setCreating(true);
    try {
      const kb = await knowledgeBaseService.create(name);
      router.push(`/knowledge-base/${kb.id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">قاعدة المعرفة</h1>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          <Plus size={16} />
          قاعدة معرفة جديدة
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-right dark:bg-gray-900">
            <tr>
              <th className="p-3 font-medium">الاسم</th>
              <th className="p-3 font-medium">تاريخ الإنشاء</th>
            </tr>
          </thead>
          <tbody>
            {items.map((kb) => (
              <tr
                key={kb.id}
                onClick={() => router.push(`/knowledge-base/${kb.id}`)}
                className="cursor-pointer border-t border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
              >
                <td className="p-3 font-medium">{kb.name}</td>
                <td className="p-3 text-gray-500">{new Date(kb.createdAt).toLocaleString('ar-EG')}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={2} className="p-6 text-center text-gray-400">
                  لا توجد قواعد معرفة بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
