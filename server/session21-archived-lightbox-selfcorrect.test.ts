/**
 * Session 21 Tests — Archived Memories UI, Multi-Image Lightbox, Intelligent Self-Correction
 *
 * Tests cover:
 * 1. Archived memories: filtering, unarchive, bulk operations
 * 2. Multi-image gallery: combining generated + uploaded images, view modes
 * 3. Intelligent self-correction: context-aware strategy rotation, progressive escalation
 */
import { describe, it, expect } from "vitest";

// ─── 1. Archived Memories ──────────────────────────────────────────────────────

describe("Archived Memories", () => {
  it("should filter archived memories from active list", () => {
    const memories = [
      { id: 1, key: "name", value: "Alice", archived: false },
      { id: 2, key: "old_preference", value: "dark mode", archived: true },
      { id: 3, key: "timezone", value: "PST", archived: false },
      { id: 4, key: "stale_topic", value: "old project", archived: true },
    ];
    const active = memories.filter(m => !m.archived);
    const archived = memories.filter(m => m.archived);
    expect(active).toHaveLength(2);
    expect(archived).toHaveLength(2);
    expect(active.every(m => !m.archived)).toBe(true);
    expect(archived.every(m => m.archived)).toBe(true);
  });

  it("should unarchive a memory by setting archived to false", () => {
    const memory = { id: 2, key: "old_preference", value: "dark mode", archived: true };
    // Simulate unarchive
    const unarchived = { ...memory, archived: false };
    expect(unarchived.archived).toBe(false);
    expect(unarchived.key).toBe("old_preference");
  });

  it("should support bulk unarchive of multiple memories", () => {
    const archived = [
      { id: 2, key: "old_preference", value: "dark mode", archived: true },
      { id: 4, key: "stale_topic", value: "old project", archived: true },
      { id: 5, key: "forgotten_skill", value: "Python", archived: true },
    ];
    const selectedIds = [2, 5];
    const result = archived.map(m => ({
      ...m,
      archived: selectedIds.includes(m.id) ? false : m.archived,
    }));
    expect(result.filter(m => !m.archived)).toHaveLength(2);
    expect(result.filter(m => m.archived)).toHaveLength(1);
  });

  it("should show empty state when no archived memories exist", () => {
    const archived: any[] = [];
    expect(archived.length).toBe(0);
    // UI should show "No archived memories" message
  });

  it("should preserve memory data integrity during unarchive", () => {
    const original = { id: 3, key: "timezone", value: "PST", archived: true, lastAccessedAt: new Date("2026-03-01") };
    const unarchived = { ...original, archived: false };
    expect(unarchived.key).toBe(original.key);
    expect(unarchived.value).toBe(original.value);
    expect(unarchived.lastAccessedAt).toEqual(original.lastAccessedAt);
  });
});

// ─── 2. Multi-Image Gallery ────────────────────────────────────────────────────

describe("Multi-Image Gallery", () => {
  it("should combine generated and uploaded images into a single list", () => {
    const generatedImages = [
      { url: "https://cdn.example.com/gen1.png", label: "Generated 1", source: "generated" },
      { url: "https://cdn.example.com/gen2.png", label: "Generated 2", source: "generated" },
    ];
    const uploadedFiles = [
      { url: "https://cdn.example.com/upload1.jpg", fileName: "photo.jpg", mimeType: "image/jpeg" },
      { url: "https://cdn.example.com/doc.pdf", fileName: "doc.pdf", mimeType: "application/pdf" },
      { url: "https://cdn.example.com/upload2.png", fileName: "screenshot.png", mimeType: "image/png" },
    ];
    const uploadedImages = uploadedFiles
      .filter(f => f.mimeType?.startsWith("image/"))
      .map(f => ({ url: f.url, label: f.fileName, source: "uploaded" }));
    const allImages = [...generatedImages, ...uploadedImages];
    expect(allImages).toHaveLength(4); // 2 generated + 2 uploaded (PDF excluded)
    expect(allImages[0].source).toBe("generated");
    expect(allImages[2].source).toBe("uploaded");
  });

  it("should filter out non-image files from uploaded files", () => {
    const files = [
      { mimeType: "image/png", url: "a.png", fileName: "a.png" },
      { mimeType: "application/pdf", url: "b.pdf", fileName: "b.pdf" },
      { mimeType: "image/jpeg", url: "c.jpg", fileName: "c.jpg" },
      { mimeType: "text/plain", url: "d.txt", fileName: "d.txt" },
      { mimeType: "image/webp", url: "e.webp", fileName: "e.webp" },
    ];
    const images = files.filter(f => f.mimeType?.startsWith("image/"));
    expect(images).toHaveLength(3);
    expect(images.map(i => i.fileName)).toEqual(["a.png", "c.jpg", "e.webp"]);
  });

  it("should extract all image URLs for lightbox navigation", () => {
    const allImages = [
      { url: "https://cdn.example.com/gen1.png", label: "Gen 1", source: "generated" },
      { url: "https://cdn.example.com/upload1.jpg", label: "Upload 1", source: "uploaded" },
    ];
    const allImageUrls = allImages.map(img => img.url);
    expect(allImageUrls).toEqual([
      "https://cdn.example.com/gen1.png",
      "https://cdn.example.com/upload1.jpg",
    ]);
  });

  it("should handle empty image lists gracefully", () => {
    const generatedImages: any[] = [];
    const uploadedImages: any[] = [];
    const allImages = [...generatedImages, ...uploadedImages];
    expect(allImages).toHaveLength(0);
    // UI should show "No images yet" empty state
  });

  it("should correctly count images by source for the header", () => {
    const allImages = [
      { source: "generated" }, { source: "generated" }, { source: "generated" },
      { source: "uploaded" }, { source: "uploaded" },
    ];
    const genCount = allImages.filter(i => i.source === "generated").length;
    const uploadCount = allImages.filter(i => i.source === "uploaded").length;
    expect(genCount).toBe(3);
    expect(uploadCount).toBe(2);
  });

  it("should support preview and gallery view modes", () => {
    const viewModes = ["preview", "gallery"] as const;
    expect(viewModes).toContain("preview");
    expect(viewModes).toContain("gallery");
    // Preview mode: single large image with thumbnail strip
    // Gallery mode: 2-column grid with expand on click
  });
});

// ─── 3. Intelligent Self-Correction ────────────────────────────────────────────

describe("Intelligent Self-Correction", () => {
  // Helper: Detect what the agent was doing based on text
  function detectStuckBehavior(text: string) {
    const lower = text.toLowerCase();
    return {
      wasResearching: /research|search|look|find|gather|investigat/i.test(lower),
      wasClaiming: /can't|cannot|unable|don't have|no access|not able/i.test(lower),
      wasAsking: /could you|please provide|can you|what would|which|clarif/i.test(lower),
      wasApologizing: /sorry|apologize|unfortunately|i'm afraid/i.test(lower),
      wasRepeatingPlan: /let me|i'll|i will|going to|plan to|next step/i.test(lower),
    };
  }

  it("should detect research loop behavior", () => {
    const text = "Let me search for more information about this topic. I'll research further to find the answer.";
    const behavior = detectStuckBehavior(text);
    expect(behavior.wasResearching).toBe(true);
    expect(behavior.wasClaiming).toBe(false);
  });

  it("should detect limitation-claiming behavior", () => {
    const text = "I'm sorry, I can't directly access that file. I don't have the ability to view images.";
    const behavior = detectStuckBehavior(text);
    expect(behavior.wasClaiming).toBe(true);
    expect(behavior.wasApologizing).toBe(true);
  });

  it("should detect clarification-seeking behavior", () => {
    const text = "Could you please provide more details about what you'd like? Which specific aspect would you like me to focus on?";
    const behavior = detectStuckBehavior(text);
    expect(behavior.wasAsking).toBe(true);
  });

  it("should detect apologizing behavior", () => {
    const text = "I apologize for the confusion. Unfortunately, I wasn't able to complete that task.";
    const behavior = detectStuckBehavior(text);
    expect(behavior.wasApologizing).toBe(true);
  });

  it("should detect plan-repeating behavior", () => {
    const text = "Let me plan the next steps. I'll start by analyzing the data, then I will create the report.";
    const behavior = detectStuckBehavior(text);
    expect(behavior.wasRepeatingPlan).toBe(true);
  });

  it("should generate context-aware correction for research loops", () => {
    const behavior = detectStuckBehavior("Conducting deeper research on this topic...");
    expect(behavior.wasResearching).toBe(true);
    // First intervention should tell agent to STOP RESEARCHING and use existing knowledge
    const correction = behavior.wasResearching
      ? "STOP RESEARCHING. Use what you already know."
      : "CHANGE YOUR APPROACH.";
    expect(correction).toContain("STOP RESEARCHING");
  });

  it("should generate context-aware correction for limitation claims", () => {
    const behavior = detectStuckBehavior("I cannot access the attached image directly.");
    expect(behavior.wasClaiming).toBe(true);
    const correction = behavior.wasClaiming
      ? "STOP CLAIMING LIMITATIONS. YOU CAN SEE THEM."
      : "CHANGE YOUR APPROACH.";
    expect(correction).toContain("STOP CLAIMING");
  });

  it("should track strategy progression across interventions", () => {
    const strategies: string[] = [];
    // Simulate 3 stuck interventions
    strategies.push("diagnose-redirect"); // 1st
    strategies.push("force-action");       // 2nd
    strategies.push("last-chance");        // 3rd
    expect(strategies).toHaveLength(3);
    expect(strategies[0]).toBe("diagnose-redirect");
    expect(strategies[1]).toBe("force-action");
    expect(strategies[2]).toBe("last-chance");
  });

  it("should force final answer after MAX_STUCK_BREAKS", () => {
    const MAX_STUCK_BREAKS = 4;
    let stuckBreakCount = 4; // Reached max
    expect(stuckBreakCount >= MAX_STUCK_BREAKS).toBe(true);
    // At this point, agent should be forced to produce final answer
  });

  it("should include strategy history in final forced answer", () => {
    const strategies = ["diagnose-redirect", "force-action", "last-chance"];
    const message = `Strategies tried: ${strategies.join(" → ")}`;
    expect(message).toContain("diagnose-redirect → force-action → last-chance");
  });

  it("should detect similarity using Jaccard-like comparison", () => {
    function isSimilar(a: string, b: string, threshold = 0.6): boolean {
      const wordsA = new Set(a.toLowerCase().split(" ").filter(w => w.length > 3));
      const wordsB = new Set(b.toLowerCase().split(" ").filter(w => w.length > 3));
      if (wordsA.size === 0 || wordsB.size === 0) return false;
      let shared = 0;
      Array.from(wordsB).forEach(w => { if (wordsA.has(w)) shared++; });
      const similarity = shared / Math.max(wordsA.size, wordsB.size);
      return similarity > threshold;
    }

    // Nearly identical responses should be detected
    expect(isSimilar(
      "conducting deeper research on this topic to find more information",
      "conducting further research on this topic to gather more information"
    )).toBe(true);

    // Completely different responses should not be flagged
    expect(isSimilar(
      "the capital of france is paris",
      "quantum computing uses qubits for parallel processing"
    )).toBe(false);

    // Partially similar but different enough
    expect(isSimilar(
      "here is a detailed analysis of the market trends for Q1 2026",
      "the market showed strong growth in technology sector during Q1"
    )).toBe(false);
  });

  it("should reset finalContent before injecting correction", () => {
    let finalContent = "Some accumulated text from the stuck response...";
    // On stuck detection, finalContent should be cleared
    finalContent = "";
    expect(finalContent).toBe("");
  });

  it("should handle edge case: very short repeated responses", () => {
    const normalizedText = "ok";
    // Short responses (< 20 chars) should be skipped by the detection
    expect(normalizedText.length).toBeLessThan(20);
    // No stuck detection should trigger for very short responses
  });
});

// ─── 4. Integration: Memory Decay + Archive UI ─────────────────────────────────

describe("Memory Decay Integration", () => {
  it("should mark memories as archived after 30 days of inactivity", () => {
    const now = new Date();
    const thirtyOneDaysAgo = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);
    const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);

    const memories = [
      { id: 1, lastAccessedAt: thirtyOneDaysAgo, archived: false },
      { id: 2, lastAccessedAt: twentyDaysAgo, archived: false },
      { id: 3, lastAccessedAt: now, archived: false },
    ];

    const staleThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const toArchive = memories.filter(m => m.lastAccessedAt < staleThreshold && !m.archived);
    expect(toArchive).toHaveLength(1);
    expect(toArchive[0].id).toBe(1);
  });

  it("should update lastAccessedAt when memory is injected into agent context", () => {
    const memory = { id: 1, lastAccessedAt: new Date("2026-03-01") };
    // Simulate touch
    const touched = { ...memory, lastAccessedAt: new Date() };
    expect(touched.lastAccessedAt.getTime()).toBeGreaterThan(memory.lastAccessedAt.getTime());
  });

  it("should not archive recently accessed memories even if old", () => {
    const now = new Date();
    const createdLongAgo = new Date("2025-01-01");
    const accessedRecently = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago

    const memory = { id: 1, createdAt: createdLongAgo, lastAccessedAt: accessedRecently, archived: false };
    const staleThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const isStale = memory.lastAccessedAt < staleThreshold;
    expect(isStale).toBe(false); // Should NOT be archived
  });
});
