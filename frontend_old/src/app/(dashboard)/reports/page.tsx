'use client';
import { useEffect, useState } from 'react';
import { Download, TrendingUp, Users, Clock, MessageSquare, BarChart3 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { reportsApi } from '@/services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const [stats, setStats] = useState<any>(null);
  const [agentStats, setAgentStats] = useState<any[]>([]);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('month');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, a] = await Promise.all([
        reportsApi.dashboard({ period }),
        reportsApi.agents({ period }),
      ]);
      setStats(s);
      setAgentStats(a);
    } catch {}
    finally { setLoading(false); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await reportsApi.exportExcel({ period });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${period}-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('تم تصدير التقرير بنجاح');
    } catch {
      toast.error('فشل التصدير');
    } finally {
      setExporting(false);
    }
  };

  const trendData = stats?.dailyTrend?.map((d: any) => ({
    date: new Date(d.date).toLocaleDateString('ar', { day: 'numeric', month: 'short' }),
    محادثات: parseInt(d.count),
  })) || [];

  const agentChartData = agentStats.slice(0, 10).map((a: any) => ({
    name: a.name?.split(' ')[0] || 'موظف',
    محادثات: parseInt(a.totalConversations) || 0,
    'تم الحل': parseInt(a.resolved) || 0,
  }));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="التقارير والإحصائيات" subtitle="تحليل أداء الفريق" />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {(['today', 'week', 'month'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${period === p ? 'bg-[#25D366] text-white' : 'bg-white dark:bg-[#1f2c33] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#2a3942]'}`}
              >
                {p === 'today' ? 'اليوم' : p === 'week' ? 'هذا الأسبوع' : 'هذا الشهر'}
              </button>
            ))}
          </div>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-60"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'جاري التصدير...' : 'تصدير Excel'}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#25D366] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'إجمالي المحادثات', value: stats.totalConversations, icon: MessageSquare, color: 'text-blue-500' },
                { label: 'معدل الحل', value: `${stats.resolutionRate}%`, icon: TrendingUp, color: 'text-green-500' },
                { label: 'متوسط وقت الاستجابة', value: `${stats.avgResponseTime} دقيقة`, icon: Clock, color: 'text-yellow-500' },
                { label: 'إجمالي الرسائل', value: stats.totalMessages, icon: BarChart3, color: 'text-purple-500' },
              ].map((card, i) => {
                const Icon = card.icon;
                return (
                  <div key={i} className="bg-white dark:bg-[#1f2c33] rounded-xl p-4 border border-gray-100 dark:border-[#2a3942]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{card.label}</span>
                      <Icon className={`w-5 h-5 ${card.color}`} />
                    </div>
                    <p className="text-2xl font-bold dark:text-white">{card.value}</p>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-[#1f2c33] rounded-xl p-4 border border-gray-100 dark:border-[#2a3942]">
                <h3 className="font-semibold text-sm mb-4 dark:text-white">اتجاه المحادثات اليومية</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="محادثات" stroke="#25D366" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white dark:bg-[#1f2c33] rounded-xl p-4 border border-gray-100 dark:border-[#2a3942]">
                <h3 className="font-semibold text-sm mb-4 dark:text-white">الرسائل الواردة والصادرة</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">رسائل واردة</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${stats.totalMessages ? (stats.inboundMessages / stats.totalMessages) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold dark:text-white">{stats.inboundMessages}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">رسائل صادرة</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#25D366] rounded-full"
                          style={{ width: `${stats.totalMessages ? (stats.outboundMessages / stats.totalMessages) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold dark:text-white">{stats.outboundMessages}</span>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 dark:border-[#2a3942] pt-3 mt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">متوسط وقت الحل</span>
                      <span className="font-semibold dark:text-white">{stats.avgResolutionTime} ساعة</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {agentChartData.length > 0 && (
              <div className="bg-white dark:bg-[#1f2c33] rounded-xl p-4 border border-gray-100 dark:border-[#2a3942]">
                <h3 className="font-semibold text-sm mb-4 dark:text-white">أداء الموظفين</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={agentChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="محادثات" fill="#25D366" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="تم الحل" fill="#128C7E" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-[#2a3942]">
                        <th className="text-right py-2 text-gray-500 dark:text-gray-400 font-medium">الموظف</th>
                        <th className="text-center py-2 text-gray-500 dark:text-gray-400 font-medium">المحادثات</th>
                        <th className="text-center py-2 text-gray-500 dark:text-gray-400 font-medium">تم الحل</th>
                        <th className="text-center py-2 text-gray-500 dark:text-gray-400 font-medium">متوسط الاستجابة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agentStats.map((agent: any, i) => (
                        <tr key={i} className="border-b border-gray-50 dark:border-[#2a3942]/50 hover:bg-gray-50 dark:hover:bg-[#2a3942]/30">
                          <td className="py-2 dark:text-white">{agent.name}</td>
                          <td className="py-2 text-center dark:text-gray-300">{agent.totalConversations}</td>
                          <td className="py-2 text-center text-green-500">{agent.resolved || 0}</td>
                          <td className="py-2 text-center dark:text-gray-300">{Math.round(agent.avgResponseMinutes || 0)} د</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
