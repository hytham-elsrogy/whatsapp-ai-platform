'use client';

import { X, Plus, Trash2 } from 'lucide-react';
import { ChatbotNodeType } from '@/types/chatbot';
import { NODE_LABELS } from './node-palette';

interface Department {
  id: string;
  name: string;
}

interface Option {
  id: string;
  title: string;
}

interface Props {
  nodeType: ChatbotNodeType;
  config: Record<string, unknown>;
  departments: Department[];
  onChange: (config: Record<string, unknown>) => void;
  onDelete: () => void;
  onClose: () => void;
}

const NOT_IMPLEMENTED: ChatbotNodeType[] = ['ai', 'api_call', 'db_query'];

export function NodeConfigPanel({ nodeType, config, departments, onChange, onDelete, onClose }: Props) {
  function set(key: string, value: unknown) {
    onChange({ ...config, [key]: value });
  }

  const options = (config.buttons ?? config.items ?? []) as Option[];
  const optionsKey = nodeType === 'list' ? 'items' : 'buttons';

  function updateOption(index: number, patch: Partial<Option>) {
    const next = options.map((o, i) => (i === index ? { ...o, ...patch } : o));
    set(optionsKey, next);
  }

  function addOption() {
    set(optionsKey, [...options, { id: String(options.length + 1), title: '' }]);
  }

  function removeOption(index: number) {
    set(
      optionsKey,
      options.filter((_, i) => i !== index),
    );
  }

  return (
    <aside className="w-80 flex-shrink-0 overflow-y-auto border-r border-gray-200 p-4 dark:border-gray-800">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">{NODE_LABELS[nodeType]}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
          <X size={18} />
        </button>
      </div>

      <div className="space-y-4 text-sm">
        {(nodeType === 'message' || nodeType === 'question' || nodeType === 'button' || nodeType === 'list') && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">نص الرسالة</label>
            <textarea
              value={(config.text as string) ?? ''}
              onChange={(e) => set('text', e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
          </div>
        )}

        {(nodeType === 'question' || nodeType === 'button' || nodeType === 'list') && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              اسم المتغير (لحفظ رد العميل)
            </label>
            <input
              value={(config.variable as string) ?? ''}
              onChange={(e) => set('variable', e.target.value)}
              placeholder="مثال: customer_name"
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
          </div>
        )}

        {(nodeType === 'button' || nodeType === 'list') && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium text-gray-500">الخيارات</label>
              <button onClick={addOption} className="text-primary hover:opacity-80">
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-1.5">
              {options.map((o, i) => (
                <div key={i} className="flex gap-1.5">
                  <input
                    value={o.id}
                    onChange={(e) => updateOption(i, { id: e.target.value })}
                    placeholder="المعرّف"
                    className="w-14 rounded-lg border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
                  />
                  <input
                    value={o.title}
                    onChange={(e) => updateOption(i, { title: e.target.value })}
                    placeholder="العنوان"
                    className="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
                  />
                  <button onClick={() => removeOption(i)} className="text-red-500 hover:opacity-80">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-gray-400">
              اربط حواف بشرط &quot;يساوي&quot; بقيمة المعرّف لتفريع المسار حسب اختيار العميل.
            </p>
          </div>
        )}

        {nodeType === 'condition' && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">المتغيّر المطلوب فحصه</label>
            <input
              value={(config.variable as string) ?? ''}
              onChange={(e) => set('variable', e.target.value)}
              placeholder="مثال: choice"
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
          </div>
        )}

        {(nodeType === 'department' || nodeType === 'agent') && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">القسم</label>
            <select
              value={(config.departmentId as string) ?? ''}
              onChange={(e) => set('departmentId', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <option value="">اختر قسمًا</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {nodeType === 'delay' && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">المدة (ثانية)</label>
            <input
              type="number"
              value={(config.seconds as number) ?? 0}
              onChange={(e) => set('seconds', Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
            <p className="mt-1 text-[11px] text-gray-400">
              ستتوقف المحادثة فعليًا لهذه المدة قبل المتابعة (الحد الأقصى: 24 ساعة).
            </p>
          </div>
        )}

        {nodeType === 'tag' && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">اسم الوسم (Tag)</label>
            <input
              value={(config.tagName as string) ?? ''}
              onChange={(e) => set('tagName', e.target.value)}
              placeholder="مثال: شكوى"
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
            <p className="mt-1 text-[11px] text-gray-400">
              يُضاف هذا الوسم للمحادثة عند وصولها لهذه النقطة — يُستخدم أيضًا في التوجيه حسب المهارة.
            </p>
          </div>
        )}

        {NOT_IMPLEMENTED.includes(nodeType) && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            هذا النوع من العقد غير مُفعّل بعد في هذه المرحلة، وسيتم تخطيه أثناء التنفيذ.
          </p>
        )}

        {(nodeType === 'start' || nodeType === 'end') && (
          <p className="text-xs text-gray-400">لا يحتاج هذا العنصر إلى إعدادات.</p>
        )}
      </div>

      {nodeType !== 'start' && (
        <button
          onClick={onDelete}
          className="mt-6 flex w-full items-center justify-center gap-1 rounded-lg border border-red-200 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
        >
          <Trash2 size={14} />
          حذف العنصر
        </button>
      )}
    </aside>
  );
}
