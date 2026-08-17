'use client';
import { useEffect, useState } from 'react';
import { Search, Plus, Edit2, Power, Shield, X, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { usersApi, departmentsApi } from '@/services/api';
import { User, Department, UserRole, PermissionsConfig } from '@/types';
import { USER_ROLE_LABELS, formatRelativeTime } from '@/utils/format';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const roleColors: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  supervisor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  agent: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  observer: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [permissionsConfig, setPermissionsConfig] = useState<PermissionsConfig | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  useEffect(() => {
    loadData();
  }, [search]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, deptsRes, permsRes] = await Promise.all([
        usersApi.list({ search, limit: 50 }),
        departmentsApi.list(),
        usersApi.getPermissionsConfig(),
      ]);
      setUsers(usersRes.data);
      setTotal(usersRes.total);
      setDepartments(deptsRes);
      setPermissionsConfig(permsRes);
    } catch {}
    finally { setLoading(false); }
  };

  const toggleActive = async (user: User) => {
    try {
      await usersApi.update(user.id, { isActive: !user.isActive });
      toast.success(user.isActive ? 'تم تعطيل المستخدم' : 'تم تفعيل المستخدم');
      loadData();
    } catch { toast.error('حدث خطأ'); }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="إدارة المستخدمين" subtitle={`${total} مستخدم`} />

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو البريد..."
              className="w-full pr-9 pl-4 py-2.5 bg-white dark:bg-[#1f2c33] border border-gray-200 dark:border-[#2a3942] rounded-xl outline-none focus:ring-2 focus:ring-[#25D366] text-sm dark:text-white"
            />
          </div>
          <button
            onClick={() => { setEditing(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#25D366] text-white rounded-xl text-sm font-medium hover:bg-[#20ba5a] transition-colors"
          >
            <Plus className="w-4 h-4" />
            مستخدم جديد
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#25D366] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1f2c33] rounded-xl border border-gray-100 dark:border-[#2a3942] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#111b21] border-b border-gray-100 dark:border-[#2a3942]">
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">المستخدم</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">الدور</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">القسم</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">الصلاحيات</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">الحالة</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-50 dark:border-[#2a3942]/50 hover:bg-gray-50 dark:hover:bg-[#202c33] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center text-white font-semibold text-sm">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : user.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div className={clsx('absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#1f2c33]', user.isOnline ? 'bg-green-500' : 'bg-gray-400')} />
                        </div>
                        <div>
                          <p className="text-sm font-medium dark:text-white">{user.name}</p>
                          <p className="text-xs text-gray-400" dir="ltr">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={clsx('status-badge', roleColors[user.role])}>
                        {USER_ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center hidden md:table-cell">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {user.department?.name || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center hidden lg:table-cell">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {user.permissions?.length || 0} صلاحية
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={clsx('status-badge', user.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                        {user.isActive ? 'نشط' : 'معطل'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => { setEditing(user); setShowModal(true); }}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#2a3942] rounded-lg"
                        >
                          <Edit2 className="w-4 h-4 text-gray-400" />
                        </button>
                        <button
                          onClick={() => toggleActive(user)}
                          className={clsx('p-1.5 rounded-lg', user.isActive ? 'hover:bg-red-50 dark:hover:bg-red-900/20' : 'hover:bg-green-50 dark:hover:bg-green-900/20')}
                        >
                          <Power className={clsx('w-4 h-4', user.isActive ? 'text-red-400' : 'text-green-400')} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {users.length === 0 && (
              <div className="py-20 text-center text-gray-400">
                <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">لا يوجد مستخدمون</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && permissionsConfig && (
        <UserModal
          user={editing}
          departments={departments}
          permissionsConfig={permissionsConfig}
          onClose={() => setShowModal(false)}
          onSaved={loadData}
        />
      )}
    </div>
  );
}

function UserModal({ user, departments, permissionsConfig, onClose, onSaved }: {
  user: User | null;
  departments: Department[];
  permissionsConfig: PermissionsConfig;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || UserRole.AGENT,
    departmentId: user?.departmentId || '',
    permissions: user?.permissions || permissionsConfig.defaults[user?.role || UserRole.AGENT] || [],
  });
  const [saving, setSaving] = useState(false);
  const [showPermissions, setShowPermissions] = useState(!!user);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const handleRoleChange = (role: UserRole) => {
    const defaultPerms = permissionsConfig.defaults[role] || [];
    setForm(f => ({ ...f, role, permissions: defaultPerms }));
  };

  const togglePermission = (perm: string) => {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter(p => p !== perm)
        : [...f.permissions, perm],
    }));
  };

  const toggleGroup = (groupKey: string) => {
    const group = permissionsConfig.groups[groupKey];
    const groupPerms = group.permissions.map(p => p.key);
    const allSelected = groupPerms.every(p => form.permissions.includes(p));

    setForm(f => ({
      ...f,
      permissions: allSelected
        ? f.permissions.filter(p => !groupPerms.includes(p))
        : Array.from(new Set([...f.permissions, ...groupPerms])),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = { ...form };
      if (!payload.password) delete payload.password;
      if (!payload.departmentId) delete payload.departmentId;

      if (user) {
        await usersApi.update(user.id, payload);
        toast.success('تم تحديث المستخدم');
      } else {
        await usersApi.create(payload);
        toast.success('تم إنشاء المستخدم');
      }
      onSaved();
      onClose();
    } catch { toast.error('حدث خطأ'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#1f2c33] rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#2a3942]">
          <h2 className="font-semibold dark:text-white">{user ? 'تعديل مستخدم' : 'مستخدم جديد'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-[#2a3942] rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3">
          {[
            { key: 'name', label: 'الاسم الكامل *', placeholder: 'أحمد محمد', required: true },
            { key: 'email', label: 'البريد الإلكتروني *', placeholder: 'ahmed@company.com', type: 'email', dir: 'ltr', required: !user },
            { key: 'password', label: user ? 'كلمة المرور الجديدة (اختياري)' : 'كلمة المرور *', placeholder: '••••••••', type: 'password', dir: 'ltr', required: !user },
          ].map(field => (
            <div key={field.key}>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">{field.label}</label>
              <input
                type={field.type || 'text'}
                value={(form as any)[field.key]}
                onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                required={field.required}
                dir={field.dir as any}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111b21] border border-gray-200 dark:border-[#2a3942] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#25D366] dark:text-white"
              />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">الدور</label>
              <select
                value={form.role}
                onChange={e => handleRoleChange(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111b21] border border-gray-200 dark:border-[#2a3942] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#25D366] dark:text-white"
              >
                {Object.entries(USER_ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">القسم</label>
              <select
                value={form.departmentId}
                onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111b21] border border-gray-200 dark:border-[#2a3942] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#25D366] dark:text-white"
              >
                <option value="">بدون قسم</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Permissions Section */}
          <div className="border border-gray-200 dark:border-[#2a3942] rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPermissions(!showPermissions)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-[#111b21] hover:bg-gray-100 dark:hover:bg-[#1a2730] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#25D366]" />
                <span className="text-sm font-medium dark:text-white">الصلاحيات</span>
                <span className="text-xs text-gray-400 bg-gray-200 dark:bg-[#2a3942] px-2 py-0.5 rounded-full">
                  {form.permissions.length}
                </span>
              </div>
              {showPermissions ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {showPermissions && (
              <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto">
                {Object.entries(permissionsConfig.groups).map(([groupKey, group]) => {
                  const groupPerms = group.permissions.map(p => p.key);
                  const selectedCount = groupPerms.filter(p => form.permissions.includes(p)).length;
                  const allSelected = selectedCount === groupPerms.length;
                  const isExpanded = expandedGroups[groupKey] !== false;

                  return (
                    <div key={groupKey} className="border border-gray-100 dark:border-[#2a3942] rounded-lg overflow-hidden">
                      <div className="flex items-center gap-2 p-2 bg-gray-50/50 dark:bg-[#111b21]/50">
                        <button
                          type="button"
                          onClick={() => toggleGroup(groupKey)}
                          className={clsx(
                            'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0',
                            allSelected
                              ? 'bg-[#25D366] border-[#25D366]'
                              : selectedCount > 0
                                ? 'bg-[#25D366]/30 border-[#25D366]'
                                : 'border-gray-300 dark:border-gray-600'
                          )}
                        >
                          {allSelected && <Check className="w-3 h-3 text-white" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedGroups(g => ({ ...g, [groupKey]: !isExpanded }))}
                          className="flex-1 flex items-center justify-between"
                        >
                          <span className="text-xs font-semibold dark:text-white">{group.label}</span>
                          <span className="text-[10px] text-gray-400">{selectedCount}/{groupPerms.length}</span>
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="grid grid-cols-2 gap-1 p-2">
                          {group.permissions.map(perm => {
                            const isSelected = form.permissions.includes(perm.key);
                            return (
                              <label
                                key={perm.key}
                                className={clsx(
                                  'flex items-center gap-2 p-1.5 rounded-md cursor-pointer transition-colors text-xs',
                                  isSelected
                                    ? 'bg-[#25D366]/10 dark:bg-[#25D366]/5'
                                    : 'hover:bg-gray-50 dark:hover:bg-[#1a2730]'
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => togglePermission(perm.key)}
                                  className="sr-only"
                                />
                                <div className={clsx(
                                  'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0',
                                  isSelected ? 'bg-[#25D366] border-[#25D366]' : 'border-gray-300 dark:border-gray-600'
                                )}>
                                  {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                                </div>
                                <span className={clsx('dark:text-gray-300', isSelected && 'font-medium dark:text-white')}>
                                  {perm.label}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-300 dark:border-[#2a3942] rounded-lg text-sm dark:text-gray-300">
              إلغاء
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-[#25D366] text-white rounded-lg text-sm font-medium hover:bg-[#20ba5a] disabled:opacity-60">
              {saving ? 'جاري الحفظ...' : (user ? 'تحديث' : 'إنشاء')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
