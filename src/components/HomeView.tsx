import { Check, ChevronRight, Flame, Play, RotateCcw, Sun, Youtube } from 'lucide-react';
import { useMemo } from 'react';
import { getDayKeyFromDate } from '../data/routine';
import { ActiveWorkout, AppSettings, CompletedWorkout, DayKey, RoutineDay, RoutineExercise } from '../types';
import {
  computeStreaks,
  getCurrentWeekDates,
  getDoubleProgressionSuggestion,
  getFormVideoTargetUrl,
  isDeloadDue,
} from '../utils/fitness';
import { ExerciseDetailData } from './ExerciseDetailSheet';

interface HomeViewProps {
  routine: RoutineDay[];
  history: CompletedWorkout[];
  settings: AppSettings;
  activeWorkout: ActiveWorkout | null;
  selectedDay: DayKey;
  deloadModeForNext: boolean;
  onSelectDay: (day: DayKey) => void;
  onToggleDeloadMode: () => void;
  onMarkDeloadCompleted: () => void;
  onStartWorkout: (day: DayKey, asDeload: boolean) => void;
  onResumeWorkout: () => void;
  onOpenExerciseDetail: (ex: ExerciseDetailData) => void;
}

export function HomeView({
  routine,
  history,
  settings,
  activeWorkout,
  selectedDay,
  deloadModeForNext,
  onSelectDay,
  onToggleDeloadMode,
  onMarkDeloadCompleted,
  onStartWorkout,
  onResumeWorkout,
  onOpenExerciseDetail,
}: HomeViewProps) {
  const todayKey = useMemo(() => getDayKeyFromDate(new Date()), []);
  const weekDates = useMemo(() => getCurrentWeekDates(new Date()), []);
  const streaks = useMemo(() => computeStreaks(history), [history]);
  const deloadStatus = useMemo(() => isDeloadDue(settings, history), [settings, history]);

  const completedDatesSet = useMemo(() => new Set(history.map((h) => h.date)), [history]);
  const workoutsThisWeek = useMemo(
    () => weekDates.filter((wd) => completedDatesSet.has(wd.dateStr)).length,
    [weekDates, completedDatesSet]
  );

  const selectedRoutine = useMemo(
    () => routine.find((r) => r.day === selectedDay) ?? routine[0],
    [routine, selectedDay]
  );

  const isSelectedCompletedToday = useMemo(() => {
    const selectedWeekObj = weekDates.find((w) => w.day === selectedDay);
    return selectedWeekObj ? completedDatesSet.has(selectedWeekObj.dateStr) : false;
  }, [weekDates, selectedDay, completedDatesSet]);

  const handleOpenDetail = (ex: RoutineExercise) => {
    onOpenExerciseDetail({
      name: ex.name,
      muscle: ex.muscle,
      sets: ex.sets,
      reps: ex.reps,
      restSeconds: ex.restSeconds,
      formTip: ex.formTip,
      videoUrl: ex.videoUrl,
    });
  };

  return (
    <div className="space-y-5 pb-28 md:pb-12">
      {/* Top Greeting & Streak Row */}
      <div className="flex items-end justify-between gap-4 pt-1">
        <div>
          <p className="text-xs font-medium text-slate-400">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-50 tracking-tight mt-0.5">
            {selectedDay === todayKey ? "Today's Session" : `${selectedRoutine.label} Routine`}
          </h1>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="rounded-2xl bg-[#141821] border border-white/[0.08] px-3.5 py-2 flex items-center gap-2">
            <Flame className={`w-4 h-4 ${streaks.currentDayStreak > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
            <div className="text-right">
              <div className="text-base font-bold font-mono-nums text-slate-50 leading-none">
                {streaks.currentDayStreak}d
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Streak</div>
            </div>
          </div>
          <div className="rounded-2xl bg-[#141821] border border-white/[0.08] px-3.5 py-2 text-right">
            <div className="text-base font-bold font-mono-nums text-slate-50 leading-none">
              {workoutsThisWeek}/6
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">This week</div>
          </div>
        </div>
      </div>

      {/* Resume Active Workout Banner */}
      {activeWorkout && (
        <button
          type="button"
          onClick={onResumeWorkout}
          className="w-full rounded-2xl bg-blue-600/15 hover:bg-blue-600/20 border border-blue-500/40 p-4 flex items-center justify-between gap-3 text-left transition-colors"
        >
          <div className="min-w-0">
            <div className="text-xs font-semibold text-blue-400">Workout in progress</div>
            <div className="text-base font-bold text-slate-50 truncate mt-0.5">
              {activeWorkout.day} — {activeWorkout.title}
            </div>
          </div>
          <div className="min-h-[44px] px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold flex items-center gap-1.5 shrink-0">
            <span>Resume</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </button>
      )}

      {/* Horizontal Week Strip (Mon–Sun) */}
      <div className="rounded-2xl bg-[#141821] border border-white/[0.07] p-2">
        <div className="grid grid-cols-7 gap-1">
          {weekDates.map((item) => {
            const isSelected = item.day === selectedDay;
            const isDone = completedDatesSet.has(item.dateStr);
            const isSun = item.day === 'SUN';

            return (
              <button
                key={item.day}
                type="button"
                onClick={() => onSelectDay(item.day)}
                className={`min-h-[60px] rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-950/50'
                    : item.isToday
                      ? 'bg-white/[0.06] text-slate-100 hover:bg-white/[0.1]'
                      : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                }`}
              >
                <span className="text-[11px] font-medium">{item.label}</span>
                <span className="text-sm font-bold font-mono-nums leading-none">
                  {item.dateNum}
                </span>
                <span className="h-3.5 flex items-center justify-center">
                  {isDone ? (
                    <Check
                      className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-emerald-400'}`}
                      strokeWidth={3}
                    />
                  ) : isSun ? (
                    <Sun className={`w-3 h-3 ${isSelected ? 'text-blue-100' : 'text-amber-400/70'}`} />
                  ) : (
                    <span className="w-1 h-1 rounded-full bg-transparent" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Deload Reminder Banner (Every 5 weeks) */}
      {(deloadStatus.due || deloadModeForNext) && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-amber-300">
                {deloadStatus.due ? 'Week 5 Deload Recommended' : 'Deload Mode Enabled'}
              </h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Sets halved · Weight -10–15% · Keep 3–4 reps in reserve to recover joints and nervous system.
              </p>
            </div>
            {deloadStatus.due && (
              <button
                type="button"
                onClick={onMarkDeloadCompleted}
                className="min-h-[36px] px-2.5 rounded-lg text-xs font-medium text-amber-300 hover:bg-amber-500/15 transition-colors shrink-0 flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset cycle</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleDeloadMode}
              className={`min-h-[44px] px-4 rounded-xl text-xs font-semibold transition-colors ${
                deloadModeForNext
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-[#1C222E] text-amber-200 hover:bg-[#252D3D]'
              }`}
            >
              {deloadModeForNext ? 'Deload Active for Next Session' : 'Apply Deload to Next Session'}
            </button>
          </div>
        </div>
      )}

      {/* Main Day Content */}
      {selectedRoutine.isRestDay ? (
        <div className="rounded-3xl bg-[#141821] border border-white/[0.08] p-6 space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
              <Sun className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Sunday Schedule</p>
              <h2 className="text-xl font-bold text-slate-50 mt-0.5">{selectedRoutine.title}</h2>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                Active recovery, hydration, and match play. Your Mon–Sat training streak is preserved on Sunday rest days.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-400">Missed a weekday session?</span>
            <button
              type="button"
              onClick={() => onSelectDay('MON')}
              className="min-h-[44px] px-4 rounded-xl bg-[#1C222E] hover:bg-[#252D3D] text-slate-100 text-sm font-semibold transition-colors"
            >
              Pick a Weekday Routine
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left / Summary Column */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-3xl bg-[#141821] border border-white/[0.08] p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                  <span>
                    {selectedRoutine.day} · {selectedRoutine.exercises.length} exercises
                  </span>
                  {isSelectedCompletedToday && (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Logged
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-slate-50 mt-1 text-balance">
                  {selectedRoutine.title}
                </h2>
              </div>

              {/* Warm-up note */}
              <div className="rounded-2xl bg-[#1C222E] px-4 py-3 text-sm text-slate-200">
                <span className="font-semibold text-blue-400">Warm-up: </span>
                5 min cardio + 1–2 light sets
              </div>

              {/* Start Workout CTA */}
              <button
                type="button"
                onClick={() => onStartWorkout(selectedRoutine.day, deloadModeForNext)}
                className="w-full min-h-[54px] rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] transition-all text-white font-bold text-base flex items-center justify-center gap-2.5 shadow-lg shadow-blue-950/50"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>
                  {deloadModeForNext ? 'Start Deload Workout' : 'Start Workout'}
                </span>
              </button>
            </div>
          </div>

          {/* Right / Exercise Preview List */}
          <div className="lg:col-span-7 rounded-3xl bg-[#141821] border border-white/[0.08] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/[0.07] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">Planned Exercises</h3>
              <span className="text-xs font-mono-nums text-slate-400">
                {selectedRoutine.exercises.reduce(
                  (acc, ex) => acc + (deloadModeForNext ? Math.max(1, Math.ceil(ex.sets / 2)) : ex.sets),
                  0
                )}{' '}
                total sets
              </span>
            </div>

            <div className="divide-y divide-white/[0.06]">
              {selectedRoutine.exercises.map((ex, idx) => {
                const progression = getDoubleProgressionSuggestion(ex, history, settings.unit);
                const videoHref = getFormVideoTargetUrl(ex.name, ex.videoUrl);
                const effectiveSets = deloadModeForNext ? Math.max(1, Math.ceil(ex.sets / 2)) : ex.sets;

                return (
                  <div key={ex.id} className="px-4 py-3.5 flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenDetail(ex)}
                      className="flex-1 min-w-0 text-left group py-0.5"
                    >
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-mono-nums text-slate-500 shrink-0">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className="text-base font-semibold text-slate-100 group-hover:text-blue-400 transition-colors truncate">
                          {ex.name}
                        </span>
                      </div>
                      <div className="pl-6 mt-0.5 text-xs text-slate-400">
                        <span>{ex.muscle}</span>
                        <span className="mx-1.5 text-slate-600" aria-hidden="true">·</span>
                        <span className="font-mono-nums text-slate-300">
                          {effectiveSets} × {ex.reps}
                        </span>
                        <span className="mx-1.5 text-slate-600" aria-hidden="true">·</span>
                        <span className="font-mono-nums">{ex.restSeconds}s rest</span>
                      </div>
                      <p className="pl-6 mt-1 text-xs text-slate-400/90 line-clamp-1">
                        {ex.formTip}
                      </p>
                      {progression && (
                        <p className="pl-6 mt-1 text-xs font-medium text-emerald-400">
                          {progression.message}
                        </p>
                      )}
                    </button>

                    <a
                      href={videoHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Watch ${ex.name} form video`}
                      aria-label={`Watch form video for ${ex.name}`}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-red-400 hover:bg-white/[0.06] transition-colors shrink-0"
                    >
                      <Youtube className="w-5 h-5" />
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
