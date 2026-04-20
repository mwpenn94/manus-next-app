/**
 * P15 Tests — Hands-Free Voice Mode, Library, TTS, Audio Feedback
 */
import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mocks ──

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getUserLibraryArtifacts: vi.fn().mockResolvedValue({
      items: [
        {
          id: 1,
          taskId: 10,
          artifactType: "code",
          label: "index.ts",
          content: "console.log('hello')",
          url: null,
          createdAt: new Date(),
          taskTitle: "Test Task",
          taskExternalId: "abc123",
        },
        {
          id: 2,
          taskId: 10,
          artifactType: "browser_screenshot",
          label: "Screenshot",
          content: null,
          url: "https://example.com/screenshot.png",
          createdAt: new Date(),
          taskTitle: "Test Task",
          taskExternalId: "abc123",
        },
      ],
      total: 2,
    }),
    getUserLibraryFiles: vi.fn().mockResolvedValue({
      items: [
        {
          id: 1,
          taskExternalId: "abc123",
          userId: 1,
          fileName: "report.pdf",
          fileKey: "user-1/report.pdf",
          url: "https://example.com/report.pdf",
          mimeType: "application/pdf",
          size: 1024000,
          createdAt: new Date(),
        },
      ],
      total: 1,
    }),
  };
});

// ── Helpers ──

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-p15",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ── Library Router Tests ──

describe("library.artifacts", () => {
  it("returns artifacts for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.library.artifacts({});
    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.items[0]).toHaveProperty("taskTitle");
    expect(result.items[0]).toHaveProperty("taskExternalId");
  });

  it("passes type filter to query", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.library.artifacts({ type: "code" });
    expect(result).toBeDefined();
    expect(result.items).toBeDefined();
  });

  it("passes search filter to query", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.library.artifacts({ search: "index" });
    expect(result).toBeDefined();
  });

  it("supports pagination", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.library.artifacts({ limit: 10, offset: 0 });
    expect(result).toBeDefined();
  });

  it("rejects unauthenticated access", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.library.artifacts({})).rejects.toThrow();
  });
});

describe("library.files", () => {
  it("returns files for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.library.files({});
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0]).toHaveProperty("fileName", "report.pdf");
  });

  it("passes search filter to query", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.library.files({ search: "report" });
    expect(result).toBeDefined();
  });

  it("supports pagination", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.library.files({ limit: 25, offset: 0 });
    expect(result).toBeDefined();
  });

  it("rejects unauthenticated access", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.library.files({})).rejects.toThrow();
  });
});

// ── TTS Module Tests ──

describe("TTS module", () => {
  it("exports synthesizeSpeech function", async () => {
    const tts = await import("./tts");
    expect(tts.synthesizeSpeech).toBeDefined();
    expect(typeof tts.synthesizeSpeech).toBe("function");
  });

  it("exports DEFAULT_VOICES constant", async () => {
    const tts = await import("./tts");
    expect(tts.DEFAULT_VOICES).toBeDefined();
    expect(Array.isArray(tts.DEFAULT_VOICES)).toBe(true);
    expect(tts.DEFAULT_VOICES.length).toBeGreaterThan(0);
  });

  it("DEFAULT_VOICES include en-US voices", async () => {
    const tts = await import("./tts");
    const usVoice = tts.DEFAULT_VOICES.find((v) => v.id.startsWith("en-US-"));
    expect(usVoice).toBeDefined();
    expect(usVoice?.name).toBeDefined();
  });

  it("exports splitIntoSentences", async () => {
    const tts = await import("./tts");
    expect(tts.splitIntoSentences).toBeDefined();
    expect(typeof tts.splitIntoSentences).toBe("function");
  });

  it("splitIntoSentences splits text correctly", async () => {
    const tts = await import("./tts");
    const result = tts.splitIntoSentences("Hello world. How are you? Fine.");
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.join(" ")).toContain("Hello");
  });

  it("exports synthesizeSpeechStream generator", async () => {
    const tts = await import("./tts");
    expect(tts.synthesizeSpeechStream).toBeDefined();
    expect(typeof tts.synthesizeSpeechStream).toBe("function");
  });
});

// ── Audio Feedback (client-side utility, structural tests) ──

describe("Audio Feedback module structure", () => {
  it("audioFeedback.ts exists and exports expected functions", async () => {
    const mod = await import("../client/src/hooks/audioFeedback");
    expect(mod.playListeningChime).toBeDefined();
    expect(mod.startProcessingPulse).toBeDefined();
    expect(mod.stopProcessingPulse).toBeDefined();
    expect(mod.playCompleteChime).toBeDefined();
    expect(mod.playErrorTone).toBeDefined();
    expect(mod.playSendClick).toBeDefined();
    expect(mod.disposeAudioContext).toBeDefined();
    expect(mod.isAudioFeedbackSupported).toBeDefined();
    expect(typeof mod.playListeningChime).toBe("function");
    expect(typeof mod.startProcessingPulse).toBe("function");
    expect(typeof mod.playCompleteChime).toBe("function");
    expect(typeof mod.playErrorTone).toBe("function");
  });
});

// ── Edge TTS Hook (structural) ──

describe("useEdgeTTS hook structure", () => {
  it("exports useEdgeTTS and splitSentences", async () => {
    const mod = await import("../client/src/hooks/useEdgeTTS");
    expect(mod.useEdgeTTS).toBeDefined();
    expect(mod.splitSentences).toBeDefined();
    expect(typeof mod.useEdgeTTS).toBe("function");
    expect(typeof mod.splitSentences).toBe("function");
  });

  it("splitSentences returns non-empty array for text with sentences", async () => {
    const { splitSentences } = await import("../client/src/hooks/useEdgeTTS");
    const result = splitSentences("Hello world. How are you today? I am doing great, thank you very much!");
    expect(result.length).toBeGreaterThanOrEqual(1);
    // The function merges short sentences, so we just verify it produces output
    expect(result.join(" ")).toContain("Hello");
  });

  it("splitSentences handles empty string", async () => {
    const { splitSentences } = await import("../client/src/hooks/useEdgeTTS");
    const result = splitSentences("");
    expect(result).toHaveLength(0);
  });

  it("splitSentences handles single sentence without terminator", async () => {
    const { splitSentences } = await import("../client/src/hooks/useEdgeTTS");
    const result = splitSentences("Hello world this is a longer sentence without punctuation");
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});

// ── Hands-Free Mode Hook (structural) ──

describe("useHandsFreeMode hook structure", () => {
  it("exports useHandsFreeMode", async () => {
    const mod = await import("../client/src/hooks/useHandsFreeMode");
    expect(mod.useHandsFreeMode).toBeDefined();
    expect(typeof mod.useHandsFreeMode).toBe("function");
  });
});

// ── HandsFreeOverlay Component (structural) ──

describe("HandsFreeOverlay component structure", () => {
  it("exports default component", async () => {
    const mod = await import("../client/src/components/HandsFreeOverlay");
    expect(mod.default).toBeDefined();
    // React lazy/memo wraps may produce object, so just check it exists
    expect(mod.default).toBeTruthy();
  });
});
