'use client';
import { useEffect, useState } from 'react';
import { Search, Plus, FileText, Edit2, Trash2, X, Tag, Copy } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { templatesApi } from '@/services/api';
import { Template } from '@/types';
import toast from 'react-hot-toast';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);

  useEffect(() => {
    loadData();
  }, [search, category]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [templatesRes, catsRes] = await Promise.all([
        templatesApi.list({ search, category }),
        templatesApi.categories(),
      ]);
      setTemplates(templatesRes.data);
      setCategories(catsRes);
    } catch {}
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل تريد حذف هذا القالب؟')) return;
    try {
      await templatesApi.delete(id);
      toast.success('تم حذف القالب');
      loadData();
    } catch { toast.error('فشل الحذف'); }
  };

  const copyTemplate = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('تم نسخ القالب');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="قوالب الردود" subtitle={`${templates.length} قالب`} />

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث في القوالب..."
              className="w-full pr-9 pl-4 py-2.5 bg-white dark:bg-[#1f2c33] border border-gray-200 dark:border-[#2a3942] rounded-xl outline-none focus:ring-2 focus:ring-[#25D366] text-sm dark:text-white"
            />
          </div>

          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setCategory('')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!category ? 'bg-[#25D366] text-white' : 'bg-white dark:bg-[#1f2c33] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#2a3942]'}`}
            >
              الكل
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${category === cat ? 'bg-[#25D366] text-white' : 'bg-white dark:bg-[#1f2c33] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#2a3942]'}`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            onClick={() => { setEditing(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#25D366] text-white rounded-xl text-sm font-medium hover:bg-[#20ba5a] transition-colors"
          >
            <Plus className="w-4 h-4" />
            قالب جديد
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#25D366] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map(template => (
              <div key={template.id} className="bg-white dark:bg-[#1f2c33] rounded-xl border border-gray-100 dark:border-[#2a3942] p-4 hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#25D366]/10 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-[#25D366]" />
                    </div>
                    <h3 className="text-sm font-medium dark:text-white">{template.name}</h3>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => copyTemplate(template.content)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#2a3942] rounded-lg">
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                    <button onClick={() => { setEditing(template); setShowModal(true); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#2a3942] rounded-lg">
                      <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                    <button onClick={() => handleDelete(template.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed">
                  {template.content}
                </p>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-[#2a3942]">
                  {template.category && (
                    <span className="flex items-center gap-1 text-[10px] text-[#25D366] bg-[#25D366]/10 px-2 py-0.5 rounded-full">
                      <Tag className="w-2.5 h-2.5" />
                      {template.category}
                    </span>
                  )}
                  <span className="text-[10px] text-gray-400 ms-auto">استُخدم {template.usageCount} مرة</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {templates.length === 0 && !loading && (
          <div className="text-center py-20 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد قوالب</p>
          </div>
        )}
      </div>

      {showModal && (
        <TemplateModal
          template={editing}
          onClose={() => setShowModal(false)}
          onSaved={loadData}
        />
      )}
    </div>
  );
}

function TemplateModal({ template, onClose, onSaved }: {
  template: Template | null; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: template?.name || '',
    content: template?.content || '',
    category: template?.category || '',
    isShared: template?.isShared ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (template) {
        await templatesApi.update(template.id, form);
        toast.success('تم تحديث القالب');
      } else {
        await templatesApi.create(form);
        toast.success('تم إنشاء القالب');
      }
      onSaved();
      onClose();
    } catch { toast.error('حدث خطأ'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#1f2c33] rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#2a3942]">
          <h2 className="font-semibold dark:text-white">{template ? 'تعديل القالب' : 'قالب جديد'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-[#2a3942] rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">اسم القالب *</label>
            <input
              type="text" required value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="مثال: رد الترحيب"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111b21] border border-gray-200 dark:border-[#2a3942] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#25D366] dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">محتوى القالب *</label>
            <textarea
              required value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="أكتب نص الرد هنا..."
              rows={5}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111b21] border border-gray-200 dark:border-[#2a3942] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#25D366] dark:text-white resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">التصنيف</label>
              <input
                type="text" value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                placeholder="مثال: ترحيب"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111b21] border border-gray-200 dark:border-[#2a3942] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#25D366] dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox" id="isShared" checked={form.isShared}
                onChange={e => setForm(f => ({ ...f, isShared: e.target.checked }))}
                className="w-4 h-4 accent-[#25D366]"
              />
              <label htmlFor="isShared" className="text-sm dark:text-gray-300">مشترك مع الفريق</label>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-300 dark:border-[#2a3942] rounded-lg text-sm dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a3942]">
              إلغاء
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-[#25D366] text-white rounded-lg text-sm font-medium hover:bg-[#20ba5a] disabled:opacity-60">
              {saving ? 'جاري الحفظ...' : (template ? 'تحديث' : 'إنشاء')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
