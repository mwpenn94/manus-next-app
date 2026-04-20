/**
 * useKokoroTTS — Real client-side TTS via Kokoro (kokoro-js)
 * 
 * Runs the 82M parameter Kokoro TTS model 100% locally in the browser.
 * Uses WebGPU for acceleration when available, falls back to WASM.
 * Model is downloaded once (~330MB for q8) and cached in browser storage.
 * 
 * After initial download, works completely offline with zero server dependency.
 */
import { useState, useRef, useCallback, useEffect } from "react";

/* ─── Types ─── */
export type KokoroModelStatus = "idle" | "loading" | "ready" | "error";
export type KokoroDevice = "webgpu" | "wasm";
export type KokoroDtype = "fp32" | "fp16" | "q8" | "q4" | "q4f16";

export interface KokoroVoice {
  id: string;
  name: string;
  language: string;
  gender: "female" | "male";
}

export interface KokoroConfig {
  device?: KokoroDevice;
  dtype?: KokoroDtype;
  modelId?: string;
}

interface KokoroTTSInstance {
  generate: (text: string, options: { voice: string }) => Promise<any>;
  list_voices: () => string[];
  stream: (splitter: any) => AsyncIterable<{ text: string; phonemes: string; audio: any }>;
}

/* ─── Voice Catalog ─── */
export const KOKORO_VOICES: KokoroVoice[] = [
  // American English Female
  { id: "af_heart", name: "Heart", language: "American English", gender: "female" },
  { id: "af_bella", name: "Bella", language: "American English", gender: "female" },
  { id: "af_nicole", name: "Nicole", language: "American English", gender: "female" },
  { id: "af_aoede", name: "Aoede", language: "American English", gender: "female" },
  { id: "af_kore", name: "Kore", language: "American English", gender: "female" },
  { id: "af_sarah", name: "Sarah", language: "American English", gender: "female" },
  { id: "af_nova", name: "Nova", language: "American English", gender: "female" },
  { id: "af_sky", name: "Sky", language: "American English", gender: "female" },
  // American English Male
  { id: "am_fenrir", name: "Fenrir", language: "American English", gender: "male" },
  { id: "am_michael", name: "Michael", language: "American English", gender: "male" },
  { id: "am_puck", name: "Puck", language: "American English", gender: "male" },
  { id: "am_eric", name: "Eric", language: "American English", gender: "male" },
  { id: "am_liam", name: "Liam", language: "American English", gender: "male" },
  // British English
  { id: "bf_emma", name: "Emma", language: "British English", gender: "female" },
  { id: "bf_isabella", name: "Isabella", language: "British English", gender: "female" },
  { id: "bf_alice", name: "Alice", language: "British English", gender: "female" },
  { id: "bm_george", name: "George", language: "British English", gender: "male" },
  { id: "bm_fable", name: "Fable", language: "British English", gender: "male" },
  { id: "bm_daniel", name: "Daniel", language: "British English", gender: "male" },
];

const DEFAULT_MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";

/* ─── Hook ─── */
export function useKokoroTTS(config?: KokoroConfig) {
  const [status, setStatus] = useState<KokoroModelStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<string[]>([]);
  
  const ttsRef = useRef<KokoroTTSInstance | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const device = config?.device || (hasWebGPU() ? "webgpu" : "wasm");
  const dtype = config?.dtype || (device === "webgpu" ? "fp32" : "q8");
  const modelId = config?.modelId || DEFAULT_MODEL_ID;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
      if (audioContextRef.current?.state !== "closed") {
        audioContextRef.current?.close();
      }
    };
  }, []);

  /**
   * Load the Kokoro model. Downloads ~330MB on first call, cached afterward.
   */
  const loadModel = useCallback(async () => {
    if (ttsRef.current) return; // Already loaded
    
    setStatus("loading");
    setProgress(0);
    setError(null);

    try {
      // Dynamic import to avoid bundling kokoro-js in main chunk
      const { KokoroTTS } = await import("kokoro-js");

      const tts = await KokoroTTS.from_pretrained(modelId, {
        dtype,
        device,
        progress_callback: (p: any) => {
          if (p.status === "progress" && p.total) {
            setProgress(Math.round((p.loaded / p.total) * 100));
          }
        },
      });

      ttsRef.current = tts as unknown as KokoroTTSInstance;
      
      // Get available voices
      try {
        const voices = tts.list_voices();
        if (Array.isArray(voices)) {
          setAvailableVoices(voices);
        } else {
          setAvailableVoices(KOKORO_VOICES.map(v => v.id));
        }
      } catch {
        setAvailableVoices(KOKORO_VOICES.map(v => v.id));
      }

      setStatus("ready");
      setProgress(100);
    } catch (err: any) {
      console.error("[KokoroTTS] Failed to load model:", err);
      setError(err.message || "Failed to load Kokoro model");
      setStatus("error");
    }
  }, [modelId, dtype, device]);

  /**
   * Generate speech from text and play it through the browser's audio system.
   * Returns the AudioBuffer for further processing if needed.
   */
  const speak = useCallback(async (text: string, voice: string = "af_heart"): Promise<AudioBuffer | null> => {
    if (!ttsRef.current) {
      setError("Model not loaded. Call loadModel() first.");
      return null;
    }
    if (!text.trim()) return null;

    setIsGenerating(true);
    setError(null);

    try {
      const result = await ttsRef.current.generate(text, { voice });

      // Convert RawAudio to AudioBuffer for browser playback
      // result.audio is Float32Array, result.sampling_rate is number
      const audioData = result.audio as Float32Array;
      const sampleRate = (result as any).sampling_rate || 24000;

      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        audioContextRef.current = new AudioContext({ sampleRate });
      }

      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") await ctx.resume();

      const audioBuffer = ctx.createBuffer(1, audioData.length, sampleRate);
      audioBuffer.copyToChannel(new Float32Array(audioData.buffer as ArrayBuffer, audioData.byteOffset, audioData.length), 0);

      // Stop any currently playing audio
      stop();

      // Play the audio
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();
      currentSourceRef.current = source;

      source.onended = () => {
        currentSourceRef.current = null;
      };

      return audioBuffer;
    } catch (err: any) {
      console.error("[KokoroTTS] Generation failed:", err);
      setError(err.message || "Speech generation failed");
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  /**
   * Generate speech and return as a Blob (for download or further processing).
   */
  const generateBlob = useCallback(async (text: string, voice: string = "af_heart"): Promise<Blob | null> => {
    if (!ttsRef.current) {
      setError("Model not loaded. Call loadModel() first.");
      return null;
    }
    if (!text.trim()) return null;

    setIsGenerating(true);
    setError(null);

    try {
      const result = await ttsRef.current.generate(text, { voice });
      const audioData = result.audio as Float32Array;
      const sampleRate = (result as any).sampling_rate || 24000;

      // Encode as WAV
      const wavBlob = encodeWAV(audioData, sampleRate);
      return wavBlob;
    } catch (err: any) {
      console.error("[KokoroTTS] Generation failed:", err);
      setError(err.message || "Speech generation failed");
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  /**
   * Stop currently playing audio.
   */
  const stop = useCallback(() => {
    try {
      currentSourceRef.current?.stop();
    } catch {
      // Already stopped
    }
    currentSourceRef.current = null;
  }, []);

  /**
   * Unload the model and free memory.
   */
  const unloadModel = useCallback(() => {
    stop();
    ttsRef.current = null;
    setStatus("idle");
    setProgress(0);
    setAvailableVoices([]);
  }, [stop]);

  return {
    status,
    progress,
    error,
    isGenerating,
    availableVoices,
    device,
    dtype,
    loadModel,
    speak,
    generateBlob,
    stop,
    unloadModel,
    isReady: status === "ready",
  };
}

/* ─── Helpers ─── */
function hasWebGPU(): boolean {
  return typeof navigator !== "undefined" && !!(navigator as any).gpu;
}

/**
 * Encode Float32Array audio data as a WAV Blob.
 */
function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // WAV header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);

  // Convert float32 to int16
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
