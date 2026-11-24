import {
  ArrowLeft,
  Check,
  Flame,
  Minus,
  Plus,
  StickyNote,
  Trash2,
  Trophy,
  TrendingUp,
  Youtube,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import {
  ActiveWorkout,
  AppSettings,
  CompletedWorkout,
  WorkoutExerciseLog,
  WorkoutSetLog,
} from '../types';
import { unlockAudio } from '../utils/audio';
import {
  computeWorkoutStats,
  displayToKg,
  formatDuration,
  formatWeight,
  getDoubleProgressionSuggestion,
  getFormVideoTargetUrl,
  getLastExerciseLog,
  getWeightStep,
  isDeloadDue,
  isSetNewPR,
  kgToDisplay,
  parseRepRange,
} from '../utils/fitness';
import { ExerciseDetailData } from './ExerciseDetailSheet';

interface WorkoutViewProps {
  workout: ActiveWorkout;
  history: CompletedWorkout[];
  settings: AppSettings;
  hasRestTimerActive: boolean;
  onUpdateWorkout: (updated: ActiveWorkout) => void;
  onStartRestTimer: (mode: 'rest' | 'next-exercise', label: string, seconds: number) => void;
  onOpenExerciseDetail: (ex: ExerciseDetailData) => void;
  onMinimize: () => void;
  onFinishWorkout: () => void;
  onDiscardWorkout: () => void;
}

export function WorkoutView({
  workout,
  history,
  settings,
  hasRestTimerActive,
  onUpdateWorkout,
  onStartRestTimer,
  onOpenExerciseDetail,
  onMinimize,
  onFinishWorkout,
  onDiscardWorkout,
}: WorkoutViewProps) {
  const [elapsedSec, setElapsedSec] = useState(() =>
    Math.floor((Date.now() - workout.startedAt) / 1000)
  );
  const [prToast, setPrToast] = useState<{ exerciseName: string; reason: string } | null>(null);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const interval = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - workout.startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [workout.startedAt]);

  useEffect(() => {
    if (!prToast) return;
    const t = window.setTimeout(() => setPrToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [prToast]);

  const deloadStatus = useMemo(() => isDeloadDue(settings, history), [settings, history]);
  const liveStats = useMemo(() => computeWorkoutStats(workout.exercises), [workout.exercises]);
  const weightStepDisplay = getWeightStep(settings.unit);

  const updateExercise = (
    exIdx: number,
    updater: (ex: WorkoutExerciseLog) => WorkoutExerciseLog
  ) => {
    const nextExercises = workout.exercises.map((ex, i) => (i === exIdx ? updater(ex) : ex));
    onUpdateWorkout({ ...workout, exercises: nextExercises });
  };

  const handleApplyDeloadNow = () => {
    const adjusted = workout.exercises.map((ex) => {
      const halfCount = Math.max(1, Math.ceil(ex.sets.length / 2));
      const trimmedSets = ex.sets.slice(0, halfCount).map((s) => ({
        ...s,
        weightKg:
          s.weightKg > 0 ? Math.max(0, Math.round((s.weightKg * 0.875) / 2.5) * 2.5) : 0,
        weightKgB:
          s.weightKgB && s.weightKgB > 0
            ? Math.max(0, Math.round((s.weightKgB * 0.875) / 2.5) * 2.5)
            : s.weightKgB,
      }));
      return { ...ex, sets: trimmedSets };
    });
    onUpdateWorkout({ ...workout, isDeload: true, exercises: adjusted });
  };

  const handleWeightDelta = (exIdx: number, setIdx: number, deltaDisplay: number, part: 'A' | 'B' = 'A') => {
    updateExercise(exIdx, (ex) => ({
      ...ex,
      sets: ex.sets.map((s, i) => {
        if (i !== setIdx) return s;
        if (part === 'B') {
          const curr = kgToDisplay(s.weightKgB ?? 0, settings.unit);
          const next = Math.max(0, Math.round((curr + deltaDisplay) * 10) / 10);
          return { ...s, weightKgB: displayToKg(next, settings.unit) };
        }
        const curr = kgToDisplay(s.weightKg, settings.unit);
        const next = Math.max(0, Math.round((curr + deltaDisplay) * 10) / 10);
        return { ...s, weightKg: displayToKg(next, settings.unit) };
      }),
    }));
  };

  const handleWeightInput = (exIdx: number, setIdx: number, raw: string, part: 'A' | 'B' = 'A') => {
    const val = raw === '' ? 0 : Math.max(0, parseFloat(raw) || 0);
    const kg = displayToKg(val, settings.unit);
    updateExercise(exIdx, (ex) => ({
      ...ex,
      sets: ex.sets.map((s, i) =>
        i === setIdx ? (part === 'B' ? { ...s, weightKgB: kg } : { ...s, weightKg: kg }) : s
      ),
    }));
  };

  const handleRepsDelta = (exIdx: number, setIdx: number, delta: number, part: 'A' | 'B' = 'A') => {
    updateExercise(exIdx, (ex) => ({
      ...ex,
      sets: ex.sets.map((s, i) => {
        if (i !== setIdx) return s;
        if (part === 'B') {
          return { ...s, repsB: Math.max(0, (s.repsB ?? 0) + delta) };
        }
        return { ...s, reps: Math.max(0, s.reps + delta) };
      }),
    }));
  };

  const handleRepsInput = (exIdx: number, setIdx: number, raw: string, part: 'A' | 'B' = 'A') => {
    const val = raw === '' ? 0 : Math.max(0, parseInt(raw, 10) || 0);
    updateExercise(exIdx, (ex) => ({
      ...ex,
      sets: ex.sets.map((s, i) =>
        i === setIdx ? (part === 'B' ? { ...s, repsB: val } : { ...s, reps: val }) : s
      ),
    }));
  };

  const handleToggleSetComplete = (exIdx: number, setIdx: number, part: 'A' | 'B' = 'A') => {
    unlockAudio();
    const ex = workout.exercises[exIdx];
    const targetSet = ex.sets[setIdx];
    const isNowCompleted = part === 'B' ? !targetSet.completedB : !targetSet.completed;

    let isPR = false;
    if (isNowCompleted && !ex.isSuperset) {
      const otherSets = ex.sets.filter((_, i) => i !== setIdx);
      const prCheck = isSetNewPR(ex.name, targetSet.weightKg, targetSet.reps, history, otherSets);
      if (prCheck.isPR) {
        isPR = true;
        setPrToast({ exerciseName: ex.name, reason: prCheck.reason });
      }
    }

    const updatedSets = ex.sets.map((s, i) => {
      if (i !== setIdx) return s;
      if (part === 'B') {
        return { ...s, completedB: isNowCompleted };
      }
      return { ...s, completed: isNowCompleted, isPR: isNowCompleted ? isPR : false };
    });

    const nextExercises = workout.exercises.map((item, i) =>
      i === exIdx ? { ...item, sets: updatedSets } : item
    );
    onUpdateWorkout({ ...workout, exercises: nextExercises });

    // Rest timer logic when ticking (completing) a set
    if (isNowCompleted) {
      if (ex.isSuperset) {
        const updatedSet = updatedSets[setIdx];
        const bothDone = Boolean(updatedSet.completed && updatedSet.completedB);
        if (!bothDone) {
          // Superset rule: rest only after BOTH exercises in the round are done
          return;
        }
        const allRoundsDone = updatedSets.every((s) => s.completed && s.completedB);
        const hasNextExercise = exIdx < workout.exercises.length - 1;
        if (allRoundsDone && hasNextExercise) {
          onStartRestTimer('next-exercise', 'Next exercise setup', 90);
        } else {
          onStartRestTimer('rest', `Rest · ${ex.name}`, ex.restSeconds);
        }
      } else {
        const allSetsDone = updatedSets.every((s) => s.completed);
        const hasNextExercise = exIdx < workout.exercises.length - 1;
        if (allSetsDone && hasNextExercise) {
          onStartRestTimer('next-exercise', 'Next exercise setup', 90);
        } else {
          onStartRestTimer('rest', `Rest · ${ex.name}`, ex.restSeconds);
        }
      }
    }
  };

  const handleAddSet = (exIdx: number) => {
    updateExercise(exIdx, (ex) => {
      const last = ex.sets[ex.sets.length - 1];
      const { min } = parseRepRange(ex.targetReps);
      const newSet: WorkoutSetLog = {
        id: `${ex.exerciseId}-set-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        weightKg: last ? last.weightKg : 0,
        reps: last ? last.reps : min,
        completed: false,
        ...(ex.isSuperset
          ? {
              weightKgB: last?.weightKgB ?? 0,
              repsB: last?.repsB ?? min,
              completedB: false,
            }
          : {}),
      };
      return { ...ex, sets: [...ex.sets, newSet] };
    });
  };

  const handleRemoveSet = (exIdx: number, setIdx: number) => {
    updateExercise(exIdx, (ex) => {
      if (ex.sets.length <= 1) return ex;
      return { ...ex, sets: ex.sets.filter((_, i) => i !== setIdx) };
    });
  };

  return (
    <div className={`min-h-screen bg-[#0B0E14] ${hasRestTimerActive ? 'pb-36' : 'pb-16'}`}>
      {/* Sticky Workout Header */}
      <header className="sticky top-0 z-30 bg-[#0B0E14]/95 backdrop-blur-md border-b border-white/[0.08]">
        <div className="max-w-3xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onMinimize}
            aria-label="Minimize workout"
            className="min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center rounded-xl text-slate-300 hover:bg-white/[0.06] transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="text-sm font-bold text-slate-100 truncate">
              {workout.day} · {workout.title}
            </div>
            <div className="text-xs font-mono-nums text-slate-400">
              {formatDuration(elapsedSec)}
              <span className="mx-1.5 text-slate-600" aria-hidden="true">·</span>
              {liveStats.totalSets} sets
              <span className="mx-1.5 text-slate-600" aria-hidden="true">·</span>
              {formatWeight(liveStats.totalVolumeKg, settings.unit)} {settings.unit}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowFinishConfirm(true)}
            className="min-h-[40px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-sm font-bold transition-all shrink-0"
          >
            Finish
          </button>
        </div>
      </header>

      {/* New PR Celebration Toast */}
      <AnimatePresence>
        {prToast && (
          <motion.div
            initial={{ y: -24, opacity: 0, scale: 0.92 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-16 left-3 right-3 z-40 flex justify-center pointer-events-none"
          >
            <div className="rounded-2xl bg-emerald-500 text-slate-950 px-5 py-3 shadow-2xl shadow-emerald-950/60 flex items-center gap-3 pointer-events-auto">
              <Trophy className="w-5 h-5 shrink-0" />
              <div>
                <div className="text-sm font-extrabold leading-none">{prToast.reason}</div>
                <div className="text-xs font-semibold opacity-85 mt-0.5">{prToast.exerciseName}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Workout Body */}
      <main className="max-w-3xl mx-auto px-3 sm:px-6 pt-4 space-y-4">
        {/* Warm-up Note */}
        <div className="rounded-2xl bg-[#141821] border border-white/[0.07] px-4 py-3 text-sm text-slate-300 flex items-center gap-2.5">
          <Flame className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong className="text-slate-100">Warm-up:</strong> 5 min cardio + 1–2 light sets
          </span>
        </div>

        {/* Deload Active or Suggested Banner */}
        {workout.isDeload ? (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-xs text-amber-200">
            <strong className="text-amber-300">Deload Session Active:</strong> Sets halved, weight reduced ~10–15%. Stop with 3–4 reps in reserve.
          </div>
        ) : (
          deloadStatus.due && (
            <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-200">
                <strong className="text-amber-300">Week 5 Deload Due:</strong> Halve sets &amp; drop weight 10–15%?
              </div>
              <button
                type="button"
                onClick={handleApplyDeloadNow}
                className="min-h-[38px] px-3 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold shrink-0"
              >
                Apply Deload
              </button>
            </div>
          )
        )}

        {/* Exercise Cards */}
        {workout.exercises.map((ex, exIdx) => {
          const prevLog = getLastExerciseLog(ex.name, history);
          const prevCompletedSets = prevLog?.log.sets.filter((s) => s.completed) ?? [];
          const progression = getDoubleProgressionSuggestion(ex, history, settings.unit);
          const formUrl = getFormVideoTargetUrl(ex.name, ex.videoUrl);
          const noteVisible = openNotes[ex.exerciseId] || ex.note.trim().length > 0;

          return (
            <section
              key={ex.exerciseId}
              className="rounded-3xl bg-[#141821] border border-white/[0.08] overflow-hidden"
            >
              {/* Exercise Header */}
              <div className="p-4 pb-3 border-b border-white/[0.06]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() =>
                          onOpenExerciseDetail({
                            name: ex.name,
                            muscle: ex.muscle,
                            sets: ex.targetSets,
                            reps: ex.targetReps,
                            restSeconds: ex.restSeconds,
                            formTip: ex.formTip,
                            videoUrl: ex.videoUrl,
                          })
                        }
                        className="text-left text-lg font-bold text-blue-400 hover:text-blue-300 transition-colors leading-snug"
                      >
                        {ex.name}
                      </button>
                      <a
                        href={formUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Watch ${ex.name} form video`}
                        aria-label={`Watch form for ${ex.name}`}
                        className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/[0.06] transition-colors"
                      >
                        <Youtube className="w-5 h-5" />
                      </a>
                    </div>

                    <div className="text-xs text-slate-400 mt-0.5">
                      <span>{ex.muscle}</span>
                      <span className="mx-1.5 text-slate-600" aria-hidden="true">·</span>
                      <span className="font-mono-nums text-slate-300">
                        {ex.targetSets} × {ex.targetReps}
                      </span>
                      <span className="mx-1.5 text-slate-600" aria-hidden="true">·</span>
                      <span className="font-mono-nums">{ex.restSeconds}s rest</span>
                    </div>

                    {/* Form Tip right under exercise name */}
                    <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
                      Tip: {ex.formTip}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setOpenNotes((prev) => ({
                        ...prev,
                        [ex.exerciseId]: !noteVisible,
                      }))
                    }
                    aria-label="Toggle exercise note"
                    className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-colors shrink-0 ${
                      noteVisible
                        ? 'text-blue-400 bg-blue-500/10'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]'
                    }`}
                  >
                    <StickyNote className="w-4 h-4" />
                  </button>
                </div>

                {/* Double Progression Suggestion */}
                {progression && (
                  <div className="mt-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 px-3 py-2 flex items-center gap-2 text-xs text-emerald-300">
                    <TrendingUp className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{progression.message}</span>
                  </div>
                )}

                {/* Note Field */}
                {noteVisible && (
                  <div className="mt-2.5">
                    <input
                      type="text"
                      value={ex.note}
                      onChange={(e) =>
                        updateExercise(exIdx, (item) => ({ ...item, note: e.target.value }))
                      }
                      placeholder={
                        prevLog?.log.note
                          ? `Last note: ${prevLog.log.note}`
                          : 'Add exercise note (seat height, grip, RIR...)'
                      }
                      className="w-full min-h-[42px] rounded-xl bg-[#0B0E14] border border-white/[0.08] px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Set Rows */}
              <div className="p-3 space-y-2.5">
                {ex.isSuperset ? (
                  /* Superset UI: Part A + Part B per round */
                  ex.sets.map((s, setIdx) => {
                    const prevSet = prevCompletedSets[setIdx];
                    const partAName = ex.supersetParts?.[0] || 'Exercise A';
                    const partBName = ex.supersetParts?.[1] || 'Exercise B';
                    const roundDone = Boolean(s.completed && s.completedB);

                    return (
                      <div
                        key={s.id}
                        className={`rounded-2xl border p-3 space-y-2.5 transition-colors ${
                          roundDone
                            ? 'bg-emerald-500/[0.08] border-emerald-500/30'
                            : 'bg-[#1A202C] border-white/[0.06]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span className="font-bold font-mono-nums text-slate-200">
                            Superset Round {setIdx + 1}
                          </span>
                          <div className="flex items-center gap-2">
                            {s.completed && !s.completedB && (
                              <span className="text-amber-300 font-medium">
                                No rest — do {partBName}
                              </span>
                            )}
                            {ex.sets.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveSet(exIdx, setIdx)}
                                aria-label="Remove superset round"
                                className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Part A */}
                        <SupersetPartRow
                          label={partAName}
                          prevText={
                            prevSet
                              ? `${formatWeight(prevSet.weightKg, settings.unit)} × ${prevSet.reps}`
                              : '—'
                          }
                          weightDisplay={kgToDisplay(s.weightKg, settings.unit)}
                          reps={s.reps}
                          completed={s.completed}
                          unit={settings.unit}
                          weightStep={weightStepDisplay}
                          onWeightDelta={(d) => handleWeightDelta(exIdx, setIdx, d, 'A')}
                          onWeightInput={(v) => handleWeightInput(exIdx, setIdx, v, 'A')}
                          onRepsDelta={(d) => handleRepsDelta(exIdx, setIdx, d, 'A')}
                          onRepsInput={(v) => handleRepsInput(exIdx, setIdx, v, 'A')}
                          onToggleComplete={() => handleToggleSetComplete(exIdx, setIdx, 'A')}
                        />

                        {/* Part B */}
                        <SupersetPartRow
                          label={partBName}
                          prevText={
                            prevSet && prevSet.repsB !== undefined
                              ? `${formatWeight(prevSet.weightKgB ?? 0, settings.unit)} × ${prevSet.repsB}`
                              : '—'
                          }
                          weightDisplay={kgToDisplay(s.weightKgB ?? 0, settings.unit)}
                          reps={s.repsB ?? 0}
                          completed={Boolean(s.completedB)}
                          unit={settings.unit}
                          weightStep={weightStepDisplay}
                          onWeightDelta={(d) => handleWeightDelta(exIdx, setIdx, d, 'B')}
                          onWeightInput={(v) => handleWeightInput(exIdx, setIdx, v, 'B')}
                          onRepsDelta={(d) => handleRepsDelta(exIdx, setIdx, d, 'B')}
                          onRepsInput={(v) => handleRepsInput(exIdx, setIdx, v, 'B')}
                          onToggleComplete={() => handleToggleSetComplete(exIdx, setIdx, 'B')}
                        />
                      </div>
                    );
                  })
                ) : (
                  /* Standard Set Rows */
                  ex.sets.map((s, setIdx) => {
                    const prevSet = prevCompletedSets[setIdx];
                    const prevText = prevSet
                      ? `${formatWeight(prevSet.weightKg, settings.unit)}×${prevSet.reps}`
                      : '—';

                    return (
                      <div
                        key={s.id}
                        className={`rounded-2xl border p-2.5 transition-colors ${
                          s.completed
                            ? 'bg-emerald-500/[0.08] border-emerald-500/30'
                            : 'bg-[#1A202C] border-white/[0.06]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2 px-0.5">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-bold font-mono-nums text-slate-200">
                              Set {setIdx + 1}
                            </span>
                            <span className="text-slate-600" aria-hidden="true">·</span>
                            <span className="text-slate-400 font-mono-nums">
                              Prev {prevText}
                            </span>
                            {s.isPR && (
                              <span className="text-emerald-400 font-bold flex items-center gap-1">
                                <Trophy className="w-3.5 h-3.5" /> PR
                              </span>
                            )}
                          </div>
                          {ex.sets.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSet(exIdx, setIdx)}
                              aria-label={`Remove set ${setIdx + 1}`}
                              className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Weight Stepper */}
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-medium text-slate-400 mb-1 px-1">
                              Weight ({settings.unit})
                            </div>
                            <div className="flex items-center rounded-xl bg-[#0B0E14] border border-white/[0.08] overflow-hidden">
                              <button
                                type="button"
                                onClick={() => handleWeightDelta(exIdx, setIdx, -weightStepDisplay)}
                                aria-label="Decrease weight"
                                className="min-h-[44px] w-10 flex items-center justify-center text-slate-300 hover:bg-white/[0.06] active:bg-white/[0.12] shrink-0"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <input
                                type="number"
                                inputMode="decimal"
                                step="any"
                                value={kgToDisplay(s.weightKg, settings.unit) || ''}
                                placeholder="0"
                                onChange={(e) => handleWeightInput(exIdx, setIdx, e.target.value)}
                                className="w-full min-w-0 bg-transparent text-center font-mono-nums font-bold text-base text-slate-50 focus:outline-none py-2"
                              />
                              <button
                                type="button"
                                onClick={() => handleWeightDelta(exIdx, setIdx, weightStepDisplay)}
                                aria-label="Increase weight"
                                className="min-h-[44px] w-10 flex items-center justify-center text-slate-300 hover:bg-white/[0.06] active:bg-white/[0.12] shrink-0"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Reps Stepper */}
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-medium text-slate-400 mb-1 px-1">
                              {ex.targetReps.toLowerCase().includes('sec') ? 'Seconds' : 'Reps'}
                            </div>
                            <div className="flex items-center rounded-xl bg-[#0B0E14] border border-white/[0.08] overflow-hidden">
                              <button
                                type="button"
                                onClick={() => handleRepsDelta(exIdx, setIdx, -1)}
                                aria-label="Decrease reps"
                                className="min-h-[44px] w-10 flex items-center justify-center text-slate-300 hover:bg-white/[0.06] active:bg-white/[0.12] shrink-0"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <input
                                type="number"
                                inputMode="numeric"
                                value={s.reps || ''}
                                placeholder="0"
                                onChange={(e) => handleRepsInput(exIdx, setIdx, e.target.value)}
                                className="w-full min-w-0 bg-transparent text-center font-mono-nums font-bold text-base text-slate-50 focus:outline-none py-2"
                              />
                              <button
                                type="button"
                                onClick={() => handleRepsDelta(exIdx, setIdx, 1)}
                                aria-label="Increase reps"
                                className="min-h-[44px] w-10 flex items-center justify-center text-slate-300 hover:bg-white/[0.06] active:bg-white/[0.12] shrink-0"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Checkmark Button */}
                          <div className="pt-4 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleSetComplete(exIdx, setIdx)}
                              aria-label={s.completed ? 'Mark set incomplete' : 'Complete set'}
                              className={`min-h-[44px] min-w-[48px] rounded-xl flex items-center justify-center transition-all active:scale-95 ${
                                s.completed
                                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/50'
                                  : 'bg-[#252D3D] text-slate-300 hover:bg-[#2F394D]'
                              }`}
                            >
                              <Check className="w-5 h-5" strokeWidth={2.8} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                <button
                  type="button"
                  onClick={() => handleAddSet(exIdx)}
                  className="w-full min-h-[44px] rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Set</span>
                </button>
              </div>
            </section>
          );
        })}

        {/* Bottom Finish / Discard Controls */}
        <div className="pt-2 pb-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => setShowFinishConfirm(true)}
            className="flex-1 min-h-[52px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-base transition-all"
          >
            Finish Workout
          </button>
          <button
            type="button"
            onClick={() => setShowFinishConfirm(true)}
            className="sm:w-auto min-h-[52px] px-5 rounded-2xl bg-[#141821] hover:bg-red-500/10 border border-white/[0.08] text-slate-400 hover:text-red-400 text-sm font-semibold transition-colors"
          >
            Discard / Options
          </button>
        </div>
      </main>

      {/* Finish / Discard Modal */}
      <AnimatePresence>
        {showFinishConfirm && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFinishConfirm(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="relative z-10 w-full max-w-md rounded-3xl bg-[#141821] border border-white/10 p-5 space-y-4 shadow-2xl"
            >
              <div>
                <h2 className="text-xl font-bold text-slate-50">Finish Workout?</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Logged {liveStats.totalSets} completed sets ·{' '}
                  {formatWeight(liveStats.totalVolumeKg, settings.unit)} {settings.unit} total volume ·{' '}
                  {formatDuration(elapsedSec)}
                </p>
              </div>

              {liveStats.totalSets === 0 && (
                <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-xl p-3">
                  No sets are checked off yet. Check off sets or discard this session.
                </p>
              )}

              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  disabled={liveStats.totalSets === 0}
                  onClick={() => {
                    setShowFinishConfirm(false);
                    onFinishWorkout();
                  }}
                  className="w-full min-h-[50px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-base transition-colors"
                >
                  Save &amp; Complete Workout
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowFinishConfirm(false);
                    onDiscardWorkout();
                  }}
                  className="w-full min-h-[48px] rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold text-sm transition-colors"
                >
                  Discard Workout
                </button>
                <button
                  type="button"
                  onClick={() => setShowFinishConfirm(false)}
                  className="w-full min-h-[48px] rounded-2xl bg-[#1C222E] hover:bg-[#252D3D] text-slate-200 font-semibold text-sm transition-colors"
                >
                  Keep Training
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface SupersetPartRowProps {
  label: string;
  prevText: string;
  weightDisplay: number;
  reps: number;
  completed: boolean;
  unit: string;
  weightStep: number;
  onWeightDelta: (d: number) => void;
  onWeightInput: (v: string) => void;
  onRepsDelta: (d: number) => void;
  onRepsInput: (v: string) => void;
  onToggleComplete: () => void;
}

function SupersetPartRow({
  label,
  prevText,
  weightDisplay,
  reps,
  completed,
  unit,
  weightStep,
  onWeightDelta,
  onWeightInput,
  onRepsDelta,
  onRepsInput,
  onToggleComplete,
}: SupersetPartRowProps) {
  return (
    <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-200">{label}</span>
        <span className="font-mono-nums text-slate-400">Prev {prevText}</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center rounded-xl bg-[#0B0E14] border border-white/[0.08] overflow-hidden">
            <button
              type="button"
              onClick={() => onWeightDelta(-weightStep)}
              aria-label={`Decrease ${label} weight`}
              className="min-h-[44px] w-9 flex items-center justify-center text-slate-300 hover:bg-white/[0.06] shrink-0"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              value={weightDisplay || ''}
              placeholder={unit}
              onChange={(e) => onWeightInput(e.target.value)}
              className="w-full min-w-0 bg-transparent text-center font-mono-nums font-bold text-sm text-slate-50 focus:outline-none py-2"
            />
            <button
              type="button"
              onClick={() => onWeightDelta(weightStep)}
              aria-label={`Increase ${label} weight`}
              className="min-h-[44px] w-9 flex items-center justify-center text-slate-300 hover:bg-white/[0.06] shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center rounded-xl bg-[#0B0E14] border border-white/[0.08] overflow-hidden">
            <button
              type="button"
              onClick={() => onRepsDelta(-1)}
              aria-label={`Decrease ${label} reps`}
              className="min-h-[44px] w-9 flex items-center justify-center text-slate-300 hover:bg-white/[0.06] shrink-0"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="number"
              inputMode="numeric"
              value={reps || ''}
              placeholder="reps"
              onChange={(e) => onRepsInput(e.target.value)}
              className="w-full min-w-0 bg-transparent text-center font-mono-nums font-bold text-sm text-slate-50 focus:outline-none py-2"
            />
            <button
              type="button"
              onClick={() => onRepsDelta(1)}
              aria-label={`Increase ${label} reps`}
              className="min-h-[44px] w-9 flex items-center justify-center text-slate-300 hover:bg-white/[0.06] shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleComplete}
          aria-label={completed ? `Uncheck ${label}` : `Complete ${label}`}
          className={`min-h-[44px] min-w-[46px] rounded-xl flex items-center justify-center transition-all active:scale-95 shrink-0 ${
            completed
              ? 'bg-emerald-500 text-slate-950'
              : 'bg-[#252D3D] text-slate-300 hover:bg-[#2F394D]'
          }`}
        >
          <Check className="w-4 h-4" strokeWidth={2.8} />
        </button>
      </div>
    </div>
  );
}
