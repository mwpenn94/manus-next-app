/**
 * musicSynthesizer.ts — Web Audio API Music Synthesizer
 *
 * Client-side music generation fallback when server audio is unavailable.
 * Parses composition descriptions (from LLM) and synthesizes audio using
 * oscillators, filters, and envelopes. Supports basic chord progressions,
 * arpeggios, pads, and rhythmic patterns.
 *
 * Usage:
 *   const synth = new MusicSynthesizer();
 *   await synth.playComposition(compositionText, { genre, mood, duration });
 *   synth.stop();
 */

// ── Note/Frequency Mapping ──
const NOTE_FREQUENCIES: Record<string, number> = {
  C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.0, A2: 110.0, B2: 123.47,
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0, B5: 987.77,
  C6: 1046.5, D6: 1174.66, E6: 1318.51, F6: 1396.91, G6: 1567.98, A6: 1760.0, B6: 1975.53,
};

// ── Chord Definitions ──
const CHORD_SHAPES: Record<string, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  sus4: [0, 5, 7],
  sus2: [0, 2, 7],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  dom7: [0, 4, 7, 10],
};

// ── Genre-Based Chord Progressions ──
const PROGRESSIONS: Record<string, string[][]> = {
  ambient: [["Cmaj7", "Fmaj7", "Am7", "G"], ["Em7", "Am7", "Dm7", "Gmaj7"]],
  electronic: [["Am", "F", "C", "G"], ["Dm", "Bb", "F", "C"]],
  "lo-fi": [["Dm7", "G7", "Cmaj7", "Am7"], ["Fmaj7", "Em7", "Dm7", "Cmaj7"]],
  cinematic: [["Cm", "Ab", "Eb", "Bb"], ["Fm", "Db", "Ab", "Eb"]],
  jazz: [["Dm7", "G7", "Cmaj7", "Am7"], ["Fm7", "Bb7", "Ebmaj7", "Cm7"]],
  classical: [["C", "Am", "F", "G"], ["Dm", "G", "C", "F"]],
  rock: [["E", "A", "B", "E"], ["G", "D", "Am", "C"]],
  default: [["C", "Am", "F", "G"], ["Am", "F", "C", "G"]],
};

// ── Mood → Tempo/Character Mapping ──
const MOOD_PARAMS: Record<string, { tempoRange: [number, number]; filterFreq: number; attack: number; release: number; waveform: OscillatorType }> = {
  calm: { tempoRange: [60, 80], filterFreq: 800, attack: 0.3, release: 1.0, waveform: "sine" },
  energetic: { tempoRange: [120, 140], filterFreq: 3000, attack: 0.01, release: 0.2, waveform: "sawtooth" },
  melancholic: { tempoRange: [70, 90], filterFreq: 600, attack: 0.2, release: 0.8, waveform: "triangle" },
  uplifting: { tempoRange: [100, 120], filterFreq: 2000, attack: 0.05, release: 0.4, waveform: "sine" },
  dark: { tempoRange: [80, 100], filterFreq: 400, attack: 0.1, release: 0.6, waveform: "sawtooth" },
  dreamy: { tempoRange: [65, 85], filterFreq: 1200, attack: 0.4, release: 1.2, waveform: "sine" },
  creative: { tempoRange: [90, 110], filterFreq: 1500, attack: 0.1, release: 0.5, waveform: "triangle" },
  default: { tempoRange: [85, 105], filterFreq: 1000, attack: 0.1, release: 0.5, waveform: "sine" },
};

interface SynthOptions {
  genre?: string;
  mood?: string;
  duration?: number; // seconds
}

interface SynthState {
  isPlaying: boolean;
  progress: number; // 0-1
  currentSection: string;
}

type StateCallback = (state: SynthState) => void;

/**
 * Parse a chord name into root note + quality
 */
function parseChord(chord: string): { root: string; quality: string } {
  const match = chord.match(/^([A-G][b#]?)(m(?:aj|in)?7?|dim|aug|sus[24]|7)?$/);
  if (!match) return { root: "C", quality: "major" };
  const root = match[1];
  const suffix = match[2] || "";
  let quality = "major";
  if (suffix === "m" || suffix === "min" || suffix === "min7") quality = "minor";
  else if (suffix === "m7") quality = "min7";
  else if (suffix === "maj7") quality = "maj7";
  else if (suffix === "dim") quality = "dim";
  else if (suffix === "aug") quality = "aug";
  else if (suffix === "sus4") quality = "sus4";
  else if (suffix === "sus2") quality = "sus2";
  else if (suffix === "7") quality = "dom7";
  return { root, quality };
}

/**
 * Get frequencies for a chord at a given octave
 */
function getChordFrequencies(chord: string, octave: number = 4): number[] {
  const { root, quality } = parseChord(chord);
  const rootNote = `${root}${octave}`;
  const rootFreq = NOTE_FREQUENCIES[rootNote] || 261.63;
  const intervals = CHORD_SHAPES[quality] || CHORD_SHAPES.major;
  return intervals.map(semitones => rootFreq * Math.pow(2, semitones / 12));
}

export class MusicSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private nodes: (OscillatorNode | AudioBufferSourceNode)[] = [];
  private scheduledTimeout: ReturnType<typeof setTimeout> | null = null;
  private isActive = false;
  private stateCallback: StateCallback | null = null;
  private progressInterval: ReturnType<typeof setInterval> | null = null;
  private startTime = 0;
  private totalDuration = 0;

  constructor() {}

  onStateChange(cb: StateCallback) {
    this.stateCallback = cb;
  }

  private emitState(state: Partial<SynthState>) {
    if (this.stateCallback) {
      this.stateCallback({
        isPlaying: this.isActive,
        progress: 0,
        currentSection: "",
        ...state,
      });
    }
  }

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Play a synthesized composition based on genre/mood parameters
   */
  async playComposition(
    _compositionText: string,
    options: SynthOptions = {}
  ): Promise<void> {
    this.stop();
    this.isActive = true;

    const ctx = this.getContext();
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.3;
    this.masterGain.connect(ctx.destination);

    const genre = (options.genre || "ambient").toLowerCase();
    const mood = (options.mood || "calm").toLowerCase();
    const duration = options.duration || 60;
    this.totalDuration = duration;
    this.startTime = ctx.currentTime;

    const moodParams = MOOD_PARAMS[mood] || MOOD_PARAMS.default;
    const tempo = moodParams.tempoRange[0] + Math.random() * (moodParams.tempoRange[1] - moodParams.tempoRange[0]);
    const beatDuration = 60 / tempo;
    const progressions = PROGRESSIONS[genre] || PROGRESSIONS.default;
    const progression = progressions[Math.floor(Math.random() * progressions.length)];

    // Start progress tracking
    this.progressInterval = setInterval(() => {
      if (!this.isActive || !this.ctx) return;
      const elapsed = this.ctx.currentTime - this.startTime;
      const progress = Math.min(elapsed / duration, 1);
      const sectionIdx = Math.floor((elapsed / duration) * 4);
      const sections = ["Intro", "Development", "Climax", "Resolution"];
      this.emitState({
        isPlaying: true,
        progress,
        currentSection: sections[Math.min(sectionIdx, 3)],
      });
      if (progress >= 1) {
        this.stop();
      }
    }, 200);

    this.emitState({ isPlaying: true, progress: 0, currentSection: "Intro" });

    // Schedule the composition
    let time = ctx.currentTime;
    const endTime = time + duration;
    let chordIdx = 0;

    // Create a reverb effect using convolution
    const convolver = ctx.createConvolver();
    const reverbBuffer = this.createReverbImpulse(ctx, 2, 2);
    convolver.buffer = reverbBuffer;
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = genre === "ambient" || genre === "cinematic" ? 0.5 : 0.25;
    convolver.connect(reverbGain);
    reverbGain.connect(this.masterGain!);

    // Low-pass filter for warmth
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = moodParams.filterFreq;
    filter.Q.value = 0.7;
    filter.connect(this.masterGain!);
    filter.connect(convolver);

    // Fade in
    this.masterGain.gain.setValueAtTime(0, ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 2);

    // Schedule fade out
    if (duration > 4) {
      this.masterGain.gain.setValueAtTime(0.3, ctx.currentTime + duration - 3);
      this.masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    }

    // Schedule chord pads and arpeggios
    while (time < endTime && this.isActive) {
      const chord = progression[chordIdx % progression.length];
      const chordFreqs = getChordFrequencies(chord, genre === "ambient" ? 3 : 4);
      const chordDuration = beatDuration * 4; // One chord per bar

      // Pad layer — sustained chord
      for (const freq of chordFreqs) {
        this.schedulePad(ctx, filter, freq, time, chordDuration, moodParams);
      }

      // Bass note
      const bassFreqs = getChordFrequencies(chord, 2);
      this.scheduleBass(ctx, filter, bassFreqs[0], time, chordDuration, moodParams);

      // Arpeggio layer (for certain genres)
      if (genre !== "ambient" || Math.random() > 0.4) {
        this.scheduleArpeggio(ctx, filter, chordFreqs, time, chordDuration, beatDuration, moodParams);
      }

      // Rhythmic element for energetic genres
      if (mood === "energetic" || genre === "electronic" || genre === "rock") {
        this.scheduleRhythm(ctx, filter, time, chordDuration, beatDuration);
      }

      time += chordDuration;
      chordIdx++;
    }

    // Auto-stop after duration
    this.scheduledTimeout = setTimeout(() => {
      this.stop();
    }, duration * 1000 + 500);
  }

  private schedulePad(
    ctx: AudioContext,
    destination: AudioNode,
    freq: number,
    startTime: number,
    duration: number,
    params: typeof MOOD_PARAMS.default
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = params.waveform;
    osc.frequency.value = freq;
    // Slight detune for richness
    osc.detune.value = (Math.random() - 0.5) * 10;

    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(destination);

    // ADSR envelope
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.08, startTime + params.attack);
    gain.gain.setValueAtTime(0.06, startTime + duration - params.release);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.1);
    this.nodes.push(osc);
  }

  private scheduleBass(
    ctx: AudioContext,
    destination: AudioNode,
    freq: number,
    startTime: number,
    duration: number,
    params: typeof MOOD_PARAMS.default
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = freq;

    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(destination);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.12, startTime + 0.05);
    gain.gain.setValueAtTime(0.1, startTime + duration * 0.8);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.1);
    this.nodes.push(osc);
  }

  private scheduleArpeggio(
    ctx: AudioContext,
    destination: AudioNode,
    chordFreqs: number[],
    startTime: number,
    chordDuration: number,
    beatDuration: number,
    params: typeof MOOD_PARAMS.default
  ) {
    const noteLength = beatDuration * 0.4;
    const pattern = this.generateArpeggioPattern(chordFreqs);
    let t = startTime;

    for (const freq of pattern) {
      if (t >= startTime + chordDuration) break;
      if (!this.isActive) break;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.value = freq * 2; // One octave up
      gain.gain.value = 0;

      osc.connect(gain);
      gain.connect(destination);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.05, t + 0.01);
      gain.gain.setValueAtTime(0.04, t + noteLength * 0.7);
      gain.gain.linearRampToValueAtTime(0, t + noteLength);

      osc.start(t);
      osc.stop(t + noteLength + 0.05);
      this.nodes.push(osc);

      t += beatDuration * 0.5;
    }
  }

  private scheduleRhythm(
    ctx: AudioContext,
    destination: AudioNode,
    startTime: number,
    chordDuration: number,
    beatDuration: number
  ) {
    let t = startTime;
    while (t < startTime + chordDuration) {
      if (!this.isActive) break;
      // Hi-hat-like noise burst
      const bufferSize = ctx.sampleRate * 0.03;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = 0.03;

      const hipass = ctx.createBiquadFilter();
      hipass.type = "highpass";
      hipass.frequency.value = 8000;

      source.connect(hipass);
      hipass.connect(gain);
      gain.connect(destination);

      source.start(t);
      this.nodes.push(source);

      t += beatDuration * 0.5;
    }
  }

  private generateArpeggioPattern(freqs: number[]): number[] {
    // Create an interesting arpeggio pattern from chord tones
    const patterns = [
      [0, 1, 2, 1], // up-down
      [0, 2, 1, 2], // skip
      [2, 1, 0, 1], // down-up
      [0, 1, 2, 0, 1, 2, 1, 0], // extended up-down
    ];
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    return pattern.map(idx => freqs[idx % freqs.length]);
  }

  private createReverbImpulse(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = ctx.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return buffer;
  }

  /**
   * Stop all playback and clean up
   */
  stop(): void {
    this.isActive = false;

    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }

    if (this.scheduledTimeout) {
      clearTimeout(this.scheduledTimeout);
      this.scheduledTimeout = null;
    }

    // Stop all oscillators/sources
    for (const node of this.nodes) {
      try {
        node.stop();
      } catch {}
    }
    this.nodes = [];

    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch {}
      this.masterGain = null;
    }

    this.emitState({ isPlaying: false, progress: 0, currentSection: "" });
  }

  /**
   * Dispose the audio context entirely
   */
  dispose(): void {
    this.stop();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }

  get playing(): boolean {
    return this.isActive;
  }
}

/** Singleton instance for the music studio page */
let instance: MusicSynthesizer | null = null;

export function getMusicSynthesizer(): MusicSynthesizer {
  if (!instance) {
    instance = new MusicSynthesizer();
  }
  return instance;
}

export function disposeMusicSynthesizer(): void {
  if (instance) {
    instance.dispose();
    instance = null;
  }
}
