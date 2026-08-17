'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { aiAgentsService } from '@/services/ai-agents';
import { AiAgent, AVAILABLE_ACTIONS, CreateAiAgentInput } from '@/types/ai-agents';

const EMPTY_FORM: CreateAiAgentInput = {
  name: '',
  systemPrompt: '',
  model: 'claude-sonnet-5',
  temperature: 0.3,
  maxTokens: 800,
  confidenceThreshold: 0.75,
  allowedActions: [],
  guardrailRules: {},
  language: 'ar',
  isActive: true,
};

export default function AiAgentsPage() {
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateAiAgentInput>(EMPTY_FORM);
  const [keywordsText, setKeywordsText] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    aiAgentsService.list().then(setAgents);
  }

  useEffect(load, []);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setKeywordsText('');
    setShowForm(true);
  }

  function openEdit(agent: AiAgent) {
    setEditingId(agent.id);
    setForm({
      name: agent.name,
      systemPrompt: agent.systemPrompt,
      model: agent.model,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      confidenceThreshold: agent.confidenceThreshold,
      allowedActions: agent.allowedActions,
      guardrailRules: agent.guardrailRules,
      language: agent.language,
      isActive: agent.isActive,
    });
    setKeywordsText((agent.guardrailRules.force_escalation_keywords ?? []).join(', '));
    setShowForm(true);
  }

  function toggleAction(name: string) {
    setForm((f) => ({
      ...f,
      allowedActions: f.allowedActions.includes(name)
        ? f.allowedActions.filter((a) => a !== name)
        : [...f.allowedActions, name],
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload: CreateAiAgentInput = {
        ...form,
        guardrailRules: {
          ...form.guardrailRules,
          force_escalation_keywords: keywordsText
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean),
        },
      };
      if (editingId) {
        await aiAgentsService.update(editingId, payload);
      } else {
        await aiAgentsService.create(payload);
      }
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">وكلاء الذكاء الاصطناعي</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={16} />
          وكيل جديد
        </button>
      </div>

      <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-right dark:bg-gray-900">
            <tr>
              <th className="p-3 font-medium">الاسم</th>
              <th className="p-3 font-medium">النموذج</th>
              <th className="p-3 font-medium">حد الثقة</th>
              <th className="p-3 font-medium">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr
                key={a.id}
                onClick={() => openEdit(a)}
                className="cursor-pointer border-t border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
              >
                <td className="p-3 font-medium">{a.name}</td>
                <td className="p-3 text-gray-500">{a.model}</td>
                <td className="p-3 text-gray-500">{a.confidenceThreshold}</td>
                <td className="p-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      a.isActive
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                    }`}
                  >
                    {a.isActive ? 'مفعّل' : 'معطّل'}
                  </span>
                </td>
              </tr>
            ))}
            {agents.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-gray-400">
                  لا يوجد وكلاء ذكاء اصطناعي بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="space-y-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <h2 className="text-lg font-semibold">{editingId ? 'تعديل الوكيل' : 'وكيل جديد'}</h2>

          <div className="grid grid-cols-2 gap-4">
            <label className="text-sm">
              الاسم
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="text-sm">
              النموذج (model)
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
              />
            </label>
          </div>

          <label className="block text-sm">
            System Prompt
            <textarea
              rows={4}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              value={form.systemPrompt}
              onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
            />
          </label>

          <div className="grid grid-cols-3 gap-4">
            <label className="text-sm">
              Temperature
              <input
                type="number"
                step="0.1"
                min={0}
                max={1}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
                value={form.temperature}
                onChange={(e) => setForm({ ...form, temperature: Number(e.target.value) })}
              />
            </label>
            <label className="text-sm">
              Max Tokens
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
                value={form.maxTokens}
                onChange={(e) => setForm({ ...form, maxTokens: Number(e.target.value) })}
              />
            </label>
            <label className="text-sm">
              حد الثقة (0-1)
              <input
                type="number"
                step="0.05"
                min={0}
                max={1}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
                value={form.confidenceThreshold}
                onChange={(e) => setForm({ ...form, confidenceThreshold: Number(e.target.value) })}
              />
            </label>
          </div>

          <label className="block text-sm">
            كلمات تصعيد فوري (مفصولة بفاصلة) — مثل: ألم شديد, طوارئ
            <input
              dir="rtl"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
            />
          </label>

          <div>
            <div className="mb-2 text-sm font-medium">الإجراءات المسموحة (AI Actions)</div>
            <div className="grid grid-cols-3 gap-2">
              {AVAILABLE_ACTIONS.map((action) => (
                <label key={action.name} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.allowedActions.includes(action.name)}
                    onChange={() => toggleAction(action.name)}
                  />
                  {action.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              مفعّل
            </label>
            <select
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
            >
              <option value="auto">تلقائي</option>
              <option value="ar">عربي</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !form.name || !form.systemPrompt || !form.model}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'جارٍ الحفظ...' : 'حفظ'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
