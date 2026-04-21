/**
 * §L.35 useVoiceSession — Client-side voice streaming hook
 *
 * Manages the full voice pipeline:
 * 1. Microphone capture via MediaRecorder API
 * 2. Browser-side VAD (Voice Activity Detection) via AudioWorklet energy detection
 * 3. WebSocket connection to /api/voice/ws
 * 4. Audio chunk streaming (mic → server)
 * 5. TTS audio playback (server → speaker)
 * 6. Barge-in / interruption handling
 * 7. Graceful degradation (mic denied, WS failure, etc.)
 *
 * Usage:
 *   const voice = useVoiceSession({ taskId: "abc" });
 *   voice.start();        // Begin voice session
 *   voice.stop();         // End voice session
 *   voice.interrupt();    // Barge-in (stop agent speaking)
 *   voice.sendText("hi"); // Text input during voice mode
 */

import { useState, useRef, useCallback, useEffect } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type VoiceState =
  | "idle"
  | "connecting"
  | "listening"
  | "processing_stt"
  | "thinking"
  | "speaking"
  | "interrupted"
  | "error"
  | "mic_denied";

export interface VoiceConfig {
  voice?: string;
  rate?: string;
  pitch?: string;
  volume?: string;
  persona?: string;
  language?: string;
  autoListen?: boolean;
  voiceOnly?: boolean;
}

export interface VoiceLatency {
  sttMs: number;
  llmMs: number;
  ttsMs: number;
  totalMs: number;
}

export interface VoiceSessionHook {
  /** Current pipeline state */
  state: VoiceState;
  /** Whether voice session is active (not idle) */
  isActive: boolean;
  /** Whether agent is currently speaking */
  isSpeaking: boolean;
  /** Latest user transcript */
  transcript: string;
  /** Latest agent text response */
  agentText: string;
  /** Latest latency metrics */
  latency: VoiceLatency | null;
  /** Error message if any */
  error: string | null;
  /** Start voice session */
  start: (config?: VoiceConfig) => Promise<void>;
  /** Stop voice session */
  stop: () => void;
  /** Interrupt agent (barge-in) */
  interrupt: () => void;
  /** Send text input during voice session */
  sendText: (text: string) => void;
  /** Update voice config mid-session */
  updateConfig: (config: VoiceConfig) => void;
}

interface UseVoiceSessionOptions {
  taskId?: string;
  userId?: number;
  /** Called when agent text response arrives */
  onAgentText?: (text: string, done: boolean) => void;
  /** Called when user transcript arrives */
  onTranscript?: (text: string, final: boolean) => void;
  /** Called when latency metrics arrive */
  onLatency?: (latency: VoiceLatency) => void;
  /** Called on state change */
  onStateChange?: (state: VoiceState) => void;
  /** Called on error */
  onError?: (message: string) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** VAD energy threshold — above this = speech detected */
const VAD_ENERGY_THRESHOLD = 0.01;

/** VAD silence duration before triggering end-of-speech (ms) */
const VAD_SILENCE_TIMEOUT = 1200;

/** Audio chunk interval for streaming to server (ms) */
const AUDIO_CHUNK_INTERVAL = 250;

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useVoiceSession(options: UseVoiceSessionOptions = {}): VoiceSessionHook {
  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [agentText, setAgentText] = useState("");
  const [latency, setLatency] = useState<VoiceLatency | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const vadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSpeakingRef = useRef(false);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const chunkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Audio Playback Queue ──

  const playNextAudioChunk = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    isPlayingRef.current = true;

    const ctx = audioContextRef.current || new AudioContext();
    audioContextRef.current = ctx;

    while (audioQueueRef.current.length > 0) {
      const chunk = audioQueueRef.current.shift();
      if (!chunk) break;

      try {
        const audioBuffer = await ctx.decodeAudioData(chunk.slice(0));
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);

        await new Promise<void>((resolve) => {
          source.onended = () => resolve();
          source.start();
        });
      } catch {
        // Skip undecodable chunks (partial MP3 frames)
      }
    }

    isPlayingRef.current = false;
  }, []);

  const stopAudioPlayback = useCallback(() => {
    audioQueueRef.current = [];
    isPlayingRef.current = false;
  }, []);

  // ── WebSocket Message Handler ──

  const handleWsMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case "state":
            setState(msg.state as VoiceState);
            options.onStateChange?.(msg.state);
            break;

          case "transcript":
            setTranscript(msg.text);
            options.onTranscript?.(msg.text, msg.final);
            break;

          case "agent_text":
            setAgentText(msg.text);
            options.onAgentText?.(msg.text, msg.done);
            break;

          case "agent_audio": {
            // Decode base64 audio and queue for playback
            const binary = atob(msg.data);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            audioQueueRef.current.push(bytes.buffer);
            playNextAudioChunk();
            break;
          }

          case "agent_audio_end":
            // Agent finished speaking
            break;

          case "latency": {
            const l: VoiceLatency = {
              sttMs: msg.sttMs,
              llmMs: msg.llmMs,
              ttsMs: msg.ttsMs,
              totalMs: msg.totalMs,
            };
            setLatency(l);
            options.onLatency?.(l);
            break;
          }

          case "error":
            setError(msg.message);
            options.onError?.(msg.message);
            break;
        }
      } catch {
        // Ignore malformed messages
      }
    },
    [options, playNextAudioChunk]
  );

  // ── VAD (Voice Activity Detection) ──

  const startVAD = useCallback(
    (stream: MediaStream) => {
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Float32Array(analyser.fftSize);

      const checkEnergy = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getFloatTimeDomainData(dataArray);

        // Calculate RMS energy
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);

        if (rms > VAD_ENERGY_THRESHOLD) {
          // Speech detected
          if (!isSpeakingRef.current) {
            isSpeakingRef.current = true;
            wsRef.current?.send(JSON.stringify({ type: "vad_start" }));
          }
          // Reset silence timer
          if (vadTimerRef.current) {
            clearTimeout(vadTimerRef.current);
          }
          vadTimerRef.current = setTimeout(() => {
            if (isSpeakingRef.current) {
              isSpeakingRef.current = false;
              wsRef.current?.send(JSON.stringify({ type: "vad_end" }));
            }
          }, VAD_SILENCE_TIMEOUT);
        }

        requestAnimationFrame(checkEnergy);
      };

      checkEnergy();
    },
    []
  );

  // ── Start Voice Session ──

  const start = useCallback(
    async (config?: VoiceConfig) => {
      setError(null);
      setState("connecting");

      // 1. Request microphone access
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000,
          },
        });
        streamRef.current = stream;
      } catch (err) {
        setState("mic_denied");
        setError("Microphone access denied. Please allow microphone access to use voice mode.");
        options.onError?.("Microphone access denied");
        return;
      }

      // 2. Connect WebSocket
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const params = new URLSearchParams();
      if (options.userId) params.set("userId", String(options.userId));
      if (options.taskId) params.set("taskId", options.taskId);

      const wsUrl = `${protocol}//${window.location.host}/api/voice/ws?${params}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setState("listening");

        // Send config
        if (config) {
          ws.send(JSON.stringify({ type: "config", ...config }));
        }

        // 3. Start MediaRecorder for audio streaming
        const recorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : "audio/webm",
        });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            // Send audio chunk as binary
            e.data.arrayBuffer().then((buf) => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(buf);
              }
            });
          }
        };

        recorder.start(AUDIO_CHUNK_INTERVAL);

        // 4. Start VAD
        startVAD(stream);
      };

      ws.onmessage = handleWsMessage;

      ws.onclose = () => {
        cleanup();
        setState("idle");
      };

      ws.onerror = () => {
        setError("Voice connection failed. Please check your network and try again.");
        cleanup();
        setState("error");
      };
    },
    [options, handleWsMessage, startVAD]
  );

  // ── Stop Voice Session ──

  const cleanup = useCallback(() => {
    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    mediaRecorderRef.current = null;

    // Stop media stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    // Stop VAD
    if (vadTimerRef.current) {
      clearTimeout(vadTimerRef.current);
      vadTimerRef.current = null;
    }
    analyserRef.current = null;

    // Stop audio playback
    stopAudioPlayback();

    // Clear chunk interval
    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current);
      chunkIntervalRef.current = null;
    }
  }, [stopAudioPlayback]);

  const stop = useCallback(() => {
    // Send end_session message
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "end_session" }));
      wsRef.current.close(1000, "User ended session");
    }
    wsRef.current = null;
    cleanup();
    setState("idle");
  }, [cleanup]);

  // ── Interrupt (Barge-in) ──

  const interrupt = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "interrupt" }));
    }
    stopAudioPlayback();
  }, [stopAudioPlayback]);

  // ── Send Text During Voice ──

  const sendText = useCallback((text: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "text", content: text }));
    }
  }, []);

  // ── Update Config ──

  const updateConfig = useCallback((config: VoiceConfig) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "config", ...config }));
    }
  }, []);

  // ── Cleanup on unmount ──

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    state,
    isActive: state !== "idle" && state !== "mic_denied" && state !== "error",
    isSpeaking: state === "speaking",
    transcript,
    agentText,
    latency,
    error,
    start,
    stop,
    interrupt,
    sendText,
    updateConfig,
  };
}
