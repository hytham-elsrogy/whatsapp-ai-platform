'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Settings } from 'lucide-react';
import { ticketsService, slaPoliciesService } from '@/services/tickets';
import { customersService } from '@/services/customers';
import { departmentsService } from '@/services/departments';
import { Ticket, SlaPolicy, CreateTicketInput } from '@/types/tickets';
import { Customer } from '@/types/customers';
import { Department } from '@/types/departments';

const STATUS_LABELS: Record<string, string> = {
  open: 'مفتوحة',
  pending: 'قيد الانتظار',
  resolved: 'محلولة',
  closed: 'مغلقة',
};

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  closed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'منخفضة',
  normal: 'عادية',
  high: 'عالية',
  urgent: 'عاجلة',
};

export default function TicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [policies, setPolicies] = useState<SlaPolicy[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showPolicies, setShowPolicies] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateTicketInput>({ customerId: '', description: '', priority: 'normal' });
  const [policyForm, setPolicyForm] = useState({
    name: '',
    departmentId: '',
    category: '',
    firstResponseMinutes: 60,
    resolutionMinutes: 480,
  });

  function load() {
    ticketsService.list().then(setTickets);
    customersService.list().then(setCustomers);
    departmentsService.list().then(setDepartments);
    slaPoliciesService.list().then(setPolicies);
  }

  useEffect(load, []);

  async function handleCreateTicket() {
    if (!form.customerId || !form.description) return;
    setSaving(true);
    try {
      await ticketsService.create(form);
      setForm({ customerId: '', description: '', priority: 'normal' });
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleCreatePolicy() {
    if (!policyForm.name) return;
    setSaving(true);
    try {
      await slaPoliciesService.create({
        name: policyForm.name,
        departmentId: policyForm.departmentId || null,
        category: policyForm.category || null,
        firstResponseMinutes: Number(policyForm.firstResponseMinutes),
        resolutionMinutes: Number(policyForm.resolutionMinutes),
      });
      setPolicyForm({ name: '', departmentId: '', category: '', firstResponseMinutes: 60, resolutionMinutes: 480 });
      load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">التذاكر</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPolicies((v) => !v)}
            className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
          >
            <Settings size={16} />
            سياسات SLA
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus size={16} />
            تذكرة جديدة
          </button>
        </div>
      </div>

      {showPolicies && (
        <div className="mb-6 space-y-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <h2 className="font-semibold">سياسات SLA</h2>
          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-right dark:bg-gray-900">
                <tr>
                  <th className="p-2 font-medium">الاسم</th>
                  <th className="p-2 font-medium">القسم</th>
                  <th className="p-2 font-medium">الفئة</th>
                  <th className="p-2 font-medium">أول رد (دقيقة)</th>
                  <th className="p-2 font-medium">الحل (دقيقة)</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((p) => (
                  <tr key={p.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="p-2">{p.name}</td>
                    <td className="p-2 text-gray-500">
                      {departments.find((d) => d.id === p.departmentId)?.name ?? 'الكل'}
                    </td>
                    <td className="p-2 text-gray-500">{p.category ?? 'الكل'}</td>
                    <td className="p-2 text-gray-500">{p.firstResponseMinutes}</td>
                    <td className="p-2 text-gray-500">{p.resolutionMinutes}</td>
                  </tr>
                ))}
                {policies.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-gray-400">
                      لا توجد سياسات بعد
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-5 gap-2">
            <input
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-950"
              placeholder="اسم السياسة"
              value={policyForm.name}
              onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
            />
            <select
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-950"
              value={policyForm.departmentId}
              onChange={(e) => setPolicyForm({ ...policyForm, departmentId: e.target.value })}
            >
              <option value="">كل الأقسام</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <input
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-950"
              placeholder="الفئة (اختياري)"
              value={policyForm.category}
              onChange={(e) => setPolicyForm({ ...policyForm, category: e.target.value })}
            />
            <input
              type="number"
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-950"
              placeholder="أول رد (دقيقة)"
              value={policyForm.firstResponseMinutes}
              onChange={(e) => setPolicyForm({ ...policyForm, firstResponseMinutes: Number(e.target.value) })}
            />
            <input
              type="number"
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-950"
              placeholder="الحل (دقيقة)"
              value={policyForm.resolutionMinutes}
              onChange={(e) => setPolicyForm({ ...policyForm, resolutionMinutes: Number(e.target.value) })}
            />
          </div>
          <button
            onClick={handleCreatePolicy}
            disabled={saving || !policyForm.name}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            حفظ السياسة
          </button>
        </div>
      )}

      {showForm && (
        <div className="mb-6 space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <div className="grid grid-cols-3 gap-3">
            <select
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
            >
              <option value="">اختر العميل</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.whatsappNumber}
                </option>
              ))}
            </select>
            <select
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              value={form.departmentId ?? ''}
              onChange={(e) => setForm({ ...form, departmentId: e.target.value || undefined })}
            >
              <option value="">بدون قسم</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value as CreateTicketInput['priority'] })}
            >
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <input
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
            placeholder="الفئة (اختياري)"
            value={form.category ?? ''}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <textarea
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
            placeholder="وصف المشكلة..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreateTicket}
              disabled={saving || !form.customerId || !form.description}
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
              <th className="p-3 font-medium">الرقم</th>
              <th className="p-3 font-medium">الأولوية</th>
              <th className="p-3 font-medium">الفئة</th>
              <th className="p-3 font-medium">الحالة</th>
              <th className="p-3 font-medium">الموعد النهائي</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr
                key={t.id}
                onClick={() => router.push(`/tickets/${t.id}`)}
                className="cursor-pointer border-t border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
              >
                <td className="p-3 font-medium">{t.ticketNumber}</td>
                <td className="p-3 text-gray-500">{PRIORITY_LABELS[t.priority]}</td>
                <td className="p-3 text-gray-500">{t.category ?? '—'}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[t.status]}`}>
                    {STATUS_LABELS[t.status]}
                  </span>
                </td>
                <td className="p-3 text-gray-500">{t.dueAt ? new Date(t.dueAt).toLocaleString('ar-EG') : '—'}</td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-400">
                  لا توجد تذاكر بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
