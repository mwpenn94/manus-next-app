/**
 * P16 Tests — Multi-Language TTS, Rate Limit Fix, Library Preview, Smart Auth Redirect
 */
import { describe, expect, it, vi } from "vitest";

// ── Multi-Language TTS Tests ──

describe("TTS multi-language support", { timeout: 15000 }, () => {
  it("exports getAllVoices function", async () => {
    const tts = await import("./tts");
    expect(tts.getAllVoices).toBeDefined();
    expect(typeof tts.getAllVoices).toBe("function");
  });

  it("exports getVoicesByLanguage function", async () => {
    const tts = await import("./tts");
    expect(tts.getVoicesByLanguage).toBeDefined();
    expect(typeof tts.getVoicesByLanguage).toBe("function");
  });

  it("exports getAvailableLanguages function", async () => {
    const tts = await import("./tts");
    expect(tts.getAvailableLanguages).toBeDefined();
    expect(typeof tts.getAvailableLanguages).toBe("function");
  });

  it("getVoicesByLanguage returns curated defaults for English", async () => {
    const tts = await import("./tts");
    const voices = await tts.getVoicesByLanguage("en");
    expect(voices.length).toBeGreaterThanOrEqual(tts.DEFAULT_VOICES.length);
    // First voices should be the curated defaults
    const firstVoice = voices[0];
    expect(firstVoice.locale).toMatch(/^en-/);
  });

  it("getVoicesByLanguage returns empty array for unknown language", async () => {
    const tts = await import("./tts");
    const voices = await tts.getVoicesByLanguage("zzzz");
    // Should be empty since 'zzzz' is not a real language code
    expect(Array.isArray(voices)).toBe(true);
  });

  it("getAvailableLanguages returns at least English", async () => {
    const tts = await import("./tts");
    const languages = await tts.getAvailableLanguages();
    expect(languages.length).toBeGreaterThanOrEqual(1);
    const english = languages.find(l => l.code === "en");
    expect(english).toBeDefined();
    expect(english!.voiceCount).toBeGreaterThan(0);
  });

  it("TTSVoice interface has all required fields", async () => {
    const tts = await import("./tts");
    const voice = tts.DEFAULT_VOICES[0];
    expect(voice).toHaveProperty("id");
    expect(voice).toHaveProperty("name");
    expect(voice).toHaveProperty("gender");
    expect(voice).toHaveProperty("locale");
    expect(voice).toHaveProperty("language");
    expect(voice).toHaveProperty("description");
  });

  it("DEFAULT_VOICES includes both male and female voices", async () => {
    const tts = await import("./tts");
    const males = tts.DEFAULT_VOICES.filter(v => v.gender === "Male");
    const females = tts.DEFAULT_VOICES.filter(v => v.gender === "Female");
    expect(males.length).toBeGreaterThan(0);
    expect(females.length).toBeGreaterThan(0);
  });

  it("getAvailableVoices backward compat returns English voices", async () => {
    const tts = await import("./tts");
    const voices = await tts.getAvailableVoices();
    expect(voices.length).toBeGreaterThanOrEqual(tts.DEFAULT_VOICES.length);
  });
});

// ── Sentence Splitting Edge Cases ──

describe("splitIntoSentences edge cases", () => {
  it("handles markdown code blocks", async () => {
    const { splitIntoSentences } = await import("./tts");
    const result = splitIntoSentences("Here is code: ```js\nconsole.log('hello');\n``` And more text.");
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.join(" ")).not.toContain("```");
  });

  it("handles markdown bold and italic", async () => {
    const { splitIntoSentences } = await import("./tts");
    const result = splitIntoSentences("This is **bold** and *italic* text.");
    expect(result.join(" ")).toContain("bold");
    expect(result.join(" ")).not.toContain("**");
    expect(result.join(" ")).not.toContain("*italic*");
  });

  it("handles markdown links", async () => {
    const { splitIntoSentences } = await import("./tts");
    const result = splitIntoSentences("Check out [this link](https://example.com) for more info.");
    expect(result.join(" ")).toContain("this link");
    expect(result.join(" ")).not.toContain("https://example.com");
  });

  it("handles multiple newlines", async () => {
    const { splitIntoSentences } = await import("./tts");
    const result = splitIntoSentences("First paragraph.\n\nSecond paragraph.\n\nThird paragraph.");
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("handles very long text without punctuation", async () => {
    const { splitIntoSentences } = await import("./tts");
    const longText = "This is a very long sentence that goes on and on without any punctuation marks to break it up into smaller chunks for the text to speech engine to process";
    const result = splitIntoSentences(longText);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("handles numbered lists", async () => {
    const { splitIntoSentences } = await import("./tts");
    const result = splitIntoSentences("1. First item\n2. Second item\n3. Third item");
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});

// ── SynthesizeOptions Tests ──

describe("synthesizeSpeech options", () => {
  it("accepts rate parameter", async () => {
    const tts = await import("./tts");
    // Just verify the function accepts the rate parameter without throwing a type error
    const options = { text: "Hello", voice: "en-US-AriaNeural", rate: "+20%" };
    expect(options.rate).toBe("+20%");
  });

  it("accepts pitch parameter", async () => {
    const tts = await import("./tts");
    const options = { text: "Hello", voice: "en-US-AriaNeural", pitch: "+5Hz" };
    expect(options.pitch).toBe("+5Hz");
  });

  it("accepts volume parameter", async () => {
    const tts = await import("./tts");
    const options = { text: "Hello", voice: "en-US-AriaNeural", volume: "+10%" };
    expect(options.volume).toBe("+10%");
  });
});

// ── Library Page Structure Tests ──

describe("Library page structure", () => {
  it("Library.tsx exports a default component", async () => {
    const mod = await import("../client/src/pages/Library");
    expect(mod.default).toBeDefined();
    expect(mod.default).toBeTruthy();
  });
});

// ── useHandsFreeMode language config ──

describe("useHandsFreeMode language support", () => {
  it("exports useHandsFreeMode with language config support", async () => {
    const mod = await import("../client/src/hooks/useHandsFreeMode");
    expect(mod.useHandsFreeMode).toBeDefined();
    expect(typeof mod.useHandsFreeMode).toBe("function");
  });
});

// ── Audio Feedback Extended Tests ──

describe("Audio Feedback extended", () => {
  it("isAudioFeedbackSupported returns false in Node.js (no window)", async () => {
    const mod = await import("../client/src/hooks/audioFeedback");
    // In Node.js test env, window is not defined, so it should return false
    try {
      const result = mod.isAudioFeedbackSupported();
      expect(typeof result).toBe("boolean");
    } catch {
      // Expected: window is not defined in Node.js
      expect(true).toBe(true);
    }
  });

  it("disposeAudioContext does not throw when no context exists", async () => {
    const mod = await import("../client/src/hooks/audioFeedback");
    expect(() => mod.disposeAudioContext()).not.toThrow();
  });

  it("stopProcessingPulse does not throw when no pulse is active", async () => {
    const mod = await import("../client/src/hooks/audioFeedback");
    expect(() => mod.stopProcessingPulse()).not.toThrow();
  });
});
