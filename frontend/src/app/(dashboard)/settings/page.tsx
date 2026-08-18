'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Plus, Smartphone, X } from 'lucide-react';
import { whatsappNumbersService } from '@/services/whatsapp-numbers';
import { departmentsService } from '@/services/departments';
import { chatbotService } from '@/services/chatbot';
import { aiAgentsService } from '@/services/ai-agents';
import { WhatsappNumber, CreateWhatsappNumberInput } from '@/types/whatsapp-numbers';
import { Department } from '@/types/departments';
import { ChatbotFlowSummary } from '@/types/chatbot';
import { AiAgent } from '@/types/ai-agents';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const EMPTY_FORM: CreateWhatsappNumberInput = {
  phoneNumberId: '',
  wabaId: '',
  displayNumber: '',
  label: '',
  accessTokenSecretRef: '',
};

// Same `??` reasoning as lib/api.ts: NEXT_PUBLIC_API_URL is an absolute
// backend URL in local dev (frontend/backend run on different ports, no
// nginx unifying them) and deliberately empty in production (nginx proxies
// both under one origin) — window.location.origin is only correct in the
// second case.
function WebhookSetupCard() {
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? origin;
  const webhookUrl = apiBase ? `${apiBase}/api/v1/webhooks/whatsapp` : '';

  return (
    <Card className="mb-6 p-4">
      <div className="mb-2 text-sm font-semibold">إعداد الـ Webhook في Meta App Dashboard</div>
      <p className="mb-3 text-xs text-gray-500">
        في صفحة منتج WhatsApp بالتطبيق على developers.facebook.com، حط القيم دي في إعدادات الـ Webhook:
      </p>
      <div className="space-y-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-gray-500">Callback URL:</span>
          <code className="rounded bg-gray-100 px-2 py-1 dark:bg-gray-800">{webhookUrl || '...'}</code>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-gray-500">Verify Token:</span>
          <span>القيمة اللي حاطها في <code className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">META_VERIFY_TOKEN</code> في <code className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">backend/.env</code></span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-gray-500">الحقول المطلوب الاشتراك فيها:</span>
          <code className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">messages</code>
        </div>
      </div>
    </Card>
  );
}

export default function SettingsPage() {
  const [numbers, setNumbers] = useState<WhatsappNumber[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [flows, setFlows] = useState<ChatbotFlowSummary[]>([]);
  const [aiAgents, setAiAgents] = useState<AiAgent[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateWhatsappNumberInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    whatsappNumbersService.list().then(setNumbers);
    departmentsService.list().then(setDepartments);
    chatbotService.listFlows().then(setFlows);
    aiAgentsService.list().then(setAiAgents);
  }

  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await whatsappNumbersService.create(form);
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل إضافة الرقم');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string, patch: Partial<WhatsappNumber>) {
    setNumbers((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
    await whatsappNumbersService.update(id, patch);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">إعدادات أرقام واتساب</h1>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'إلغاء' : 'رقم واتساب جديد'}
        </Button>
      </div>

      <WebhookSetupCard />

      {showForm && (
        <Card className="mb-6 p-4">
          <form onSubmit={handleCreate} className="space-y-3">
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm">
                الاسم التعريفي (Label)
                <input
                  required
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="مثال: خط الاستقبال الرئيسي"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                />
              </label>
              <label className="text-sm">
                رقم الهاتف المعروض
                <input
                  required
                  value={form.displayNumber}
                  onChange={(e) => setForm((f) => ({ ...f, displayNumber: e.target.value }))}
                  placeholder="+201234567890"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                />
              </label>
              <label className="text-sm">
                Phone Number ID (من Meta)
                <input
                  required
                  value={form.phoneNumberId}
                  onChange={(e) => setForm((f) => ({ ...f, phoneNumberId: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                />
              </label>
              <label className="text-sm">
                WABA ID (من Meta)
                <input
                  required
                  value={form.wabaId}
                  onChange={(e) => setForm((f) => ({ ...f, wabaId: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                />
              </label>
              <label className="text-sm sm:col-span-2">
                اسم متغيّر التوكن في backend/.env (وليس التوكن نفسه)
                <input
                  required
                  value={form.accessTokenSecretRef}
                  onChange={(e) => setForm((f) => ({ ...f, accessTokenSecretRef: e.target.value }))}
                  placeholder="مثال: META_ACCESS_TOKEN أو WHATSAPP_TOKEN_MAIN_LINE"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                />
                <span className="mt-1 block text-xs text-gray-400">
                  لازم يبقى فيه متغيّر بنفس الاسم ده في backend/.env وقيمته التوكن الحقيقي من Meta.
                </span>
              </label>
              <label className="text-sm">
                القسم (اختياري)
                <select
                  value={form.departmentId ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value || undefined }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                >
                  <option value="">بدون</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? 'جارٍ الحفظ...' : 'حفظ الرقم'}
            </Button>
          </form>
        </Card>
      )}

      <div className="space-y-3">
        {numbers.map((n) => (
          <Card key={n.id} className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Smartphone size={18} />
                </div>
                <div>
                  <div className="font-semibold">{n.label}</div>
                  <div className="text-xs text-gray-500">{n.displayNumber} — phone_number_id: {n.phoneNumberId}</div>
                </div>
              </div>
              <select
                value={n.status}
                onChange={(e) => handleUpdate(n.id, { status: e.target.value as WhatsappNumber['status'] })}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  n.status === 'active'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                }`}
              >
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <label className="text-sm">
                القسم
                <select
                  value={n.departmentId ?? ''}
                  onChange={(e) => handleUpdate(n.id, { departmentId: e.target.value || undefined })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-950"
                >
                  <option value="">بدون</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                الشات بوت
                <select
                  value={n.chatbotFlowId ?? ''}
                  onChange={(e) => handleUpdate(n.id, { chatbotFlowId: e.target.value || undefined })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-950"
                >
                  <option value="">بدون</option>
                  {flows.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                وكيل الذكاء الاصطناعي
                <select
                  value={n.aiAgentId ?? ''}
                  onChange={(e) => handleUpdate(n.id, { aiAgentId: e.target.value || undefined })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-950"
                >
                  <option value="">بدون</option>
                  {aiAgents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </label>
            </div>
          </Card>
        ))}
        {numbers.length === 0 && (
          <Card className="p-8 text-center text-sm text-gray-400">
            لا يوجد أي رقم واتساب مضاف بعد — ابدأ بإضافة رقم جديد.
          </Card>
        )}
      </div>
    </div>
  );
}
