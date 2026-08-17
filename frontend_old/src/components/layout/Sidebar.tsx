'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageSquare, Users, Phone, BarChart3, Settings,
  LogOut, Moon, Sun, Bell, FileText, Home, Shield,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/store/auth.store';
import { useNotificationsStore } from '@/store/notifications.store';
import { UserRole } from '@/types';
import clsx from 'clsx';

const navItems = [
  { href: '/dashboard', icon: Home, label: 'لوحة التحكم' },
  { href: '/conversations', icon: MessageSquare, label: 'المحادثات' },
  { href: '/contacts', icon: Phone, label: 'جهات الاتصال' },
  { href: '/templates', icon: FileText, label: 'قوالب الردود' },
  { href: '/reports', icon: BarChart3, label: 'التقارير', roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SUPERVISOR] },
  { href: '/users', icon: Users, label: 'المستخدمون', roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
  { href: '/settings', icon: Settings, label: 'الإعدادات', roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationsStore();

  const allowedItems = navItems.filter(item => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role as UserRole);
  });

  return (
    <aside className="w-16 lg:w-64 h-screen sidebar-bg flex flex-col py-4 transition-all duration-300 shrink-0">
      <div className="px-3 mb-6 hidden lg:block">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 bg-[#25D366] rounded-full flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm leading-tight">WhatsApp CRM</h1>
            <p className="text-[#8696a0] text-xs">نظام المحادثات</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center lg:block px-2 mb-4 lg:mb-0">
        <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[#25D366] rounded-full flex items-center justify-center shrink-0 lg:mx-2">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-white font-bold text-sm">{user?.name?.charAt(0) || 'U'}</span>
          )}
        </div>
        <div className="hidden lg:block mt-1 px-2">
          <p className="text-white text-sm font-medium truncate">{user?.name}</p>
          <p className="text-[#8696a0] text-xs truncate">{user?.email}</p>
        </div>
      </div>

      <div className="w-full h-px bg-white/10 my-3" />

      <nav className="flex-1 flex flex-col gap-1 px-2 overflow-y-auto">
        {allowedItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group',
                isActive
                  ? 'bg-[#25D366]/20 text-[#25D366]'
                  : 'text-[#aebac1] hover:bg-white/5 hover:text-white',
              )}
            >
              <div className="relative">
                <Icon className="w-5 h-5 shrink-0" />
                {item.href === '/conversations' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="hidden lg:block text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="w-full h-px bg-white/10 my-3" />

      <div className="px-2 flex flex-col gap-1">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#aebac1] hover:bg-white/5 hover:text-white transition-all w-full"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
          <span className="hidden lg:block text-sm">{theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}</span>
        </button>

        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-all w-full"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className="hidden lg:block text-sm">تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}
