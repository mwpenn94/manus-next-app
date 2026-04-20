/**
 * server/tts.ts — Edge TTS (Microsoft Neural Voices)
 * 
 * High-quality, free text-to-speech using Microsoft Edge's Read Aloud API.
 * Supports 47+ English neural voices, streaming audio generation,
 * and sentence-by-sentence chunked synthesis for low-latency playback.
 * 
 * P15: Grok-level conversational voice capability
 */
import { Communicate, listVoices } from "edge-tts-universal";

// ── Voice catalog ──

export interface TTSVoice {
  id: string;        // ShortName e.g. "en-US-AriaNeural"
  name: string;      // Friendly name e.g. "Aria"
  gender: "Male" | "Female";
  locale: string;    // e.g. "en-US"
  description: string;
}

// Curated default voices — best quality for conversational AI
export const DEFAULT_VOICES: TTSVoice[] = [
  { id: "en-US-AriaNeural", name: "Aria", gender: "Female", locale: "en-US", description: "Warm, conversational female voice" },
  { id: "en-US-AvaNeural", name: "Ava", gender: "Female", locale: "en-US", description: "Clear, professional female voice" },
  { id: "en-US-EmmaNeural", name: "Emma", gender: "Female", locale: "en-US", description: "Friendly, natural female voice" },
  { id: "en-US-JennyNeural", name: "Jenny", gender: "Female", locale: "en-US", description: "Bright, engaging female voice" },
  { id: "en-US-AndrewNeural", name: "Andrew", gender: "Male", locale: "en-US", description: "Calm, professional male voice" },
  { id: "en-US-BrianNeural", name: "Brian", gender: "Male", locale: "en-US", description: "Warm, conversational male voice" },
  { id: "en-US-GuyNeural", name: "Guy", gender: "Male", locale: "en-US", description: "Deep, authoritative male voice" },
  { id: "en-US-ChristopherNeural", name: "Christopher", gender: "Male", locale: "en-US", description: "Clear, articulate male voice" },
  { id: "en-US-RogerNeural", name: "Roger", gender: "Male", locale: "en-US", description: "Mature, distinguished male voice" },
  { id: "en-US-MichelleNeural", name: "Michelle", gender: "Female", locale: "en-US", description: "Smooth, elegant female voice" },
  { id: "en-GB-SoniaNeural", name: "Sonia (UK)", gender: "Female", locale: "en-GB", description: "British female voice" },
  { id: "en-GB-RyanNeural", name: "Ryan (UK)", gender: "Male", locale: "en-GB", description: "British male voice" },
];

const DEFAULT_VOICE = "en-US-AriaNeural";

// ── Core synthesis ──

export interface SynthesizeOptions {
  text: string;
  voice?: string;
  rate?: string;   // e.g. "+20%" or "-10%"
  pitch?: string;  // e.g. "+5Hz" or "-2Hz"
  volume?: string; // e.g. "+10%" or "-5%"
}

/**
 * Synthesize text to MP3 audio buffer using Edge TTS.
 * Returns a Buffer containing the complete MP3 audio.
 */
export async function synthesizeSpeech(options: SynthesizeOptions): Promise<Buffer> {
  const communicate = new Communicate(options.text, {
    voice: options.voice || DEFAULT_VOICE,
    rate: options.rate,
    pitch: options.pitch,
    volume: options.volume,
  });

  const chunks: Buffer[] = [];
  for await (const chunk of communicate.stream()) {
    if (chunk.type === "audio" && chunk.data) {
      chunks.push(chunk.data);
    }
  }

  return Buffer.concat(chunks);
}

/**
 * Synthesize text and stream audio chunks as they arrive.
 * Yields Buffer chunks for real-time streaming to the client.
 * This enables sentence-by-sentence playback for Grok-level latency.
 */
export async function* synthesizeSpeechStream(options: SynthesizeOptions): AsyncGenerator<Buffer> {
  const communicate = new Communicate(options.text, {
    voice: options.voice || DEFAULT_VOICE,
    rate: options.rate,
    pitch: options.pitch,
    volume: options.volume,
  });

  for await (const chunk of communicate.stream()) {
    if (chunk.type === "audio" && chunk.data) {
      yield chunk.data;
    }
  }
}

// ── Sentence splitting for streaming TTS ──

/**
 * Split text into sentences for streaming TTS.
 * Strips markdown, splits on sentence boundaries, and filters empty chunks.
 */
export function splitIntoSentences(text: string): string[] {
  // Strip markdown formatting
  let clean = text
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

  // Split on sentence boundaries (period, question mark, exclamation, semicolon followed by space)
  const sentences = clean.split(/(?<=[.!?;])\s+/).filter(s => s.trim().length > 0);
  
  // Merge very short sentences with the next one for natural flow
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

// ── Voice listing ──

let voiceCache: TTSVoice[] | null = null;

/**
 * Get all available English voices from Edge TTS.
 * Results are cached after first call.
 */
export async function getAvailableVoices(): Promise<TTSVoice[]> {
  if (voiceCache) return voiceCache;
  
  try {
    const voices = await listVoices();
    voiceCache = voices
      .filter((v: any) => v.Locale?.startsWith("en-"))
      .map((v: any) => ({
        id: v.ShortName,
        name: v.ShortName.replace(/^en-\w+-/, "").replace("Neural", ""),
        gender: v.Gender as "Male" | "Female",
        locale: v.Locale,
        description: v.FriendlyName || v.ShortName,
      }));
    return voiceCache;
  } catch (err) {
    console.error("[TTS] Failed to list voices:", err);
    return DEFAULT_VOICES;
  }
}
