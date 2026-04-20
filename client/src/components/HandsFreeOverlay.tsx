/**
 * HandsFreeOverlay — Floating Hands-Free Voice UI
 * 
 * P15: Grok-level conversational voice interface.
 * Displays a floating overlay with:
 * - Animated waveform visualization based on state
 * - State indicator (Listening / Transcribing / Processing / Speaking)
 * - Mic button to interrupt or toggle
 * - Close button to deactivate
 * 
 * Positioned at bottom-center, above the chat input.
 * Works alongside screen/video broadcast.
 */
import { useEffect, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, Loader2, X, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HandsFreeState } from "@/hooks/useHandsFreeMode";

interface HandsFreeOverlayProps {
  state: HandsFreeState;
  isActive: boolean;
  onInterrupt: () => void;
  onDeactivate: () => void;
}

// ── Waveform Visualization ──

function WaveformCanvas({ state }: { state: HandsFreeState }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    let t = 0;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      t += 0.03;

      const bars = 24;
      const barWidth = w / bars - 2;
      const centerY = h / 2;

      for (let i = 0; i < bars; i++) {
        const x = i * (barWidth + 2) + 1;
        let amplitude: number;

        switch (state) {
          case "listening":
            // Active waveform — responsive feel
            amplitude = (Math.sin(t * 3 + i * 0.5) * 0.4 + 0.5) * (h * 0.4);
            break;
          case "transcribing":
            // Pulsing dots — processing speech
            amplitude = (Math.sin(t * 2 + i * 0.3) * 0.2 + 0.3) * (h * 0.3);
            break;
          case "processing":
            // Slow breathing wave — agent thinking
            amplitude = (Math.sin(t * 1.5 + i * 0.4) * 0.15 + 0.2) * (h * 0.35);
            break;
          case "speaking":
            // Dynamic output wave — TTS playing
            amplitude = (Math.sin(t * 4 + i * 0.6) * 0.35 + 0.45) * (h * 0.4);
            break;
          default:
            amplitude = 2;
        }

        const barHeight = Math.max(2, amplitude);

        // Color based on state
        let color: string;
        switch (state) {
          case "listening":
            color = "oklch(0.75 0.15 160)"; // Primary green-teal
            break;
          case "transcribing":
            color = "oklch(0.7 0.12 250)"; // Blue
            break;
          case "processing":
            color = "oklch(0.65 0.14 45)"; // Amber
            break;
          case "speaking":
            color = "oklch(0.75 0.15 160)"; // Primary
            break;
          default:
            color = "oklch(0.4 0.01 60)"; // Muted
        }

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x, centerY - barHeight / 2, barWidth, barHeight, 1);
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [state]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={40}
      className="opacity-80"
    />
  );
}

// ── State Label ──

function StateLabel({ state }: { state: HandsFreeState }) {
  const labels: Record<HandsFreeState, string> = {
    idle: "Ready",
    listening: "Listening...",
    transcribing: "Transcribing...",
    processing: "Thinking...",
    speaking: "Speaking...",
  };

  const icons: Record<HandsFreeState, React.ReactNode> = {
    idle: null,
    listening: <Radio className="w-3 h-3 animate-pulse" />,
    transcribing: <Loader2 className="w-3 h-3 animate-spin" />,
    processing: <Loader2 className="w-3 h-3 animate-spin" />,
    speaking: <Volume2 className="w-3 h-3" />,
  };

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {icons[state]}
      <span>{labels[state]}</span>
    </div>
  );
}

// ── Main Overlay ──

function HandsFreeOverlay({ state, isActive, onInterrupt, onDeactivate }: HandsFreeOverlayProps) {
  if (!isActive) return null;

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed bottom-24 md:bottom-20 left-1/2 -translate-x-1/2 z-50"
        >
          <div
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl backdrop-blur-md",
              "bg-card/95 border-border/60",
              state === "listening" && "border-primary/40 shadow-primary/10",
              state === "speaking" && "border-primary/30 shadow-primary/5",
              state === "processing" && "border-amber-500/30 shadow-amber-500/5",
            )}
          >
            {/* Waveform */}
            <WaveformCanvas state={state} />

            {/* State label */}
            <StateLabel state={state} />

            {/* Interrupt / Mic button */}
            <button
              onClick={onInterrupt}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                state === "listening"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 animate-pulse"
                  : state === "speaking"
                  ? "bg-primary/20 text-primary hover:bg-primary/30"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
              title={state === "listening" ? "Stop listening" : state === "speaking" ? "Interrupt" : "Start listening"}
              aria-label={state === "listening" ? "Stop listening" : "Interrupt and listen"}
            >
              {state === "listening" ? (
                <Mic className="w-4 h-4" />
              ) : state === "speaking" ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>

            {/* Close button */}
            <button
              onClick={onDeactivate}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Exit hands-free mode"
              aria-label="Exit hands-free mode"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default memo(HandsFreeOverlay);
