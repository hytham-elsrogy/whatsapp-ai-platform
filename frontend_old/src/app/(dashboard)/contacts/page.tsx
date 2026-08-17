'use client';
import { useEffect, useState } from 'react';
import { Search, Plus, Phone, Mail, Tag, MoreVertical, X, Edit2, Trash2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { contactsApi } from '@/services/api';
import { Contact } from '@/types';
import { formatRelativeTime, formatPhone } from '@/utils/format';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadContacts();
  }, [search, page]);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const response = await contactsApi.list({ search, page, limit: 20 });
      setContacts(response.data);
      setTotal(response.total);
    } catch {}
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف جهة الاتصال؟')) return;
    try {
      await contactsApi.delete(id);
      toast.success('تم حذف جهة الاتصال');
      loadContacts();
    } catch {
      toast.error('فشل الحذف');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="جهات الاتصال" subtitle={`${total} جهة اتصال`} />

      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="بحث بالاسم أو الهاتف أو البريد..."
                className="w-full pr-9 pl-4 py-2.5 bg-white dark:bg-[#1f2c33] border border-gray-200 dark:border-[#2a3942] rounded-xl outline-none focus:ring-2 focus:ring-[#25D366] text-sm dark:text-white"
              />
            </div>
            <button
              onClick={() => { setEditingContact(null); setShowModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#25D366] text-white rounded-xl text-sm font-medium hover:bg-[#20ba5a] transition-colors"
            >
              <Plus className="w-4 h-4" />
              إضافة جهة اتصال
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#25D366] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {contacts.map((contact) => (
                <div key={contact.id} className="bg-white dark:bg-[#1f2c33] rounded-xl p-4 border border-gray-100 dark:border-[#2a3942] hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center text-white font-semibold shrink-0">
                        {contact.avatarUrl ? (
                          <img src={contact.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          contact.name?.charAt(0)?.toUpperCase() || contact.phone.slice(-2)
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold dark:text-white">{contact.name || 'بدون اسم'}</h3>
                        <p className="text-xs text-gray-400" dir="ltr">{formatPhone(contact.phone)}</p>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <button
                        onClick={() => { setEditingContact(contact); setShowModal(true); }}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#2a3942] rounded-lg transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleDelete(contact.id)}
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    {contact.email && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <Mail className="w-3.5 h-3.5" />
                        <span className="truncate">{contact.email}</span>
                      </div>
                    )}
                    {contact.company && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <Tag className="w-3.5 h-3.5" />
                        <span>{contact.company}</span>
                      </div>
                    )}
                    {contact.tags && contact.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-2">
                        {contact.tags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="px-2 py-0.5 bg-[#25D366]/10 text-[#25D366] rounded-full text-[10px]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[#2a3942] flex items-center justify-between">
                    <span className="text-[10px] text-gray-400">
                      {contact.conversationCount} محادثة
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {contact.lastContactAt ? formatRelativeTime(contact.lastContactAt) : 'لا يوجد تواصل'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {contacts.length === 0 && !loading && (
            <div className="text-center py-20 text-gray-400">
              <Phone className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد جهات اتصال</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <ContactModal
          contact={editingContact}
          onClose={() => setShowModal(false)}
          onSaved={loadContacts}
        />
      )}
    </div>
  );
}

function ContactModal({ contact, onClose, onSaved }: {
  contact: Contact | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    phone: contact?.phone || '',
    name: contact?.name || '',
    email: contact?.email || '',
    company: contact?.company || '',
    notes: contact?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (contact) {
        await contactsApi.update(contact.id, form);
        toast.success('تم تحديث جهة الاتصال');
      } else {
        await contactsApi.create(form);
        toast.success('تمت إضافة جهة الاتصال');
      }
      onSaved();
      onClose();
    } catch {
      toast.error('حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#1f2c33] rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#2a3942]">
          <h2 className="font-semibold dark:text-white">{contact ? 'تعديل جهة الاتصال' : 'إضافة جهة اتصال'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-[#2a3942] rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {[
            { key: 'phone', label: 'رقم الهاتف *', placeholder: '966500000000', dir: 'ltr' as const, required: true },
            { key: 'name', label: 'الاسم', placeholder: 'اسم العميل' },
            { key: 'email', label: 'البريد الإلكتروني', placeholder: 'email@example.com', dir: 'ltr' as const },
            { key: 'company', label: 'الشركة', placeholder: 'اسم الشركة' },
          ].map(field => (
            <div key={field.key}>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">{field.label}</label>
              <input
                type="text"
                value={(form as any)[field.key]}
                onChange={(e) => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                required={field.required}
                dir={field.dir}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111b21] border border-gray-200 dark:border-[#2a3942] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#25D366] dark:text-white"
              />
            </div>
          ))}

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">ملاحظات</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="ملاحظات عن العميل..."
              rows={3}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111b21] border border-gray-200 dark:border-[#2a3942] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#25D366] dark:text-white resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 dark:border-[#2a3942] rounded-lg text-sm dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a3942] transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 bg-[#25D366] text-white rounded-lg text-sm font-medium hover:bg-[#20ba5a] transition-colors disabled:opacity-60"
            >
              {saving ? 'جاري الحفظ...' : (contact ? 'تحديث' : 'إضافة')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
