/**
 * useHandsFreeMode — Full Conversational Pipeline Orchestrator
 * 
 * P15: Grok-level hands-free voice conversation.
 * Pipeline: Mic → Whisper transcription → Agent stream → Edge TTS playback → Auto-listen
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
  autoListen?: boolean;       // Auto-restart mic after TTS finishes
  soundEffects?: boolean;     // Play audible cues
  onTranscription?: (text: string) => void;  // Called when speech is transcribed
  onSendMessage?: (text: string) => void;    // Called to send message to agent
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

          // Upload to S3 then transcribe
          const ext = mimeType.includes("webm") ? "webm" : "mp4";
          const fileName = `handsfree-${Date.now()}.${ext}`;
          
          const arrayBuffer = await blob.arrayBuffer();
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            headers: {
              "Content-Type": mimeType,
              "X-File-Name": fileName,
              "X-Task-Id": "handsfree",
            },
            body: new Uint8Array(arrayBuffer),
          });

          if (!uploadRes.ok) throw new Error("Upload failed");
          const { url } = await uploadRes.json();

          // Transcribe via tRPC-like endpoint
          const transcribeRes = await fetch("/api/trpc/voice.transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              json: { audioUrl: url, language: "en" },
            }),
          });

          if (!transcribeRes.ok) throw new Error("Transcription failed");
          const transcribeData = await transcribeRes.json();
          const text = transcribeData?.result?.data?.json?.text || "";

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
        const SILENCE_THRESHOLD = 15;  // RMS below this = silence
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
    // startListening will be triggered by the isActive effect
  }, []);

  const deactivate = useCallback(() => {
    tts.stop();
    stopMic();
    stopProcessingPulse();
    setState("idle");
    setIsActive(false);
    isActiveRef.current = false;
  }, [tts, stopMic]);

  const interrupt = useCallback(() => {
    tts.stop();
    stopProcessingPulse();
    if (isActiveRef.current) {
      startListening();
    }
  }, [tts, startListening]);

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
