'use client';
import { useEffect, useState } from 'react';
import { Save, Plus, Trash2, X, AlertCircle } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { settingsApi, departmentsApi, authApi } from '@/services/api';
import { Department } from '@/types';
import toast from 'react-hot-toast';

const settingGroups = [
  { key: 'general', label: 'عام' },
  { key: 'working_hours', label: 'ساعات العمل' },
  { key: 'messages', label: 'الرسائل التلقائية' },
  { key: 'automation', label: 'الأتمتة' },
  { key: 'sla', label: 'مستوى الخدمة (SLA)' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<any[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [showDeptModal, setShowDeptModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, d] = await Promise.all([
        settingsApi.get(),
        departmentsApi.list(true),
      ]);
      setSettings(s);
      setDepartments(d);
    } catch {}
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (Object.keys(editedValues).length === 0) {
      toast('لا يوجد تغييرات للحفظ');
      return;
    }
    setSaving(true);
    try {
      await settingsApi.update(editedValues);
      toast.success('تم حفظ الإعدادات');
      setEditedValues({});
      loadData();
    } catch {
      toast.error('فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const groupSettings = settings.filter(s => s.group === activeTab);

  const getValue = (setting: any) => {
    return editedValues[setting.key] !== undefined ? editedValues[setting.key] : (setting.value || '');
  };

  const handleChange = (key: string, value: string) => {
    setEditedValues(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="إعدادات النظام" />

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex gap-4 flex-col lg:flex-row">
          <div className="lg:w-48 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible">
            {settingGroups.map(group => (
              <button
                key={group.key}
                onClick={() => setActiveTab(group.key)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap text-right ${activeTab === group.key ? 'bg-[#25D366] text-white' : 'bg-white dark:bg-[#1f2c33] text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a3942]'}`}
              >
                {group.label}
              </button>
            ))}

            <button
              onClick={() => setActiveTab('departments')}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap text-right ${activeTab === 'departments' ? 'bg-[#25D366] text-white' : 'bg-white dark:bg-[#1f2c33] text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a3942]'}`}
            >
              الأقسام
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap text-right ${activeTab === 'security' ? 'bg-[#25D366] text-white' : 'bg-white dark:bg-[#1f2c33] text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a3942]'}`}
            >
              الأمان
            </button>
          </div>

          <div className="flex-1">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-2 border-[#25D366] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : activeTab === 'departments' ? (
              <DepartmentsSettings
                departments={departments}
                onRefresh={loadData}
              />
            ) : activeTab === 'security' ? (
              <SecuritySettings />
            ) : (
              <div className="bg-white dark:bg-[#1f2c33] rounded-xl border border-gray-100 dark:border-[#2a3942] p-6 space-y-4">
                {groupSettings.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">لا توجد إعدادات في هذا القسم</p>
                ) : (
                  groupSettings.map(setting => (
                    <div key={setting.key}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {setting.description || setting.key}
                      </label>
                      {setting.type === 'boolean' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={getValue(setting) === 'true'}
                            onChange={e => handleChange(setting.key, e.target.checked ? 'true' : 'false')}
                            className="w-4 h-4 accent-[#25D366]"
                          />
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {getValue(setting) === 'true' ? 'مفعّل' : 'معطّل'}
                          </span>
                        </div>
                      ) : setting.type === 'number' ? (
                        <input
                          type="number"
                          value={getValue(setting)}
                          onChange={e => handleChange(setting.key, e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111b21] border border-gray-200 dark:border-[#2a3942] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#25D366] dark:text-white max-w-xs"
                        />
                      ) : setting.key.includes('message') || setting.key.includes('away') ? (
                        <textarea
                          value={getValue(setting)}
                          onChange={e => handleChange(setting.key, e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111b21] border border-gray-200 dark:border-[#2a3942] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#25D366] dark:text-white resize-none"
                        />
                      ) : (
                        <input
                          type="text"
                          value={getValue(setting)}
                          onChange={e => handleChange(setting.key, e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111b21] border border-gray-200 dark:border-[#2a3942] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#25D366] dark:text-white"
                        />
                      )}
                    </div>
                  ))
                )}

                {Object.keys(editedValues).length > 0 && (
                  <div className="pt-4 border-t border-gray-100 dark:border-[#2a3942] flex gap-2">
                    <button
                      onClick={() => setEditedValues({})}
                      className="px-4 py-2 border border-gray-300 dark:border-[#2a3942] rounded-lg text-sm dark:text-gray-300"
                    >
                      إلغاء التغييرات
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-lg text-sm font-medium hover:bg-[#20ba5a] disabled:opacity-60"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DepartmentsSettings({ departments, onRefresh }: {
  departments: Department[]; onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', color: '#25D366' });
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await departmentsApi.create(form);
      toast.success('تم إنشاء القسم');
      setForm({ name: '', description: '', color: '#25D366' });
      setShowForm(false);
      onRefresh();
    } catch { toast.error('حدث خطأ'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل تريد تعطيل هذا القسم؟')) return;
    try {
      await departmentsApi.delete(id);
      toast.success('تم تعطيل القسم');
      onRefresh();
    } catch { toast.error('حدث خطأ'); }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold dark:text-white">الأقسام ({departments.length})</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] text-white rounded-lg text-sm"
        >
          <Plus className="w-4 h-4" />
          قسم جديد
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-[#1f2c33] rounded-xl border border-gray-100 dark:border-[#2a3942] p-4 space-y-3">
          <input type="text" required placeholder="اسم القسم *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111b21] border border-gray-200 dark:border-[#2a3942] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#25D366] dark:text-white" />
          <input type="text" placeholder="الوصف (اختياري)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111b21] border border-gray-200 dark:border-[#2a3942] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#25D366] dark:text-white" />
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 border border-gray-200 dark:border-[#2a3942] rounded-lg text-sm dark:text-gray-300">إلغاء</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-[#25D366] text-white rounded-lg text-sm font-medium">{saving ? 'جاري...' : 'إنشاء'}</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {departments.map(dept => (
          <div key={dept.id} className="bg-white dark:bg-[#1f2c33] rounded-xl border border-gray-100 dark:border-[#2a3942] p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color || '#25D366' }} />
              <div>
                <p className="text-sm font-medium dark:text-white">{dept.name}</p>
                {dept.description && <p className="text-xs text-gray-400">{dept.description}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`status-badge ${dept.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {dept.isActive ? 'نشط' : 'معطل'}
              </span>
              <button onClick={() => handleDelete(dept.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SecuritySettings() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) {
      toast.error('كلمتا المرور غير متطابقتين');
      return;
    }
    setSaving(true);
    try {
      await authApi.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success('تم تغيير كلمة المرور');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch { toast.error('حدث خطأ'); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-white dark:bg-[#1f2c33] rounded-xl border border-gray-100 dark:border-[#2a3942] p-6">
      <h3 className="font-semibold dark:text-white mb-4">تغيير كلمة المرور</h3>
      <form onSubmit={handleChangePassword} className="space-y-3 max-w-sm">
        {[
          { key: 'currentPassword', label: 'كلمة المرور الحالية' },
          { key: 'newPassword', label: 'كلمة المرور الجديدة' },
          { key: 'confirm', label: 'تأكيد كلمة المرور' },
        ].map(field => (
          <div key={field.key}>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">{field.label}</label>
            <input
              type="password" required
              value={(form as any)[field.key]}
              onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111b21] border border-gray-200 dark:border-[#2a3942] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#25D366] dark:text-white"
              dir="ltr"
            />
          </div>
        ))}
        <button type="submit" disabled={saving} className="px-6 py-2 bg-[#25D366] text-white rounded-lg text-sm font-medium hover:bg-[#20ba5a] disabled:opacity-60">
          {saving ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-gray-100 dark:border-[#2a3942]">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
          <AlertCircle className="w-4 h-4" />
          <h3 className="font-semibold text-sm">المصادقة الثنائية (2FA)</h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          قم بتفعيل المصادقة الثنائية لزيادة أمان حسابك
        </p>
        <button className="px-4 py-2 border border-amber-500 text-amber-600 dark:text-amber-400 rounded-lg text-sm hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
          إعداد المصادقة الثنائية
        </button>
      </div>
    </div>
  );
}
