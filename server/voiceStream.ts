/**
 * §L.35 Voice Streaming Pipeline — Conversational / Multimodal / Handsfree
 *
 * Architecture (per v9 prompt §L.35):
 * ┌─────────────────────────────────────────────────────────────┐
 * │ Browser: WebSocket → Continuous audio stream                │
 * │   ├─ VAD (browser-side) → detects user speech boundaries    │
 * │   └─ Audio chunks → server for STT                          │
 * │                              ↓                              │
 * │                    WebSocket to agent server                 │
 * │                              ↓                              │
 * │ Server: Voice Pipeline Orchestrator                         │
 * │   ├─ Orchestrates: STT → LLM → TTS pipeline                │
 * │   ├─ Manages interruption (barge-in <100ms)                 │
 * │   ├─ Handles multimodal input (video / image / file)        │
 * │   └─ Tool-use during voice (e.g., "search the web")        │
 * │                              ↓                              │
 * │   LLM (§L.22 tier): streaming response                     │
 * │                              ↓                              │
 * │   TTS (edge-tts): streaming audio chunks                   │
 * │                              ↓                              │
 * │   Back to browser via WebSocket                             │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Protocol (WebSocket messages):
 *   Client → Server:
 *     { type: "audio_chunk", data: base64 }     — raw PCM/webm audio
 *     { type: "vad_start" }                      — user started speaking
 *     { type: "vad_end" }                        — user stopped speaking
 *     { type: "interrupt" }                      — user barge-in
 *     { type: "config", voice, rate, persona }   — session config
 *     { type: "text", content }                  — text input during voice
 *     { type: "end_session" }                    — close voice session
 *
 *   Server → Client:
 *     { type: "transcript", text, final }        — STT result
 *     { type: "agent_text", text, done }         — LLM text chunk
 *     { type: "agent_audio", data: base64 }      — TTS audio chunk
 *     { type: "agent_audio_end" }                — TTS finished
 *     { type: "state", state }                   — pipeline state change
 *     { type: "error", message }                 — error
 *     { type: "latency", sttMs, llmMs, ttsMs }  — timing metrics
 */

import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { URL } from "url";
import crypto from "crypto";

// ─── Types ───────────────────────────────────────────────────────────────────

export type VoiceSessionState =
  | "idle"
  | "listening"
  | "processing_stt"
  | "thinking"
  | "speaking"
  | "interrupted"
  | "error";

export interface VoiceSession {
  id: string;
  userId: number | null;
  taskId: string | null;
  ws: WebSocket;
  state: VoiceSessionState;
  config: VoiceConfig;
  audioBuffer: Buffer[];
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
  metrics: VoiceMetrics;
  createdAt: number;
  lastActivityAt: number;
  abortController: AbortController | null;
}

export interface VoiceConfig {
  voice: string;
  rate: string;
  pitch: string;
  volume: string;
  persona: string;
  language: string;
  autoListen: boolean; // always-listening mode
  voiceOnly: boolean;  // voice-only output (no text rendering)
}

export interface VoiceMetrics {
  totalTurns: number;
  avgSttLatencyMs: number;
  avgLlmLatencyMs: number;
  avgTtsLatencyMs: number;
  avgTotalLatencyMs: number;
  interruptions: number;
  sttSamples: number[];
  llmSamples: number[];
  ttsSamples: number[];
  totalSamples: number[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: VoiceConfig = {
  voice: "en-US-AriaNeural",
  rate: "+0%",
  pitch: "+0Hz",
  volume: "+0%",
  persona: "default",
  language: "en",
  autoListen: false,
  voiceOnly: false,
};

/** Max audio buffer size before forced flush (16MB) */
const MAX_AUDIO_BUFFER = 16 * 1024 * 1024;

/** Session timeout (5 minutes of inactivity) */
const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

/** Max conversation history to keep in memory */
const MAX_HISTORY_TURNS = 50;

// ─── Session Store ───────────────────────────────────────────────────────────

const activeSessions = new Map<string, VoiceSession>();

export function getActiveVoiceSessions(): number {
  return activeSessions.size;
}

export function getVoiceSession(sessionId: string): VoiceSession | undefined {
  return activeSessions.get(sessionId);
}

// ─── Pipeline Functions ──────────────────────────────────────────────────────

/**
 * Process accumulated audio through STT → LLM → TTS pipeline
 */
async function processVoiceTurn(session: VoiceSession): Promise<void> {
  if (session.audioBuffer.length === 0) return;

  const turnStart = Date.now();
  session.abortController = new AbortController();
  const { signal } = session.abortController;

  try {
    // ── Phase 1: STT ──
    setState(session, "processing_stt");
    const sttStart = Date.now();

    const audioData = Buffer.concat(session.audioBuffer);
    session.audioBuffer = [];

    // Upload audio to get URL for Whisper API
    let transcription = "";
    try {
      const { storagePut } = await import("./storage");
      const audioKey = `voice-sessions/${session.id}/turn-${session.metrics.totalTurns}-${Date.now()}.webm`;
      const { url: audioUrl } = await storagePut(audioKey, audioData, "audio/webm");

      const { transcribeAudio } = await import("./_core/voiceTranscription");
      const result = await transcribeAudio({
        audioUrl,
        language: session.config.language,
        prompt: "Transcribe the user's voice input for a conversational AI assistant",
      });

      if ("text" in result && result.text) {
        transcription = result.text.trim();
      }
    } catch (err) {
      console.error("[VoiceStream] STT failed:", err);
      sendMessage(session.ws, { type: "error", message: "Speech recognition failed. Please try again." });
      setState(session, "listening");
      return;
    }

    if (signal.aborted) return;

    const sttLatency = Date.now() - sttStart;
    session.metrics.sttSamples.push(sttLatency);

    // Send transcript to client
    sendMessage(session.ws, { type: "transcript", text: transcription, final: true });

    if (!transcription || transcription.length < 2) {
      setState(session, "listening");
      return;
    }

    // ── Phase 2: LLM ──
    setState(session, "thinking");
    const llmStart = Date.now();

    // Add user message to history
    session.conversationHistory.push({ role: "user", content: transcription });

    // Trim history if too long
    if (session.conversationHistory.length > MAX_HISTORY_TURNS) {
      session.conversationHistory = session.conversationHistory.slice(-MAX_HISTORY_TURNS);
    }

    let agentResponse = "";
    try {
      const { invokeLLM } = await import("./_core/llm");

      const systemPrompt = buildSystemPrompt(session.config);
      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...session.conversationHistory.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      const response = await invokeLLM({ messages });
      const rawContent = response?.choices?.[0]?.message?.content;
      agentResponse = (typeof rawContent === "string" ? rawContent : "I'm sorry, I didn't understand that.") || "I'm sorry, I didn't understand that.";
    } catch (err) {
      console.error("[VoiceStream] LLM failed:", err);
      agentResponse = "I encountered an error processing your request. Please try again.";
    }

    if (signal.aborted) return;

    const llmLatency = Date.now() - llmStart;
    session.metrics.llmSamples.push(llmLatency);

    // Send text response to client
    sendMessage(session.ws, { type: "agent_text", text: agentResponse, done: true });

    // Add assistant message to history
    session.conversationHistory.push({ role: "assistant", content: agentResponse });

    // ── Phase 3: TTS ──
    setState(session, "speaking");
    const ttsStart = Date.now();

    try {
      const { synthesizeSpeechStream, splitIntoSentences } = await import("./tts");

      const sentences = splitIntoSentences(agentResponse);

      for (const sentence of sentences) {
        if (signal.aborted) break;

        const stream = synthesizeSpeechStream({
          text: sentence,
          voice: session.config.voice,
          rate: session.config.rate,
          pitch: session.config.pitch,
          volume: session.config.volume,
        });

        for await (const chunk of stream) {
          if (signal.aborted) break;
          sendMessage(session.ws, {
            type: "agent_audio",
            data: chunk.toString("base64"),
          });
        }
      }

      if (!signal.aborted) {
        sendMessage(session.ws, { type: "agent_audio_end" });
      }
    } catch (err) {
      console.error("[VoiceStream] TTS failed:", err);
      // Graceful degradation: text was already sent, just note TTS failure
      sendMessage(session.ws, { type: "agent_audio_end" });
    }

    const ttsLatency = Date.now() - ttsStart;
    session.metrics.ttsSamples.push(ttsLatency);

    // ── Metrics ──
    const totalLatency = Date.now() - turnStart;
    session.metrics.totalSamples.push(totalLatency);
    session.metrics.totalTurns++;

    // Update averages
    session.metrics.avgSttLatencyMs = avg(session.metrics.sttSamples);
    session.metrics.avgLlmLatencyMs = avg(session.metrics.llmSamples);
    session.metrics.avgTtsLatencyMs = avg(session.metrics.ttsSamples);
    session.metrics.avgTotalLatencyMs = avg(session.metrics.totalSamples);

    sendMessage(session.ws, {
      type: "latency",
      sttMs: sttLatency,
      llmMs: llmLatency,
      ttsMs: ttsLatency,
      totalMs: totalLatency,
    });

    setState(session, "listening");
  } catch (err) {
    console.error("[VoiceStream] Pipeline error:", err);
    sendMessage(session.ws, { type: "error", message: "Voice pipeline error" });
    setState(session, "error");
  } finally {
    session.abortController = null;
  }
}

/**
 * Handle barge-in / interruption
 */
function handleInterrupt(session: VoiceSession): void {
  if (session.state === "speaking" || session.state === "thinking") {
    session.metrics.interruptions++;
    // Abort current pipeline
    if (session.abortController) {
      session.abortController.abort();
      session.abortController = null;
    }
    setState(session, "interrupted");
    sendMessage(session.ws, { type: "agent_audio_end" });
    // Immediately transition to listening for new input
    setTimeout(() => {
      if (session.state === "interrupted") {
        setState(session, "listening");
      }
    }, 50);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sendMessage(ws: WebSocket, data: Record<string, unknown>): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function setState(session: VoiceSession, state: VoiceSessionState): void {
  session.state = state;
  session.lastActivityAt = Date.now();
  sendMessage(session.ws, { type: "state", state });
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

function buildSystemPrompt(config: VoiceConfig): string {
  const personaHints: Record<string, string> = {
    default: "You are a helpful, conversational AI assistant. Keep responses concise and natural for voice interaction.",
    formal: "You are a professional AI assistant. Use formal language and structured responses. Keep voice responses clear and well-organized.",
    casual: "You are a friendly, casual AI assistant. Use conversational language, contractions, and a warm tone. Keep it brief for voice.",
    professional: "You are a business-focused AI assistant. Be efficient, data-driven, and actionable in your responses.",
    friendly: "You are an enthusiastic, supportive AI assistant. Be encouraging and warm. Use simple language for voice clarity.",
    accessibility: "You are an accessibility-focused AI assistant. Speak clearly and slowly. Use simple sentence structures. Avoid jargon.",
  };

  const base = personaHints[config.persona] || personaHints.default;

  return `${base}

Important guidelines for voice conversation:
- Keep responses concise (2-4 sentences for simple questions, up to a paragraph for complex ones)
- Use natural spoken language, not written/formal style
- Avoid markdown formatting, bullet points, or numbered lists — speak naturally
- If asked to perform a task (search, generate, etc.), acknowledge briefly then describe what you're doing
- If you need clarification, ask a single clear question
- Remember the full conversation context for natural follow-ups`;
}

function createSession(ws: WebSocket, userId: number | null, taskId: string | null): VoiceSession {
  const session: VoiceSession = {
    id: crypto.randomUUID(),
    userId,
    taskId,
    ws,
    state: "idle",
    config: { ...DEFAULT_CONFIG },
    audioBuffer: [],
    conversationHistory: [],
    metrics: {
      totalTurns: 0,
      avgSttLatencyMs: 0,
      avgLlmLatencyMs: 0,
      avgTtsLatencyMs: 0,
      avgTotalLatencyMs: 0,
      interruptions: 0,
      sttSamples: [],
      llmSamples: [],
      ttsSamples: [],
      totalSamples: [],
    },
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    abortController: null,
  };
  activeSessions.set(session.id, session);
  return session;
}

function destroySession(sessionId: string): void {
  const session = activeSessions.get(sessionId);
  if (session) {
    if (session.abortController) {
      session.abortController.abort();
    }
    activeSessions.delete(sessionId);
  }
}

// ─── WebSocket Server ────────────────────────────────────────────────────────

/**
 * Initialize the voice streaming WebSocket server.
 * Handles upgrade requests to /api/voice/ws
 */
export function initVoiceStream(httpServer: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request: any, socket: any, head: any) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    if (url.pathname !== "/api/voice/ws") {
      return; // Let other upgrade handlers (Vite HMR, device relay) handle it
    }

    // Extract auth from query params (cookie-based auth not available in WS upgrade)
    const userId = url.searchParams.get("userId");
    const taskId = url.searchParams.get("taskId");

    wss.handleUpgrade(request, socket, head, (ws: any) => {
      wss.emit("connection", ws, request, userId, taskId);
    });
  });

  wss.on("connection", (ws: WebSocket, _request: any, userId?: string, taskId?: string) => {
    const session = createSession(ws, userId ? parseInt(userId, 10) : null, taskId || null);

    console.log(`[VoiceStream] Session ${session.id} connected (user: ${userId || "anon"}, task: ${taskId || "none"})`);

    sendMessage(ws, {
      type: "state",
      state: "idle",
      sessionId: session.id,
      config: session.config,
    });

    ws.on("message", async (raw: Buffer | string) => {
      session.lastActivityAt = Date.now();

      try {
        // Handle binary audio data directly
        if (Buffer.isBuffer(raw)) {
          const totalSize = session.audioBuffer.reduce((s, b) => s + b.length, 0);
          if (totalSize + raw.length > MAX_AUDIO_BUFFER) {
            sendMessage(ws, { type: "error", message: "Audio buffer overflow — processing now" });
            await processVoiceTurn(session);
          }
          session.audioBuffer.push(raw);
          return;
        }

        // Handle JSON messages
        const msg = JSON.parse(raw.toString());

        switch (msg.type) {
          case "audio_chunk": {
            // Base64-encoded audio
            if (msg.data) {
              const chunk = Buffer.from(msg.data, "base64");
              const totalSize = session.audioBuffer.reduce((s, b) => s + b.length, 0);
              if (totalSize + chunk.length > MAX_AUDIO_BUFFER) {
                sendMessage(ws, { type: "error", message: "Audio buffer overflow" });
                await processVoiceTurn(session);
              }
              session.audioBuffer.push(chunk);
            }
            break;
          }

          case "vad_start": {
            setState(session, "listening");
            break;
          }

          case "vad_end": {
            // User stopped speaking — process the accumulated audio
            if (session.audioBuffer.length > 0) {
              await processVoiceTurn(session);
            }
            break;
          }

          case "interrupt": {
            handleInterrupt(session);
            break;
          }

          case "config": {
            // Update session config
            if (msg.voice) session.config.voice = msg.voice;
            if (msg.rate) session.config.rate = msg.rate;
            if (msg.pitch) session.config.pitch = msg.pitch;
            if (msg.volume) session.config.volume = msg.volume;
            if (msg.persona) session.config.persona = msg.persona;
            if (msg.language) session.config.language = msg.language;
            if (typeof msg.autoListen === "boolean") session.config.autoListen = msg.autoListen;
            if (typeof msg.voiceOnly === "boolean") session.config.voiceOnly = msg.voiceOnly;
            sendMessage(ws, { type: "state", state: session.state, config: session.config });
            break;
          }

          case "text": {
            // Text input during voice session — process as if spoken
            if (msg.content && typeof msg.content === "string") {
              session.conversationHistory.push({ role: "user", content: msg.content });
              sendMessage(ws, { type: "transcript", text: msg.content, final: true });

              // Run LLM + TTS directly (skip STT)
              setState(session, "thinking");
              const llmStart = Date.now();

              try {
                const { invokeLLM } = await import("./_core/llm");
                const systemPrompt = buildSystemPrompt(session.config);
                const messages = [
                  { role: "system" as const, content: systemPrompt },
                  ...session.conversationHistory.map((m) => ({
                    role: m.role as "user" | "assistant",
                    content: m.content,
                  })),
                ];
                const response = await invokeLLM({ messages });
                const rawContent = response?.choices?.[0]?.message?.content;
                const agentResponse = (typeof rawContent === "string" ? rawContent : "I'm sorry, I didn't understand that.") || "I'm sorry, I didn't understand that.";

                session.conversationHistory.push({ role: "assistant", content: agentResponse });
                sendMessage(ws, { type: "agent_text", text: agentResponse, done: true });

                const llmLatency = Date.now() - llmStart;
                session.metrics.llmSamples.push(llmLatency);

                // TTS
                setState(session, "speaking");
                const ttsStart = Date.now();
                const { synthesizeSpeechStream, splitIntoSentences } = await import("./tts");
                const sentences = splitIntoSentences(agentResponse);

                for (const sentence of sentences) {
                  const stream = synthesizeSpeechStream({
                    text: sentence,
                    voice: session.config.voice,
                    rate: session.config.rate,
                  });
                  for await (const chunk of stream) {
                    sendMessage(ws, { type: "agent_audio", data: chunk.toString("base64") });
                  }
                }
                sendMessage(ws, { type: "agent_audio_end" });

                const ttsLatency = Date.now() - ttsStart;
                session.metrics.ttsSamples.push(ttsLatency);
                session.metrics.totalTurns++;
              } catch (err) {
                console.error("[VoiceStream] Text-to-voice error:", err);
                sendMessage(ws, { type: "error", message: "Failed to process text input" });
              }

              setState(session, "listening");
            }
            break;
          }

          case "end_session": {
            sendMessage(ws, {
              type: "state",
              state: "idle",
              metrics: session.metrics,
            });
            destroySession(session.id);
            ws.close(1000, "Session ended by client");
            break;
          }

          default:
            sendMessage(ws, { type: "error", message: `Unknown message type: ${msg.type}` });
        }
      } catch (err) {
        console.error("[VoiceStream] Message handling error:", err);
        sendMessage(ws, { type: "error", message: "Invalid message format" });
      }
    });

    ws.on("close", () => {
      console.log(`[VoiceStream] Session ${session.id} disconnected`);
      destroySession(session.id);
    });

    ws.on("error", (err: Error) => {
      console.error(`[VoiceStream] Session ${session.id} error:`, err.message);
      destroySession(session.id);
    });
  });

  // Cleanup stale sessions every 60s
  setInterval(() => {
    const now = Date.now();
    for (const [id, session] of Array.from(activeSessions.entries())) {
      if (now - session.lastActivityAt > SESSION_TIMEOUT_MS) {
        console.log(`[VoiceStream] Cleaning up stale session ${id}`);
        sendMessage(session.ws, { type: "state", state: "idle", reason: "timeout" });
        try { session.ws.close(1000, "Session timeout"); } catch {}
        destroySession(id);
      }
    }
  }, 60_000);

  console.log("[VoiceStream] §L.35 voice streaming WebSocket initialized on /api/voice/ws");
}

// ─── Exports for testing ─────────────────────────────────────────────────────

export {
  createSession as _createSession,
  destroySession as _destroySession,
  handleInterrupt as _handleInterrupt,
  buildSystemPrompt as _buildSystemPrompt,
  DEFAULT_CONFIG,
};
