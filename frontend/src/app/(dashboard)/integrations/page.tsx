'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { integrationsService } from '@/services/integrations';
import { Integration, IntegrationType } from '@/types/integrations';

const TYPE_LABELS: Record<IntegrationType, string> = {
  odoo: 'Odoo',
  oracle_apex: 'Oracle APEX / ORDS',
  his: 'نظام معلومات المستشفى (HIS)',
  custom: 'مخصص (HTTP عام)',
};

function parseEndpoints(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const [action, path] = line.split(':').map((s) => s.trim());
    if (action && path) result[action] = path;
  }
  return result;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: 'custom' as IntegrationType,
    name: '',
    baseUrl: '',
    secretRef: '',
    database: '',
    username: '',
    ordsSchema: '',
    endpointsText: '',
  });

  const [testResults, setTestResults] = useState<Record<string, unknown>>({});
  const [testAction, setTestAction] = useState<Record<string, string>>({});

  function load() {
    integrationsService.list().then(setIntegrations);
  }

  useEffect(load, []);

  async function handleCreate() {
    if (!form.name || !form.baseUrl) return;
    setSaving(true);
    try {
      await integrationsService.create(form.type, form.name, {
        baseUrl: form.baseUrl,
        secretRef: form.secretRef || undefined,
        database: form.database || undefined,
        username: form.username || undefined,
        ordsSchema: form.ordsSchema || undefined,
        endpoints: parseEndpoints(form.endpointsText),
      });
      setForm({ ...form, name: '', baseUrl: '', secretRef: '', database: '', username: '', ordsSchema: '', endpointsText: '' });
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(integration: Integration) {
    await integrationsService.update(integration.id, {
      status: integration.status === 'active' ? 'inactive' : 'active',
    });
    load();
  }

  async function handleTest(id: string) {
    const action = testAction[id] || Object.keys(integrations.find((i) => i.id === id)?.config.endpoints ?? {})[0];
    if (!action) return;
    const result = await integrationsService.testConnection(id, action);
    setTestResults((prev) => ({ ...prev, [id]: result }));
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">تكاملات الأنظمة الخارجية</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={16} />
          تكامل جديد
        </button>
      </div>

      {showForm && (
        <div className="mb-6 space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <div className="grid grid-cols-3 gap-3">
            <select
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as IntegrationType })}
            >
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input
              className="col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              placeholder="اسم التكامل"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <input
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
            placeholder="Base URL (https://...)"
            value={form.baseUrl}
            onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
          />
          <div className="grid grid-cols-3 gap-3">
            <input
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              placeholder="اسم متغير البيئة للسر (secretRef)"
              value={form.secretRef}
              onChange={(e) => setForm({ ...form, secretRef: e.target.value })}
            />
            {form.type === 'odoo' && (
              <input
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
                placeholder="Database (Odoo)"
                value={form.database}
                onChange={(e) => setForm({ ...form, database: e.target.value })}
              />
            )}
            {(form.type === 'odoo' || form.type === 'oracle_apex') && (
              <input
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
                placeholder="Username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            )}
            {form.type === 'oracle_apex' && (
              <input
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
                placeholder="ORDS Schema"
                value={form.ordsSchema}
                onChange={(e) => setForm({ ...form, ordsSchema: e.target.value })}
              />
            )}
          </div>
          <label className="block text-sm">
            ربط الإجراءات بالمسارات — سطر لكل إجراء بصيغة{' '}
            <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">action: path</code>
            <textarea
              rows={3}
              dir="ltr"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              placeholder={
                form.type === 'odoo'
                  ? 'checkAppointment: calendar.event.search_read'
                  : 'checkAppointment: /appointments/check'
              }
              value={form.endpointsText}
              onChange={(e) => setForm({ ...form, endpointsText: e.target.value })}
            />
          </label>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={saving || !form.name || !form.baseUrl}
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

      <div className="space-y-4">
        {integrations.map((integration) => (
          <div key={integration.id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <span className="font-semibold">{integration.name}</span>
                <span className="mr-2 text-xs text-gray-500">({TYPE_LABELS[integration.type]})</span>
              </div>
              <button
                onClick={() => handleToggleStatus(integration)}
                className={`rounded-full px-2 py-0.5 text-xs ${
                  integration.status === 'active'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                {integration.status === 'active' ? 'مفعّل' : 'معطّل'}
              </button>
            </div>
            <div className="mb-2 text-xs text-gray-500" dir="ltr">
              {integration.config.baseUrl}
            </div>
            <div className="flex items-center gap-2">
              <input
                className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-950"
                placeholder="اسم الإجراء للاختبار"
                dir="ltr"
                value={testAction[integration.id] ?? ''}
                onChange={(e) => setTestAction((prev) => ({ ...prev, [integration.id]: e.target.value }))}
              />
              <button
                onClick={() => handleTest(integration.id)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900"
              >
                اختبار الاتصال
              </button>
            </div>
            {testResults[integration.id] !== undefined ? (
              <pre className="mt-2 overflow-x-auto rounded-lg bg-gray-50 p-2 text-xs dark:bg-gray-950" dir="ltr">
                {JSON.stringify(testResults[integration.id], null, 2)}
              </pre>
            ) : null}
          </div>
        ))}
        {integrations.length === 0 && <p className="p-6 text-center text-gray-400">لا توجد تكاملات بعد</p>}
      </div>
    </div>
  );
}
