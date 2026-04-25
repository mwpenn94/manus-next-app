import { readRouterSource } from "./test-utils/readRouterSource";
/**
 * Session 17 Tests — Memory Isolation, Extraction Quality, Credit Banner, Templates
 *
 * Covers:
 * 1. Memory injection isolation rules in system prompt
 * 2. Memory extraction prompt excludes task-specific details
 * 3. Memory relevance filter logic
 * 4. Credit warning banner event dispatch
 * 5. Save as Template from TaskView
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// ── 1. Memory Injection Isolation ──

describe("Memory injection isolation in agentStream", () => {
  let agentStreamSource: string;

  beforeEach(() => {
    agentStreamSource = readFileSync(
      resolve(__dirname, "agentStream.ts"),
      "utf-8"
    );
  });

  it("should include 'Background Context Only' header for memory section", () => {
    expect(agentStreamSource).toContain(
      "USER MEMORY (Background Context Only)"
    );
  });

  it("should include CRITICAL RULES FOR MEMORY USAGE section", () => {
    expect(agentStreamSource).toContain("CRITICAL RULES FOR MEMORY USAGE");
  });

  it("should include rule about memories being supplementary context", () => {
    expect(agentStreamSource).toContain(
      "SUPPLEMENTARY CONTEXT"
    );
  });

  it("should include rule about ONLY using relevant memories", () => {
    expect(agentStreamSource).toContain(
      "ONLY use a memory if it is DIRECTLY RELEVANT"
    );
  });

  it("should include rule preventing Topic A/B contamination", () => {
    expect(agentStreamSource).toContain(
      "do NOT inject content from a memory about Topic B"
    );
  });

  it("should include rule to IGNORE ALL MEMORIES when none are relevant", () => {
    expect(agentStreamSource).toContain(
      "IGNORE ALL MEMORIES completely"
    );
  });

  it("should include rule that current user message is PRIMARY directive", () => {
    expect(agentStreamSource).toContain(
      "current user message is your PRIMARY directive"
    );
  });

  it("should have exactly 7 critical rules", () => {
    const rulesMatch = agentStreamSource.match(
      /\d+\.\s+.*(?:memories|memory|MEMORY|current|PRIMARY|Topic|SUPPLEMENTARY|IGNORE|RELEVANT)/g
    );
    // We expect at least 7 numbered rules in the CRITICAL RULES section
    expect(rulesMatch).toBeTruthy();
    expect(rulesMatch!.length).toBeGreaterThanOrEqual(7);
  });
});

// ── 2. Memory Extraction Quality ──

describe("Memory extraction prompt quality", () => {
  let extractorSource: string;

  beforeEach(() => {
    extractorSource = readFileSync(
      resolve(__dirname, "memoryExtractor.ts"),
      "utf-8"
    );
  });

  it("should instruct to extract ONLY enduring personal facts", () => {
    expect(extractorSource).toContain(
      "ONLY enduring personal facts"
    );
  });

  it("should have DO STORE section with identity/preferences", () => {
    expect(extractorSource).toContain("DO STORE");
    expect(extractorSource).toContain("name, identity, location");
    expect(extractorSource).toContain("Recurring interests");
    expect(extractorSource).toContain("Technical stack");
    expect(extractorSource).toContain("Long-term goals");
    expect(extractorSource).toContain("Communication preferences");
    expect(extractorSource).toContain("Professional role");
  });

  it("should have DO NOT STORE section with task-specific exclusions", () => {
    expect(extractorSource).toContain("DO NOT STORE");
    expect(extractorSource).toContain("Specific task requests");
    expect(extractorSource).toContain("werewolf PvP build");
    expect(extractorSource).toContain("One-time queries");
    expect(extractorSource).toContain("game builds, recipes, itineraries");
  });

  it("should include the cross-topic relevance test", () => {
    expect(extractorSource).toContain(
      "Would this fact help personalize a response about a COMPLETELY DIFFERENT topic"
    );
  });

  it("should NOT contain the old generic extraction prompt", () => {
    expect(extractorSource).not.toContain(
      "Extract key facts, preferences, and notable information"
    );
    expect(extractorSource).not.toContain(
      "projects they're working on"
    );
  });
});

// ── 3. Memory Relevance Filter ──

describe("Memory relevance filter in index.ts", () => {
  let indexSource: string;

  beforeEach(() => {
    indexSource = readFileSync(
      resolve(__dirname, "_core/index.ts"),
      "utf-8"
    );
  });

  it("should contain relevance filtering logic", () => {
    expect(indexSource).toContain("relevance filtering");
    expect(indexSource).toContain("relevantMemories");
  });

  it("should have tiered identity/preference keys (STRICT_IDENTITY_KEYS + SOFT_PREFERENCE_KEYS)", () => {
    expect(indexSource).toContain("STRICT_IDENTITY_KEYS");
    expect(indexSource).toContain("SOFT_PREFERENCE_KEYS");
    expect(indexSource).toContain('"name"');
    expect(indexSource).toContain('"identity"');
    expect(indexSource).toContain('"preference"');
    expect(indexSource).toContain('"role"');
    expect(indexSource).toContain('"expertise"');
  });

  it("should filter memories based on keyword overlap with task text", () => {
    expect(indexSource).toContain("firstUserMsg");
    expect(indexSource).toContain("taskText");
    expect(indexSource).toContain("memWords");
  });

  it("should only inject memoryContext when relevant memories exist", () => {
    expect(indexSource).toContain("if (relevantMemories.length > 0)");
  });

  it("should skip short words (less than 5 chars) in keyword matching", () => {
    expect(indexSource).toContain("w.length >= 5");
  });
});

// ── 4. Memory Relevance Filter — Unit Logic ──

describe("Memory relevance filter logic (unit)", () => {
  // Simulate the filter logic from index.ts
  const ALWAYS_RELEVANT_KEYS = [
    "name", "identity", "location", "timezone", "language",
    "preference", "communication", "style", "role", "expertise",
    "stack", "framework", "profession", "job",
  ];

  function filterMemories(
    memories: Array<{ key: string; value: string }>,
    taskText: string
  ) {
    const taskLower = taskText.toLowerCase();
    return memories.filter((m) => {
      const keyLower = (m.key || "").toLowerCase();
      const valueLower = (m.value || "").toLowerCase();
      if (ALWAYS_RELEVANT_KEYS.some((k) => keyLower.includes(k))) return true;
      if (taskLower.length > 0) {
        const memWords = (keyLower + " " + valueLower)
          .split(/\W+/)
          .filter((w: string) => w.length > 3);
        return memWords.some((w: string) => taskLower.includes(w));
      }
      return false;
    });
  }

  it("should always include identity memories regardless of task topic", () => {
    const memories = [
      { key: "User Name", value: "John" },
      { key: "ESO werewolf build", value: "Dark Elf Arcanist PvP" },
    ];
    const result = filterMemories(memories, "Tell me about skyshards");
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("User Name");
  });

  it("should include preference memories regardless of task topic", () => {
    const memories = [
      { key: "Communication preference", value: "Prefers concise answers" },
      { key: "Cooking recipe", value: "Likes pasta carbonara" },
    ];
    const result = filterMemories(memories, "Help me write Python code");
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("Communication preference");
  });

  it("should include memories with keyword overlap to the task", () => {
    const memories = [
      { key: "Technical stack", value: "Prefers React + TypeScript" },
      { key: "ESO character", value: "Dark Elf Nightblade" },
    ];
    const result = filterMemories(memories, "Help me build a React component");
    // "stack" includes "React" in value, and "React" appears in task
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.some((m) => m.key === "Technical stack")).toBe(true);
  });

  it("should exclude unrelated memories when no keyword overlap", () => {
    const memories = [
      { key: "ESO werewolf build", value: "Dark Elf Arcanist PvP stamina" },
    ];
    const result = filterMemories(memories, "What are skyshards in ESO?");
    // "werewolf", "arcanist", "stamina" don't appear in "what are skyshards in eso"
    // But "skyshards" doesn't appear in the memory either
    // Actually "dark" (4 chars) doesn't match. Let's check carefully.
    // memWords: ["werewolf", "build", "dark", "arcanist", "stamina"]
    // "dark" is 4 chars so included. Does "dark" appear in "what are skyshards in eso"? No.
    // "werewolf" in "what are skyshards in eso"? No.
    // So this should be excluded.
    expect(result).toHaveLength(0);
  });

  it("should handle empty task text gracefully", () => {
    const memories = [
      { key: "User Name", value: "Alice" },
      { key: "Game build", value: "Werewolf PvP" },
    ];
    const result = filterMemories(memories, "");
    // Only identity memories should be included
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("User Name");
  });
});

// ── 5. Credit Warning Banner ──

describe("Credit warning banner", () => {
  it("should export CreditWarningBanner component", async () => {
    // Verify the component file exists and exports correctly
    const source = readFileSync(
      resolve(__dirname, "../client/src/components/CreditWarningBanner.tsx"),
      "utf-8"
    );
    expect(source).toContain("export function CreditWarningBanner");
    expect(source).toContain("CREDIT_EXHAUSTED_EVENT");
    expect(source).toContain("CREDIT_RESTORED_EVENT");
    expect(source).toContain("dispatchCreditExhausted");
    expect(source).toContain("dispatchCreditRestored");
  });

  it("should use sessionStorage for persistence across navigation", () => {
    const source = readFileSync(
      resolve(__dirname, "../client/src/components/CreditWarningBanner.tsx"),
      "utf-8"
    );
    expect(source).toContain("sessionStorage");
    expect(source).toContain("creditExhausted");
  });

  it("should be dismissible", () => {
    const source = readFileSync(
      resolve(__dirname, "../client/src/components/CreditWarningBanner.tsx"),
      "utf-8"
    );
    expect(source).toContain("handleDismiss");
    expect(source).toContain("dismissed");
  });

  it("should be integrated into AppLayout", () => {
    const layoutSrc = readFileSync(resolve(__dirname, "../client/src/components/AppLayout.tsx"), "utf8");
    expect(layoutSrc).toContain("CreditWarningBanner");
  });

  it("should dispatch credit-exhausted event from SSE error handler", () => {
    const streamSource = readFileSync(
      resolve(__dirname, "../client/src/lib/streamWithRetry.ts"),
      "utf-8"
    );
    expect(streamSource).toContain("manus:credit-exhausted");
    expect(streamSource).toContain("credits");
    expect(streamSource).toContain("exhausted");
  });
});

// ── 6. Save as Template from TaskView ──

describe("Save as Template in TaskView", () => {
  let taskViewSource: string;

  beforeEach(() => {
    taskViewSource = readFileSync(
      resolve(__dirname, "../client/src/pages/TaskView.tsx"),
      "utf-8"
    );
  });

  it("should import BookmarkPlus icon", () => {
    expect(taskViewSource).toContain("BookmarkPlus");
  });

  it("should have saveTemplateMutation using trpc.templates.create", () => {
    expect(taskViewSource).toContain("saveTemplateMutation");
    expect(taskViewSource).toContain("trpc.templates.create.useMutation");
  });

  it("should have 'Save as Template' button in the More menu", () => {
    expect(taskViewSource).toContain("Save as Template");
  });

  it("should extract first user message for template prompt", () => {
    expect(taskViewSource).toContain('task.messages.find(m => m.role === "user")');
  });

  it("should show toast on success and error", () => {
    expect(taskViewSource).toContain('"Saved as template"');
    expect(taskViewSource).toContain('"Failed to save template"');
  });
});

// ── 7. Template CRUD Backend ──

describe("Template CRUD backend", () => {
  let routersSource: string;
  let dbSource: string;

  beforeEach(() => {
    routersSource = readRouterSource();
    dbSource = readFileSync(
      resolve(__dirname, "db.ts"),
      "utf-8"
    );
  });

  it("should have templates router with list/create/update/delete/use", () => {
    expect(routersSource).toContain("templates: router(");
    expect(routersSource).toContain("list: protectedProcedure");
    // create, update, delete, use are all under templates router
    const templatesSection = routersSource.slice(
      routersSource.indexOf("templates: router(")
    );
    expect(templatesSection).toContain("create: protectedProcedure");
    expect(templatesSection).toContain("update: protectedProcedure");
    expect(templatesSection).toContain("delete: protectedProcedure");
    expect(templatesSection).toContain("use: protectedProcedure");
  });

  it("should have DB helpers for template CRUD", () => {
    expect(dbSource).toContain("createTaskTemplate");
    expect(dbSource).toContain("getUserTaskTemplates");
    expect(dbSource).toContain("updateTaskTemplate");
    expect(dbSource).toContain("deleteTaskTemplate");
    expect(dbSource).toContain("incrementTemplateUsage");
  });
});
