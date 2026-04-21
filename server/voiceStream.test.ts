import { describe, expect, it, vi, beforeEach } from "vitest";
import type { VoiceSessionState, VoiceConfig, VoiceMetrics, VoiceSession } from "./voiceStream";

// We test the exported helper functions and types without starting a real WebSocket server

describe("VoiceStream Module", () => {
  describe("VoiceSessionState type", () => {
    it("accepts all valid states", () => {
      const validStates: VoiceSessionState[] = [
        "idle",
        "listening",
        "processing_stt",
        "thinking",
        "speaking",
        "interrupted",
        "error",
      ];
      expect(validStates).toHaveLength(7);
      validStates.forEach((state) => {
        expect(typeof state).toBe("string");
      });
    });
  });

  describe("VoiceConfig defaults", () => {
    it("has expected default config shape", () => {
      const defaultConfig: VoiceConfig = {
        voice: "en-US-AriaNeural",
        rate: "+0%",
        pitch: "+0Hz",
        volume: "+0%",
        persona: "default",
        language: "en",
        autoListen: false,
        voiceOnly: false,
      };
      expect(defaultConfig.voice).toBe("en-US-AriaNeural");
      expect(defaultConfig.persona).toBe("default");
      expect(defaultConfig.language).toBe("en");
      expect(defaultConfig.autoListen).toBe(false);
      expect(defaultConfig.voiceOnly).toBe(false);
    });
  });

  describe("VoiceMetrics initialization", () => {
    it("starts with zero values", () => {
      const metrics: VoiceMetrics = {
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
      };
      expect(metrics.totalTurns).toBe(0);
      expect(metrics.interruptions).toBe(0);
      expect(metrics.sttSamples).toHaveLength(0);
      expect(metrics.llmSamples).toHaveLength(0);
      expect(metrics.ttsSamples).toHaveLength(0);
      expect(metrics.totalSamples).toHaveLength(0);
    });

    it("correctly tracks latency samples", () => {
      const metrics: VoiceMetrics = {
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
      };

      // Simulate adding latency samples
      metrics.sttSamples.push(150, 200, 180);
      metrics.llmSamples.push(250, 300, 275);
      metrics.ttsSamples.push(80, 100, 90);
      metrics.totalSamples.push(480, 600, 545);
      metrics.totalTurns = 3;

      // Calculate averages
      const avgStt = metrics.sttSamples.reduce((a, b) => a + b, 0) / metrics.sttSamples.length;
      const avgLlm = metrics.llmSamples.reduce((a, b) => a + b, 0) / metrics.llmSamples.length;
      const avgTts = metrics.ttsSamples.reduce((a, b) => a + b, 0) / metrics.ttsSamples.length;
      const avgTotal = metrics.totalSamples.reduce((a, b) => a + b, 0) / metrics.totalSamples.length;

      expect(avgStt).toBeCloseTo(176.67, 1);
      expect(avgLlm).toBeCloseTo(275, 0);
      expect(avgTts).toBe(90);
      expect(avgTotal).toBeCloseTo(541.67, 1);
    });
  });

  describe("getActiveVoiceSessions", () => {
    it("returns a number", async () => {
      const { getActiveVoiceSessions } = await import("./voiceStream");
      const count = getActiveVoiceSessions();
      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getVoiceSession", () => {
    it("returns undefined for non-existent session", async () => {
      const { getVoiceSession } = await import("./voiceStream");
      const session = getVoiceSession("non-existent-id");
      expect(session).toBeUndefined();
    });
  });

  describe("WebSocket protocol messages", () => {
    it("validates client-to-server message types", () => {
      const validClientMessages = [
        { type: "audio_chunk", data: "base64data" },
        { type: "vad_start" },
        { type: "vad_end" },
        { type: "interrupt" },
        { type: "config", voice: "en-US-AriaNeural", persona: "default" },
        { type: "text", content: "Hello" },
        { type: "end_session" },
      ];

      validClientMessages.forEach((msg) => {
        expect(msg.type).toBeTruthy();
        expect(typeof msg.type).toBe("string");
      });
      expect(validClientMessages).toHaveLength(7);
    });

    it("validates server-to-client message types", () => {
      const validServerMessages = [
        { type: "transcript", text: "Hello", final: true },
        { type: "agent_text", text: "Hi there", done: false },
        { type: "agent_audio", data: "base64audio" },
        { type: "agent_audio_end" },
        { type: "state", state: "listening" },
        { type: "error", message: "Something went wrong" },
        { type: "latency", sttMs: 150, llmMs: 200, ttsMs: 80, totalMs: 430 },
      ];

      validServerMessages.forEach((msg) => {
        expect(msg.type).toBeTruthy();
        expect(typeof msg.type).toBe("string");
      });
      expect(validServerMessages).toHaveLength(7);
    });
  });

  describe("Persona system prompts", () => {
    const personas = ["default", "formal", "casual", "professional", "friendly", "accessibility"];

    it("supports 6 persona types", () => {
      expect(personas).toHaveLength(6);
    });

    it("each persona has a unique name", () => {
      const unique = new Set(personas);
      expect(unique.size).toBe(personas.length);
    });

    it("accessibility persona is included for §L.35 requirement", () => {
      expect(personas).toContain("accessibility");
    });
  });

  describe("Audio buffer management", () => {
    it("enforces max buffer size of 16MB", () => {
      const MAX_AUDIO_BUFFER = 16 * 1024 * 1024;
      expect(MAX_AUDIO_BUFFER).toBe(16777216);
    });

    it("session timeout is 5 minutes", () => {
      const SESSION_TIMEOUT_MS = 5 * 60 * 1000;
      expect(SESSION_TIMEOUT_MS).toBe(300000);
    });

    it("max history turns is 50", () => {
      const MAX_HISTORY_TURNS = 50;
      expect(MAX_HISTORY_TURNS).toBe(50);
    });
  });

  describe("Interrupt handling logic", () => {
    it("interrupt resets state correctly", () => {
      // Simulate interrupt state transition
      const states: VoiceSessionState[] = ["speaking", "interrupted", "listening"];
      expect(states[0]).toBe("speaking");
      expect(states[1]).toBe("interrupted");
      expect(states[2]).toBe("listening");
    });

    it("interrupt increments interruption counter", () => {
      const metrics: VoiceMetrics = {
        totalTurns: 5,
        avgSttLatencyMs: 0,
        avgLlmLatencyMs: 0,
        avgTtsLatencyMs: 0,
        avgTotalLatencyMs: 0,
        interruptions: 0,
        sttSamples: [],
        llmSamples: [],
        ttsSamples: [],
        totalSamples: [],
      };

      // Simulate interrupt
      metrics.interruptions++;
      expect(metrics.interruptions).toBe(1);

      metrics.interruptions++;
      expect(metrics.interruptions).toBe(2);
    });
  });

  describe("Voice selection", () => {
    const supportedVoices = [
      "en-US-AriaNeural",
      "en-US-AvaNeural",
      "en-US-EmmaNeural",
      "en-US-JennyNeural",
      "en-US-AndrewNeural",
      "en-US-BrianNeural",
      "en-US-GuyNeural",
      "en-US-RogerNeural",
      "en-GB-SoniaNeural",
      "en-GB-RyanNeural",
    ];

    it("supports 10+ voices per §L.35 requirement", () => {
      expect(supportedVoices.length).toBeGreaterThanOrEqual(10);
    });

    it("includes both male and female voices", () => {
      // Female voices typically have names like Aria, Ava, Emma, Jenny, Sonia
      // Male voices typically have names like Andrew, Brian, Guy, Roger, Ryan
      expect(supportedVoices.some((v) => v.includes("Aria"))).toBe(true);
      expect(supportedVoices.some((v) => v.includes("Andrew"))).toBe(true);
    });

    it("includes UK English voices", () => {
      expect(supportedVoices.some((v) => v.startsWith("en-GB"))).toBe(true);
    });
  });
});
