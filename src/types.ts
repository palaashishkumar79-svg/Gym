export type DayKey = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

export type WeightUnit = 'kg' | 'lb';

export type BodyRegion = 'upper' | 'lower' | 'core';

export interface RoutineExercise {
  id: string;
  name: string;
  muscle: string;
  sets: number;
  reps: string;
  restSeconds: number;
  formTip: string;
  videoUrl: string;
  isSuperset?: boolean;
  supersetParts?: [string, string];
  bodyRegion?: BodyRegion;
}

export interface RoutineDay {
  day: DayKey;
  label: string;
  title: string;
  isRestDay?: boolean;
  exercises: RoutineExercise[];
}

export interface WorkoutSetLog {
  id: string;
  weightKg: number;
  reps: number;
  completed: boolean;
  isPR?: boolean;
  // For supersets (Part B)
  weightKgB?: number;
  repsB?: number;
  completedB?: boolean;
  isPRB?: boolean;
}

export interface WorkoutExerciseLog {
  exerciseId: string;
  name: string;
  muscle: string;
  targetSets: number;
  targetReps: string;
  restSeconds: number;
  formTip: string;
  videoUrl: string;
  isSuperset?: boolean;
  supersetParts?: [string, string];
  bodyRegion?: BodyRegion;
  note: string;
  sets: WorkoutSetLog[];
}

export interface ActiveWorkout {
  id: string;
  day: DayKey;
  title: string;
  startedAt: number; // timestamp ms
  isDeload: boolean;
  exercises: WorkoutExerciseLog[];
}

export interface CompletedWorkout {
  id: string;
  day: DayKey;
  title: string;
  date: string; // YYYY-MM-DD local date
  startedAt: number;
  endedAt: number;
  durationSeconds: number;
  isDeload: boolean;
  totalVolumeKg: number;
  totalSets: number;
  prCount: number;
  exercises: WorkoutExerciseLog[];
}

export interface AppSettings {
  unit: WeightUnit;
  soundEnabled: boolean;
  vibrateEnabled: boolean;
  deloadEnabled: boolean;
  lastDeloadDate: string | null; // YYYY-MM-DD
  programStartDate: string; // YYYY-MM-DD
}

export interface RestTimerState {
  active: boolean;
  mode: 'rest' | 'next-exercise';
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  endTimeMs: number;
}

export interface ExercisePR {
  exerciseName: string;
  muscle: string;
  bestWeightKg: number;
  bestWeightReps: number;
  bestWeightDate: string;
  bestReps: number;
  bestRepsWeightKg: number;
  bestRepsDate: string;
  bestEst1RMKg: number;
  bestEst1RMDate: string;
}

export interface AppBackupData {
  version: number;
  exportedAt: string;
  routine: RoutineDay[];
  history: CompletedWorkout[];
  settings: AppSettings;
}
