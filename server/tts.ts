/**
 * server/tts.ts — Edge TTS (Microsoft Neural Voices)
 * 
 * High-quality, free text-to-speech using Microsoft Edge's Read Aloud API.
 * Supports 400+ neural voices across 75+ languages, streaming audio generation,
 * and sentence-by-sentence chunked synthesis for low-latency playback.
 * 
 * P15: Grok-level conversational voice capability
 * P16: Multi-language voice catalog
 */
import { Communicate, listVoices } from "edge-tts-universal";

// ── Voice catalog ──

export interface TTSVoice {
  id: string;        // ShortName e.g. "en-US-AriaNeural"
  name: string;      // Friendly name e.g. "Aria"
  gender: "Male" | "Female";
  locale: string;    // e.g. "en-US"
  language: string;  // e.g. "English (US)"
  description: string;
}

// Language display name mapping for common locales
const LOCALE_DISPLAY_NAMES: Record<string, string> = {
  "af": "Afrikaans", "am": "Amharic", "ar": "Arabic", "az": "Azerbaijani",
  "bg": "Bulgarian", "bn": "Bengali", "bs": "Bosnian", "ca": "Catalan",
  "cs": "Czech", "cy": "Welsh", "da": "Danish", "de": "German",
  "el": "Greek", "en": "English", "es": "Spanish", "et": "Estonian",
  "eu": "Basque", "fa": "Persian", "fi": "Finnish", "fil": "Filipino",
  "fr": "French", "ga": "Irish", "gl": "Galician", "gu": "Gujarati",
  "he": "Hebrew", "hi": "Hindi", "hr": "Croatian", "hu": "Hungarian",
  "hy": "Armenian", "id": "Indonesian", "is": "Icelandic", "it": "Italian",
  "ja": "Japanese", "jv": "Javanese", "ka": "Georgian", "kk": "Kazakh",
  "km": "Khmer", "kn": "Kannada", "ko": "Korean", "lo": "Lao",
  "lt": "Lithuanian", "lv": "Latvian", "mk": "Macedonian", "ml": "Malayalam",
  "mn": "Mongolian", "mr": "Marathi", "ms": "Malay", "mt": "Maltese",
  "my": "Myanmar", "nb": "Norwegian", "ne": "Nepali", "nl": "Dutch",
  "pl": "Polish", "ps": "Pashto", "pt": "Portuguese", "ro": "Romanian",
  "ru": "Russian", "si": "Sinhala", "sk": "Slovak", "sl": "Slovenian",
  "so": "Somali", "sq": "Albanian", "sr": "Serbian", "su": "Sundanese",
  "sv": "Swedish", "sw": "Swahili", "ta": "Tamil", "te": "Telugu",
  "th": "Thai", "tr": "Turkish", "uk": "Ukrainian", "ur": "Urdu",
  "uz": "Uzbek", "vi": "Vietnamese", "zh": "Chinese", "zu": "Zulu",
};

function getLanguageDisplayName(locale: string): string {
  const parts = locale.split("-");
  const langCode = parts[0].toLowerCase();
  const baseName = LOCALE_DISPLAY_NAMES[langCode] || langCode;
  const region = parts.length > 1 ? parts.slice(1).join("-") : "";
  return region ? `${baseName} (${region})` : baseName;
}

// Curated default voices — best quality for conversational AI (English)
export const DEFAULT_VOICES: TTSVoice[] = [
  { id: "en-US-AriaNeural", name: "Aria", gender: "Female", locale: "en-US", language: "English (US)", description: "Warm, conversational female voice" },
  { id: "en-US-AvaNeural", name: "Ava", gender: "Female", locale: "en-US", language: "English (US)", description: "Clear, professional female voice" },
  { id: "en-US-EmmaNeural", name: "Emma", gender: "Female", locale: "en-US", language: "English (US)", description: "Friendly, natural female voice" },
  { id: "en-US-JennyNeural", name: "Jenny", gender: "Female", locale: "en-US", language: "English (US)", description: "Bright, engaging female voice" },
  { id: "en-US-AndrewNeural", name: "Andrew", gender: "Male", locale: "en-US", language: "English (US)", description: "Calm, professional male voice" },
  { id: "en-US-BrianNeural", name: "Brian", gender: "Male", locale: "en-US", language: "English (US)", description: "Warm, conversational male voice" },
  { id: "en-US-GuyNeural", name: "Guy", gender: "Male", locale: "en-US", language: "English (US)", description: "Deep, authoritative male voice" },
  { id: "en-US-ChristopherNeural", name: "Christopher", gender: "Male", locale: "en-US", language: "English (US)", description: "Clear, articulate male voice" },
  { id: "en-US-RogerNeural", name: "Roger", gender: "Male", locale: "en-US", language: "English (US)", description: "Mature, distinguished male voice" },
  { id: "en-US-MichelleNeural", name: "Michelle", gender: "Female", locale: "en-US", language: "English (US)", description: "Smooth, elegant female voice" },
  { id: "en-GB-SoniaNeural", name: "Sonia (UK)", gender: "Female", locale: "en-GB", language: "English (GB)", description: "British female voice" },
  { id: "en-GB-RyanNeural", name: "Ryan (UK)", gender: "Male", locale: "en-GB", language: "English (GB)", description: "British male voice" },
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

let allVoiceCache: TTSVoice[] | null = null;
let voiceCacheByLang: Map<string, TTSVoice[]> | null = null;

/**
 * Get all available voices from Edge TTS across all languages.
 * Results are cached after first call.
 */
export async function getAllVoices(): Promise<TTSVoice[]> {
  if (allVoiceCache) return allVoiceCache;
  
  try {
    const voices = await listVoices();
    allVoiceCache = voices
      .filter((v: any) => v.ShortName && v.Locale)
      .map((v: any) => ({
        id: v.ShortName,
        name: v.ShortName.replace(/^[a-z]{2,3}-[A-Z]{2,4}-/, "").replace("Neural", "").trim(),
        gender: v.Gender as "Male" | "Female",
        locale: v.Locale,
        language: getLanguageDisplayName(v.Locale),
        description: v.FriendlyName || v.ShortName,
      }))
      .sort((a, b) => a.language.localeCompare(b.language) || a.name.localeCompare(b.name));
    
    // Build language index
    voiceCacheByLang = new Map();
    for (const v of allVoiceCache) {
      const langKey = v.locale.split("-")[0].toLowerCase();
      if (!voiceCacheByLang.has(langKey)) voiceCacheByLang.set(langKey, []);
      voiceCacheByLang.get(langKey)!.push(v);
    }
    
    return allVoiceCache;
  } catch (err) {
    console.error("[TTS] Failed to list voices:", err);
    return DEFAULT_VOICES;
  }
}

/**
 * Get available voices filtered by language code (e.g. "en", "es", "ja").
 * Returns curated defaults for English if no language specified.
 */
export async function getVoicesByLanguage(langCode?: string): Promise<TTSVoice[]> {
  if (!langCode || langCode === "en") {
    // For English, return curated defaults first, then all English voices
    const all = await getAllVoices();
    const defaultIds = new Set(DEFAULT_VOICES.map(v => v.id));
    const englishVoices = all.filter(v => v.locale.startsWith("en-"));
    const nonDefault = englishVoices.filter(v => !defaultIds.has(v.id));
    return [...DEFAULT_VOICES, ...nonDefault];
  }
  
  // Ensure cache is populated
  await getAllVoices();
  
  const lang = langCode.toLowerCase();
  return voiceCacheByLang?.get(lang) || [];
}

/**
 * Get a list of all available languages with voice counts.
 */
export async function getAvailableLanguages(): Promise<Array<{ code: string; name: string; voiceCount: number }>> {
  await getAllVoices();
  
  if (!voiceCacheByLang) return [{ code: "en", name: "English", voiceCount: DEFAULT_VOICES.length }];
  
  const languages: Array<{ code: string; name: string; voiceCount: number }> = [];
  const entries = Array.from(voiceCacheByLang.entries());
  for (const [code, voices] of entries) {
    const name = LOCALE_DISPLAY_NAMES[code] || code;
    languages.push({ code, name, voiceCount: voices.length });
  }
  
  return languages.sort((a, b) => a.name.localeCompare(b.name));
}

// Backward compat
export async function getAvailableVoices(): Promise<TTSVoice[]> {
  return getVoicesByLanguage("en");
}
