'use client';
import { useEffect, useState } from 'react';
import {
  MessageSquare, CheckCircle, Clock, Users, TrendingUp,
  TrendingDown, Inbox, AlertCircle,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { reportsApi } from '@/services/api';
import { DashboardStats } from '@/types';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';

const STATUS_COLORS: Record<string, string> = {
  new: '#3b82f6',
  in_progress: '#f59e0b',
  pending_customer: '#f97316',
  resolved: '#22c55e',
  closed: '#6b7280',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'جديدة',
  in_progress: 'قيد المعالجة',
  pending_customer: 'بانتظار العميل',
  resolved: 'محلولة',
  closed: 'مغلقة',
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, [period]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await reportsApi.dashboard({ period });
      setStats(data);
    } catch {}
    finally { setLoading(false); }
  };

  const cards = stats ? [
    { label: 'إجمالي المحادثات', value: stats.totalConversations, icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'تم الحل', value: stats.resolvedConversations, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
    { label: 'معدل الحل', value: `${stats.resolutionRate}%`, icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { label: 'جديدة / غير معالجة', value: stats.newConversations, icon: Inbox, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    { label: 'إجمالي الرسائل', value: stats.totalMessages, icon: MessageSquare, color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/20' },
    { label: 'متوسط وقت الاستجابة', value: `${stats.avgResponseTime} د`, icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
    { label: 'رسائل واردة', value: stats.inboundMessages, icon: TrendingDown, color: 'text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'رسائل صادرة', value: stats.outboundMessages, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
  ] : [];

  const trendData = stats?.dailyTrend?.map(d => ({
    date: format(parseISO(d.date), 'd MMM', { locale: ar }),
    محادثات: parseInt(d.count),
  })) || [];

  const pieData = stats?.statusBreakdown?.map(s => ({
    name: STATUS_LABELS[s.status] || s.status,
    value: parseInt(s.count),
    color: STATUS_COLORS[s.status] || '#6b7280',
  })) || [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="لوحة التحكم" subtitle="نظرة عامة على أداء الفريق" />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex items-center gap-2">
          {(['today', 'week', 'month'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${period === p ? 'bg-[#25D366] text-white' : 'bg-white dark:bg-[#1f2c33] text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a3942]'}`}
            >
              {p === 'today' ? 'اليوم' : p === 'week' ? 'هذا الأسبوع' : 'هذا الشهر'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-24 bg-white dark:bg-[#1f2c33] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {cards.map((card, i) => {
                const Icon = card.icon;
                return (
                  <div key={i} className="bg-white dark:bg-[#1f2c33] rounded-xl p-4 shadow-sm border border-gray-100 dark:border-[#2a3942]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{card.label}</span>
                      <div className={`w-8 h-8 ${card.bg} rounded-lg flex items-center justify-center`}>
                        <Icon className={`w-4 h-4 ${card.color}`} />
                      </div>
                    </div>
                    <p className="text-2xl font-bold dark:text-white">{card.value}</p>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-white dark:bg-[#1f2c33] rounded-xl p-4 shadow-sm border border-gray-100 dark:border-[#2a3942]">
                <h3 className="font-semibold text-sm mb-4 dark:text-white">اتجاه المحادثات</h3>
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#25D366" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#25D366" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="محادثات" stroke="#25D366" fill="url(#colorConv)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center text-gray-400 text-sm">لا توجد بيانات كافية</div>
                )}
              </div>

              <div className="bg-white dark:bg-[#1f2c33] rounded-xl p-4 shadow-sm border border-gray-100 dark:border-[#2a3942]">
                <h3 className="font-semibold text-sm mb-4 dark:text-white">توزيع الحالات</h3>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                        {pieData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value, name]} />
                      <Legend formatter={(value) => <span className="text-xs">{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center text-gray-400 text-sm">لا توجد بيانات</div>
                )}
              </div>
            </div>

            {stats?.topAgents && stats.topAgents.length > 0 && (
              <div className="bg-white dark:bg-[#1f2c33] rounded-xl p-4 shadow-sm border border-gray-100 dark:border-[#2a3942]">
                <h3 className="font-semibold text-sm mb-4 dark:text-white">أفضل الموظفين</h3>
                <div className="space-y-3">
                  {stats.topAgents.map((agent, idx) => (
                    <div key={agent.id} className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-400 w-5">{idx + 1}</span>
                      <div className="w-8 h-8 bg-[#25D366]/20 rounded-full flex items-center justify-center text-[#25D366] font-bold text-sm">
                        {agent.name?.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium dark:text-white">{agent.name}</p>
                      </div>
                      <span className="text-sm font-bold text-[#25D366]">{agent.count} محادثة</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
