import { DEFAULT_ROUTINE } from '../data/routine';
import { ActiveWorkout, AppBackupData, AppSettings, CompletedWorkout, RoutineDay } from '../types';
import { toLocalDateString } from './fitness';

const KEYS = {
  ROUTINE: 'ironlog_routine_v1',
  HISTORY: 'ironlog_history_v1',
  SETTINGS: 'ironlog_settings_v1',
  ACTIVE_WORKOUT: 'ironlog_active_workout_v1',
};

export const DEFAULT_SETTINGS: AppSettings = {
  unit: 'kg',
  soundEnabled: true,
  vibrateEnabled: true,
  deloadEnabled: true,
  lastDeloadDate: null,
  programStartDate: toLocalDateString(new Date()),
};

export function loadRoutine(): RoutineDay[] {
  try {
    const raw = localStorage.getItem(KEYS.ROUTINE);
    if (!raw) return DEFAULT_ROUTINE;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === 7) {
      return parsed;
    }
  } catch {
    // fallback
  }
  return DEFAULT_ROUTINE;
}

export function saveRoutine(routine: RoutineDay[]): void {
  try {
    localStorage.setItem(KEYS.ROUTINE, JSON.stringify(routine));
  } catch {
    // ignore quota errors
  }
}

export function loadHistory(): CompletedWorkout[] {
  try {
    const raw = localStorage.getItem(KEYS.HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // fallback
  }
  return [];
}

export function saveHistory(history: CompletedWorkout[]): void {
  try {
    localStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
  } catch {
    // ignore
  }
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function loadActiveWorkout(): ActiveWorkout | null {
  try {
    const raw = localStorage.getItem(KEYS.ACTIVE_WORKOUT);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.exercises)) return parsed;
  } catch {
    // ignore
  }
  return null;
}

export function saveActiveWorkout(workout: ActiveWorkout | null): void {
  try {
    if (!workout) {
      localStorage.removeItem(KEYS.ACTIVE_WORKOUT);
    } else {
      localStorage.setItem(KEYS.ACTIVE_WORKOUT, JSON.stringify(workout));
    }
  } catch {
    // ignore
  }
}

export function createBackupPayload(
  routine: RoutineDay[],
  history: CompletedWorkout[],
  settings: AppSettings
): AppBackupData {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    routine,
    history,
    settings,
  };
}

export function parseBackupPayload(jsonText: string): AppBackupData {
  const parsed = JSON.parse(jsonText);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid JSON backup file.');
  }
  if (!Array.isArray(parsed.routine) || !Array.isArray(parsed.history)) {
    throw new Error('Backup file is missing routine or history arrays.');
  }
  return {
    version: typeof parsed.version === 'number' ? parsed.version : 1,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString(),
    routine: parsed.routine,
    history: parsed.history,
    settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
  };
}
