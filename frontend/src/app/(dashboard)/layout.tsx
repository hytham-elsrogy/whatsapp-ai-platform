'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Inbox, Building2, Bot, Sparkles, BookOpen, Ticket,
  FileText, BarChart3, Plug, LogOut, MessageCircle,
} from 'lucide-react';
import { bootstrapSession } from '@/lib/auth';
import { api } from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth-store';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { Avatar } from '@/components/ui/avatar';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'العمليات',
    items: [
      { href: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
      { href: '/reports', label: 'التقارير', icon: BarChart3 },
      { href: '/inbox', label: 'المحادثات', icon: Inbox },
      { href: '/tickets', label: 'التذاكر', icon: Ticket },
    ],
  },
  {
    label: 'الأتمتة والذكاء الاصطناعي',
    items: [
      { href: '/chatbot-builder', label: 'الشات بوت', icon: Bot },
      { href: '/ai-agents', label: 'وكلاء الذكاء الاصطناعي', icon: Sparkles },
      { href: '/knowledge-base', label: 'قاعدة المعرفة', icon: BookOpen },
      { href: '/templates', label: 'قوالب الرسائل', icon: FileText },
    ],
  },
  {
    label: 'الإدارة',
    items: [
      { href: '/departments', label: 'الأقسام', icon: Building2 },
      { href: '/integrations', label: 'التكاملات', icon: Plug },
    ],
  },
];

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
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

  const currentTitle = ALL_NAV_ITEMS.find((item) => pathname?.startsWith(item.href))?.label ?? '';

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-shrink-0 flex-col border-l border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-white">
            <MessageCircle size={18} />
          </div>
          <span className="text-base font-bold">منصة الخدمة</span>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="mb-1.5 px-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active = pathname?.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                        active
                          ? 'bg-primary/10 font-medium text-primary'
                          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Icon size={17} />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-gray-100 p-3 dark:border-gray-800">
          <div className="mb-1 flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <Avatar name={user?.name ?? '?'} size={32} />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{user?.name}</div>
              <div className="truncate text-xs text-gray-500">{user?.role?.name}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/50"
          >
            <LogOut size={17} />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 dark:border-gray-800 dark:bg-gray-900">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{currentTitle}</span>
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
