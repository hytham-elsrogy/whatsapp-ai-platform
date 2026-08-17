'use client';
import { useState, useRef, useEffect } from 'react';
import { Bell, Search, X } from 'lucide-react';
import { useNotificationsStore } from '@/store/notifications.store';
import { formatRelativeTime } from '@/utils/format';
import clsx from 'clsx';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const { notifications, unreadCount, markRead, markAllRead, fetchNotifications } = useNotificationsStore();
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-14 bg-white dark:bg-[#1f2c33] border-b border-gray-200 dark:border-[#2a3942] flex items-center justify-between px-4 shrink-0 z-10">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2a3942] transition-colors"
          >
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute left-0 top-full mt-1 w-80 bg-white dark:bg-[#1f2c33] rounded-xl shadow-2xl border border-gray-200 dark:border-[#2a3942] z-50 max-h-96 overflow-hidden flex flex-col animate-fade-in">
              <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-[#2a3942]">
                <span className="font-medium text-sm dark:text-white">الإشعارات ({unreadCount} غير مقروءة)</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-[#25D366] hover:underline">
                    تمييز الكل كمقروء
                  </button>
                )}
              </div>

              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">لا توجد إشعارات</div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => { if (!notif.isRead) markRead(notif.id); }}
                      className={clsx(
                        'p-3 border-b border-gray-100 dark:border-[#2a3942] cursor-pointer hover:bg-gray-50 dark:hover:bg-[#2a3942]/50 transition-colors',
                        !notif.isRead && 'bg-blue-50/50 dark:bg-[#25D366]/5',
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {!notif.isRead && (
                          <div className="w-2 h-2 bg-[#25D366] rounded-full mt-1.5 shrink-0" />
                        )}
                        <div className={!notif.isRead ? '' : 'ml-4'}>
                          <p className="text-sm font-medium dark:text-white">{notif.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{notif.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(notif.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
