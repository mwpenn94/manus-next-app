/**
 * useHandsFreeMode — Full Conversational Pipeline Orchestrator
 * 
 * P15: Grok-level hands-free voice conversation.
 * P25b: Fixed transcription — now uses injected transcribe/upload functions
 *       from the parent component (tRPC mutation) instead of raw fetch.
 * 
 * Pipeline: Mic → Upload → Whisper transcription → Agent stream → Edge TTS playback → Auto-listen
 * 
 * States:
 * - idle: Not active
 * - listening: Mic is recording user speech
 * - transcribing: Converting speech to text via Whisper
 * - processing: Agent is generating response
 * - speaking: TTS is reading the response
 * 
 * Features:
 * - Auto-listen after TTS finishes (continuous conversation)
 * - Interrupt: tap to stop TTS and start listening
 * - Works alongside screen/video broadcast (visual + verbal)
 * - Audible processing cues (chimes, pulses)
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { useEdgeTTS, splitSentences } from "./useEdgeTTS";
import {
  playListeningChime,
  startProcessingPulse,
  stopProcessingPulse,
  playCompleteChime,
  playErrorTone,
  playSendClick,
} from "./audioFeedback";

export type HandsFreeState = "idle" | "listening" | "transcribing" | "processing" | "speaking";

export interface HandsFreeConfig {
  voice?: string;
  language?: string;          // ISO 639-1 language code for Whisper transcription (default: "en")
  autoListen?: boolean;       // Auto-restart mic after TTS finishes
  soundEffects?: boolean;     // Play audible cues
  noiseGateThreshold?: number; // RMS threshold below which audio is treated as noise (default: 15)
  inactivityTimeoutMs?: number; // Auto-deactivate after this many ms of no interaction (default: 120000 = 2min)
  onTranscription?: (text: string) => void;  // Called when speech is transcribed
  onSendMessage?: (text: string) => void;    // Called to send message to agent
  onTimeout?: () => void;     // Called when inactivity timeout triggers
  /** Upload audio blob to S3 and return the URL. Injected from parent to use proper auth. */
  uploadAudio?: (blob: Blob, fileName: string, mimeType: string) => Promise<string>;
  /** Transcribe audio URL via Whisper. Injected from parent to use tRPC mutation with proper auth. */
  transcribeAudio?: (audioUrl: string, language?: string) => Promise<string>;
}

export interface HandsFreeControls {
  state: HandsFreeState;
  isActive: boolean;
  /** Start hands-free mode (begins listening) */
  activate: () => void;
  /** Stop hands-free mode entirely */
  deactivate: () => void;
  /** Interrupt current action and start listening */
  interrupt: () => void;
  /** Feed agent response text for TTS playback */
  speakResponse: (text: string) => void;
  /** Notify that agent started processing */
  notifyProcessing: () => void;
  /** Notify that agent finished (triggers TTS if text accumulated) */
  notifyComplete: (fullResponse: string) => void;
  /** Notify error */
  notifyError: (message: string) => void;
  /** Current TTS state */
  ttsState: {
    isSpeaking: boolean;
    isLoading: boolean;
  };
}

export function useHandsFreeMode(config: HandsFreeConfig): HandsFreeControls {
  const [state, setState] = useState<HandsFreeState>("idle");
  const [isActive, setIsActive] = useState(false);
  const tts = useEdgeTTS();
  
  const configRef = useRef(config);
  configRef.current = config;
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastInteractionRef = useRef<number>(Date.now());

  // Inactivity timeout: auto-deactivate after configurable period
  const resetInactivityTimer = useCallback(() => {
    lastInteractionRef.current = Date.now();
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    const timeout = configRef.current.inactivityTimeoutMs ?? 120_000;
    if (timeout > 0 && isActiveRef.current) {
      inactivityTimerRef.current = setTimeout(() => {
        if (isActiveRef.current) {
          console.log("[HandsFree] Inactivity timeout — deactivating");
          configRef.current.onTimeout?.();
          // Deactivate inline to avoid stale closure
          tts.stop();
          stopMic();
          stopProcessingPulse();
          setState("idle");
          setIsActive(false);
          isActiveRef.current = false;
        }
      }, timeout);
    }
  }, [tts]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stateRef = useRef<HandsFreeState>("idle");
  const isActiveRef = useRef(false);
  
  // Keep refs in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  // ── Microphone Recording ──
  
  const stopMic = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startListening = useCallback(async () => {
    if (!isActiveRef.current) return;
    
    setState("listening");
    if (configRef.current.soundEffects) {
      playListeningChime();
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Detect supported MIME type
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        if (chunksRef.current.length === 0 || stateRef.current === "idle") return;
        
        setState("transcribing");
        
        try {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          
          // Check size (16MB limit for Whisper)
          if (blob.size > 16 * 1024 * 1024) {
            if (configRef.current.soundEffects) playErrorTone();
            setState(isActiveRef.current ? "listening" : "idle");
            return;
          }

          // Skip if blob is too small (likely no speech)
          if (blob.size < 1000) {
            if (isActiveRef.current) startListening();
            return;
          }

          const ext = mimeType.includes("webm") ? "webm" : "mp4";
          const fileName = `handsfree-${Date.now()}.${ext}`;

          // Use injected upload function (proper auth via fetch with credentials)
          let audioUrl: string;
          if (configRef.current.uploadAudio) {
            audioUrl = await configRef.current.uploadAudio(blob, fileName, mimeType);
          } else {
            // Fallback: direct fetch (may fail without auth)
            const arrayBuffer = await blob.arrayBuffer();
            const uploadRes = await fetch("/api/upload", {
              method: "POST",
              headers: {
                "Content-Type": mimeType,
                "X-File-Name": fileName,
                "X-Task-Id": "handsfree",
              },
              credentials: "include",
              body: new Uint8Array(arrayBuffer),
            });
            if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`);
            const data = await uploadRes.json();
            audioUrl = data.url;
          }

          // Use injected transcribe function (tRPC mutation with proper auth)
          let text: string;
          if (configRef.current.transcribeAudio) {
            text = await configRef.current.transcribeAudio(audioUrl, configRef.current.language || "en");
          } else {
            // Fallback: raw fetch (may fail without proper tRPC batch format)
            const transcribeRes = await fetch("/api/trpc/voice.transcribe?batch=1", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                "0": { json: { audioUrl, language: configRef.current.language || "en" } },
              }),
            });
            if (!transcribeRes.ok) throw new Error(`Transcription failed: ${transcribeRes.status}`);
            const transcribeData = await transcribeRes.json();
            // tRPC batch response format: [{ result: { data: { json: { text, language } } } }]
            text = transcribeData?.[0]?.result?.data?.json?.text || "";
          }

          if (text.trim()) {
            if (configRef.current.soundEffects) playSendClick();
            configRef.current.onTranscription?.(text.trim());
            configRef.current.onSendMessage?.(text.trim());
            setState("processing");
          } else {
            // No speech detected, restart listening
            if (isActiveRef.current) startListening();
          }
        } catch (err) {
          console.error("[HandsFree] Transcription error:", err);
          if (configRef.current.soundEffects) playErrorTone();
          // Restart listening on error
          if (isActiveRef.current && (stateRef.current as string) !== "idle") {
            setTimeout(() => startListening(), 1000);
          }
        }
      };

      recorder.start(250); // Collect in 250ms chunks
      
      // ── Voice Activity Detection (VAD) ──
      // Auto-stop recording after ~2s of silence (Grok parity)
      try {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.3;
        source.connect(analyser);
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let silenceStart = 0;
        let hasSpoken = false;
        const SILENCE_THRESHOLD = configRef.current.noiseGateThreshold ?? 15;  // Configurable noise gate
        const SILENCE_DURATION = 2000; // 2 seconds of silence to auto-stop
        const MIN_SPEECH_DURATION = 500; // Must speak for at least 500ms
        let speechStart = Date.now();
        
        const vadInterval = setInterval(() => {
          if (recorder.state !== "recording") {
            clearInterval(vadInterval);
            audioCtx.close().catch(() => {});
            return;
          }
          
          analyser.getByteTimeDomainData(dataArray);
          
          // Calculate RMS volume
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const val = (dataArray[i] - 128) / 128;
            sum += val * val;
          }
          const rms = Math.sqrt(sum / dataArray.length) * 100;
          
          if (rms > SILENCE_THRESHOLD) {
            hasSpoken = true;
            silenceStart = 0;
          } else if (hasSpoken) {
            if (silenceStart === 0) {
              silenceStart = Date.now();
            } else if (Date.now() - silenceStart > SILENCE_DURATION && Date.now() - speechStart > MIN_SPEECH_DURATION) {
              // 2s of silence after speech detected — auto-stop
              clearInterval(vadInterval);
              audioCtx.close().catch(() => {});
              if (recorder.state === "recording") {
                recorder.stop();
              }
              return;
            }
          }
        }, 100);
      } catch {
        // VAD failed — fall back to timeout-only
      }
      
      // Hard ceiling: auto-stop after 30 seconds (prevent runaway)
      setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop();
        }
      }, 30000);
      
    } catch (err) {
      console.error("[HandsFree] Mic error:", err);
      if (configRef.current.soundEffects) playErrorTone();
      setState("idle");
      setIsActive(false);
    }
  }, []);

  // ── Public Controls ──

  const activate = useCallback(() => {
    setIsActive(true);
    isActiveRef.current = true;
    resetInactivityTimer();
    // startListening will be triggered by the isActive effect
  }, [resetInactivityTimer]);

  const deactivate = useCallback(() => {
    tts.stop();
    stopMic();
    stopProcessingPulse();
    setState("idle");
    setIsActive(false);
    isActiveRef.current = false;
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
  }, [tts, stopMic]);

  const interrupt = useCallback(() => {
    tts.stop();
    stopProcessingPulse();
    resetInactivityTimer();
    if (isActiveRef.current) {
      startListening();
    }
  }, [tts, startListening, resetInactivityTimer]);

  const notifyProcessing = useCallback(() => {
    if (!isActiveRef.current) return;
    setState("processing");
    if (configRef.current.soundEffects) {
      startProcessingPulse();
    }
  }, []);

  const speakResponse = useCallback(async (text: string) => {
    if (!isActiveRef.current) return;
    stopProcessingPulse();
    setState("speaking");
    
    const sentences = splitSentences(text);
    if (sentences.length === 0) {
      if (configRef.current.autoListen) {
        startListening();
      } else {
        setState("idle");
      }
      return;
    }

    await tts.speakStreaming(sentences, {
      voice: configRef.current.voice,
      onEnd: () => {
        if (configRef.current.soundEffects) playCompleteChime();
        // Auto-listen after speaking
        if (configRef.current.autoListen && isActiveRef.current) {
          setTimeout(() => startListening(), 500);
        } else {
          setState("idle");
        }
      },
      onError: () => {
        if (configRef.current.soundEffects) playErrorTone();
        if (configRef.current.autoListen && isActiveRef.current) {
          setTimeout(() => startListening(), 1000);
        } else {
          setState("idle");
        }
      },
    });
  }, [tts, startListening]);

  const notifyComplete = useCallback((fullResponse: string) => {
    if (!isActiveRef.current) return;
    stopProcessingPulse();
    speakResponse(fullResponse);
  }, [speakResponse]);

  const notifyError = useCallback((message: string) => {
    if (!isActiveRef.current) return;
    stopProcessingPulse();
    if (configRef.current.soundEffects) playErrorTone();
    // Speak the error briefly then restart
    tts.speak(`Sorry, an error occurred. ${message}`, {
      voice: configRef.current.voice,
      onEnd: () => {
        if (configRef.current.autoListen && isActiveRef.current) {
          setTimeout(() => startListening(), 1000);
        } else {
          setState("idle");
        }
      },
    });
    setState("speaking");
  }, [tts, startListening]);

  // Start listening when activated
  useEffect(() => {
    if (isActive && state === "idle") {
      startListening();
    }
  }, [isActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMic();
      tts.stop();
      stopProcessingPulse();
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, []);

  return {
    state,
    isActive,
    activate,
    deactivate,
    interrupt,
    speakResponse,
    notifyProcessing,
    notifyComplete,
    notifyError,
    ttsState: {
      isSpeaking: tts.isSpeaking,
      isLoading: tts.isLoading,
    },
  };
}
