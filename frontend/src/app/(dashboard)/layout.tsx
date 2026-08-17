'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, Inbox, Building2, Bot, Sparkles, BookOpen, Ticket, FileText, BarChart3, Plug, LogOut } from 'lucide-react';
import { bootstrapSession } from '@/lib/auth';
import { api } from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth-store';
import { NotificationBell } from '@/components/notifications/notification-bell';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/reports', label: 'التقارير', icon: BarChart3 },
  { href: '/inbox', label: 'المحادثات', icon: Inbox },
  { href: '/tickets', label: 'التذاكر', icon: Ticket },
  { href: '/templates', label: 'قوالب الرسائل', icon: FileText },
  { href: '/chatbot-builder', label: 'الشات بوت', icon: Bot },
  { href: '/ai-agents', label: 'وكلاء الذكاء الاصطناعي', icon: Sparkles },
  { href: '/knowledge-base', label: 'قاعدة المعرفة', icon: BookOpen },
  { href: '/departments', label: 'الأقسام', icon: Building2 },
  { href: '/integrations', label: 'التكاملات', icon: Plug },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, accessToken, clear } = useAuthStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (accessToken) {
      setChecking(false);
      return;
    }
    bootstrapSession().then((ok) => {
      if (!ok) router.replace('/login');
      setChecking(false);
    });
  }, [accessToken, router]);

  useEffect(() => {
    if (accessToken) connectSocket(accessToken);
    return () => {
      if (!accessToken) disconnectSocket();
    };
  }, [accessToken]);

  async function handleLogout() {
    await api.post('/auth/logout');
    disconnectSocket();
    clear();
    router.replace('/login');
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">
        جارٍ التحقق من الجلسة...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-col border-l border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 flex items-center justify-between px-2">
          <span className="text-lg font-semibold">منصة الخدمة</span>
          <NotificationBell />
        </div>
        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <a
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <Icon size={18} />
              {label}
            </a>
          ))}
        </nav>
        <div className="border-t border-gray-200 pt-3 dark:border-gray-800">
          <div className="mb-2 px-2 text-sm">
            <div className="font-medium">{user?.name}</div>
            <div className="text-xs text-gray-500">{user?.role?.name}</div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
          >
            <LogOut size={18} />
            تسجيل الخروج
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
