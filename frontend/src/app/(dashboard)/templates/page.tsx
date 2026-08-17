'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { templatesService } from '@/services/templates';
import { Template, TemplateCategory } from '@/types/templates';

const STATUS_LABELS: Record<string, string> = {
  pending: 'قيد المراجعة',
  approved: 'معتمد',
  rejected: 'مرفوض',
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
};

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  utility: 'خدمية',
  marketing: 'تسويقية',
  authentication: 'مصادقة',
};

function countPlaceholders(body: string): number {
  const matches = body.match(/\{\{\d+\}\}/g);
  return matches ? new Set(matches).size : 0;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'utility' as TemplateCategory, language: 'ar', body: '' });

  function load() {
    templatesService.list().then(setTemplates);
  }

  useEffect(load, []);

  async function handleCreate() {
    if (!form.name || !form.body) return;
    setSaving(true);
    try {
      const variableCount = countPlaceholders(form.body);
      await templatesService.create({
        ...form,
        variables: Array.from({ length: variableCount }, () => ({})),
      });
      setForm({ name: '', category: 'utility', language: 'ar', body: '' });
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  // Meta's real approval webhook can't reach a local dev server — this lets
  // an admin reconcile status manually. See TemplatesService.setStatus().
  async function handleForceStatus(id: string, status: 'approved' | 'rejected') {
    await templatesService.setStatus(id, status);
    load();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">قوالب الرسائل</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={16} />
          قالب جديد
        </button>
      </div>

      {showForm && (
        <div className="mb-6 space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <div className="grid grid-cols-3 gap-3">
            <input
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              placeholder="اسم القالب (بالإنجليزية، بدون مسافات)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <select
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as TemplateCategory })}
            >
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              placeholder="كود اللغة (ar, en)"
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
            />
          </div>
          <textarea
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
            placeholder="نص الرسالة — استخدم {{1}}, {{2}} لأماكن المتغيرات"
            dir="rtl"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
          <p className="text-xs text-gray-400">عدد المتغيرات المكتشفة: {countPlaceholders(form.body)}</p>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={saving || !form.name || !form.body}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              حفظ
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

      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-right dark:bg-gray-900">
            <tr>
              <th className="p-3 font-medium">الاسم</th>
              <th className="p-3 font-medium">الفئة</th>
              <th className="p-3 font-medium">اللغة</th>
              <th className="p-3 font-medium">النص</th>
              <th className="p-3 font-medium">الحالة</th>
              <th className="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="p-3 font-medium">{t.name}</td>
                <td className="p-3 text-gray-500">{CATEGORY_LABELS[t.category]}</td>
                <td className="p-3 text-gray-500">{t.language}</td>
                <td className="max-w-xs truncate p-3 text-gray-500">{t.body}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[t.status]}`}>
                    {STATUS_LABELS[t.status]}
                  </span>
                </td>
                <td className="p-3">
                  {t.status === 'pending' && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleForceStatus(t.id, 'approved')}
                        className="rounded-lg border border-emerald-300 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950"
                      >
                        اعتماد
                      </button>
                      <button
                        onClick={() => handleForceStatus(t.id, 'rejected')}
                        className="rounded-lg border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950"
                      >
                        رفض
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {templates.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-400">
                  لا توجد قوالب بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
