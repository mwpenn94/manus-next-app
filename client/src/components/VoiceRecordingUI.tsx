/**
 * VoiceRecordingUI — Manus-style recording overlay for the input bar
 *
 * When recording is active, this replaces the normal input bar bottom toolbar
 * with an animated waveform visualization, elapsed timer, and cancel (X) /
 * confirm (checkmark) buttons.
 *
 * Matches screenshots IMG_6904/6905:
 * - Full-width bar with dark bg
 * - Animated waveform bars in center
 * - Timer display (MM:SS)
 * - X button (cancel) on left
 * - Checkmark button (send) on right
 */
import { useState, useEffect, useRef, useMemo } from "react";
import { X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface VoiceRecordingUIProps {
  /** Whether currently recording */
  recording: boolean;
  /** Whether transcription is in progress */
  transcribing: boolean;
  /** Cancel recording — discards audio */
  onCancel: () => void;
  /** Confirm recording — stops and sends for transcription */
  onConfirm: () => void;
  className?: string;
}

export default function VoiceRecordingUI({
  recording,
  transcribing,
  onCancel,
  onConfirm,
  className,
}: VoiceRecordingUIProps) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer
  useEffect(() => {
    if (recording) {
      setElapsed(0);
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [recording]);

  const timerDisplay = useMemo(() => {
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, [elapsed]);

  if (!recording && !transcribing) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "flex items-center justify-between gap-3 px-3 py-2",
        className
      )}
    >
      {/* Cancel button */}
      <button
        onClick={onCancel}
        disabled={transcribing}
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center transition-colors shrink-0",
          "bg-muted/60 text-muted-foreground hover:bg-destructive/20 hover:text-destructive active:scale-95",
          transcribing && "opacity-50 cursor-not-allowed"
        )}
        title="Cancel recording"
        aria-label="Cancel recording"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Waveform + Timer */}
      <div className="flex-1 flex items-center justify-center gap-3">
        {/* Animated waveform bars */}
        <div className="flex items-center gap-[3px] h-8">
          {Array.from({ length: 20 }).map((_, i) => (
            <WaveformBar key={i} index={i} active={recording} />
          ))}
        </div>

        {/* Timer */}
        <span
          className={cn(
            "text-sm font-mono tabular-nums shrink-0",
            recording ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {transcribing ? "Transcribing..." : timerDisplay}
        </span>
      </div>

      {/* Confirm / Send button */}
      <button
        onClick={onConfirm}
        disabled={transcribing}
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center transition-colors shrink-0",
          "bg-primary text-primary-foreground hover:opacity-90 active:scale-95",
          transcribing && "opacity-50 cursor-not-allowed"
        )}
        title="Send recording"
        aria-label="Send recording"
      >
        {transcribing ? (
          <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
        ) : (
          <Check className="w-4 h-4" />
        )}
      </button>
    </motion.div>
  );
}

// ── Individual waveform bar with CSS animation ──

function WaveformBar({ index, active }: { index: number; active: boolean }) {
  // Deterministic pseudo-random height offset based on index
  const baseHeight = 4;
  const maxHeight = 24;
  const delay = (index * 0.07) % 1;

  return (
    <div
      className={cn(
        "w-[3px] rounded-full transition-colors",
        active ? "bg-destructive" : "bg-muted-foreground/30"
      )}
      style={{
        height: active ? undefined : `${baseHeight}px`,
        animation: active
          ? `voiceWaveBar 0.6s ease-in-out ${delay}s infinite alternate`
          : "none",
        minHeight: `${baseHeight}px`,
      }}
    />
  );
}

// Inject the keyframes once via a style tag
const VOICE_WAVE_STYLE = `
@keyframes voiceWaveBar {
  0% { height: 4px; }
  50% { height: 16px; }
  100% { height: 24px; }
}
`;

// Style injection component
export function VoiceWaveStyles() {
  return <style>{VOICE_WAVE_STYLE}</style>;
}
