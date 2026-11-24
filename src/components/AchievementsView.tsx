import { Award, CheckCircle2, Flame, Search, Trophy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AppSettings, CompletedWorkout } from '../types';
import { computeExercisePRs, computeStreaks, formatWeight } from '../utils/fitness';

interface AchievementsViewProps {
  history: CompletedWorkout[];
  settings: AppSettings;
}

interface MilestoneBadge {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  progressText: string;
}

export function AchievementsView({ history, settings }: AchievementsViewProps) {
  const [search, setSearch] = useState('');

  const streaks = useMemo(() => computeStreaks(history), [history]);
  const prs = useMemo(() => {
    const map = computeExercisePRs(history);
    return Array.from(map.values()).sort((a, b) => b.bestEst1RMKg - a.bestEst1RMKg);
  }, [history]);

  const totals = useMemo(() => {
    let totalVolumeKg = 0;
    let totalSets = 0;
    for (const w of history) {
      totalVolumeKg += w.totalVolumeKg;
      totalSets += w.totalSets;
    }
    return {
      workouts: history.length,
      totalVolumeKg,
      totalSets,
    };
  }, [history]);

  const milestones: MilestoneBadge[] = useMemo(() => {
    const wCount = totals.workouts;
    const vol = totals.totalVolumeKg;
    const wkStreak = streaks.weeklyConsistencyStreak;

    return [
      {
        id: 'w-1',
        title: 'First Session',
        description: 'Complete your first logged gym workout',
        unlocked: wCount >= 1,
        progressText: `${Math.min(wCount, 1)} / 1`,
      },
      {
        id: 'w-10',
        title: '10 Workouts',
        description: 'Build the habit with 10 logged sessions',
        unlocked: wCount >= 10,
        progressText: `${Math.min(wCount, 10)} / 10`,
      },
      {
        id: 'w-50',
        title: '50 Workouts',
        description: 'Halfway to triple digits',
        unlocked: wCount >= 50,
        progressText: `${Math.min(wCount, 50)} / 50`,
      },
      {
        id: 'w-100',
        title: '100 Workouts',
        description: 'Century club consistency',
        unlocked: wCount >= 100,
        progressText: `${Math.min(wCount, 100)} / 100`,
      },
      {
        id: 'v-10k',
        title: '10,000 kg Moved',
        description: 'Lift 10,000 kg cumulative volume',
        unlocked: vol >= 10000,
        progressText: `${formatWeight(Math.min(vol, 10000), settings.unit)} / ${formatWeight(10000, settings.unit)} ${settings.unit}`,
      },
      {
        id: 'v-50k',
        title: '50,000 kg Moved',
        description: 'Lift 50,000 kg cumulative volume',
        unlocked: vol >= 50000,
        progressText: `${formatWeight(Math.min(vol, 50000), settings.unit)} / ${formatWeight(50000, settings.unit)} ${settings.unit}`,
      },
      {
        id: 'v-100k',
        title: '100,000 kg Iron',
        description: 'Lift 100,000 kg cumulative volume',
        unlocked: vol >= 100000,
        progressText: `${formatWeight(Math.min(vol, 100000), settings.unit)} / ${formatWeight(100000, settings.unit)} ${settings.unit}`,
      },
      {
        id: 's-4w',
        title: '4-Week Consistency',
        description: '4 consecutive weeks with 4+ sessions',
        unlocked: wkStreak >= 4,
        progressText: `${Math.min(wkStreak, 4)} / 4 wks`,
      },
      {
        id: 's-12w',
        title: '12-Week Block',
        description: '12 consecutive weeks with 4+ sessions',
        unlocked: wkStreak >= 12,
        progressText: `${Math.min(wkStreak, 12)} / 12 wks`,
      },
    ];
  }, [totals, streaks, settings.unit]);

  const filteredPRs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return prs;
    return prs.filter(
      (p) =>
        p.exerciseName.toLowerCase().includes(q) || p.muscle.toLowerCase().includes(q)
    );
  }, [prs, search]);

  return (
    <div className="space-y-6 pb-28 md:pb-12">
      <div className="pt-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-50 tracking-tight">Achievements</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Streaks, volume milestones, and personal records
        </p>
      </div>

      {/* Streak Summary Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-[#141821] border border-white/[0.08] p-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Current</span>
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono-nums text-slate-50">
            {streaks.currentDayStreak}d
          </div>
        </div>
        <div className="rounded-2xl bg-[#141821] border border-white/[0.08] p-4">
          <div className="text-xs text-slate-400">Best Streak</div>
          <div className="mt-1.5 text-2xl font-bold font-mono-nums text-slate-50">
            {streaks.longestDayStreak}d
          </div>
        </div>
        <div className="rounded-2xl bg-[#141821] border border-white/[0.08] p-4">
          <div className="text-xs text-slate-400">Weekly Run</div>
          <div className="mt-1.5 text-2xl font-bold font-mono-nums text-slate-50">
            {streaks.weeklyConsistencyStreak}w
          </div>
        </div>
      </div>

      {/* Milestone Badges */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-100">Milestone Badges</h2>
          <span className="text-xs font-mono-nums text-slate-400">
            {milestones.filter((m) => m.unlocked).length} / {milestones.length} unlocked
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {milestones.map((badge) => (
            <div
              key={badge.id}
              className={`rounded-2xl border p-4 flex items-start gap-3 transition-colors ${
                badge.unlocked
                  ? 'bg-emerald-500/[0.08] border-emerald-500/30'
                  : 'bg-[#141821] border-white/[0.07] opacity-80'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  badge.unlocked
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-white/[0.05] text-slate-500'
                }`}
              >
                {badge.unlocked ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Award className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-slate-100">{badge.title}</div>
                <div className="text-xs text-slate-400 mt-0.5">{badge.description}</div>
                <div
                  className={`mt-2 text-xs font-mono-nums font-semibold ${
                    badge.unlocked ? 'text-emerald-400' : 'text-slate-500'
                  }`}
                >
                  {badge.unlocked ? 'Unlocked' : badge.progressText}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Personal Records */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-100">Exercise PRs</h2>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter exercise or muscle..."
              className="w-full min-h-[42px] rounded-xl bg-[#141821] border border-white/[0.08] pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {filteredPRs.length === 0 ? (
          <div className="rounded-3xl bg-[#141821] border border-white/[0.08] p-8 text-center space-y-2">
            <Trophy className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-sm text-slate-400">
              {prs.length === 0
                ? 'Complete a workout to start recording Weight and Reps PRs.'
                : 'No matching exercises found.'}
            </p>
          </div>
        ) : (
          <div className="rounded-3xl bg-[#141821] border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden">
            {filteredPRs.map((pr) => (
              <div key={pr.exerciseName} className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-100 truncate">
                    {pr.exerciseName}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{pr.muscle}</div>
                </div>

                <div className="flex items-center gap-4 shrink-0 text-right font-mono-nums">
                  <div>
                    <div className="text-[11px] text-slate-500">Weight PR</div>
                    <div className="text-sm font-bold text-emerald-400">
                      {formatWeight(pr.bestWeightKg, settings.unit)} {settings.unit} × {pr.bestWeightReps}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Reps PR</div>
                    <div className="text-sm font-bold text-slate-200">
                      {pr.bestReps} @ {formatWeight(pr.bestRepsWeightKg, settings.unit)}
                    </div>
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-[11px] text-slate-500">Est. 1RM</div>
                    <div className="text-sm font-bold text-blue-400">
                      {formatWeight(pr.bestEst1RMKg, settings.unit)} {settings.unit}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
