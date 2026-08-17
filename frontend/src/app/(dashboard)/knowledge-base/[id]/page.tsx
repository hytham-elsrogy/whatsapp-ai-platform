'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { knowledgeBaseService } from '@/services/knowledge-base';
import { KbDocument, KnowledgeBase } from '@/types/knowledge-base';

const STATUS_LABELS: Record<string, string> = {
  processing: 'قيد المعالجة',
  ready: 'جاهز',
  failed: 'فشل',
};

const STATUS_STYLES: Record<string, string> = {
  processing: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  ready: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  failed: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  faq: 'FAQ',
  manual: 'نص عام',
  policy: 'سياسة',
  url: 'رابط ويب',
  pdf: 'PDF',
};

export default function KnowledgeBaseDetailPage() {
  const params = useParams<{ id: string }>();
  const kbId = params.id;

  const [kb, setKb] = useState<KnowledgeBase | null>(null);
  const [documents, setDocuments] = useState<KbDocument[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [sourceType, setSourceType] = useState<'manual' | 'faq' | 'url' | 'pdf'>('faq');
  const [content, setContent] = useState('');
  const [sourceUri, setSourceUri] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    knowledgeBaseService.get(kbId).then(setKb);
    knowledgeBaseService.listDocuments(kbId).then(setDocuments);
  }

  useEffect(load, [kbId]);

  function resetForm() {
    setTitle('');
    setContent('');
    setSourceUri('');
    setPdfFile(null);
    setShowForm(false);
    setError(null);
  }

  async function handleSave() {
    if (!title) return;
    setSaving(true);
    setError(null);
    try {
      if (sourceType === 'url') {
        if (!sourceUri) return;
        await knowledgeBaseService.createDocumentFromUrl(kbId, title, sourceUri);
      } else if (sourceType === 'pdf') {
        if (!pdfFile) return;
        await knowledgeBaseService.uploadPdf(kbId, title, pdfFile);
      } else {
        if (!content) return;
        await knowledgeBaseService.createDocument(kbId, title, sourceType, content);
      }
      resetForm();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل حفظ المستند');
    } finally {
      setSaving(false);
    }
  }

  const canSave =
    Boolean(title) &&
    ((sourceType === 'url' && Boolean(sourceUri)) ||
      (sourceType === 'pdf' && Boolean(pdfFile)) ||
      ((sourceType === 'manual' || sourceType === 'faq') && Boolean(content)));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{kb?.name ?? '...'}</h1>
          <p className="text-sm text-gray-500">المستندات وقطع النص المُضمَّنة (chunks) في قاعدة المعرفة هذه</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={16} />
          مستند جديد
        </button>
      </div>

      {showForm && (
        <div className="mb-6 space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <div className="grid grid-cols-3 gap-3">
            <input
              className="col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              placeholder="عنوان المستند"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <select
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as 'manual' | 'faq' | 'url' | 'pdf')}
            >
              <option value="faq">FAQ</option>
              <option value="manual">نص عام</option>
              <option value="url">رابط ويب (URL)</option>
              <option value="pdf">ملف PDF</option>
            </select>
          </div>

          {(sourceType === 'manual' || sourceType === 'faq') && (
            <textarea
              rows={6}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              placeholder="الصق نص المستند هنا..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          )}

          {sourceType === 'url' && (
            <input
              dir="ltr"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              placeholder="https://example.com/faq"
              value={sourceUri}
              onChange={(e) => setSourceUri(e.target.value)}
            />
          )}

          {sourceType === 'pdf' && (
            <input
              type="file"
              accept="application/pdf"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
            />
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !canSave}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'جارٍ الحفظ والفهرسة...' : 'حفظ'}
            </button>
            <button
              onClick={resetForm}
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
              <th className="p-3 font-medium">العنوان</th>
              <th className="p-3 font-medium">النوع</th>
              <th className="p-3 font-medium">الحالة</th>
              <th className="p-3 font-medium">تاريخ الإضافة</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((d) => (
              <tr key={d.id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="p-3 font-medium">{d.title}</td>
                <td className="p-3 text-gray-500">{SOURCE_TYPE_LABELS[d.sourceType] ?? d.sourceType}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[d.status]}`}>
                    {STATUS_LABELS[d.status]}
                  </span>
                </td>
                <td className="p-3 text-gray-500">{new Date(d.createdAt).toLocaleString('ar-EG')}</td>
              </tr>
            ))}
            {documents.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-gray-400">
                  لا توجد مستندات بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
