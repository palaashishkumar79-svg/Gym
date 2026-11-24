import {
  ArrowDown,
  ArrowUp,
  Check,
  Download,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import { ChangeEvent, useRef, useState } from 'react';
import { DEFAULT_ROUTINE } from '../data/routine';
import { AppSettings, BodyRegion, CompletedWorkout, DayKey, RoutineDay, RoutineExercise, WeightUnit } from '../types';
import { createBackupPayload, parseBackupPayload } from '../utils/storage';

interface SettingsViewProps {
  routine: RoutineDay[];
  history: CompletedWorkout[];
  settings: AppSettings;
  onUpdateSettings: (next: AppSettings) => void;
  onUpdateRoutine: (next: RoutineDay[]) => void;
  onImportBackup: (routine: RoutineDay[], history: CompletedWorkout[], settings: AppSettings) => void;
  onClearAllHistory: () => void;
  onMarkDeloadCompleted: () => void;
}

export function SettingsView({
  routine,
  history,
  settings,
  onUpdateSettings,
  onUpdateRoutine,
  onImportBackup,
  onClearAllHistory,
  onMarkDeloadCompleted,
}: SettingsViewProps) {
  const [editingDay, setEditingDay] = useState<DayKey>('MON');
  const [expandedExId, setExpandedExId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedDayObj = routine.find((r) => r.day === editingDay) ?? routine[0];

  const showStatus = (type: 'ok' | 'err', text: string) => {
    setStatusMsg({ type, text });
    window.setTimeout(() => setStatusMsg(null), 3500);
  };

  const handleUnitChange = (unit: WeightUnit) => {
    onUpdateSettings({ ...settings, unit });
  };

  const handleExerciseChange = (
    exId: string,
    patch: Partial<RoutineExercise>
  ) => {
    const nextRoutine = routine.map((d) => {
      if (d.day !== editingDay) return d;
      return {
        ...d,
        exercises: d.exercises.map((ex) => (ex.id === exId ? { ...ex, ...patch } : ex)),
      };
    });
    onUpdateRoutine(nextRoutine);
  };

  const handleMoveExercise = (idx: number, dir: -1 | 1) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= selectedDayObj.exercises.length) return;
    const nextRoutine = routine.map((d) => {
      if (d.day !== editingDay) return d;
      const copy = [...d.exercises];
      const [item] = copy.splice(idx, 1);
      copy.splice(targetIdx, 0, item);
      return { ...d, exercises: copy };
    });
    onUpdateRoutine(nextRoutine);
  };

  const handleDeleteExercise = (exId: string) => {
    const nextRoutine = routine.map((d) => {
      if (d.day !== editingDay) return d;
      return {
        ...d,
        exercises: d.exercises.filter((ex) => ex.id !== exId),
      };
    });
    onUpdateRoutine(nextRoutine);
  };

  const handleAddExercise = () => {
    const newId = `${editingDay.toLowerCase()}-custom-${Date.now()}`;
    const newEx: RoutineExercise = {
      id: newId,
      name: 'New Exercise',
      muscle: 'Chest',
      sets: 3,
      reps: '8-12',
      restSeconds: 90,
      formTip: 'Controlled tempo, full range of motion',
      videoUrl: '',
      bodyRegion: 'upper',
    };
    const nextRoutine = routine.map((d) => {
      if (d.day !== editingDay) return d;
      return { ...d, exercises: [...d.exercises, newEx] };
    });
    onUpdateRoutine(nextRoutine);
    setExpandedExId(newId);
  };

  const handleResetRoutine = () => {
    onUpdateRoutine(DEFAULT_ROUTINE);
    showStatus('ok', 'Routine reset to default 6-day program.');
  };

  const handleExportJSON = () => {
    const payload = createBackupPayload(routine, history, settings);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ironlog-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showStatus('ok', 'JSON backup downloaded.');
  };

  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseBackupPayload(text);
      onImportBackup(parsed.routine, parsed.history, parsed.settings);
      showStatus('ok', `Imported ${parsed.history.length} workouts & routine.`);
    } catch (err) {
      showStatus('err', err instanceof Error ? err.message : 'Failed to import JSON backup.');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6 pb-28 md:pb-12">
      <div className="pt-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-50 tracking-tight">Settings</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Units, rest times, routine editor, video links, and JSON backups
        </p>
      </div>

      {statusMsg && (
        <div
          className={`rounded-2xl px-4 py-3 text-sm font-medium border ${
            statusMsg.type === 'ok'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {/* General Preferences */}
      <section className="rounded-3xl bg-[#141821] border border-white/[0.08] p-5 space-y-4">
        <h2 className="text-base font-bold text-slate-100">Preferences</h2>

        {/* Units */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-200">Weight Unit</div>
            <div className="text-xs text-slate-400">Steppers adjust by 2.5 kg or 5 lb</div>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0B0E14] border border-white/[0.06]">
            {(['kg', 'lb'] as WeightUnit[]).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => handleUnitChange(u)}
                className={`min-h-[40px] px-4 rounded-lg text-sm font-bold uppercase transition-colors ${
                  settings.unit === u
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        {/* Sound & Vibration */}
        <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-200">Rest Timer Sound</div>
            <div className="text-xs text-slate-400">Audio chime when countdown finishes</div>
          </div>
          <button
            type="button"
            onClick={() =>
              onUpdateSettings({ ...settings, soundEnabled: !settings.soundEnabled })
            }
            className={`min-h-[40px] px-4 rounded-xl text-xs font-bold transition-colors ${
              settings.soundEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-[#0B0E14] text-slate-400 border border-white/[0.08]'
            }`}
          >
            {settings.soundEnabled ? 'On' : 'Off'}
          </button>
        </div>

        <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-200">Vibration Alert</div>
            <div className="text-xs text-slate-400">Haptic buzz on supported phones</div>
          </div>
          <button
            type="button"
            onClick={() =>
              onUpdateSettings({ ...settings, vibrateEnabled: !settings.vibrateEnabled })
            }
            className={`min-h-[40px] px-4 rounded-xl text-xs font-bold transition-colors ${
              settings.vibrateEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-[#0B0E14] text-slate-400 border border-white/[0.08]'
            }`}
          >
            {settings.vibrateEnabled ? 'On' : 'Off'}
          </button>
        </div>

        {/* Deload Cycle */}
        <div className="pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-200">5-Week Deload Reminder</div>
            <div className="text-xs text-slate-400">
              Halve sets, drop weight 10–15%, 3–4 RIR
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onMarkDeloadCompleted}
              className="min-h-[40px] px-3 rounded-xl bg-[#1C222E] hover:bg-[#252D3D] text-slate-200 text-xs font-semibold transition-colors"
            >
              Reset 5-Wk Cycle
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({ ...settings, deloadEnabled: !settings.deloadEnabled })
              }
              className={`min-h-[40px] px-4 rounded-xl text-xs font-bold transition-colors ${
                settings.deloadEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-[#0B0E14] text-slate-400 border border-white/[0.08]'
              }`}
            >
              {settings.deloadEnabled ? 'On' : 'Off'}
            </button>
          </div>
        </div>
      </section>

      {/* Routine & Video URL Editor */}
      <section className="rounded-3xl bg-[#141821] border border-white/[0.08] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-100">Edit Routine &amp; Form Videos</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Customize rest times, exercises, or paste a custom YouTube videoUrl
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetRoutine}
            className="min-h-[38px] px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Default</span>
          </button>
        </div>

        {/* Day Selector Tabs */}
        <div className="grid grid-cols-6 gap-1.5">
          {routine
            .filter((d) => !d.isRestDay)
            .map((d) => (
              <button
                key={d.day}
                type="button"
                onClick={() => setEditingDay(d.day)}
                className={`min-h-[42px] rounded-xl text-xs font-bold transition-colors ${
                  editingDay === d.day
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#0B0E14] text-slate-400 hover:text-slate-200'
                }`}
              >
                {d.day}
              </button>
            ))}
        </div>

        {/* Day Title Input */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            {selectedDayObj.day} Split Title
          </label>
          <input
            type="text"
            value={selectedDayObj.title}
            onChange={(e) => {
              const next = routine.map((d) =>
                d.day === editingDay ? { ...d, title: e.target.value } : d
              );
              onUpdateRoutine(next);
            }}
            className="w-full min-h-[44px] rounded-xl bg-[#0B0E14] border border-white/[0.08] px-3.5 text-sm font-semibold text-slate-100 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Exercises List */}
        <div className="space-y-2.5">
          {selectedDayObj.exercises.map((ex, idx) => {
            const isOpen = expandedExId === ex.id;
            return (
              <div
                key={ex.id}
                className="rounded-2xl bg-[#0B0E14] border border-white/[0.07] overflow-hidden"
              >
                <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedExId(isOpen ? null : ex.id)}
                    className="flex-1 min-w-0 text-left py-1"
                  >
                    <div className="text-sm font-bold text-slate-100 truncate">
                      {idx + 1}. {ex.name}
                    </div>
                    <div className="text-xs text-slate-400 font-mono-nums mt-0.5">
                      {ex.muscle} · {ex.sets}×{ex.reps} · {ex.restSeconds}s
                      {ex.videoUrl ? ' · Custom video set' : ''}
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMoveExercise(idx, -1)}
                      disabled={idx === 0}
                      aria-label="Move up"
                      className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-400 hover:bg-white/[0.06] disabled:opacity-30"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveExercise(idx, 1)}
                      disabled={idx === selectedDayObj.exercises.length - 1}
                      aria-label="Move down"
                      className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-400 hover:bg-white/[0.06] disabled:opacity-30"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedExId(isOpen ? null : ex.id)}
                      className="min-h-[38px] px-2.5 rounded-lg bg-[#1C222E] text-xs font-semibold text-blue-400"
                    >
                      {isOpen ? 'Done' : 'Edit'}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="px-3.5 pb-3.5 pt-2 border-t border-white/[0.06] space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Exercise Name</label>
                        <input
                          type="text"
                          value={ex.name}
                          onChange={(e) => handleExerciseChange(ex.id, { name: e.target.value })}
                          className="w-full min-h-[42px] rounded-xl bg-[#141821] border border-white/[0.08] px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Target Muscle</label>
                        <input
                          type="text"
                          value={ex.muscle}
                          onChange={(e) => handleExerciseChange(ex.id, { muscle: e.target.value })}
                          className="w-full min-h-[42px] rounded-xl bg-[#141821] border border-white/[0.08] px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Sets</label>
                        <input
                          type="number"
                          min={1}
                          value={ex.sets}
                          onChange={(e) =>
                            handleExerciseChange(ex.id, {
                              sets: Math.max(1, parseInt(e.target.value, 10) || 1),
                            })
                          }
                          className="w-full min-h-[42px] rounded-xl bg-[#141821] border border-white/[0.08] px-3 text-sm font-mono-nums text-slate-100 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Reps</label>
                        <input
                          type="text"
                          value={ex.reps}
                          onChange={(e) => handleExerciseChange(ex.id, { reps: e.target.value })}
                          className="w-full min-h-[42px] rounded-xl bg-[#141821] border border-white/[0.08] px-3 text-sm font-mono-nums text-slate-100 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Rest (sec)</label>
                        <input
                          type="number"
                          min={10}
                          step={5}
                          value={ex.restSeconds}
                          onChange={(e) =>
                            handleExerciseChange(ex.id, {
                              restSeconds: Math.max(10, parseInt(e.target.value, 10) || 60),
                            })
                          }
                          className="w-full min-h-[42px] rounded-xl bg-[#141821] border border-white/[0.08] px-3 text-sm font-mono-nums text-slate-100 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Form Tip</label>
                      <input
                        type="text"
                        value={ex.formTip}
                        onChange={(e) => handleExerciseChange(ex.id, { formTip: e.target.value })}
                        className="w-full min-h-[42px] rounded-xl bg-[#141821] border border-white/[0.08] px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Form Video URL (optional YouTube link)
                      </label>
                      <input
                        type="url"
                        value={ex.videoUrl}
                        placeholder="https://www.youtube.com/watch?v=..."
                        onChange={(e) => handleExerciseChange(ex.id, { videoUrl: e.target.value })}
                        className="w-full min-h-[42px] rounded-xl bg-[#141821] border border-white/[0.08] px-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <select
                        aria-label="Body region for double progression"
                        value={ex.bodyRegion || 'upper'}
                        onChange={(e) =>
                          handleExerciseChange(ex.id, {
                            bodyRegion: e.target.value as BodyRegion,
                          })
                        }
                        className="min-h-[38px] rounded-xl bg-[#141821] border border-white/[0.08] px-2.5 text-xs text-slate-300"
                      >
                        <option value="upper">Upper Body (+2.5 kg progression)</option>
                        <option value="lower">Lower Body (+5 kg progression)</option>
                        <option value="core">Core / Mobility</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleDeleteExercise(ex.id)}
                        className="min-h-[38px] px-3 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleAddExercise}
          className="w-full min-h-[48px] rounded-2xl bg-[#1C222E] hover:bg-[#252D3D] text-slate-100 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Exercise to {selectedDayObj.day}</span>
        </button>
      </section>

      {/* JSON Backup Export / Import */}
      <section className="rounded-3xl bg-[#141821] border border-white/[0.08] p-5 space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-100">Backup &amp; Data</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            All data is stored locally on your device. Export a JSON backup anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleExportJSON}
            className="min-h-[48px] rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export JSON Backup</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[48px] rounded-2xl bg-[#1C222E] hover:bg-[#252D3D] text-slate-100 text-sm font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Import JSON Backup</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>

        <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">
            {history.length} saved workouts in localStorage
          </span>
          {!confirmClear ? (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="min-h-[40px] px-3 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Clear Workout History
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClearAllHistory();
                  setConfirmClear(false);
                  showStatus('ok', 'Workout history cleared.');
                }}
                className="min-h-[38px] px-3 rounded-xl bg-red-600 text-white text-xs font-bold flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" /> Confirm Clear
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="min-h-[38px] px-3 rounded-xl bg-[#1C222E] text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
