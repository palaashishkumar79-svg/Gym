import { ExternalLink, Play, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { getFormVideoTargetUrl, getYouTubeEmbedUrl } from '../utils/fitness';

export interface ExerciseDetailData {
  name: string;
  muscle: string;
  sets: number;
  reps: string;
  restSeconds: number;
  formTip: string;
  videoUrl?: string;
}

interface ExerciseDetailSheetProps {
  exercise: ExerciseDetailData | null;
  onClose: () => void;
}

export function ExerciseDetailSheet({ exercise, onClose }: ExerciseDetailSheetProps) {
  const targetUrl = exercise ? getFormVideoTargetUrl(exercise.name, exercise.videoUrl) : '';
  const embedUrl = exercise?.videoUrl ? getYouTubeEmbedUrl(exercise.videoUrl) : null;
  const isCustomVideo = Boolean(exercise?.videoUrl && exercise.videoUrl.trim().length > 0);

  return (
    <AnimatePresence>
      {exercise && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={exercise.name}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: '100%', opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.9 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-[#141821] border border-white/10 shadow-2xl max-h-[88vh] flex flex-col overflow-hidden"
          >
            {/* Grab Handle */}
            <div className="pt-3 pb-1 flex justify-center sm:hidden">
              <div className="w-10 h-1.5 rounded-full bg-slate-700" />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-5 pt-3 pb-4 border-b border-white/[0.07]">
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-slate-50 leading-snug text-balance">
                  {exercise.name}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  <span>{exercise.muscle}</span>
                  <span className="mx-2 text-slate-600" aria-hidden="true">·</span>
                  <span className="font-mono-nums text-slate-300">
                    {exercise.sets} × {exercise.reps}
                  </span>
                  <span className="mx-2 text-slate-600" aria-hidden="true">·</span>
                  <span className="font-mono-nums">{exercise.restSeconds}s rest</span>
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close exercise details"
                className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 space-y-5 overflow-y-auto">
              {/* Optional Custom Video Embed */}
              {isCustomVideo && embedUrl && (
                <div className="rounded-2xl overflow-hidden bg-black border border-white/10 aspect-video">
                  <iframe
                    src={embedUrl}
                    title={`${exercise.name} form video`}
                    className="w-full h-full"
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}

              {isCustomVideo && !embedUrl && /\.(mp4|webm|mov)(\?|$)/i.test(exercise.videoUrl || '') && (
                <div className="rounded-2xl overflow-hidden bg-black border border-white/10 aspect-video">
                  <video
                    src={exercise.videoUrl}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Large Form Tip */}
              <div className="rounded-2xl bg-[#1C222E] border border-white/[0.06] p-4">
                <p className="text-xs font-semibold text-blue-400 mb-1.5">Form Cue</p>
                <p className="text-lg font-medium text-slate-100 leading-relaxed">
                  {exercise.formTip || 'Control the eccentric, maintain full range of motion.'}
                </p>
              </div>

              {/* Targets Breakdown */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-[#0B0E14] border border-white/[0.06] py-3 px-2">
                  <div className="text-xs text-slate-400">Sets</div>
                  <div className="mt-1 text-lg font-bold font-mono-nums text-slate-100">
                    {exercise.sets}
                  </div>
                </div>
                <div className="rounded-xl bg-[#0B0E14] border border-white/[0.06] py-3 px-2">
                  <div className="text-xs text-slate-400">Target Reps</div>
                  <div className="mt-1 text-lg font-bold font-mono-nums text-slate-100">
                    {exercise.reps}
                  </div>
                </div>
                <div className="rounded-xl bg-[#0B0E14] border border-white/[0.06] py-3 px-2">
                  <div className="text-xs text-slate-400">Rest</div>
                  <div className="mt-1 text-lg font-bold font-mono-nums text-slate-100">
                    {exercise.restSeconds}s
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Action */}
            <div className="p-5 pt-3 border-t border-white/[0.07] bg-[#141821] pb-safe">
              <a
                href={targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-[52px] rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] transition-all text-white font-semibold text-base flex items-center justify-center gap-2.5 shadow-lg shadow-blue-950/50"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>{isCustomVideo ? 'Open Form Video' : 'Watch Form Video'}</span>
                <ExternalLink className="w-4 h-4 opacity-80" />
              </a>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
