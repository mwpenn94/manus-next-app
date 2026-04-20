/**
 * audioFeedback.ts — Web Audio API Tone Generator
 * 
 * P15: Audible processing cues for hands-free mode.
 * Generates pleasant, non-intrusive tones using Web Audio API oscillators.
 * Manages AudioContext lifecycle (lazy init, resume on user gesture).
 * 
 * Tones:
 * - listening: Rising two-note chime (mic activated)
 * - processing: Soft pulsing hum (agent thinking)
 * - complete: Descending three-note resolution (response ready)
 * - error: Low buzz (something went wrong)
 * - send: Quick click (message sent)
 */

let audioCtx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  // Resume if suspended (browsers require user gesture)
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/** Play a tone at a given frequency, duration, and volume */
function playTone(
  frequency: number,
  duration: number,
  volume: number = 0.15,
  type: OscillatorType = "sine",
  startDelay: number = 0
): void {
  try {
    const ctx = getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = 0;

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime + startDelay;

    // Smooth fade in/out to avoid clicks
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.02);
    gain.gain.setValueAtTime(volume, now + duration - 0.04);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    osc.start(now);
    osc.stop(now + duration);
  } catch {
    // Silently fail — audio feedback is non-critical
  }
}

// ── Public API ──

/** Rising two-note chime — microphone activated, listening started */
export function playListeningChime(): void {
  playTone(523.25, 0.12, 0.12, "sine", 0);     // C5
  playTone(659.25, 0.15, 0.12, "sine", 0.1);    // E5
}

/** Soft pulsing hum — agent is processing/thinking */
let processingInterval: ReturnType<typeof setInterval> | null = null;
let processingOsc: OscillatorNode | null = null;
let processingGain: GainNode | null = null;

export function startProcessingPulse(): void {
  stopProcessingPulse();
  try {
    const ctx = getContext();
    processingOsc = ctx.createOscillator();
    processingGain = ctx.createGain();

    processingOsc.type = "sine";
    processingOsc.frequency.value = 220; // A3 — soft, non-intrusive
    processingGain.gain.value = 0;

    processingOsc.connect(processingGain);
    processingGain.connect(ctx.destination);
    processingOsc.start();

    // Gentle pulse: fade in/out every 1.5s
    const maxVol = 0.04;
    let rising = true;
    processingGain.gain.setValueAtTime(0, ctx.currentTime);

    processingInterval = setInterval(() => {
      if (!processingGain || !audioCtx) return;
      const now = audioCtx.currentTime;
      if (rising) {
        processingGain.gain.linearRampToValueAtTime(maxVol, now + 0.75);
      } else {
        processingGain.gain.linearRampToValueAtTime(0.005, now + 0.75);
      }
      rising = !rising;
    }, 750);
  } catch {
    // Silently fail
  }
}

export function stopProcessingPulse(): void {
  if (processingInterval) {
    clearInterval(processingInterval);
    processingInterval = null;
  }
  if (processingOsc && processingGain && audioCtx) {
    try {
      const now = audioCtx.currentTime;
      processingGain.gain.linearRampToValueAtTime(0, now + 0.1);
      processingOsc.stop(now + 0.15);
    } catch {}
    processingOsc = null;
    processingGain = null;
  }
}

/** Descending three-note resolution — response complete */
export function playCompleteChime(): void {
  stopProcessingPulse();
  playTone(659.25, 0.1, 0.1, "sine", 0);      // E5
  playTone(523.25, 0.1, 0.1, "sine", 0.1);     // C5
  playTone(392.00, 0.18, 0.1, "sine", 0.2);     // G4
}

/** Low buzz — error occurred */
export function playErrorTone(): void {
  stopProcessingPulse();
  playTone(150, 0.3, 0.1, "sawtooth", 0);
}

/** Quick click — message sent */
export function playSendClick(): void {
  playTone(800, 0.04, 0.08, "square", 0);
}

/** Clean up AudioContext on app teardown */
export function disposeAudioContext(): void {
  stopProcessingPulse();
  if (audioCtx) {
    audioCtx.close().catch(() => {});
    audioCtx = null;
  }
}

/** Check if Web Audio API is available */
export function isAudioFeedbackSupported(): boolean {
  return typeof AudioContext !== "undefined" || typeof (window as any).webkitAudioContext !== "undefined";
}
