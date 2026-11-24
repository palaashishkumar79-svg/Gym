import { CheckCircle2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import { AchievementsView } from './components/AchievementsView';
import { AppTab, BottomNav } from './components/BottomNav';
import { ExerciseDetailData, ExerciseDetailSheet } from './components/ExerciseDetailSheet';
import { HistoryView } from './components/HistoryView';
import { HomeView } from './components/HomeView';
import { RestTimerBar } from './components/RestTimerBar';
import { SettingsView } from './components/SettingsView';
import { StatsView } from './components/StatsView';
import { WorkoutView } from './components/WorkoutView';
import { getDayKeyFromDate } from './data/routine';
import {
  ActiveWorkout,
  AppSettings,
  CompletedWorkout,
  DayKey,
  RestTimerState,
  RoutineDay,
} from './types';
import {
  playTimerBeep,
  releaseWakeLock,
  requestWakeLock,
  triggerVibration,
  unlockAudio,
} from './utils/audio';
import {
  buildActiveWorkoutFromRoutine,
  computeWorkoutStats,
  toLocalDateString,
} from './utils/fitness';
import {
  loadActiveWorkout,
  loadHistory,
  loadRoutine,
  loadSettings,
  saveActiveWorkout,
  saveHistory,
  saveRoutine,
  saveSettings,
} from './utils/storage';

export default function App() {
  const [routine, setRoutine] = useState<RoutineDay[]>(() => loadRoutine());
  const [history, setHistory] = useState<CompletedWorkout[]>(() => loadHistory());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(() => loadActiveWorkout());

  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [selectedDay, setSelectedDay] = useState<DayKey>(() => getDayKeyFromDate(new Date()));
  const [isWorkoutScreenOpen, setIsWorkoutScreenOpen] = useState<boolean>(() =>
    Boolean(loadActiveWorkout())
  );
  const [deloadModeForNext, setDeloadModeForNext] = useState(false);

  const [detailExercise, setDetailExercise] = useState<ExerciseDetailData | null>(null);
  const [restTimer, setRestTimer] = useState<RestTimerState | null>(null);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  // Sync persistence
  useEffect(() => {
    saveRoutine(routine);
  }, [routine]);

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveActiveWorkout(activeWorkout);
  }, [activeWorkout]);

  // Keep screen awake during active workout or running rest timer
  useEffect(() => {
    const shouldKeepAwake = isWorkoutScreenOpen || Boolean(restTimer?.active);
    if (shouldKeepAwake) {
      void requestWakeLock();
    } else {
      void releaseWakeLock();
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && shouldKeepAwake) {
        void requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isWorkoutScreenOpen, restTimer?.active]);

  // Rest timer countdown loop
  useEffect(() => {
    if (!restTimer || !restTimer.active) return;

    const tick = () => {
      const remaining = (restTimer.endTimeMs - Date.now()) / 1000;
      if (remaining <= 0) {
        setRestTimer(null);
        if (settings.soundEnabled) playTimerBeep();
        if (settings.vibrateEnabled) triggerVibration([200, 100, 200]);
      } else {
        setRestTimer((prev) =>
          prev && prev.active ? { ...prev, remainingSeconds: remaining } : prev
        );
      }
    };

    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [restTimer?.active, restTimer?.endTimeMs, settings.soundEnabled, settings.vibrateEnabled]);

  useEffect(() => {
    if (!savedBanner) return;
    const t = window.setTimeout(() => setSavedBanner(null), 4000);
    return () => window.clearTimeout(t);
  }, [savedBanner]);

  const handleStartRestTimer = useCallback(
    (mode: 'rest' | 'next-exercise', label: string, seconds: number) => {
      const safeSecs = Math.max(5, seconds);
      setRestTimer({
        active: true,
        mode,
        label,
        totalSeconds: safeSecs,
        remainingSeconds: safeSecs,
        endTimeMs: Date.now() + safeSecs * 1000,
      });
    },
    []
  );

  const handleAdjustRestTimer = useCallback((deltaSeconds: number) => {
    setRestTimer((prev) => {
      if (!prev || !prev.active) return prev;
      const newEndMs = prev.endTimeMs + deltaSeconds * 1000;
      const newRemaining = (newEndMs - Date.now()) / 1000;
      if (newRemaining <= 0) {
        return null;
      }
      return {
        ...prev,
        endTimeMs: newEndMs,
        totalSeconds: Math.max(prev.totalSeconds, Math.ceil(newRemaining)),
        remainingSeconds: newRemaining,
      };
    });
  }, []);

  const handleSkipRestTimer = useCallback(() => {
    setRestTimer(null);
  }, []);

  const handleStartWorkout = (day: DayKey, asDeload: boolean) => {
    unlockAudio();
    const routineDay = routine.find((r) => r.day === day);
    if (!routineDay || routineDay.isRestDay) return;

    const fresh = buildActiveWorkoutFromRoutine(routineDay, history, asDeload);
    setActiveWorkout(fresh);
    setIsWorkoutScreenOpen(true);
    setDeloadModeForNext(false);
  };

  const handleFinishWorkout = () => {
    if (!activeWorkout) return;
    const endedAt = Date.now();
    const stats = computeWorkoutStats(activeWorkout.exercises);

    const completed: CompletedWorkout = {
      id: activeWorkout.id,
      day: activeWorkout.day,
      title: activeWorkout.title,
      date: toLocalDateString(new Date(endedAt)),
      startedAt: activeWorkout.startedAt,
      endedAt,
      durationSeconds: Math.max(1, Math.floor((endedAt - activeWorkout.startedAt) / 1000)),
      isDeload: activeWorkout.isDeload,
      totalVolumeKg: stats.totalVolumeKg,
      totalSets: stats.totalSets,
      prCount: stats.prCount,
      exercises: activeWorkout.exercises,
    };

    setHistory((prev) => [completed, ...prev]);
    if (activeWorkout.isDeload) {
      setSettings((prev) => ({ ...prev, lastDeloadDate: completed.date }));
    }
    setActiveWorkout(null);
    setRestTimer(null);
    setIsWorkoutScreenOpen(false);
    setActiveTab('history');
    setSavedBanner(`Saved ${completed.day} workout · ${completed.totalSets} sets`);
  };

  const handleDiscardWorkout = () => {
    setActiveWorkout(null);
    setRestTimer(null);
    setIsWorkoutScreenOpen(false);
  };

  const handleMarkDeloadCompleted = () => {
    setSettings((prev) => ({
      ...prev,
      lastDeloadDate: toLocalDateString(new Date()),
    }));
    setDeloadModeForNext(false);
  };

  const handleDeleteWorkout = (id: string) => {
    setHistory((prev) => prev.filter((w) => w.id !== id));
  };

  const handleImportBackup = (
    importedRoutine: RoutineDay[],
    importedHistory: CompletedWorkout[],
    importedSettings: AppSettings
  ) => {
    setRoutine(importedRoutine);
    setHistory(importedHistory);
    setSettings(importedSettings);
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-100">
      {/* Saved Workout Confirmation Toast */}
      <AnimatePresence>
        {savedBanner && (
          <motion.div
            initial={{ y: -24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -24, opacity: 0 }}
            className="fixed top-4 left-3 right-3 z-50 flex justify-center pointer-events-none"
          >
            <div className="rounded-2xl bg-emerald-600 text-white px-4 py-3 shadow-2xl flex items-center gap-2 text-sm font-semibold pointer-events-auto">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{savedBanner}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isWorkoutScreenOpen && activeWorkout ? (
        <WorkoutView
          workout={activeWorkout}
          history={history}
          settings={settings}
          hasRestTimerActive={Boolean(restTimer?.active)}
          onUpdateWorkout={setActiveWorkout}
          onStartRestTimer={handleStartRestTimer}
          onOpenExerciseDetail={setDetailExercise}
          onMinimize={() => setIsWorkoutScreenOpen(false)}
          onFinishWorkout={handleFinishWorkout}
          onDiscardWorkout={handleDiscardWorkout}
        />
      ) : (
        <>
          <BottomNav activeTab={activeTab} onSelectTab={setActiveTab} />

          <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
            {activeTab === 'home' && (
              <HomeView
                routine={routine}
                history={history}
                settings={settings}
                activeWorkout={activeWorkout}
                selectedDay={selectedDay}
                deloadModeForNext={deloadModeForNext}
                onSelectDay={setSelectedDay}
                onToggleDeloadMode={() => setDeloadModeForNext((v) => !v)}
                onMarkDeloadCompleted={handleMarkDeloadCompleted}
                onStartWorkout={handleStartWorkout}
                onResumeWorkout={() => setIsWorkoutScreenOpen(true)}
                onOpenExerciseDetail={setDetailExercise}
              />
            )}

            {activeTab === 'history' && (
              <HistoryView
                history={history}
                routine={routine}
                settings={settings}
                onDeleteWorkout={handleDeleteWorkout}
              />
            )}

            {activeTab === 'awards' && (
              <AchievementsView history={history} settings={settings} />
            )}

            {activeTab === 'stats' && (
              <StatsView history={history} routine={routine} settings={settings} />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                routine={routine}
                history={history}
                settings={settings}
                onUpdateSettings={setSettings}
                onUpdateRoutine={setRoutine}
                onImportBackup={handleImportBackup}
                onClearAllHistory={() => setHistory([])}
                onMarkDeloadCompleted={handleMarkDeloadCompleted}
              />
            )}
          </main>
        </>
      )}

      {/* Persistent Rest Timer Bar */}
      <RestTimerBar
        timer={restTimer}
        onAdjust={handleAdjustRestTimer}
        onSkip={handleSkipRestTimer}
      />

      {/* Exercise Detail Bottom Sheet */}
      <ExerciseDetailSheet
        exercise={detailExercise}
        onClose={() => setDetailExercise(null)}
      />
    </div>
  );
}
