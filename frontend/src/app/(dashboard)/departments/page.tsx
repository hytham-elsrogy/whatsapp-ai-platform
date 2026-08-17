'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { departmentsService } from '@/services/departments';
import { aiAgentsService } from '@/services/ai-agents';
import { knowledgeBaseService } from '@/services/knowledge-base';
import { Department } from '@/types/departments';
import { AiAgent } from '@/types/ai-agents';
import { KnowledgeBase } from '@/types/knowledge-base';

const REPLY_MODE_LABELS: Record<string, string> = {
  auto: 'تلقائي (يرسل مباشرة)',
  suggestion: 'اقتراح (يراجعه موظف)',
  human_only: 'بشري فقط (بدون AI)',
};

const ROUTING_LABELS: Record<string, string> = {
  round_robin: 'بالتناوب',
  least_active: 'الأقل انشغالًا',
  skill_based: 'حسب المهارة (الوسوم)',
  department_based: 'حسب القسم',
  manual: 'يدوي',
};

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [aiAgents, setAiAgents] = useState<AiAgent[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [creating, setCreating] = useState(false);

  function load() {
    departmentsService.list().then(setDepartments);
    aiAgentsService.list().then(setAiAgents);
    knowledgeBaseService.list().then(setKnowledgeBases);
  }

  useEffect(load, []);

  async function handleCreate() {
    const name = window.prompt('اسم القسم الجديد:');
    if (!name) return;
    setCreating(true);
    try {
      await departmentsService.create(name);
      load();
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdate(id: string, patch: Partial<Department>) {
    setDepartments((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    await departmentsService.update(id, patch);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">الأقسام</h1>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          <Plus size={16} />
          قسم جديد
        </button>
      </div>

      <div className="space-y-4">
        {departments.map((d) => (
          <div key={d.id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <div className="mb-3 font-semibold">{d.name}</div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <label className="text-sm">
                وضع ردّ الذكاء الاصطناعي
                <select
                  className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-950"
                  value={d.aiReplyMode}
                  onChange={(e) => handleUpdate(d.id, { aiReplyMode: e.target.value as Department['aiReplyMode'] })}
                >
                  {Object.entries(REPLY_MODE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                وكيل الذكاء الاصطناعي
                <select
                  className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-950"
                  value={d.aiAgentId ?? ''}
                  onChange={(e) => handleUpdate(d.id, { aiAgentId: e.target.value || null })}
                >
                  <option value="">بدون</option>
                  {aiAgents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                قاعدة المعرفة
                <select
                  className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-950"
                  value={d.knowledgeBaseId ?? ''}
                  onChange={(e) => handleUpdate(d.id, { knowledgeBaseId: e.target.value || null })}
                >
                  <option value="">بدون</option>
                  {knowledgeBases.map((kb) => (
                    <option key={kb.id} value={kb.id}>
                      {kb.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                استراتيجية التوجيه
                <select
                  className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-950"
                  value={d.routingStrategy}
                  onChange={(e) =>
                    handleUpdate(d.id, { routingStrategy: e.target.value as Department['routingStrategy'] })
                  }
                >
                  {Object.entries(ROUTING_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ))}
        {departments.length === 0 && <div className="p-6 text-center text-gray-400">لا توجد أقسام بعد</div>}
      </div>
    </div>
  );
}
