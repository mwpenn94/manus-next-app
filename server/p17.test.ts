/**
 * P17 Tests — Package Enablement, Client Inference, Real Kokoro TTS Integration
 */
import { describe, it, expect, vi } from "vitest";

// Mock edge-tts-universal to prevent network calls
vi.mock("edge-tts-universal", () => {
  const mockVoices = [
    { ShortName: "en-US-AriaNeural", Locale: "en-US", Gender: "Female", FriendlyName: "Aria" },
    { ShortName: "en-US-GuyNeural", Locale: "en-US", Gender: "Male", FriendlyName: "Guy" },
    { ShortName: "en-GB-SoniaNeural", Locale: "en-GB", Gender: "Female", FriendlyName: "Sonia" },
    { ShortName: "es-ES-ElviraNeural", Locale: "es-ES", Gender: "Female", FriendlyName: "Elvira" },
    { ShortName: "zh-CN-XiaoxiaoNeural", Locale: "zh-CN", Gender: "Female", FriendlyName: "Xiaoxiao" },
    { ShortName: "fr-FR-DeniseNeural", Locale: "fr-FR", Gender: "Female", FriendlyName: "Denise" },
    { ShortName: "de-DE-KatjaNeural", Locale: "de-DE", Gender: "Female", FriendlyName: "Katja" },
    { ShortName: "ja-JP-NanamiNeural", Locale: "ja-JP", Gender: "Female", FriendlyName: "Nanami" },
    { ShortName: "ko-KR-SunHiNeural", Locale: "ko-KR", Gender: "Female", FriendlyName: "SunHi" },
    { ShortName: "pt-BR-FranciscaNeural", Locale: "pt-BR", Gender: "Female", FriendlyName: "Francisca" },
    { ShortName: "ru-RU-SvetlanaNeural", Locale: "ru-RU", Gender: "Female", FriendlyName: "Svetlana" },
    { ShortName: "it-IT-ElsaNeural", Locale: "it-IT", Gender: "Female", FriendlyName: "Elsa" },
    { ShortName: "hi-IN-SwaraNeural", Locale: "hi-IN", Gender: "Female", FriendlyName: "Swara" },
    { ShortName: "ar-SA-ZariyahNeural", Locale: "ar-SA", Gender: "Female", FriendlyName: "Zariyah" },
  ];
  return {
    listVoices: vi.fn(async () => mockVoices),
    Communicate: vi.fn(),
  };
});

import { DEFAULT_VOICES, getAvailableLanguages, getVoicesByLanguage, synthesizeSpeech } from "./tts";

describe("P17 — Package Enablement & Client Inference", () => {
  describe("Package Status Flags", () => {
    it("should have all four packages set to live status", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/pages/SettingsPage.tsx", "utf-8");
      
      // Package names use @manus-next/ prefix
      expect(content).toContain("@manus-next/webapp-builder");
      expect(content).toContain("@manus-next/client-inference");
      expect(content).toContain("@manus-next/desktop");
      expect(content).toContain("@manus-next/deck");
      
      // Verify none are still "planned"
      const plannedMatches = content.match(/status:\s*"planned"/g);
      expect(plannedMatches).toBeNull();
    });

    it("should have all four packages defaultEnabled: true", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/pages/SettingsPage.tsx", "utf-8");
      
      // Count defaultEnabled: true occurrences in CAPABILITY_DEFINITIONS
      const capabilitiesSection = content.split("CAPABILITY_DEFINITIONS")[1]?.split("];")[0] || "";
      const enabledCount = (capabilitiesSection.match(/defaultEnabled:\s*true/g) || []).length;
      expect(enabledCount).toBeGreaterThanOrEqual(4);
    });
  });

  describe("Client Inference Page — Structure", () => {
    it("should have ClientInferencePage component file", async () => {
      const fs = await import("fs");
      const exists = fs.existsSync("client/src/pages/ClientInferencePage.tsx");
      expect(exists).toBe(true);
    });

    it("client inference page exists as standalone file (removed from nav for Manus alignment)", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/pages/ClientInferencePage.tsx", "utf-8");
      expect(content).toContain("ClientInference");
    });

    it("should include WebGPU detection logic", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/pages/ClientInferencePage.tsx", "utf-8");
      expect(content).toContain("detectWebGPU");
      expect(content).toContain("navigator");
      expect(content).toContain("gpu");
    });

    it("should include 4 model definitions", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/pages/ClientInferencePage.tsx", "utf-8");
      expect(content).toContain("kokoro-tts-v1");
      expect(content).toContain("chatterbox-voice-clone");
      expect(content).toContain("whisper-tiny-wasm");
      expect(content).toContain("smollm2-360m");
    });

    it("should include voice cloning UI with record and upload", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/pages/ClientInferencePage.tsx", "utf-8");
      expect(content).toContain("Voice Personalization");
      expect(content).toContain("Record Voice");
      expect(content).toContain("Upload Audio");
      expect(content).toContain("Personalize & Generate");
    });

    it("should include TTS demo tab", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/pages/ClientInferencePage.tsx", "utf-8");
      expect(content).toContain("TTS Demo");
      expect(content).toContain("Local Text-to-Speech");
    });

    it("should include model download and cache management", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/pages/ClientInferencePage.tsx", "utf-8");
      expect(content).toContain("handleDownload");
      expect(content).toContain("handleRemove");
      expect(content).toContain("Cache Size");
      expect(content).toContain("Models Ready");
    });
  });

  describe("Real Kokoro TTS Integration (P17b)", () => {
    it("should have useKokoroTTS hook file", async () => {
      const fs = await import("fs");
      const exists = fs.existsSync("client/src/hooks/useKokoroTTS.ts");
      expect(exists).toBe(true);
    });

    it("should export KOKORO_VOICES constant with 19+ voices", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/hooks/useKokoroTTS.ts", "utf-8");
      expect(content).toContain("export const KOKORO_VOICES");
      const voiceMatches = content.match(/\{ id: "/g);
      expect(voiceMatches).not.toBeNull();
      expect(voiceMatches!.length).toBeGreaterThanOrEqual(19);
    });

    it("should export KokoroModelStatus type", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/hooks/useKokoroTTS.ts", "utf-8");
      expect(content).toContain("export type KokoroModelStatus");
      expect(content).toContain('"idle"');
      expect(content).toContain('"loading"');
      expect(content).toContain('"ready"');
      expect(content).toContain('"error"');
    });

    it("should export useKokoroTTS hook with correct API surface", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/hooks/useKokoroTTS.ts", "utf-8");
      expect(content).toContain("loadModel");
      expect(content).toContain("speak");
      expect(content).toContain("generateBlob");
      expect(content).toContain("stop");
      expect(content).toContain("unloadModel");
      expect(content).toContain("isReady");
      expect(content).toContain("isGenerating");
      expect(content).toContain("device");
      expect(content).toContain("dtype");
    });

    it("should use dynamic import for kokoro-js to avoid bundling in main chunk", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/hooks/useKokoroTTS.ts", "utf-8");
      expect(content).toContain('import("kokoro-js")');
    });

    it("should reference the correct ONNX model ID", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/hooks/useKokoroTTS.ts", "utf-8");
      expect(content).toContain("onnx-community/Kokoro-82M-v1.0-ONNX");
    });

    it("should include WAV encoding for audio export", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/hooks/useKokoroTTS.ts", "utf-8");
      expect(content).toContain("encodeWAV");
      expect(content).toContain("audio/wav");
    });

    it("should import useKokoroTTS in ClientInferencePage", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/pages/ClientInferencePage.tsx", "utf-8");
      expect(content).toContain("useKokoroTTS");
      expect(content).toContain("KOKORO_VOICES");
    });

    it("should use real kokoro.loadModel() for download instead of simulated", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/pages/ClientInferencePage.tsx", "utf-8");
      expect(content).toContain("kokoro.loadModel()");
      // Should NOT contain old simulateDownload for kokoro
      expect(content).not.toContain("simulateDownload(model.id)");
    });

    it("should use kokoro.speak() for local TTS generation", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/pages/ClientInferencePage.tsx", "utf-8");
      expect(content).toContain("kokoro.speak(");
      expect(content).toContain("kokoro.isReady");
    });

    it("should have voice selector UI when Kokoro is loaded", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/pages/ClientInferencePage.tsx", "utf-8");
      expect(content).toContain("selectedVoice");
      expect(content).toContain("setSelectedVoice");
      expect(content).toContain("KOKORO_VOICES.filter");
    });

    it("should show Running Locally badge when Kokoro is ready", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/pages/ClientInferencePage.tsx", "utf-8");
      expect(content).toContain("Running Locally");
      expect(content).toContain("Real Local Inference");
    });

    it("should fall back to server Edge TTS when Kokoro not loaded", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/pages/ClientInferencePage.tsx", "utf-8");
      expect(content).toContain("/api/tts");
      expect(content).toContain("Server Fallback");
    });

    it("should have stop button during generation", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/pages/ClientInferencePage.tsx", "utf-8");
      expect(content).toContain("kokoro.stop");
      expect(content).toContain("StopCircle");
    });

    it("should show device and dtype info when model is ready", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/pages/ClientInferencePage.tsx", "utf-8");
      expect(content).toContain("kokoro.device");
      expect(content).toContain("kokoro.dtype");
    });
  });

  describe("Multi-Language TTS (from P16)", { timeout: 15000 }, () => {
    it("should have getAvailableLanguages returning languages from voice catalog", async () => {
      const languages = await getAvailableLanguages();
      // With mocked edge-tts, returns languages from mock voices (14 voices across ~12 languages)
      expect(languages.length).toBeGreaterThanOrEqual(1);
      const english = languages.find(l => l.code === "en");
      expect(english).toBeDefined();
    });

    it("should have getVoicesByLanguage returning voices for English", async () => {
      const voices = await getVoicesByLanguage("en");
      expect(voices.length).toBeGreaterThan(0);
      expect(voices[0]).toHaveProperty("id");
      expect(voices[0]).toHaveProperty("name");
    });

    it("should have getVoicesByLanguage returning voices for Spanish", async () => {
      const voices = await getVoicesByLanguage("es");
      expect(voices.length).toBeGreaterThan(0);
    });

    it("should have getVoicesByLanguage returning voices for Chinese", async () => {
      const voices = await getVoicesByLanguage("zh");
      expect(voices.length).toBeGreaterThan(0);
    });

    it("should return empty array for non-existent language", async () => {
      const voices = await getVoicesByLanguage("xx");
      expect(voices.length).toBe(0);
    });
  });

  describe("Rate Limiter Fix (from P16)", () => {
    it("should have increased rate limit in server config", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("server/_core/index.ts", "utf-8");
      expect(content).toContain("max: 600");
    });

    it("should NOT have global auth redirect in main.tsx (prevents auth loop on deployed site)", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/main.tsx", "utf-8");
      // Global auth redirect was removed because it caused auth loops.
      // Auth redirects are now handled per-page via useAuth({ redirectOnUnauthenticated: true })
      expect(content).not.toContain("hasEverBeenAuthenticated");
      expect(content).not.toContain("redirectToLoginIfUnauthorized");
      // Should still reference UNAUTHED_ERR_MSG for error filtering
      expect(content).toContain("UNAUTHED_ERR_MSG");
    });
  });

  describe("Webapp Builder Page", () => {
    it("should exist and have substantial implementation", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/pages/WebAppBuilderPage.tsx", "utf-8");
      expect(content.length).toBeGreaterThan(10000);
      expect(content).toContain("export default");
    });
  });

  describe("Desktop Agent Page", () => {
    it("should exist and have substantial implementation", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/pages/DesktopAppPage.tsx", "utf-8");
      expect(content.length).toBeGreaterThan(5000);
      expect(content).toContain("export default");
    });
  });
});
