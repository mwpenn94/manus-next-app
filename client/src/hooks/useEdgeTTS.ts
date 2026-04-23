/**
 * useEdgeTTS — Server-backed Edge TTS with streaming audio playback
 * 
 * P15: Replaces browser SpeechSynthesis with high-quality Microsoft Neural voices.
 * Supports sentence-by-sentence streaming for Grok-level conversational latency.
 * Falls back to browser SpeechSynthesis if server TTS fails after retries.
 *
 * Enhancements:
 *   - Retry logic: 3 attempts with exponential backoff (500ms, 1s, 2s)
 *   - Quality selection: standard, high, low presets
 *   - Structured error states with error codes
 *   - Voice selection persistence via localStorage
 */
import { useState, useCallback, useRef, useEffect } from "react";

// ── Types ──

export type TTSQuality = "low" | "standard" | "high";

export interface EdgeTTSOptions {
  voice?: string;    // Edge TTS voice ID e.g. "en-US-AriaNeural"
  rate?: string;     // e.g. "+20%" or "-10%"
  pitch?: string;    // e.g. "+5Hz"
  volume?: string;   // e.g. "+10%"
  quality?: TTSQuality;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

export interface TTSError {
  message: string;
  code: "NETWORK" | "SYNTHESIS" | "PLAYBACK" | "ABORTED" | "FALLBACK";
  retryCount: number;
}

export interface EdgeTTSState {
  isSpeaking: boolean;
  isLoading: boolean;
  error: TTSError | null;
  quality: TTSQuality;
  setQuality: (q: TTSQuality) => void;
  speak: (text: string, options?: EdgeTTSOptions) => Promise<void>;
  stop: () => void;
  /** Speak multiple sentences in sequence for streaming conversation */
  speakStreaming: (sentences: string[], options?: EdgeTTSOptions) => Promise<void>;
  /** Whether currently using browser fallback */
  isFallback: boolean;
}

// ── Constants ──

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 500;
const STORAGE_KEY_VOICE = "manus-tts-voice";
const STORAGE_KEY_QUALITY = "manus-tts-quality";

/** Quality presets map to rate/pitch adjustments */
const QUALITY_PRESETS: Record<TTSQuality, { rate?: string; pitch?: string }> = {
  low: { rate: "+30%" },       // Faster, lower quality
  standard: {},                 // Default
  high: { rate: "-5%", pitch: "+2Hz" }, // Slightly slower, richer
};

// ── Helpers ──

/** Strip markdown for cleaner speech */
function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " code block omitted ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "image: $1")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\|[^|]+\|/g, "")
    .replace(/---+/g, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .trim();
}

/** Split text into sentences for streaming TTS */
function splitSentences(text: string): string[] {
  const clean = stripMarkdown(text);
  if (!clean) return [];
  
  const sentences = clean.split(/(?<=[.!?;])\s+/).filter(s => s.trim().length > 0);
  
  // Merge short sentences for natural flow
  const merged: string[] = [];
  let buffer = "";
  for (const s of sentences) {
    buffer += (buffer ? " " : "") + s;
    if (buffer.length >= 40) {
      merged.push(buffer);
      buffer = "";
    }
  }
  if (buffer) merged.push(buffer);
  return merged;
}

/** Sleep helper for retry backoff */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Load persisted quality preference */
function loadQuality(): TTSQuality {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_QUALITY);
    if (stored === "low" || stored === "standard" || stored === "high") return stored;
  } catch {}
  return "standard";
}

/** Load persisted voice preference */
function loadVoice(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_VOICE);
  } catch {
    return null;
  }
}

// ── Hook ──

export function useEdgeTTS(): EdgeTTSState {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<TTSError | null>(null);
  const [quality, setQualityState] = useState<TTSQuality>(loadQuality);
  const [isFallback, setIsFallback] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<string[]>([]);
  const playingRef = useRef(false);

  // Persist quality preference
  const setQuality = useCallback((q: TTSQuality) => {
    setQualityState(q);
    try { localStorage.setItem(STORAGE_KEY_QUALITY, q); } catch {}
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    queueRef.current = [];
    playingRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsLoading(false);
    setIsFallback(false);
  }, []);

  /** Synthesize and play a single text chunk with retry logic */
  const playChunk = useCallback(async (
    text: string,
    options?: EdgeTTSOptions,
    signal?: AbortSignal
  ): Promise<void> => {
    const qualityPreset = QUALITY_PRESETS[options?.quality ?? quality];
    const persistedVoice = loadVoice();
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
      
      try {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            voice: options?.voice ?? persistedVoice ?? undefined,
            rate: options?.rate ?? qualityPreset.rate,
            pitch: options?.pitch ?? qualityPreset.pitch,
            volume: options?.volume,
          }),
          signal,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: "TTS failed" }));
          throw new Error(err.error || `TTS synthesis failed (${response.status})`);
        }

        const blob = await response.blob();
        if (blob.size === 0) {
          throw new Error("Empty audio response");
        }
        
        const url = URL.createObjectURL(blob);

        return await new Promise<void>((resolve, reject) => {
          const audio = new Audio(url);
          audioRef.current = audio;

          audio.onended = () => {
            URL.revokeObjectURL(url);
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Audio playback failed"));
          };

          if (signal?.aborted) {
            URL.revokeObjectURL(url);
            reject(new DOMException("Aborted", "AbortError"));
            return;
          }

          signal?.addEventListener("abort", () => {
            audio.pause();
            audio.src = "";
            URL.revokeObjectURL(url);
            reject(new DOMException("Aborted", "AbortError"));
          });

          audio.play().catch((e) => {
            URL.revokeObjectURL(url);
            reject(e);
          });
        });
      } catch (err: any) {
        if (err.name === "AbortError") throw err;
        lastError = err;
        
        // Don't retry on the last attempt
        if (attempt < MAX_RETRIES - 1) {
          const backoff = RETRY_BASE_MS * Math.pow(2, attempt);
          console.warn(`[TTS] Attempt ${attempt + 1} failed, retrying in ${backoff}ms:`, err.message);
          await sleep(backoff);
        }
      }
    }
    
    // All retries exhausted
    throw lastError ?? new Error("TTS failed after retries");
  }, [quality]);

  /** Browser SpeechSynthesis fallback */
  const speakBrowserFallback = useCallback((
    text: string,
    options?: EdgeTTSOptions
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!("speechSynthesis" in window)) {
        reject(new Error("Browser speech synthesis not available"));
        return;
      }
      
      setIsFallback(true);
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Apply quality-based rate
      const qualityPreset = QUALITY_PRESETS[options?.quality ?? quality];
      if (qualityPreset.rate) {
        const rateMatch = qualityPreset.rate.match(/([+-]?\d+)%/);
        if (rateMatch) {
          utterance.rate = 1 + parseInt(rateMatch[1]) / 100;
        }
      }
      
      // Try to use a persisted voice
      const persistedVoice = loadVoice();
      if (persistedVoice) {
        const voices = window.speechSynthesis.getVoices();
        const match = voices.find(v => v.name === persistedVoice || v.voiceURI === persistedVoice);
        if (match) utterance.voice = match;
      }
      
      utterance.onend = () => {
        setIsFallback(false);
        resolve();
      };
      utterance.onerror = (e) => {
        setIsFallback(false);
        reject(new Error(`Browser TTS error: ${e.error}`));
      };
      
      window.speechSynthesis.speak(utterance);
    });
  }, [quality]);

  /** Speak a single text (full synthesis then play) */
  const speak = useCallback(async (text: string, options?: EdgeTTSOptions) => {
    stop();
    const clean = stripMarkdown(text);
    if (!clean) return;

    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);
    options?.onStart?.();

    try {
      setIsSpeaking(true);
      setIsLoading(false);
      await playChunk(clean, options, controller.signal);
      setIsSpeaking(false);
      options?.onEnd?.();
    } catch (err: any) {
      if (err.name === "AbortError") return;
      const msg = err.message || "TTS failed";
      
      // Set structured error
      setError({
        message: msg,
        code: msg.includes("playback") ? "PLAYBACK" : "SYNTHESIS",
        retryCount: MAX_RETRIES,
      });
      
      // Attempt browser fallback
      try {
        setError(prev => prev ? { ...prev, code: "FALLBACK" } : null);
        await speakBrowserFallback(clean, options);
        setIsSpeaking(false);
        options?.onEnd?.();
      } catch {
        setIsSpeaking(false);
        setIsLoading(false);
        options?.onError?.(msg);
      }
    }
  }, [stop, playChunk, speakBrowserFallback]);

  /** Speak multiple sentences in sequence — enables streaming conversation */
  const speakStreaming = useCallback(async (sentences: string[], options?: EdgeTTSOptions) => {
    stop();
    if (!sentences.length) return;

    const controller = new AbortController();
    abortRef.current = controller;
    queueRef.current = [...sentences];
    playingRef.current = true;

    setIsLoading(true);
    setError(null);
    options?.onStart?.();

    try {
      setIsSpeaking(true);
      setIsLoading(false);

      while (queueRef.current.length > 0 && playingRef.current) {
        const sentence = queueRef.current.shift()!;
        await playChunk(sentence, options, controller.signal);
      }

      setIsSpeaking(false);
      playingRef.current = false;
      options?.onEnd?.();
    } catch (err: any) {
      if (err.name === "AbortError") return;
      const msg = err.message || "TTS streaming failed";
      
      setError({
        message: msg,
        code: "SYNTHESIS",
        retryCount: MAX_RETRIES,
      });
      
      // Attempt browser fallback for remaining sentences
      const remaining = queueRef.current;
      if (remaining.length > 0 && "speechSynthesis" in window) {
        try {
          setError(prev => prev ? { ...prev, code: "FALLBACK" } : null);
          for (const sentence of remaining) {
            if (!playingRef.current) break;
            await speakBrowserFallback(sentence, options);
          }
        } catch {}
      }
      
      setIsSpeaking(false);
      setIsLoading(false);
      playingRef.current = false;
      options?.onError?.(msg);
    }
  }, [stop, playChunk, speakBrowserFallback]);

  return { isSpeaking, isLoading, error, quality, setQuality, speak, stop, speakStreaming, isFallback };
}

/** Utility: split text into sentences (exported for use in hands-free mode) */
export { splitSentences };
