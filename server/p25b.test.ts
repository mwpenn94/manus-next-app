/**
 * P25b Tests — Hands-Free Mode Transcription Fix
 *
 * Validates that useHandsFreeMode now accepts injected uploadAudio and
 * transcribeAudio callbacks, and that TaskView wires them properly via
 * tRPC mutation instead of raw fetch.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const read = (p: string) => readFileSync(resolve(__dirname, "..", p), "utf-8");

describe("P25b — Hands-Free Mode Transcription Fix", () => {
  describe("useHandsFreeMode — Injected Callbacks", () => {
    const src = read("client/src/hooks/useHandsFreeMode.ts");

    it("accepts uploadAudio callback in config", () => {
      expect(src).toContain("uploadAudio?: (blob: Blob, fileName: string, mimeType: string) => Promise<string>");
    });

    it("accepts transcribeAudio callback in config", () => {
      expect(src).toContain("transcribeAudio?: (audioUrl: string, language?: string) => Promise<string>");
    });

    it("uses injected uploadAudio when available", () => {
      expect(src).toContain("configRef.current.uploadAudio");
      expect(src).toContain("await configRef.current.uploadAudio(blob, fileName, mimeType)");
    });

    it("uses injected transcribeAudio when available", () => {
      expect(src).toContain("configRef.current.transcribeAudio");
      expect(src).toContain("await configRef.current.transcribeAudio(audioUrl");
    });

    it("has fallback fetch with credentials:include for upload", () => {
      // Fallback path still uses credentials: include
      const fallbackSection = src.slice(src.indexOf("// Fallback: direct fetch"));
      expect(fallbackSection).toContain('credentials: "include"');
    });

    it("has fallback fetch with batch format for transcription", () => {
      expect(src).toContain("?batch=1");
      expect(src).toContain('"0": { json:');
    });

    it("skips blobs smaller than 1000 bytes (no speech)", () => {
      expect(src).toContain("blob.size < 1000");
    });

    it("calls onTranscription then onSendMessage on successful transcription", () => {
      const onstopSection = src.slice(src.indexOf("recorder.onstop"));
      expect(onstopSection).toContain("configRef.current.onTranscription?.(text.trim())");
      expect(onstopSection).toContain("configRef.current.onSendMessage?.(text.trim())");
    });

    it("sets state to processing after successful transcription", () => {
      expect(src).toContain('setState("processing")');
    });

    it("restarts listening on empty transcription result", () => {
      expect(src).toContain("// No speech detected, restart listening");
      expect(src).toContain("if (isActiveRef.current) startListening()");
    });

    it("restarts listening on transcription error with delay", () => {
      expect(src).toContain("setTimeout(() => startListening(), 1000)");
    });
  });

  describe("TaskView — Hands-Free tRPC Wiring", () => {
    const tv = read("client/src/pages/TaskView.tsx");

    it("creates a dedicated tRPC mutation for hands-free transcription", () => {
      expect(tv).toContain("handsFreeTranscribeMutation = trpc.voice.transcribe.useMutation()");
    });

    it("passes uploadAudio callback to useHandsFreeMode", () => {
      expect(tv).toContain("uploadAudio: async (blob: Blob, fileName: string, mimeType: string)");
    });

    it("passes transcribeAudio callback to useHandsFreeMode", () => {
      expect(tv).toContain("transcribeAudio: async (audioUrl: string, language?: string)");
    });

    it("uses handsFreeTranscribeMutation.mutateAsync in transcribeAudio", () => {
      expect(tv).toContain("handsFreeTranscribeMutation.mutateAsync");
    });

    it("sends credentials:include in upload fetch", () => {
      // Find the uploadAudio callback section
      const uploadSection = tv.slice(tv.indexOf("uploadAudio: async"), tv.indexOf("transcribeAudio: async"));
      expect(uploadSection).toContain('credentials: "include"');
    });

    it("passes language to transcription mutation", () => {
      expect(tv).toContain('language: language || "en"');
    });

    it("returns result.text from transcription", () => {
      expect(tv).toContain('return result.text || ""');
    });
  });

  describe("Pipeline Integration", () => {
    const hook = read("client/src/hooks/useHandsFreeMode.ts");
    const tv = read("client/src/pages/TaskView.tsx");

    it("full pipeline: onSendMessage triggers handleHandsFreeSend", () => {
      expect(tv).toContain("handleHandsFreeSend(text)");
    });

    it("handleHandsFreeSend calls handsFree.notifyProcessing", () => {
      expect(tv).toContain("handsFree.notifyProcessing()");
    });

    it("handleHandsFreeSend calls handsFree.notifyComplete on success", () => {
      expect(tv).toContain("handsFree.notifyComplete(accumulated)");
    });

    it("handleHandsFreeSend calls handsFree.notifyError on failure", () => {
      expect(tv).toContain("handsFree.notifyError(errorMsg)");
    });

    it("notifyComplete triggers TTS speakResponse", () => {
      expect(hook).toContain("speakResponse(fullResponse)");
    });

    it("TTS onEnd triggers auto-listen for continuous conversation", () => {
      expect(hook).toContain("configRef.current.autoListen && isActiveRef.current");
      expect(hook).toContain("setTimeout(() => startListening(), 500)");
    });

    it("VAD auto-stops recording after 2s of silence", () => {
      expect(hook).toContain("SILENCE_DURATION = 2000");
      expect(hook).toContain("SILENCE_THRESHOLD = 15");
    });

    it("hard ceiling stops recording after 30 seconds", () => {
      expect(hook).toContain("30000");
    });
  });

  describe("Audio Feedback Cues", () => {
    const hook = read("client/src/hooks/useHandsFreeMode.ts");

    it("plays listening chime when recording starts", () => {
      expect(hook).toContain("playListeningChime()");
    });

    it("plays send click on successful transcription", () => {
      expect(hook).toContain("playSendClick()");
    });

    it("starts processing pulse during agent processing", () => {
      expect(hook).toContain("startProcessingPulse()");
    });

    it("plays complete chime after TTS finishes", () => {
      expect(hook).toContain("playCompleteChime()");
    });

    it("plays error tone on failures", () => {
      expect(hook).toContain("playErrorTone()");
    });
  });
});
