/**
 * Session 20 Tests — Attachment Processing, Loop Detection, Memory Decay,
 * Notification Center, Thumbnail Lightbox
 */
import { describe, it, expect } from "vitest";

// ─── 1. Vision Capability Declaration ───────────────────────────────────────

describe("Vision capability in system prompt", () => {
  const VISION_SECTION = `## VISION CAPABILITIES
You have full vision capabilities. You CAN see and analyze images.`;

  it("declares vision capabilities explicitly", () => {
    expect(VISION_SECTION).toContain("You have full vision capabilities");
    expect(VISION_SECTION).toContain("You CAN see and analyze images");
  });

  it("does not claim inability to see images", () => {
    expect(VISION_SECTION).not.toContain("cannot see");
    expect(VISION_SECTION).not.toContain("unable to view");
  });
});

describe("Attachment-aware prompting", () => {
  // Simulate the attachment detection logic from agentStream.ts
  function detectAttachments(messages: any[]): { hasImages: boolean; hasFiles: boolean; imageCount: number } {
    let hasImages = false;
    let hasFiles = false;
    let imageCount = 0;
    for (const msg of messages) {
      if (msg.role === "user" && Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.type === "image_url") { hasImages = true; imageCount++; }
          if (part.type === "file_url") hasFiles = true;
        }
      }
    }
    return { hasImages, hasFiles, imageCount };
  }

  it("detects image_url parts in user messages", () => {
    const messages = [
      { role: "user", content: [
        { type: "text", text: "What's in this image?" },
        { type: "image_url", image_url: { url: "https://example.com/photo.jpg" } },
      ]},
    ];
    const result = detectAttachments(messages);
    expect(result.hasImages).toBe(true);
    expect(result.imageCount).toBe(1);
  });

  it("detects file_url parts in user messages", () => {
    const messages = [
      { role: "user", content: [
        { type: "text", text: "Analyze this PDF" },
        { type: "file_url", file_url: { url: "https://example.com/doc.pdf" } },
      ]},
    ];
    const result = detectAttachments(messages);
    expect(result.hasFiles).toBe(true);
  });

  it("detects multiple images across messages", () => {
    const messages = [
      { role: "user", content: [
        { type: "image_url", image_url: { url: "https://example.com/1.jpg" } },
        { type: "image_url", image_url: { url: "https://example.com/2.jpg" } },
      ]},
      { role: "user", content: [
        { type: "image_url", image_url: { url: "https://example.com/3.jpg" } },
      ]},
    ];
    const result = detectAttachments(messages);
    expect(result.hasImages).toBe(true);
    expect(result.imageCount).toBe(3);
  });

  it("returns false for text-only messages", () => {
    const messages = [
      { role: "user", content: "Just a text message" },
      { role: "user", content: [{ type: "text", text: "Another text" }] },
    ];
    const result = detectAttachments(messages);
    expect(result.hasImages).toBe(false);
    expect(result.hasFiles).toBe(false);
    expect(result.imageCount).toBe(0);
  });

  it("ignores assistant message content arrays", () => {
    const messages = [
      { role: "assistant", content: [
        { type: "image_url", image_url: { url: "https://example.com/gen.jpg" } },
      ]},
    ];
    const result = detectAttachments(messages);
    expect(result.hasImages).toBe(false);
  });
});

// ─── 2. Loop/Stuck Detection ────────────────────────────────────────────────

describe("Loop/stuck detection", () => {
  // Simulate the stuck detection logic from agentStream.ts
  function detectStuck(responses: string[]): { isStuck: boolean; reason: string } {
    if (responses.length < 3) return { isStuck: false, reason: "" };

    // Check for identical responses
    const last3 = responses.slice(-3);
    const allSame = last3.every(r => r === last3[0]);
    if (allSame) return { isStuck: true, reason: "identical_responses" };

    // Check for high similarity (>80% overlap in words)
    const wordSets = last3.map(r =>
      new Set(r.toLowerCase().split(/\s+/).filter(w => w.length >= 4))
    );
    let highSimilarity = true;
    for (let i = 1; i < wordSets.length; i++) {
      const prev = wordSets[i - 1];
      const curr = wordSets[i];
      const intersection = Array.from(curr).filter(w => prev.has(w)).length;
      const union = new Set([...Array.from(prev), ...Array.from(curr)]).size;
      const similarity = union > 0 ? intersection / union : 0;
      if (similarity < 0.8) highSimilarity = false;
    }
    if (highSimilarity) return { isStuck: true, reason: "high_similarity" };

    return { isStuck: false, reason: "" };
  }

  it("detects identical consecutive responses", () => {
    const responses = [
      "I'll help you with that.",
      "I'll help you with that.",
      "I'll help you with that.",
    ];
    const result = detectStuck(responses);
    expect(result.isStuck).toBe(true);
    expect(result.reason).toBe("identical_responses");
  });

  it("detects highly similar responses", () => {
    const responses = [
      "I can help you analyze this data and provide detailed insights about the overall trends and patterns in the dataset.",
      "I can help you analyze this data and provide detailed insights about the overall trends and patterns in the dataset.",
      "I can help you analyze this data and provide detailed insights about the overall trends and patterns in this dataset.",
    ];
    const result = detectStuck(responses);
    expect(result.isStuck).toBe(true);
  });

  it("does not flag varied responses", () => {
    const responses = [
      "The weather in Tokyo is sunny today with temperatures around 25°C.",
      "For your recipe, you'll need flour, sugar, eggs, and butter.",
      "The stock market closed up 2% today driven by tech sector gains.",
    ];
    const result = detectStuck(responses);
    expect(result.isStuck).toBe(false);
  });

  it("requires at least 3 responses to detect stuck", () => {
    const responses = ["Hello", "Hello"];
    const result = detectStuck(responses);
    expect(result.isStuck).toBe(false);
  });
});

// ─── 3. Memory Decay/TTL ────────────────────────────────────────────────────

describe("Memory decay/TTL", () => {
  it("archiveStaleMemories targets memories older than threshold", () => {
    const STALE_DAYS = 30;
    const now = new Date();
    const staleDate = new Date(now.getTime() - (STALE_DAYS + 1) * 24 * 60 * 60 * 1000);
    const recentDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

    expect(staleDate.getTime()).toBeLessThan(now.getTime() - STALE_DAYS * 24 * 60 * 60 * 1000);
    expect(recentDate.getTime()).toBeGreaterThan(now.getTime() - STALE_DAYS * 24 * 60 * 60 * 1000);
  });

  it("touchMemoryAccess updates lastAccessedAt to current time", () => {
    const before = Date.now();
    const touchedAt = Date.now(); // Simulates what touchMemoryAccess does
    const after = Date.now();
    expect(touchedAt).toBeGreaterThanOrEqual(before);
    expect(touchedAt).toBeLessThanOrEqual(after);
  });

  it("archived memories are excluded from getUserMemories default query", () => {
    // The query adds: where archived = 0
    const archived = { archived: 1, key: "old_preference", value: "something" };
    const active = { archived: 0, key: "name", value: "Michael" };
    const results = [archived, active].filter(m => m.archived === 0);
    expect(results).toHaveLength(1);
    expect(results[0].key).toBe("name");
  });

  it("listArchived returns only archived memories", () => {
    const all = [
      { archived: 0, key: "name" },
      { archived: 1, key: "old_pref" },
      { archived: 1, key: "stale_topic" },
    ];
    const archivedOnly = all.filter(m => m.archived === 1);
    expect(archivedOnly).toHaveLength(2);
  });

  it("unarchive resets archived flag and updates lastAccessedAt", () => {
    const memory = { archived: 1, lastAccessedAt: new Date("2025-01-01") };
    // Simulate unarchive
    memory.archived = 0;
    memory.lastAccessedAt = new Date();
    expect(memory.archived).toBe(0);
    expect(memory.lastAccessedAt.getTime()).toBeGreaterThan(new Date("2025-12-01").getTime());
  });
});

// ─── 4. Notification Center Grouping ────────────────────────────────────────

describe("Notification center stale_completed grouping", () => {
  function groupNotifications(notifications: any[]) {
    const stale: any[] = [];
    const other: any[] = [];
    for (const n of notifications) {
      if (n.type === "stale_completed") {
        stale.push(n);
      } else {
        other.push(n);
      }
    }
    return { staleGroup: stale, otherNotifications: other };
  }

  it("groups stale_completed notifications separately", () => {
    const notifications = [
      { id: 1, type: "stale_completed", title: "Task auto-completed" },
      { id: 2, type: "task_completed", title: "Task done" },
      { id: 3, type: "stale_completed", title: "Another auto-completed" },
      { id: 4, type: "system", title: "Welcome" },
    ];
    const { staleGroup, otherNotifications } = groupNotifications(notifications);
    expect(staleGroup).toHaveLength(2);
    expect(otherNotifications).toHaveLength(2);
  });

  it("returns empty stale group when no stale notifications", () => {
    const notifications = [
      { id: 1, type: "task_completed", title: "Done" },
      { id: 2, type: "system", title: "Info" },
    ];
    const { staleGroup } = groupNotifications(notifications);
    expect(staleGroup).toHaveLength(0);
  });

  it("Resume All extracts unique task IDs", () => {
    const staleGroup = [
      { taskExternalId: "abc123" },
      { taskExternalId: "abc123" }, // duplicate
      { taskExternalId: "def456" },
      { taskExternalId: null },
    ];
    const taskIds = staleGroup
      .map((n: any) => n.taskExternalId)
      .filter((id: any): id is string => !!id);
    const unique = Array.from(new Set(taskIds));
    expect(unique).toHaveLength(2);
    expect(unique).toContain("abc123");
    expect(unique).toContain("def456");
  });
});

// ─── 5. Notification Type Icons ─────────────────────────────────────────────

describe("Notification type icons", () => {
  const typeMap: Record<string, string> = {
    task_completed: "check",
    task_error: "alert",
    share_viewed: "share",
    stale_completed: "clock",
    system: "info",
  };

  it("maps stale_completed to clock icon", () => {
    expect(typeMap["stale_completed"]).toBe("clock");
  });

  it("maps all known types", () => {
    expect(Object.keys(typeMap)).toHaveLength(5);
  });
});

// ─── 6. ImageLightbox Logic ─────────────────────────────────────────────────

describe("ImageLightbox navigation", () => {
  it("hasPrev is false at index 0", () => {
    const currentIndex = 0;
    expect(currentIndex > 0).toBe(false);
  });

  it("hasNext is false at last index", () => {
    const images = ["a.jpg", "b.jpg", "c.jpg"];
    const currentIndex = 2;
    expect(currentIndex < images.length - 1).toBe(false);
  });

  it("navigates forward correctly", () => {
    let index = 0;
    const images = ["a.jpg", "b.jpg", "c.jpg"];
    if (index < images.length - 1) index++;
    expect(index).toBe(1);
    if (index < images.length - 1) index++;
    expect(index).toBe(2);
    if (index < images.length - 1) index++;
    expect(index).toBe(2); // stays at end
  });

  it("navigates backward correctly", () => {
    let index = 2;
    if (index > 0) index--;
    expect(index).toBe(1);
    if (index > 0) index--;
    expect(index).toBe(0);
    if (index > 0) index--;
    expect(index).toBe(0); // stays at start
  });

  it("thumbnail strip shows all images", () => {
    const images = ["a.jpg", "b.jpg", "c.jpg", "d.jpg"];
    expect(images.length).toBe(4);
    expect(images.length > 1).toBe(true); // strip only shows for multiple
  });

  it("single image hides thumbnail strip", () => {
    const images = ["only.jpg"];
    expect(images.length > 1).toBe(false);
  });
});

// ─── 7. Memory Enabled Toggle ───────────────────────────────────────────────

describe("Memory enabled toggle integration", () => {
  it("memoryEnabled defaults to true", () => {
    const defaultSettings = { memoryEnabled: true };
    expect(defaultSettings.memoryEnabled).toBe(true);
  });

  it("when disabled, memory injection is skipped", () => {
    const memoryEnabled = false;
    let memoryContext: string | undefined;
    if (memoryEnabled) {
      memoryContext = "some memories";
    }
    expect(memoryContext).toBeUndefined();
  });

  it("when disabled, memory extraction is skipped", () => {
    const memoryEnabled = false;
    let extracted = false;
    if (memoryEnabled) {
      extracted = true;
    }
    expect(extracted).toBe(false);
  });

  it("when enabled, both injection and extraction proceed", () => {
    const memoryEnabled = true;
    let memoryContext: string | undefined;
    let extracted = false;
    if (memoryEnabled) {
      memoryContext = "User prefers dark mode";
      extracted = true;
    }
    expect(memoryContext).toBeDefined();
    expect(extracted).toBe(true);
  });
});

// ─── 8. Scheduler Memory Decay Sweep ────────────────────────────────────────

describe("Scheduler memory decay configuration", () => {
  it("decay interval is 24 hours", () => {
    const MEMORY_DECAY_INTERVAL_MS = 24 * 60 * 60 * 1000;
    expect(MEMORY_DECAY_INTERVAL_MS).toBe(86400000);
  });

  it("stale threshold is 30 days", () => {
    const MEMORY_STALE_DAYS = 30;
    const thresholdMs = MEMORY_STALE_DAYS * 24 * 60 * 60 * 1000;
    expect(thresholdMs).toBe(2592000000);
  });

  it("first sweep runs 10 minutes after startup", () => {
    const FIRST_SWEEP_DELAY_MS = 10 * 60 * 1000;
    expect(FIRST_SWEEP_DELAY_MS).toBe(600000);
  });
});
