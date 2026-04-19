/**
 * useTTS — Browser SpeechSynthesis hook for text-to-speech
 * 
 * Capability #59: Voice TTS
 * Uses the Web Speech API (SpeechSynthesis) for zero-cost, zero-latency TTS.
 * Supports voice selection, rate/pitch control, and playback state.
 */
import { useState, useEffect, useCallback, useRef } from "react";

export interface TTSOptions {
  rate?: number;      // 0.1 - 10, default 1
  pitch?: number;     // 0 - 2, default 1
  volume?: number;    // 0 - 1, default 1
  voiceName?: string; // preferred voice name
  lang?: string;      // BCP 47 language tag, default 'en-US'
}

export interface TTSState {
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
  speak: (text: string, options?: TTSOptions) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

/** Strip markdown formatting for cleaner speech */
function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " code block omitted ")  // code blocks
    .replace(/`([^`]+)`/g, "$1")                          // inline code
    .replace(/\*\*([^*]+)\*\*/g, "$1")                    // bold
    .replace(/\*([^*]+)\*/g, "$1")                        // italic
    .replace(/__([^_]+)__/g, "$1")                        // bold alt
    .replace(/_([^_]+)_/g, "$1")                          // italic alt
    .replace(/#{1,6}\s+/g, "")                            // headings
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")              // links
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "image: $1")      // images
    .replace(/^\s*[-*+]\s+/gm, "")                        // list markers
    .replace(/^\s*\d+\.\s+/gm, "")                        // numbered lists
    .replace(/\|[^|]+\|/g, "")                            // table rows
    .replace(/---+/g, "")                                 // horizontal rules
    .replace(/\n{2,}/g, ". ")                             // paragraph breaks
    .replace(/\n/g, " ")                                  // line breaks
    .trim();
}

export function useTTS(): TTSState {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  // Load voices (they load asynchronously in some browsers)
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) {
        setVoices(available);
      }
    };

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, [isSupported]);

  const speak = useCallback((text: string, options?: TTSOptions) => {
    if (!isSupported) return;

    // Stop any current speech
    window.speechSynthesis.cancel();

    const cleanText = stripMarkdown(text);
    if (!cleanText.trim()) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = options?.rate ?? 1;
    utterance.pitch = options?.pitch ?? 1;
    utterance.volume = options?.volume ?? 1;
    utterance.lang = options?.lang ?? "en-US";

    // Select voice
    if (options?.voiceName) {
      const match = voices.find(v => v.name === options.voiceName);
      if (match) utterance.voice = match;
    } else {
      // Prefer a natural-sounding English voice
      const preferred = voices.find(v =>
        v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha"))
      ) || voices.find(v => v.lang.startsWith("en") && v.default);
      if (preferred) utterance.voice = preferred;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isSupported, voices]);

  const pause = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
  }, [isSupported]);

  const resume = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.resume();
    setIsPaused(false);
  }, [isSupported]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  }, [isSupported]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  return { isSpeaking, isPaused, isSupported, voices, speak, pause, resume, stop };
}
