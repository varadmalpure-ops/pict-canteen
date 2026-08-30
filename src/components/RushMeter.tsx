import { Clock } from 'lucide-react';

interface RushMeterProps {
  queueCount: number;
}

export default function RushMeter({ queueCount }: RushMeterProps) {
  const isLow = queueCount <= 5;
  const isModerate = queueCount > 5 && queueCount <= 15;

  const badgeColor = isLow
    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-300'
    : isModerate
      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-800/60 text-amber-900 dark:text-amber-300'
      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-800/60 text-rose-900 dark:text-rose-300';

  const dotColor = isLow
    ? 'bg-emerald-500 shadow-emerald-500/50'
    : isModerate
      ? 'bg-amber-500 shadow-amber-500/50'
      : 'bg-rose-500 shadow-rose-500/50';

  const title = isLow
    ? 'Low Rush · ~3–5 min wait'
    : isModerate
      ? 'Moderate Rush · ~8–12 min wait'
      : 'Peak Rush · ~15+ min wait';

  const subtitle = queueCount === 0
    ? 'Kitchen queue is clear — order now for instant pickup!'
    : `${queueCount} active order${queueCount > 1 ? 's' : ''} currently being cooked`;

  return (
    <div className={`p-3.5 rounded-2xl border ${badgeColor} transition-all duration-300 flex items-center justify-between shadow-xs mb-5`}>
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center">
          <div className="w-8 h-8 rounded-xl bg-white/90 dark:bg-slate-800/90 flex items-center justify-center shadow-xs">
            <Clock size={16} />
          </div>
          <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${dotColor} shadow-sm animate-pulse`} />
        </div>

        <div>
          <div className="font-extrabold text-xs tracking-tight">
            {title}
          </div>
          <div className="text-[11px] opacity-80 dark:opacity-90 font-medium mt-0.5">
            {subtitle}
          </div>
        </div>
      </div>
    </div>
  );
}
