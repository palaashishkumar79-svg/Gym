import { DEFAULT_ROUTINE, mapMuscleToGroups, MUSCLE_WEEKLY_TARGETS } from '../data/routine';
import {
  ActiveWorkout,
  AppSettings,
  BodyRegion,
  CompletedWorkout,
  DayKey,
  ExercisePR,
  RoutineDay,
  RoutineExercise,
  WeightUnit,
  WorkoutExerciseLog,
  WorkoutSetLog,
} from '../types';

const KG_TO_LB = 2.20462262185;

export function toLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function kgToDisplay(weightKg: number, unit: WeightUnit): number {
  if (unit === 'kg') return Math.round(weightKg * 10) / 10;
  return Math.round(weightKg * KG_TO_LB * 10) / 10;
}

export function displayToKg(displayWeight: number, unit: WeightUnit): number {
  if (unit === 'kg') return Math.round(displayWeight * 10) / 10;
  return Math.round((displayWeight / KG_TO_LB) * 10) / 10;
}

export function formatWeight(weightKg: number, unit: WeightUnit): string {
  const val = kgToDisplay(weightKg, unit);
  return Number.isInteger(val) ? String(val) : val.toFixed(1);
}

export function getWeightStep(unit: WeightUnit): number {
  return unit === 'kg' ? 2.5 : 5;
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${hrs}h ${String(mins).padStart(2, '0')}m`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatTimerClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function parseRepRange(repsStr: string): { min: number; max: number; isTimed: boolean } {
  const isTimed = repsStr.toLowerCase().includes('sec');
  const matches = repsStr.match(/\d+/g);
  if (!matches || matches.length === 0) {
    return { min: 10, max: 12, isTimed };
  }
  if (matches.length === 1) {
    const val = parseInt(matches[0], 10);
    return { min: val, max: val, isTimed };
  }
  const min = parseInt(matches[0], 10);
  const max = parseInt(matches[1], 10);
  return { min, max: Math.max(min, max), isTimed };
}

export function inferBodyRegion(exercise: Pick<RoutineExercise, 'bodyRegion' | 'muscle' | 'name'>): BodyRegion {
  if (exercise.bodyRegion) return exercise.bodyRegion;
  const text = `${exercise.muscle} ${exercise.name}`.toLowerCase();
  if (
    text.includes('quad') ||
    text.includes('hamstring') ||
    text.includes('glute') ||
    text.includes('calf') ||
    text.includes('calves') ||
    text.includes('soleus') ||
    text.includes('squat') ||
    text.includes('leg ') ||
    text.includes('rdl') ||
    text.includes('lunge') ||
    text.includes('hip thrust')
  ) {
    return 'lower';
  }
  if (text.includes('abs') || text.includes('core') || text.includes('oblique') || text.includes('plank')) {
    return 'core';
  }
  return 'upper';
}

export function estimate1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

export function getLastExerciseLog(
  exerciseName: string,
  history: CompletedWorkout[]
): { date: string; log: WorkoutExerciseLog } | null {
  const sorted = [...history].sort((a, b) => b.endedAt - a.endedAt);
  for (const w of sorted) {
    const found = w.exercises.find((ex) => ex.name.toLowerCase() === exerciseName.toLowerCase());
    if (found && found.sets.some((s) => s.completed)) {
      return { date: w.date, log: found };
    }
  }
  return null;
}

export interface ProgressionSuggestion {
  shouldIncrease: boolean;
  incrementKg: number;
  message: string;
}

export function getDoubleProgressionSuggestion(
  exercise: RoutineExercise | WorkoutExerciseLog,
  history: CompletedWorkout[],
  unit: WeightUnit
): ProgressionSuggestion | null {
  const last = getLastExerciseLog(exercise.name, history);
  if (!last) return null;

  const targetRepsStr = 'reps' in exercise ? exercise.reps : exercise.targetReps;
  const { max, isTimed } = parseRepRange(targetRepsStr);
  if (isTimed) return null;

  const completedSets = last.log.sets.filter((s) => s.completed);
  if (completedSets.length === 0) return null;

  const allHitTop = completedSets.every((s) => s.reps >= max);
  if (!allHitTop) return null;

  const region = inferBodyRegion(exercise);
  const incrementKg = region === 'lower' ? 5 : 2.5;
  const incrementLabel = unit === 'kg' ? `+${incrementKg} kg` : `+${region === 'lower' ? 10 : 5} lb`;

  return {
    shouldIncrease: true,
    incrementKg,
    message: `Double progression: hit ${max}+ reps on all sets last time — try ${incrementLabel} (1–2 RIR)`,
  };
}

export function getYouTubeSearchUrl(exerciseName: string): string {
  const query = `${exerciseName} proper form`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = trimmed.match(p);
    if (m && m[1]) return m[1];
  }
  return null;
}

export function getYouTubeEmbedUrl(url: string): string | null {
  const id = extractYouTubeVideoId(url);
  if (!id) return null;
  return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&playsinline=1&rel=0&modestbranding=1`;
}

export function getFormVideoTargetUrl(exerciseName: string, videoUrl?: string): string {
  if (videoUrl && videoUrl.trim().length > 0) {
    return videoUrl.trim();
  }
  return getYouTubeSearchUrl(exerciseName);
}

export function buildActiveWorkoutFromRoutine(
  routineDay: RoutineDay,
  history: CompletedWorkout[],
  isDeload: boolean
): ActiveWorkout {
  const exercises: WorkoutExerciseLog[] = routineDay.exercises.map((ex) => {
    const last = getLastExerciseLog(ex.name, history);
    const { min } = parseRepRange(ex.reps);
    const baseSetsCount = isDeload ? Math.max(1, Math.ceil(ex.sets / 2)) : ex.sets;
    const prevSets = last?.log.sets.filter((s) => s.completed) ?? [];

    const sets: WorkoutSetLog[] = Array.from({ length: baseSetsCount }, (_, idx) => {
      const prev = prevSets[idx] ?? prevSets[prevSets.length - 1];
      let weightKg = prev ? prev.weightKg : 0;
      if (isDeload && weightKg > 0) {
        // Reduce 12.5% and round to nearest 2.5 kg
        weightKg = Math.max(0, Math.round((weightKg * 0.875) / 2.5) * 2.5);
      }
      const reps = prev ? prev.reps : min;

      let weightKgB = prev?.weightKgB ?? 0;
      if (isDeload && weightKgB > 0) {
        weightKgB = Math.max(0, Math.round((weightKgB * 0.875) / 2.5) * 2.5);
      }
      const repsB = prev?.repsB ?? min;

      return {
        id: `${ex.id}-set-${idx + 1}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        weightKg,
        reps,
        completed: false,
        ...(ex.isSuperset
          ? {
              weightKgB,
              repsB,
              completedB: false,
            }
          : {}),
      };
    });

    return {
      exerciseId: ex.id,
      name: ex.name,
      muscle: ex.muscle,
      targetSets: ex.sets,
      targetReps: ex.reps,
      restSeconds: ex.restSeconds,
      formTip: ex.formTip,
      videoUrl: ex.videoUrl || '',
      isSuperset: ex.isSuperset,
      supersetParts: ex.supersetParts,
      bodyRegion: ex.bodyRegion,
      note: '',
      sets,
    };
  });

  return {
    id: `workout-${Date.now()}`,
    day: routineDay.day,
    title: routineDay.title,
    startedAt: Date.now(),
    isDeload,
    exercises,
  };
}

export function computeExercisePRs(history: CompletedWorkout[]): Map<string, ExercisePR> {
  const map = new Map<string, ExercisePR>();
  const chronological = [...history].sort((a, b) => a.endedAt - b.endedAt);

  for (const w of chronological) {
    for (const ex of w.exercises) {
      const key = ex.name.toLowerCase();
      for (const s of ex.sets) {
        if (!s.completed) continue;
        const est = estimate1RM(s.weightKg, s.reps);
        const existing = map.get(key);
        if (!existing) {
          map.set(key, {
            exerciseName: ex.name,
            muscle: ex.muscle,
            bestWeightKg: s.weightKg,
            bestWeightReps: s.reps,
            bestWeightDate: w.date,
            bestReps: s.reps,
            bestRepsWeightKg: s.weightKg,
            bestRepsDate: w.date,
            bestEst1RMKg: est,
            bestEst1RMDate: w.date,
          });
        } else {
          if (
            s.weightKg > existing.bestWeightKg ||
            (s.weightKg === existing.bestWeightKg && s.reps > existing.bestWeightReps)
          ) {
            existing.bestWeightKg = s.weightKg;
            existing.bestWeightReps = s.reps;
            existing.bestWeightDate = w.date;
          }
          if (
            s.reps > existing.bestReps ||
            (s.reps === existing.bestReps && s.weightKg > existing.bestRepsWeightKg)
          ) {
            existing.bestReps = s.reps;
            existing.bestRepsWeightKg = s.weightKg;
            existing.bestRepsDate = w.date;
          }
          if (est > existing.bestEst1RMKg) {
            existing.bestEst1RMKg = est;
            existing.bestEst1RMDate = w.date;
          }
        }
      }
    }
  }

  return map;
}

export function isSetNewPR(
  exerciseName: string,
  weightKg: number,
  reps: number,
  history: CompletedWorkout[],
  currentWorkoutOtherSets: WorkoutSetLog[]
): { isPR: boolean; reason: string } {
  if (reps <= 0 || weightKg <= 0) return { isPR: false, reason: '' };
  const prs = computeExercisePRs(history);
  const prev = prs.get(exerciseName.toLowerCase());
  if (!prev) {
    // Only celebrate PRs once user has at least 1 prior completed workout for this exercise
    return { isPR: false, reason: '' };
  }

  let bestWeightSoFar = prev.bestWeightKg;
  let best1RMSoFar = prev.bestEst1RMKg;
  for (const s of currentWorkoutOtherSets) {
    if (s.completed) {
      if (s.weightKg > bestWeightSoFar) bestWeightSoFar = s.weightKg;
      const e = estimate1RM(s.weightKg, s.reps);
      if (e > best1RMSoFar) best1RMSoFar = e;
    }
  }

  const newEst1RM = estimate1RM(weightKg, reps);
  if (weightKg > bestWeightSoFar) {
    return { isPR: true, reason: 'New Weight PR!' };
  }
  if (newEst1RM > best1RMSoFar) {
    return { isPR: true, reason: 'New Est. 1RM PR!' };
  }
  return { isPR: false, reason: '' };
}

export function getStartOfWeek(date: Date = new Date()): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0=Sun..6=Sat
  const diffToMon = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMon);
  return d;
}

export function getCurrentWeekDates(referenceDate: Date = new Date()): { day: DayKey; label: string; dateStr: string; dateNum: number; isToday: boolean }[] {
  const monday = getStartOfWeek(referenceDate);
  const todayStr = toLocalDateString(referenceDate);
  const keys: DayKey[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return keys.map((day, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    const dateStr = toLocalDateString(d);
    return {
      day,
      label: labels[idx],
      dateStr,
      dateNum: d.getDate(),
      isToday: dateStr === todayStr,
    };
  });
}

/**
 * Calculates consecutive training streak (Mon-Sat workout days, Sunday rest day does not break streak).
 * Also calculates consecutive weeks with >= 4 workouts.
 */
export function computeStreaks(history: CompletedWorkout[]): {
  currentDayStreak: number;
  longestDayStreak: number;
  weeklyConsistencyStreak: number;
} {
  if (history.length === 0) {
    return { currentDayStreak: 0, longestDayStreak: 0, weeklyConsistencyStreak: 0 };
  }

  const dateSet = new Set(history.map((h) => h.date));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Current streak walking backwards from today (or yesterday if today not logged yet)
  let cursor = new Date(today);
  const todayStr = toLocalDateString(cursor);
  if (!dateSet.has(todayStr)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let currentDayStreak = 0;
  for (let i = 0; i < 730; i++) {
    const dStr = toLocalDateString(cursor);
    const isSunday = cursor.getDay() === 0;
    if (dateSet.has(dStr)) {
      currentDayStreak++;
    } else if (isSunday) {
      // Rest / Cricket day preserves streak without adding or breaking
    } else {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  // Longest day streak across all dates
  const sortedDates = Array.from(dateSet).sort();
  let longestDayStreak = 0;
  if (sortedDates.length > 0) {
    let run = 1;
    longestDayStreak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const prev = parseLocalDate(sortedDates[i - 1]);
      const curr = parseLocalDate(sortedDates[i]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      if (diffDays === 1) {
        run++;
      } else if (diffDays === 2) {
        // Check if the skipped day was Sunday
        const middle = new Date(prev);
        middle.setDate(prev.getDate() + 1);
        if (middle.getDay() === 0) {
          run++;
        } else {
          run = 1;
        }
      } else {
        run = 1;
      }
      if (run > longestDayStreak) longestDayStreak = run;
    }
  }

  // Weekly consistency streak: consecutive weeks (including current if >=1) with >= 4 workouts
  const weekCounts = new Map<string, number>();
  for (const h of history) {
    const monStr = toLocalDateString(getStartOfWeek(parseLocalDate(h.date)));
    weekCounts.set(monStr, (weekCounts.get(monStr) || 0) + 1);
  }
  let weeklyConsistencyStreak = 0;
  let weekCursor = getStartOfWeek(today);
  const thisWeekStr = toLocalDateString(weekCursor);
  if ((weekCounts.get(thisWeekStr) || 0) >= 4) {
    weeklyConsistencyStreak++;
  }
  weekCursor.setDate(weekCursor.getDate() - 7);
  for (let i = 0; i < 104; i++) {
    const wStr = toLocalDateString(weekCursor);
    if ((weekCounts.get(wStr) || 0) >= 4) {
      weeklyConsistencyStreak++;
      weekCursor.setDate(weekCursor.getDate() - 7);
    } else {
      break;
    }
  }

  return { currentDayStreak, longestDayStreak, weeklyConsistencyStreak };
}

export function isDeloadDue(settings: AppSettings, history: CompletedWorkout[]): {
  due: boolean;
  weeksSinceDeload: number;
} {
  if (!settings.deloadEnabled) return { due: false, weeksSinceDeload: 0 };

  const anchorStr = settings.lastDeloadDate || settings.programStartDate;
  const anchor = parseLocalDate(anchorStr);
  const today = new Date();
  const diffDays = Math.max(0, Math.floor((today.getTime() - anchor.getTime()) / 86400000));
  const weeksSinceDeload = Math.floor(diffDays / 7);

  // Also check if user has completed >= 24 workouts since last deload (~4 weeks of 6-day routine)
  const workoutsSinceAnchor = history.filter((h) => h.date >= anchorStr && !h.isDeload).length;
  const due = weeksSinceDeload >= 4 || workoutsSinceAnchor >= 24;

  return { due, weeksSinceDeload };
}

export function computeWeeklyMuscleSets(
  history: CompletedWorkout[],
  routine: RoutineDay[] = DEFAULT_ROUTINE
): { group: string; actual: number; target: number }[] {
  const mondayStr = toLocalDateString(getStartOfWeek(new Date()));
  const counts = new Map<string, number>();

  for (const w of history) {
    if (w.date < mondayStr) continue;
    for (const ex of w.exercises) {
      const completedCount = ex.sets.filter((s) => s.completed).length;
      if (completedCount === 0) continue;
      const groups = mapMuscleToGroups(ex.muscle);
      for (const g of groups) {
        counts.set(g, (counts.get(g) || 0) + completedCount);
      }
    }
  }

  // Compute dynamic weekly targets from the active routine if customized
  const routineTargets = new Map<string, number>();
  for (const day of routine) {
    for (const ex of day.exercises) {
      const groups = mapMuscleToGroups(ex.muscle);
      for (const g of groups) {
        routineTargets.set(g, (routineTargets.get(g) || 0) + ex.sets);
      }
    }
  }

  return MUSCLE_WEEKLY_TARGETS.map(({ group, target }) => ({
    group,
    actual: counts.get(group) || 0,
    target: routineTargets.get(group) || target,
  }));
}

export function computeWorkoutStats(workout: WorkoutExerciseLog[]): {
  totalVolumeKg: number;
  totalSets: number;
  prCount: number;
} {
  let totalVolumeKg = 0;
  let totalSets = 0;
  let prCount = 0;

  for (const ex of workout) {
    for (const s of ex.sets) {
      if (s.completed) {
        totalSets++;
        totalVolumeKg += s.weightKg * s.reps;
        if (s.isPR) prCount++;
      }
      if (ex.isSuperset && s.completedB) {
        totalSets++;
        totalVolumeKg += (s.weightKgB || 0) * (s.repsB || 0);
        if (s.isPRB) prCount++;
      }
    }
  }

  return {
    totalVolumeKg: Math.round(totalVolumeKg),
    totalSets,
    prCount,
  };
}
