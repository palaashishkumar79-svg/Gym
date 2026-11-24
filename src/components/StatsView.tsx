import { useMemo } from 'react';
import { AppSettings, CompletedWorkout, RoutineDay } from '../types';
import {
  computeWeeklyMuscleSets,
  formatWeight,
  getStartOfWeek,
  kgToDisplay,
  parseLocalDate,
  toLocalDateString,
} from '../utils/fitness';

interface StatsViewProps {
  history: CompletedWorkout[];
  routine: RoutineDay[];
  settings: AppSettings;
}

export function StatsView({ history, routine, settings }: StatsViewProps) {
  const muscleSets = useMemo(
    () => computeWeeklyMuscleSets(history, routine),
    [history, routine]
  );

  // Weekly volume for the last 8 weeks
  const weeklyVolumes = useMemo(() => {
    const currentMon = getStartOfWeek(new Date());
    const weeks: { key: string; label: string; volumeKg: number; workouts: number }[] = [];

    for (let i = 7; i >= 0; i--) {
      const d = new Date(currentMon);
      d.setDate(currentMon.getDate() - i * 7);
      const key = toLocalDateString(d);
      const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      weeks.push({ key, label, volumeKg: 0, workouts: 0 });
    }

    const weekMap = new Map(weeks.map((w) => [w.key, w]));
    for (const item of history) {
      const monKey = toLocalDateString(getStartOfWeek(parseLocalDate(item.date)));
      const bucket = weekMap.get(monKey);
      if (bucket) {
        bucket.volumeKg += item.totalVolumeKg;
        bucket.workouts += 1;
      }
    }

    return weeks;
  }, [history]);

  // Workouts per month for the last 6 months
  const monthlyWorkouts = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; count: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString(undefined, { month: 'short' });
      months.push({ key, label, count: 0 });
    }

    const monthMap = new Map(months.map((m) => [m.key, m]));
    for (const item of history) {
      const key = item.date.slice(0, 7);
      const bucket = monthMap.get(key);
      if (bucket) bucket.count += 1;
    }

    return months;
  }, [history]);

  const totalWeeklySetsActual = muscleSets.reduce((acc, m) => acc + m.actual, 0);
  const totalWeeklySetsTarget = muscleSets.reduce((acc, m) => acc + m.target, 0);
  const maxWeeklyVolDisplay = Math.max(
    1,
    ...weeklyVolumes.map((w) => kgToDisplay(w.volumeKg, settings.unit))
  );
  const maxMonthlyCount = Math.max(1, ...monthlyWorkouts.map((m) => m.count));

  return (
    <div className="space-y-6 pb-28 md:pb-12">
      <div className="pt-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-50 tracking-tight">Stats</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Weekly muscle volume, training tonnage, and monthly frequency
        </p>
      </div>

      {/* Weekly Sets per Muscle Group vs Target */}
      <section className="rounded-3xl bg-[#141821] border border-white/[0.08] p-5 space-y-4">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-100">Weekly Sets by Muscle</h2>
            <p className="text-xs text-slate-400 mt-0.5">This week vs routine target</p>
          </div>
          <div className="text-sm font-bold font-mono-nums text-blue-400">
            {totalWeeklySetsActual} / {totalWeeklySetsTarget} sets
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3.5">
          {muscleSets.map((m) => {
            const pct = m.target > 0 ? Math.min(100, Math.round((m.actual / m.target) * 100)) : 0;
            const hitTarget = m.actual >= m.target && m.target > 0;
            return (
              <div key={m.group} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-200">{m.group}</span>
                  <span
                    className={`font-mono-nums font-semibold ${
                      hitTarget ? 'text-emerald-400' : 'text-slate-400'
                    }`}
                  >
                    {m.actual} / {m.target} sets
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-[#0B0E14] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      hitTarget ? 'bg-emerald-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Weekly Volume Bar Chart */}
        <section className="rounded-3xl bg-[#141821] border border-white/[0.08] p-5 space-y-4">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-100">Volume per Week</h2>
              <p className="text-xs text-slate-400 mt-0.5">Last 8 weeks ({settings.unit})</p>
            </div>
            <div className="text-sm font-bold font-mono-nums text-slate-200">
              {formatWeight(weeklyVolumes[weeklyVolumes.length - 1]?.volumeKg || 0, settings.unit)}{' '}
              {settings.unit}
            </div>
          </div>

          <div className="h-44 flex items-end gap-2 pt-4">
            {weeklyVolumes.map((w, idx) => {
              const disp = kgToDisplay(w.volumeKg, settings.unit);
              const heightPct = w.volumeKg > 0 ? Math.max(8, (disp / maxWeeklyVolDisplay) * 100) : 3;
              const isCurrent = idx === weeklyVolumes.length - 1;
              return (
                <div key={w.key} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[10px] font-mono-nums text-slate-400 truncate max-w-full">
                    {disp > 0 ? (disp >= 1000 ? `${(disp / 1000).toFixed(1)}k` : Math.round(disp)) : ''}
                  </span>
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className={`w-full rounded-t-lg transition-all ${
                        w.volumeKg === 0
                          ? 'bg-white/[0.05]'
                          : isCurrent
                            ? 'bg-blue-500'
                            : 'bg-blue-500/50'
                      }`}
                      style={{ height: `${heightPct}%` }}
                      title={`${w.label}: ${disp} ${settings.unit}`}
                    />
                  </div>
                  <span className="text-[10px] font-mono-nums text-slate-500 whitespace-nowrap">
                    {w.label.split(' ')[1] || w.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Workouts per Month Bar Chart */}
        <section className="rounded-3xl bg-[#141821] border border-white/[0.08] p-5 space-y-4">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-100">Workouts per Month</h2>
              <p className="text-xs text-slate-400 mt-0.5">Last 6 months consistency</p>
            </div>
            <div className="text-sm font-bold font-mono-nums text-emerald-400">
              {monthlyWorkouts[monthlyWorkouts.length - 1]?.count || 0} this month
            </div>
          </div>

          <div className="h-44 flex items-end gap-3 pt-4">
            {monthlyWorkouts.map((m, idx) => {
              const heightPct = m.count > 0 ? Math.max(10, (m.count / maxMonthlyCount) * 100) : 3;
              const isCurrent = idx === monthlyWorkouts.length - 1;
              return (
                <div key={m.key} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-xs font-mono-nums font-semibold text-slate-300">
                    {m.count > 0 ? m.count : ''}
                  </span>
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className={`w-full rounded-t-lg transition-all ${
                        m.count === 0
                          ? 'bg-white/[0.05]'
                          : isCurrent
                            ? 'bg-emerald-500'
                            : 'bg-emerald-500/50'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-400">{m.label}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
