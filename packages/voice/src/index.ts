/**
 * @mwpenn94/manus-next-voice
 * Voice input and TTS for Manus Next
 *
 * This package is a workspace stub that re-exports types and
 * utilities from the monolith. When published to npm, these
 * will be standalone imports.
 */

// Voice types
export interface VoiceInputOptions {
  language?: string;
  continuous?: boolean;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (error: Error) => void;
}

export interface TTSOptions {
  text: string;
  voice?: string;
  rate?: number;
  pitch?: number;
  onEnd?: () => void;
}

export const PACKAGE_NAME = "@mwpenn94/manus-next-voice";
export const PACKAGE_VERSION = "0.1.0";
