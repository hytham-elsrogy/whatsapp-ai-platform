'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { reportsService } from '@/services/reports';
import { OverviewReport } from '@/types/reports';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [overview, setOverview] = useState<OverviewReport | null>(null);

  useEffect(() => {
    reportsService.overview().then(setOverview);
  }, []);

  const stats = [
    { label: 'المحادثات المفتوحة', value: overview?.openConversations ?? '—' },
    { label: 'محادثات اليوم', value: overview?.todayConversations ?? '—' },
    { label: 'المحلولة اليوم', value: overview?.resolvedToday ?? '—' },
    {
      label: 'متوسط زمن الاستجابة اليوم',
      value:
        overview?.avgFirstResponseMinutesToday != null
          ? `${Math.round(overview.avgFirstResponseMinutesToday)} دقيقة`
          : '—',
    },
  ];

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">مرحبًا، {user?.name}</h1>
      <p className="mb-6 text-sm text-gray-500">نظرة عامة على أداء اليوم — لتقارير أكثر تفصيلاً راجع صفحة التقارير.</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="text-xs text-gray-500">{stat.label}</div>
            <div className="mt-1 text-2xl font-semibold">{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
