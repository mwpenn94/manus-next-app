/**
 * useEdgeTTS — Server-backed Edge TTS with streaming audio playback
 * 
 * P15: Replaces browser SpeechSynthesis with high-quality Microsoft Neural voices.
 * Supports sentence-by-sentence streaming for Grok-level conversational latency.
 * Falls back to browser SpeechSynthesis if server TTS fails.
 */
import { useState, useCallback, useRef, useEffect } from "react";

export interface EdgeTTSOptions {
  voice?: string;    // Edge TTS voice ID e.g. "en-US-AriaNeural"
  rate?: string;     // e.g. "+20%" or "-10%"
  pitch?: string;    // e.g. "+5Hz"
  volume?: string;   // e.g. "+10%"
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

export interface EdgeTTSState {
  isSpeaking: boolean;
  isLoading: boolean;
  error: string | null;
  speak: (text: string, options?: EdgeTTSOptions) => Promise<void>;
  stop: () => void;
  /** Speak multiple sentences in sequence for streaming conversation */
  speakStreaming: (sentences: string[], options?: EdgeTTSOptions) => Promise<void>;
}

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

export function useEdgeTTS(): EdgeTTSState {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<string[]>([]);
  const playingRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
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
    setIsSpeaking(false);
    setIsLoading(false);
  }, []);

  /** Synthesize and play a single text chunk */
  const playChunk = useCallback(async (
    text: string,
    options?: EdgeTTSOptions,
    signal?: AbortSignal
  ): Promise<void> => {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        voice: options?.voice,
        rate: options?.rate,
        pitch: options?.pitch,
        volume: options?.volume,
      }),
      signal,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "TTS failed" }));
      throw new Error(err.error || "TTS synthesis failed");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    return new Promise<void>((resolve, reject) => {
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

      audio.play().catch(reject);
    });
  }, []);

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
      setError(msg);
      setIsSpeaking(false);
      setIsLoading(false);
      options?.onError?.(msg);
      
      // Fallback to browser SpeechSynthesis
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.rate = 1;
        utterance.onend = () => {
          setIsSpeaking(false);
          options?.onEnd?.();
        };
        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
      }
    }
  }, [stop, playChunk]);

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
      setError(msg);
      setIsSpeaking(false);
      setIsLoading(false);
      playingRef.current = false;
      options?.onError?.(msg);
    }
  }, [stop, playChunk]);

  return { isSpeaking, isLoading, error, speak, stop, speakStreaming };
}

/** Utility: split text into sentences (exported for use in hands-free mode) */
export { splitSentences };
