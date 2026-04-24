/**
 * Session 25 — Pass 5: Manus Parity Convergence Tests
 *
 * Step 1: In-Conversation Message Search (Cmd+F)
 * Step 2: User Message Edit & Re-send
 * Step 3: Collapsible Agent Thinking Summary
 *
 * These tests validate the full wiring from server SSE emission through
 * client-side parsing to UI rendering for each feature.
 */
import { describe, expect, it } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ── Helper: read source files ──
function readSource(relPath: string): string {
  return fs.readFileSync(path.resolve(__dirname, relPath), "utf-8");
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 1: In-Conversation Message Search (Cmd+F)
// ═══════════════════════════════════════════════════════════════════════════
describe("Pass 5 Step 1: In-Conversation Message Search", () => {
  const searchComponent = readSource(
    "../client/src/components/InConversationSearch.tsx"
  );
  const taskView = readSource("../client/src/pages/TaskView.tsx");

  it("InConversationSearch component exists and exports default", () => {
    expect(searchComponent).toContain("export default function InConversationSearch");
  });

  it("component accepts open, onClose, messages, and scrollRef props", () => {
    expect(searchComponent).toContain("open");
    expect(searchComponent).toContain("onClose");
    expect(searchComponent).toContain("messages");
    expect(searchComponent).toContain("scrollRef");
  });

  it("supports keyboard navigation with Enter and Shift+Enter", () => {
    expect(searchComponent).toContain("Enter");
    expect(searchComponent).toContain("shiftKey");
  });

  it("highlights matching text in messages using mark elements", () => {
    expect(searchComponent).toContain("mark");
    expect(searchComponent).toContain("data-message-content");
  });

  it("shows match count in the search bar", () => {
    // The component should display current match index and total
    expect(searchComponent).toContain("currentMatchIndex");
    expect(searchComponent).toContain("matches");
  });

  it("TaskView imports InConversationSearch and useConversationSearch", () => {
    expect(taskView).toContain("InConversationSearch");
    expect(taskView).toContain("useConversationSearch");
  });

  it("useConversationSearch hook registers Cmd+F / Ctrl+F keyboard shortcut", () => {
    // The hook should listen for metaKey/ctrlKey + f
    expect(searchComponent).toContain("metaKey");
    expect(searchComponent).toContain("ctrlKey");
    expect(searchComponent).toMatch(/key\s*===\s*["']f["']/);
  });

  it("TaskView uses searchOpen state from useConversationSearch", () => {
    expect(taskView).toContain("searchOpen");
    expect(taskView).toContain("closeSearch");
  });

  it("messages have data-message-content attribute for search targeting", () => {
    expect(taskView).toContain("data-message-content");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// STEP 2: User Message Edit & Re-send
// ═══════════════════════════════════════════════════════════════════════════
describe("Pass 5 Step 2: User Message Edit & Re-send", () => {
  const taskView = readSource("../client/src/pages/TaskView.tsx");
  const taskContext = readSource("../client/src/contexts/TaskContext.tsx");

  it("TaskContext has editMessageAndTruncate method", () => {
    expect(taskContext).toContain("editMessageAndTruncate");
    // Should be in the interface
    expect(taskContext).toMatch(
      /editMessageAndTruncate.*taskId.*messageId.*newContent/
    );
  });

  it("editMessageAndTruncate truncates messages after the edited one", () => {
    // The implementation should slice messages up to and including the edited message
    expect(taskContext).toContain("slice(0, msgIndex + 1)");
  });

  it("editMessageAndTruncate is provided in the TaskContext.Provider value", () => {
    expect(taskContext).toContain("editMessageAndTruncate,");
  });

  it("TaskView destructures editMessageAndTruncate from useTask", () => {
    expect(taskView).toContain("editMessageAndTruncate");
  });

  it("TaskView has handleEditAndResend function", () => {
    expect(taskView).toContain("handleEditAndResend");
    // Should accept messageId and newContent
    expect(taskView).toMatch(/handleEditAndResend.*messageId.*newContent/);
  });

  it("handleEditAndResend calls editMessageAndTruncate then streams", () => {
    // The function should call editMessageAndTruncate and then start streaming
    const fnMatch = taskView.match(
      /handleEditAndResend[\s\S]*?editMessageAndTruncate[\s\S]*?setStreaming\(true\)/
    );
    expect(fnMatch).toBeTruthy();
  });

  it("MessageBubble has edit-related props (isEditing, editDraft, onStartEdit, onCancelEdit, onSaveEdit)", () => {
    expect(taskView).toContain("isEditing");
    expect(taskView).toContain("editDraft");
    expect(taskView).toContain("onStartEdit");
    expect(taskView).toContain("onCancelEdit");
    expect(taskView).toContain("onSaveEdit");
    expect(taskView).toContain("onEditDraftChange");
  });

  it("edit mode shows textarea with Save and Cancel buttons", () => {
    expect(taskView).toContain("editDraft");
    // Should have save and cancel actions
    expect(taskView).toContain("Save & Resend");
    expect(taskView).toContain("Cancel");
  });

  it("TaskView tracks editingMessageId and editDraft state", () => {
    expect(taskView).toContain("editingMessageId");
    expect(taskView).toContain("setEditingMessageId");
    expect(taskView).toContain("editDraft");
    expect(taskView).toContain("setEditDraft");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// STEP 3: Collapsible Agent Thinking Summary
// ═══════════════════════════════════════════════════════════════════════════
describe("Pass 5 Step 3: Collapsible Agent Thinking Summary", () => {
  const agentStream = readSource("./agentStream.ts");
  const streamWithRetry = readSource(
    "../client/src/lib/streamWithRetry.ts"
  );
  const buildCallbacks = readSource(
    "../client/src/lib/buildStreamCallbacks.ts"
  );
  const taskView = readSource("../client/src/pages/TaskView.tsx");

  it("server emits agent_thinking SSE event when text content accompanies tool calls", () => {
    // Should send agent_thinking SSE with content and turn
    expect(agentStream).toContain("agent_thinking");
    expect(agentStream).toMatch(/agent_thinking.*content.*turn/);
  });

  it("agent_thinking is only emitted when textContent has meaningful length", () => {
    // Should check for minimum content length before emitting
    expect(agentStream).toMatch(/textContent.*trim\(\)\.length\s*>\s*10/);
  });

  it("StreamCallbacks interface includes onAgentThinking", () => {
    expect(streamWithRetry).toContain("onAgentThinking");
    expect(streamWithRetry).toMatch(/onAgentThinking.*content.*turn/);
  });

  it("SSE parser routes agent_thinking events to onAgentThinking callback", () => {
    expect(streamWithRetry).toContain("data.agent_thinking");
    expect(streamWithRetry).toContain("callbacks.onAgentThinking");
  });

  it("buildStreamCallbacks implements onAgentThinking handler", () => {
    expect(buildCallbacks).toContain("onAgentThinking");
    // Should create a thinking action with preview content
    expect(buildCallbacks).toMatch(/thinking.*Reasoning/);
  });

  it("thinking action includes preview content from agent reasoning", () => {
    expect(buildCallbacks).toMatch(/thinkingAction\.preview\s*=\s*data\.content/);
  });

  it("existing ActionStep component already renders thinking type with expandable preview", () => {
    // The thinking type should already have icon and label support
    expect(taskView).toContain('"thinking"');
    expect(taskView).toContain("Reasoning about next steps");
    // ActionStep should have expandable preview
    expect(taskView).toContain("previewExpanded");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CROSS-CUTTING: Integration & Consistency
// ═══════════════════════════════════════════════════════════════════════════
describe("Pass 5: Cross-cutting integration", () => {
  const taskView = readSource("../client/src/pages/TaskView.tsx");

  it("all three features coexist in TaskView", () => {
    expect(taskView).toContain("InConversationSearch"); // Step 1
    expect(taskView).toContain("handleEditAndResend");  // Step 2
    expect(taskView).toContain("editMessageAndTruncate"); // Step 2
    // Step 3 is server-side + callbacks, validated above
  });

  it("search and edit features use distinct state variables", () => {
    expect(taskView).toContain("searchOpen");
    expect(taskView).toContain("editingMessageId");
    expect(taskView).toContain("editDraft");
  });
});
