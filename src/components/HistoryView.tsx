import { Calendar, ChevronDown, ChevronUp, Clock, Dumbbell, Trash2, Trophy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AppSettings, CompletedWorkout, RoutineDay } from '../types';
import {
  estimate1RM,
  formatDuration,
  formatWeight,
  kgToDisplay,
  parseLocalDate,
} from '../utils/fitness';

interface HistoryViewProps {
  history: CompletedWorkout[];
  routine: RoutineDay[];
  settings: AppSettings;
  onDeleteWorkout: (id: string) => void;
}

export function HistoryView({ history, routine, settings, onDeleteWorkout }: HistoryViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [chartMetric, setChartMetric] = useState<'weight' | '1rm'>('1rm');

  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => b.endedAt - a.endedAt),
    [history]
  );

  // Collect all unique exercise names across routine & history
  const exerciseNames = useMemo(() => {
    const set = new Set<string>();
    for (const day of routine) {
      for (const ex of day.exercises) {
        set.add(ex.name);
      }
    }
    for (const w of history) {
      for (const ex of w.exercises) {
        set.add(ex.name);
      }
    }
    return Array.from(set);
  }, [routine, history]);

  const [selectedExercise, setSelectedExercise] = useState<string>(
    () => exerciseNames[0] || 'Incline DB Press'
  );

  const chartPoints = useMemo(() => {
    const chrono = [...history].sort((a, b) => a.endedAt - b.endedAt);
    const points: { date: string; label: string; bestWeightDisplay: number; best1RMDisplay: number }[] = [];

    for (const w of chrono) {
      const ex = w.exercises.find(
        (item) => item.name.toLowerCase() === selectedExercise.toLowerCase()
      );
      if (!ex) continue;
      const completed = ex.sets.filter((s) => s.completed && s.weightKg > 0 && s.reps > 0);
      if (completed.length === 0) continue;

      let maxW = 0;
      let max1RM = 0;
      for (const s of completed) {
        if (s.weightKg > maxW) maxW = s.weightKg;
        const est = estimate1RM(s.weightKg, s.reps);
        if (est > max1RM) max1RM = est;
      }

      const d = parseLocalDate(w.date);
      points.push({
        date: w.date,
        label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        bestWeightDisplay: kgToDisplay(maxW, settings.unit),
        best1RMDisplay: kgToDisplay(max1RM, settings.unit),
      });
    }
    return points;
  }, [history, selectedExercise, settings.unit]);

  return (
    <div className="space-y-6 pb-28 md:pb-12">
      <div className="pt-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-50 tracking-tight">History</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          {sortedHistory.length} logged {sortedHistory.length === 1 ? 'session' : 'sessions'}
        </p>
      </div>

      {/* Per-Exercise Progress Chart */}
      <section className="rounded-3xl bg-[#141821] border border-white/[0.08] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-100">Exercise Progress</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Best weight &amp; estimated 1RM over time
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0B0E14] border border-white/[0.06] self-start">
            <button
              type="button"
              onClick={() => setChartMetric('1rm')}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold transition-colors ${
                chartMetric === '1rm' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Est. 1RM
            </button>
            <button
              type="button"
              onClick={() => setChartMetric('weight')}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold transition-colors ${
                chartMetric === 'weight' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Best Weight
            </button>
          </div>
        </div>

        <select
          aria-label="Select exercise for progress chart"
          value={selectedExercise}
          onChange={(e) => setSelectedExercise(e.target.value)}
          className="w-full min-h-[46px] rounded-xl bg-[#0B0E14] border border-white/[0.08] px-3.5 text-sm font-medium text-slate-100 focus:outline-none focus:border-blue-500"
        >
          {exerciseNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        {chartPoints.length === 0 ? (
          <div className="rounded-2xl bg-[#0B0E14] border border-white/[0.05] py-10 px-4 text-center text-sm text-slate-400">
            No completed weighted sets logged yet for {selectedExercise}.
          </div>
        ) : (
          <ProgressLineChart
            points={chartPoints}
            metric={chartMetric}
            unit={settings.unit}
          />
        )}
      </section>

      {/* Past Workouts List */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-slate-100">Past Sessions</h2>

        {sortedHistory.length === 0 ? (
          <div className="rounded-3xl bg-[#141821] border border-white/[0.08] p-8 text-center space-y-2">
            <Dumbbell className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-base font-semibold text-slate-200">No workouts logged yet</p>
            <p className="text-sm text-slate-400">
              Start today&apos;s session from the Today tab to begin tracking your sets and PRs.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedHistory.map((w) => {
              const isExpanded = expandedId === w.id;
              const dateObj = parseLocalDate(w.date);
              const formattedDate = dateObj.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <div
                  key={w.id}
                  className="rounded-3xl bg-[#141821] border border-white/[0.08] overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : w.id)}
                    className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-bold text-slate-50 truncate">
                          {w.day} — {w.title}
                        </span>
                        {w.isDeload && (
                          <span className="text-xs font-semibold text-amber-400">· Deload</span>
                        )}
                      </div>

                      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formattedDate}
                        </span>
                        <span className="inline-flex items-center gap-1 font-mono-nums">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDuration(w.durationSeconds)}
                        </span>
                        <span className="font-mono-nums text-slate-300">
                          {formatWeight(w.totalVolumeKg, settings.unit)} {settings.unit}
                        </span>
                        <span className="font-mono-nums">{w.totalSets} sets</span>
                        {w.prCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold font-mono-nums">
                            <Trophy className="w-3.5 h-3.5" /> {w.prCount} PR
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 shrink-0">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-white/[0.06] space-y-3">
                      {w.exercises.map((ex) => {
                        const doneSets = ex.sets.filter((s) => s.completed || s.completedB);
                        if (doneSets.length === 0) return null;
                        return (
                          <div key={ex.exerciseId} className="rounded-2xl bg-[#0B0E14] p-3 space-y-1.5">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-sm font-semibold text-slate-100">{ex.name}</span>
                              <span className="text-xs text-slate-500">{ex.muscle}</span>
                            </div>
                            {ex.note && (
                              <p className="text-xs text-slate-400 italic">Note: {ex.note}</p>
                            )}
                            <div className="space-y-1 pt-1">
                              {doneSets.map((s, idx) => (
                                <div
                                  key={s.id}
                                  className="flex items-center justify-between text-xs font-mono-nums text-slate-300"
                                >
                                  <span className="text-slate-500">Set {idx + 1}</span>
                                  <div className="flex items-center gap-2">
                                    {ex.isSuperset ? (
                                      <span>
                                        {formatWeight(s.weightKg, settings.unit)} {settings.unit} × {s.reps} +{' '}
                                        {formatWeight(s.weightKgB ?? 0, settings.unit)} {settings.unit} × {s.repsB ?? 0}
                                      </span>
                                    ) : (
                                      <span>
                                        {formatWeight(s.weightKg, settings.unit)} {settings.unit} × {s.reps} reps
                                      </span>
                                    )}
                                    {s.isPR && <Trophy className="w-3.5 h-3.5 text-emerald-400" />}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => onDeleteWorkout(w.id)}
                          className="min-h-[40px] px-3 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 flex items-center gap-1.5 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Session</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

interface ProgressLineChartProps {
  points: { date: string; label: string; bestWeightDisplay: number; best1RMDisplay: number }[];
  metric: 'weight' | '1rm';
  unit: string;
}

function ProgressLineChart({ points, metric, unit }: ProgressLineChartProps) {
  const [activeIdx, setActiveIdx] = useState<number>(points.length - 1);
  const safeIdx = Math.min(activeIdx, points.length - 1);
  const values = points.map((p) => (metric === '1rm' ? p.best1RMDisplay : p.bestWeightDisplay));
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = Math.max(1, maxVal - minVal);
  const padMin = Math.max(0, minVal - range * 0.15);
  const padMax = maxVal + range * 0.15;
  const padRange = Math.max(1, padMax - padMin);

  const width = 520;
  const height = 180;
  const padX = 28;
  const padY = 20;
  const plotW = width - padX * 2;
  const plotH = height - padY * 2;

  const coords = points.map((p, i) => {
    const val = metric === '1rm' ? p.best1RMDisplay : p.bestWeightDisplay;
    const x = points.length === 1 ? padX + plotW / 2 : padX + (i / (points.length - 1)) * plotW;
    const y = padY + plotH - ((val - padMin) / padRange) * plotH;
    return { x, y, val, label: p.label };
  });

  const pathD = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');

  const areaD =
    coords.length > 1
      ? `${pathD} L ${coords[coords.length - 1].x.toFixed(1)} ${(padY + plotH).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(padY + plotH).toFixed(1)} Z`
      : '';

  const selected = coords[safeIdx];

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between px-1">
        <div className="text-xs text-slate-400">
          {selected?.label} · {metric === '1rm' ? 'Est. 1RM' : 'Best Weight'}
        </div>
        <div className="text-lg font-bold font-mono-nums text-blue-400">
          {selected?.val} {unit}
        </div>
      </div>

      <div className="rounded-2xl bg-[#0B0E14] border border-white/[0.06] p-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible">
          {/* Grid lines */}
          {[0, 0.5, 1].map((t) => {
            const y = padY + t * plotH;
            return (
              <line
                key={t}
                x1={padX}
                x2={width - padX}
                y1={y}
                y2={y}
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray="3 3"
              />
            );
          })}

          {areaD && (
            <path d={areaD} fill="rgba(59, 130, 246, 0.12)" />
          )}

          {coords.length > 1 && (
            <path
              d={pathD}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {coords.map((c, idx) => {
            const isSel = idx === safeIdx;
            return (
              <g key={`${c.label}-${idx}`} className="cursor-pointer" onClick={() => setActiveIdx(idx)}>
                <circle cx={c.x} cy={c.y} r={14} fill="transparent" />
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={isSel ? 5.5 : 3.5}
                  fill={isSel ? '#60A5FA' : '#1E293B'}
                  stroke="#3B82F6"
                  strokeWidth="2"
                />
              </g>
            );
          })}
        </svg>

        <div className="flex items-center justify-between px-3 pb-1 text-[11px] font-mono-nums text-slate-500">
          <span>{points[0]?.label}</span>
          {points.length > 1 && <span>{points[points.length - 1]?.label}</span>}
        </div>
      </div>
    </div>
  );
}
