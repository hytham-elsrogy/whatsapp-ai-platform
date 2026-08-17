'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { reportsService } from '@/services/reports';
import { AgentPerformanceRow, AiAnalyticsReport, SlaComplianceRow } from '@/types/reports';

const AI_STATUS_COLORS: Record<string, string> = {
  'محلولة': '#10b981',
  'مُصعّدة': '#ef4444',
  'نشطة': '#f59e0b',
};

const SLA_TYPE_LABELS: Record<string, string> = {
  first_response: 'أول رد',
  resolution: 'الحل',
};

export default function ReportsPage() {
  const [agents, setAgents] = useState<AgentPerformanceRow[]>([]);
  const [ai, setAi] = useState<AiAnalyticsReport | null>(null);
  const [sla, setSla] = useState<SlaComplianceRow[]>([]);

  useEffect(() => {
    reportsService.agents().then(setAgents);
    reportsService.ai().then(setAi);
    reportsService.sla().then(setSla);
  }, []);

  const aiStatusData = ai
    ? [
        { name: 'محلولة', value: ai.resolved },
        { name: 'مُصعّدة', value: ai.escalated },
        { name: 'نشطة', value: ai.active },
      ].filter((d) => d.value > 0)
    : [];

  const slaData = sla.map((s) => ({ name: SLA_TYPE_LABELS[s.type] ?? s.type, count: s.count }));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">التقارير</h1>

      <section>
        <h2 className="mb-3 font-semibold">أداء الموظفين</h2>
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-right dark:bg-gray-900">
              <tr>
                <th className="p-3 font-medium">الموظف</th>
                <th className="p-3 font-medium">مفتوحة</th>
                <th className="p-3 font-medium">محلولة</th>
                <th className="p-3 font-medium">متوسط زمن الاستجابة</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.agentId} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="p-3 font-medium">{a.agentName}</td>
                  <td className="p-3 text-gray-500">{a.openCount}</td>
                  <td className="p-3 text-gray-500">{a.resolvedCount}</td>
                  <td className="p-3 text-gray-500">
                    {a.avgFirstResponseMinutes != null ? `${Math.round(a.avgFirstResponseMinutes)} دقيقة` : '—'}
                  </td>
                </tr>
              ))}
              {agents.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-gray-400">
                    لا توجد بيانات بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-3 font-semibold">تحليلات الذكاء الاصطناعي</h2>
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            {ai && ai.total > 0 ? (
              <>
                <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs text-gray-500">
                  <div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{ai.total}</div>
                    إجمالي الجلسات
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {ai.resolutionRate != null ? `${Math.round(ai.resolutionRate * 100)}%` : '—'}
                    </div>
                    نسبة الحل
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{ai.totalTokensUsed}</div>
                    التوكنز المستخدمة
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={aiStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                      {aiStatusData.map((entry) => (
                        <Cell key={entry.name} fill={AI_STATUS_COLORS[entry.name]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                {ai.topIntents.length > 0 && (
                  <div className="mt-3 text-xs text-gray-500">
                    أكثر النوايا: {ai.topIntents.map((t) => `${t.intent} (${t.count})`).join('، ')}
                  </div>
                )}
              </>
            ) : (
              <p className="p-6 text-center text-sm text-gray-400">لا توجد جلسات ذكاء اصطناعي بعد</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="mb-3 font-semibold">تجاوزات اتفاقية مستوى الخدمة (SLA)</h2>
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            {slaData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={slaData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="p-6 text-center text-sm text-gray-400">لا توجد تجاوزات SLA — أداء ممتاز</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
