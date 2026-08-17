'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { notificationsService } from '@/services/notifications';
import { connectSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth-store';
import { AppNotification } from '@/types/notifications';

// Real-time push (see EventsGateway) is the primary path now — this poll is
// just a resync safety net in case a socket event is ever missed.
const POLL_INTERVAL_MS = 60_000;

const TYPE_LABELS: Record<AppNotification['type'], string> = {
  new_conversation: 'محادثة جديدة',
  new_assignment: 'تكليف جديد',
  sla_breach: 'تجاوز SLA',
  ai_escalation: 'تصعيد من الذكاء الاصطناعي',
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  function load() {
    notificationsService.list().then(setNotifications);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (!accessToken) return;
    // connectSocket() is idempotent (no-op if already connected with this
    // token) — called here too rather than relying solely on the layout
    // having connected first, since child effects run before parent effects.
    const socket = connectSocket(accessToken);
    const handler = (notification: AppNotification) => {
      setNotifications((prev) => [notification, ...prev]);
    };
    socket.on('notification:new', handler);
    return () => {
      socket.off('notification:new', handler);
    };
  }, [accessToken]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  async function handleMarkAllRead() {
    await notificationsService.markAllRead();
    load();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 z-10 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-100 p-3 dark:border-gray-800">
            <span className="text-sm font-medium">الإشعارات</span>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-primary hover:underline">
                تعليم الكل كمقروء
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`border-b border-gray-100 p-3 text-sm dark:border-gray-800 ${
                  n.isRead ? 'text-gray-500' : 'font-medium'
                }`}
              >
                <div>{TYPE_LABELS[n.type]}</div>
                <div className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString('ar-EG')}</div>
              </div>
            ))}
            {notifications.length === 0 && (
              <div className="p-6 text-center text-sm text-gray-400">لا توجد إشعارات</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
