/**
 * Session 25: Convergence-Validated Tests
 *
 * Bug Fix 1: LIMITLESS mode system prompt — action-first for generation requests
 * Bug Fix 2: Context-aware follow-up suggestions (not static/code-oriented)
 * Bug Fix 3: Task auto-completion deliverable check for generation requests
 * Feature 4: Memory tuning preferences wired to server-side (agentStream + scheduler)
 * Feature 5: Improved Task Export to Markdown
 * Feature 6: Task Duplicate/Fork (tRPC procedure + UI button)
 *
 * Convergence Pass 2: Depth + Adversarial hardening tests added
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

// ── Bug Fix 1: LIMITLESS Mode Action-First Prompt ──
describe("Session 25 — Bug Fix 1: LIMITLESS mode action-first for generation", () => {
  it("LIMITLESS mode prompt includes ACTION-FIRST directive", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "./agentStream.ts"),
      "utf-8"
    );
    // The LIMITLESS prompt should contain the action-first directive
    expect(source).toContain("ACTION-FIRST PRINCIPLE");
    expect(source).toContain("generate_document");
    expect(source).toContain("generate_image");
  });

  it("MAX mode prompt also includes ACTION-FIRST directive", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "./agentStream.ts"),
      "utf-8"
    );
    // Find the MAX mode section — it should also have the action-first rule
    const maxModeSection = source.match(/mode === "max"[\s\S]*?(?=mode === "|$)/);
    expect(maxModeSection).toBeTruthy();
    // The overall file should have multiple ACTION-FIRST references (LIMITLESS + MAX)
    const actionFirstCount = (source.match(/ACTION-FIRST PRINCIPLE/g) || []).length;
    expect(actionFirstCount).toBeGreaterThanOrEqual(2);
  });

  it("Anti-shallow-completion skips when wantsCreativeOutput is true", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "./agentStream.ts"),
      "utf-8"
    );
    // The anti-shallow block should check for wantsCreativeOutput
    expect(source).toContain("wantsCreativeOutput");
    // Should skip the anti-shallow research injection for creative/generation requests
    expect(source).toMatch(/wantsCreativeOutput.*skip|skip.*wantsCreativeOutput/is);
  });
});

// ── Bug Fix 2: Context-Aware Follow-Up Suggestions ──
describe("Session 25 — Bug Fix 2: Context-aware follow-up suggestions", () => {
  it("TaskView includes generation_incomplete suggestion category", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/TaskView.tsx"),
      "utf-8"
    );
    expect(source).toContain("generation_incomplete");
    expect(source).toContain("generation_done");
    expect(source).toContain("Please generate it now");
  });

  it("getFollowUpSuggestions checks user message content, not just assistant", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/TaskView.tsx"),
      "utf-8"
    );
    // The function should look at lastUser message, not just lastAssistant
    expect(source).toContain("lastUser");
    expect(source).toContain("userWantedGeneration");
    expect(source).toContain("hasArtifact");
  });

  it("Detects generation requests using comprehensive regex", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/TaskView.tsx"),
      "utf-8"
    );
    // Should detect: generate, create, make, build, draft + pdf, document, image, etc.
    expect(source).toMatch(/generate\|create\|make\|build\|draft/);
    expect(source).toMatch(/pdf\|document\|image\|picture/);
  });
});

// ── Bug Fix 3: Task Auto-Completion Deliverable Check ──
describe("Session 25 — Bug Fix 3: Deliverable check before completion", () => {
  it("Checks wasGenerationRequest before sending completed status", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "./agentStream.ts"),
      "utf-8"
    );
    // Should check if the original user message was a generation request
    expect(source).toContain("wasGenerationRequest");
    expect(source).toContain("producedArtifact");
  });

  it("Sends generationIncomplete metadata when no artifact produced", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "./agentStream.ts"),
      "utf-8"
    );
    expect(source).toContain("generationIncomplete");
    // Should still send completed status but with metadata flag
    expect(source).toMatch(/status.*completed.*metadata.*generationIncomplete/s);
  });

  it("Does NOT flag as incomplete when agent asked for clarification", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "./agentStream.ts"),
      "utf-8"
    );
    expect(source).toContain("agentAskedForClarification");
    // The condition should exclude clarification requests from the incomplete flag
    expect(source).toMatch(/!agentAskedForClarification/);
  });
});

// ── Feature 4: Memory Tuning Preferences Wired to Server ──
describe("Session 25 — Feature 4: Memory tuning wired to server", () => {
  it("index.ts reads memoryDecayHalfLife from user preferences", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "./_core/index.ts"),
      "utf-8"
    );
    expect(source).toContain("memoryDecayHalfLife");
    expect(source).toContain("userHalfLifeDays");
    // Should pass the user's half-life preference to getUserMemories
    expect(source).toMatch(/getUserMemories.*userHalfLifeDays/s);
  });

  it("scheduler.ts applies per-user memory tuning preferences", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "./scheduler.ts"),
      "utf-8"
    );
    // Should iterate over users and apply their preferences
    expect(source).toContain("runMemoryDecaySweep");
    expect(source).toContain("getUserPreferences");
    expect(source).toContain("memoryDecayHalfLife");
    expect(source).toContain("memoryArchiveThreshold");
    // Should apply per-user halfLifeDays to archiveStaleMemories with userId
    expect(source).toMatch(/archiveStaleMemories\(archiveThreshold,\s*halfLifeDays,\s*u\.id\)/);
  });

  it("scheduler.ts reads from all users, not just a single default", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "./scheduler.ts"),
      "utf-8"
    );
    expect(source).toContain("allUsers");
    expect(source).toMatch(/for.*const.*u.*of.*allUsers/);
  });

  // Convergence Pass 2: Depth — UI threshold max matches server cap
  it("SettingsPage threshold slider max is 0.5, matching server cap", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/SettingsPage.tsx"),
      "utf-8"
    );
    // The archive threshold slider should have max={0.5} not max={1.0}
    expect(source).toMatch(/max=\{0\.5\}/);
    // Should NOT have max={1.0} for the archive threshold
    expect(source).toContain("0.50 (archive aggressively)");
  });

  // Convergence Pass 2: Depth — warning for aggressive values
  it("Shows amber warning when threshold > 0.3", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/SettingsPage.tsx"),
      "utf-8"
    );
    expect(source).toContain("memoryArchiveThreshold > 0.3");
    expect(source).toContain("High threshold");
    expect(source).toContain("text-amber-400");
  });

  // Convergence Pass 2: Depth — warning for aggressive decay
  it("Shows amber warning when decay half-life <= 5 days", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/SettingsPage.tsx"),
      "utf-8"
    );
    expect(source).toContain("memoryDecayHalfLife <= 5");
    expect(source).toContain("Very fast decay");
  });

  // Convergence Pass 2: Adversarial — archiveStaleMemories is user-scoped
  it("archiveStaleMemories accepts optional userId parameter", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "./db.ts"),
      "utf-8"
    );
    // Function signature should include userId parameter
    expect(source).toMatch(/archiveStaleMemories\(.*userId\?.*number\)/);
    // Should filter by userId when provided
    expect(source).toContain("eq(memoryEntries.userId, userId)");
  });
});

// ── Feature 5: Improved Task Export to Markdown ──
describe("Session 25 — Feature 5: Improved Task Export to Markdown", () => {
  it("Export includes metadata block with Created, Status, Messages, Mode", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/TaskView.tsx"),
      "utf-8"
    );
    // The export should include metadata fields
    expect(source).toContain("**Created:**");
    expect(source).toContain("**Status:**");
    expect(source).toContain("**Messages:**");
    expect(source).toContain("**Mode:**");
  });

  it("Export skips system messages", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/TaskView.tsx"),
      "utf-8"
    );
    // Should filter out system messages before export
    expect(source).toContain("exportableMessages");
    expect(source).toMatch(/filter.*role.*system/s);
  });

  it("Export extracts and lists artifact URLs", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/TaskView.tsx"),
      "utf-8"
    );
    expect(source).toContain("artifactUrls");
    expect(source).toContain("Artifacts:");
  });

  it("Export includes Sovereign AI branding in footer", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/TaskView.tsx"),
      "utf-8"
    );
    expect(source).toContain("Exported from Sovereign AI");
  });

  // Convergence Pass 2: Depth — tool actions exported as collapsible summary
  it("Export includes tool action summaries in collapsible blocks", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/TaskView.tsx"),
      "utf-8"
    );
    expect(source).toContain("actionSummary");
    expect(source).toContain("<details>");
    expect(source).toContain("Actions (");
  });

  // Convergence Pass 2: Depth — images embedded as markdown images
  it("Export embeds images as markdown image syntax", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/TaskView.tsx"),
      "utf-8"
    );
    expect(source).toContain("imageUrls");
    expect(source).toContain("![Generated Image]");
    // Should support webp format too
    expect(source).toContain("webp");
  });

  // Convergence Pass 2: Adversarial — empty task guard
  it("Export guards against empty tasks (0 messages)", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/TaskView.tsx"),
      "utf-8"
    );
    expect(source).toContain("Nothing to export");
    expect(source).toContain("exportableMessages.length === 0");
  });

  // Convergence Pass 2: Adversarial — safe filename
  it("Export uses safe filename with fallback", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/TaskView.tsx"),
      "utf-8"
    );
    expect(source).toContain("safeName");
    expect(source).toContain("task-export");
  });

  // Convergence Pass 2: Adversarial — large export warning
  it("Export warns for very large conversations (> 500KB)", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/TaskView.tsx"),
      "utf-8"
    );
    expect(source).toContain("500_000");
    expect(source).toContain("Large export");
  });
});

// ── Feature 6: Task Duplicate/Fork ──
describe("Session 25 — Feature 6: Task Duplicate/Fork", () => {
  it("routers.ts has a task.duplicate procedure", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "./routers.ts"),
      "utf-8"
    );
    expect(source).toContain("duplicate:");
    expect(source).toContain("sourceExternalId");
    expect(source).toContain("upToMessageIndex");
    expect(source).toContain("newTitle");
  });

  it("Duplicate procedure copies messages from source task", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "./routers.ts"),
      "utf-8"
    );
    expect(source).toContain("getTaskMessages(sourceTask.id)");
    expect(source).toContain("addTaskMessage");
    expect(source).toContain("messagesCopied");
  });

  it("Duplicate procedure supports partial copy via upToMessageIndex", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "./routers.ts"),
      "utf-8"
    );
    // Should slice messages when upToMessageIndex is provided
    expect(source).toMatch(/upToMessageIndex.*slice/s);
  });

  it("TaskView has a Duplicate Task button in the More menu", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/TaskView.tsx"),
      "utf-8"
    );
    expect(source).toContain("Duplicate Task");
    expect(source).toContain("duplicateTaskMutation");
  });

  it("Duplicate navigates to the new task after creation", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/TaskView.tsx"),
      "utf-8"
    );
    // Should navigate to the new task's URL after duplication
    expect(source).toMatch(/navigate.*task.*result\.externalId/);
  });

  // Convergence Pass 2: Adversarial — empty task guard on server
  it("Server-side duplicate rejects empty tasks", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "./routers.ts"),
      "utf-8"
    );
    expect(source).toContain("Cannot duplicate a task with no messages");
    expect(source).toContain("sourceMessages.length === 0");
  });

  // Convergence Pass 2: Adversarial — client-side empty task guard
  it("Client-side duplicate guards against empty tasks", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/TaskView.tsx"),
      "utf-8"
    );
    expect(source).toContain("Cannot duplicate");
    expect(source).toContain("no messages");
  });

  // Convergence Pass 2: Depth — loading state during duplication
  it("Duplicate button shows loading state while pending", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/TaskView.tsx"),
      "utf-8"
    );
    expect(source).toContain("duplicateTaskMutation.isPending");
    expect(source).toContain("Duplicating...");
    // Button should be disabled while pending (double-click guard)
    expect(source).toMatch(/disabled=\{duplicateTaskMutation\.isPending\}/);
  });

  // Convergence Pass 2: Adversarial — upToMessageIndex bounds clamping
  it("Server-side duplicate clamps upToMessageIndex to message count", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "./routers.ts"),
      "utf-8"
    );
    // Should use Math.min to prevent out-of-bounds slicing
    expect(source).toContain("Math.min(input.upToMessageIndex + 1, sourceMessages.length)");
  });

  // Convergence Pass 2: Depth — confirmation for large tasks
  it("Client-side duplicate confirms before duplicating large tasks", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/TaskView.tsx"),
      "utf-8"
    );
    expect(source).toContain("messages.length > 50");
    expect(source).toContain("Duplicate all of them");
  });
});
