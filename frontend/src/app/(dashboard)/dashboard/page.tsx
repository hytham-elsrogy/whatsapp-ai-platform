'use client';

import { useEffect, useState } from 'react';
import { Inbox, MessageSquarePlus, CheckCircle2, Timer } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { reportsService } from '@/services/reports';
import { OverviewReport } from '@/types/reports';
import { StatCard } from '@/components/ui/stat-card';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [overview, setOverview] = useState<OverviewReport | null>(null);

  useEffect(() => {
    reportsService.overview().then(setOverview);
  }, []);

  const stats = [
    { label: 'المحادثات المفتوحة', value: overview?.openConversations ?? '—', icon: Inbox, accent: 'primary' as const },
    { label: 'محادثات اليوم', value: overview?.todayConversations ?? '—', icon: MessageSquarePlus, accent: 'sky' as const },
    { label: 'المحلولة اليوم', value: overview?.resolvedToday ?? '—', icon: CheckCircle2, accent: 'violet' as const },
    {
      label: 'متوسط زمن الاستجابة اليوم',
      value:
        overview?.avgFirstResponseMinutesToday != null
          ? `${Math.round(overview.avgFirstResponseMinutesToday)} دقيقة`
          : '—',
      icon: Timer,
      accent: 'amber' as const,
    },
  ];

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">مرحبًا، {user?.name}</h1>
      <p className="mb-6 text-sm text-gray-500">نظرة عامة على أداء اليوم — لتقارير أكثر تفصيلاً راجع صفحة التقارير.</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} accent={stat.accent} />
        ))}
      </div>
    </div>
  );
}
