import { SkipForward, Timer } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { RestTimerState } from '../types';
import { formatTimerClock } from '../utils/fitness';

interface RestTimerBarProps {
  timer: RestTimerState | null;
  onAdjust: (deltaSeconds: number) => void;
  onSkip: () => void;
}

export function RestTimerBar({ timer, onAdjust, onSkip }: RestTimerBarProps) {
  const progressPct =
    timer && timer.totalSeconds > 0
      ? Math.max(0, Math.min(100, (timer.remainingSeconds / timer.totalSeconds) * 100))
      : 0;

  const isNextExercise = timer?.mode === 'next-exercise';

  return (
    <AnimatePresence>
      {timer && timer.active && (
        <motion.div
          initial={{ y: 96, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 96, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-3 pb-safe pointer-events-none"
        >
          <div className="mx-auto max-w-2xl pointer-events-auto rounded-2xl bg-[#181E29]/95 backdrop-blur-md border border-white/10 shadow-2xl overflow-hidden">
            {/* Progress Track */}
            <div className="h-1 w-full bg-white/[0.06]">
              <div
                className={`h-full transition-all duration-300 ease-linear ${
                  isNextExercise ? 'bg-amber-500' : 'bg-blue-500'
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isNextExercise
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'bg-blue-500/15 text-blue-400'
                  }`}
                >
                  <Timer className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-slate-400 truncate">
                    {isNextExercise ? 'Next exercise setup' : timer.label}
                  </div>
                  <div className="text-xl font-bold font-mono-nums text-slate-50 leading-tight">
                    {formatTimerClock(timer.remainingSeconds)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onAdjust(-15)}
                  className="min-h-[44px] px-3 rounded-xl bg-[#222A38] hover:bg-[#2B3547] active:scale-95 text-slate-200 text-xs font-semibold font-mono-nums transition-all"
                >
                  -15s
                </button>
                <button
                  type="button"
                  onClick={() => onAdjust(15)}
                  className="min-h-[44px] px-3 rounded-xl bg-[#222A38] hover:bg-[#2B3547] active:scale-95 text-slate-200 text-xs font-semibold font-mono-nums transition-all"
                >
                  +15s
                </button>
                <button
                  type="button"
                  onClick={onSkip}
                  className="min-h-[44px] px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold flex items-center gap-1 transition-all"
                >
                  <span>Skip</span>
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
