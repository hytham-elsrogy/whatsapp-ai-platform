import { LucideIcon } from 'lucide-react';
import { Card } from './card';

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: 'primary' | 'sky' | 'violet' | 'amber';
}

const ACCENT_CLASSES: Record<NonNullable<Props['accent']>, string> = {
  primary: 'bg-primary/10 text-primary',
  sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
};

export function StatCard({ label, value, icon: Icon, accent = 'primary' }: Props) {
  return (
    <Card className="p-4 transition hover:shadow-soft">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${ACCENT_CLASSES[accent]}`}>
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-xs text-gray-500 dark:text-gray-400">{label}</div>
          <div className="mt-0.5 text-2xl font-semibold tabular-nums">{value}</div>
        </div>
      </div>
    </Card>
  );
}
