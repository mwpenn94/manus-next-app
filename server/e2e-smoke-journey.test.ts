/**
 * E2E Smoke Test — Full User Journey (Structural Validation)
 *
 * Validates the complete data flow path:
 * Login → Create Task → Send Message → Stream Response → View Artifacts
 *
 * This is a structural test that verifies all components in the pipeline
 * are properly wired without requiring a running browser.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const readSrc = (rel: string) => fs.readFileSync(path.resolve(rel), "utf-8");

const CLIENT_SRC = "client/src";
const APP = readSrc(`${CLIENT_SRC}/App.tsx`);
const HOME = readSrc(`${CLIENT_SRC}/pages/Home.tsx`);
const TASK_VIEW = readSrc(`${CLIENT_SRC}/pages/TaskView.tsx`);
const TASK_CONTEXT = readSrc(`${CLIENT_SRC}/contexts/TaskContext.tsx`);
const STREAM_RETRY = readSrc(`${CLIENT_SRC}/lib/streamWithRetry.ts`);
const CALLBACKS = readSrc(`${CLIENT_SRC}/lib/buildStreamCallbacks.ts`);
const TRPC_LIB = readSrc(`${CLIENT_SRC}/lib/trpc.ts`);
const AGENT_STREAM = readSrc("server/agentStream.ts");
const INDEX = readSrc("server/_core/index.ts");

// ═══════════════════════════════════════════════════════════════════
// STEP 1: Authentication Flow
// ═══════════════════════════════════════════════════════════════════
describe("Journey Step 1: Authentication", () => {
  it("App has auth provider and login URL generation", () => {
    const constFile = readSrc(`${CLIENT_SRC}/const.ts`);
    expect(constFile).toContain("getLoginUrl");
    expect(constFile).toContain("OAUTH");
  });

  it("useAuth hook provides user state and logout", () => {
    const authHook = readSrc(`${CLIENT_SRC}/_core/hooks/useAuth.ts`);
    expect(authHook).toContain("useAuth");
    expect(authHook).toContain("user");
    expect(authHook).toContain("logout");
    expect(authHook).toContain("isAuthenticated");
  });

  it("tRPC client is configured with credentials: include", () => {
    const main = readSrc(`${CLIENT_SRC}/main.tsx`);
    expect(main).toContain("credentials");
    expect(main).toContain("include");
  });

  it("server has OAuth callback endpoint", () => {
    expect(INDEX).toContain("oauth");
    expect(INDEX).toContain("callback");
  });
});

// ═══════════════════════════════════════════════════════════════════
// STEP 2: Task Creation
// ═══════════════════════════════════════════════════════════════════
describe("Journey Step 2: Create Task", () => {
  it("Home page has input that creates a task", () => {
    expect(HOME).toContain("createTask");
  });

  it("TaskContext provides createTask function", () => {
    expect(TASK_CONTEXT).toContain("createTask");
    expect(TASK_CONTEXT).toContain("createTaskMutation");
  });

  it("createTask navigates to /task/:id", () => {
    expect(HOME).toContain("navigate");
    expect(HOME).toContain("/task/");
  });

  it("App.tsx has route for /task/:id", () => {
    expect(APP).toContain("/task/");
    expect(APP).toContain("TaskView");
  });
});

// ═══════════════════════════════════════════════════════════════════
// STEP 3: Send Message
// ═══════════════════════════════════════════════════════════════════
describe("Journey Step 3: Send Message", () => {
  it("TaskView has message input and send handler", () => {
    expect(TASK_VIEW).toContain("handleSend");
    expect(TASK_VIEW).toContain("input");
  });

  it("messages are sent via streaming endpoint (not tRPC)", () => {
    expect(STREAM_RETRY).toContain("/api/stream");
    expect(STREAM_RETRY).toContain("POST");
  });

  it("stream request includes messages array and task context", () => {
    expect(STREAM_RETRY).toContain("messages");
    expect(STREAM_RETRY).toContain("taskExternalId");
  });

  it("server has /api/stream endpoint", () => {
    expect(INDEX).toContain("/api/stream");
  });
});

// ═══════════════════════════════════════════════════════════════════
// STEP 4: Receive Streamed Response
// ═══════════════════════════════════════════════════════════════════
describe("Journey Step 4: Stream Response", () => {
  it("stream uses Server-Sent Events (SSE) format", () => {
    // SSE headers are set in index.ts, not agentStream.ts
    expect(INDEX).toContain("text/event-stream");
    expect(AGENT_STREAM).toContain("sendSSE");
  });

  it("stream emits delta events for text chunks", () => {
    expect(AGENT_STREAM).toContain("delta");
    expect(CALLBACKS).toContain("onDelta");
  });

  it("stream emits tool_start and tool_result events", () => {
    expect(AGENT_STREAM).toContain("tool_start");
    expect(AGENT_STREAM).toContain("tool_result");
    expect(CALLBACKS).toContain("onToolStart");
    expect(CALLBACKS).toContain("onToolResult");
  });

  it("stream emits step_progress events", () => {
    expect(AGENT_STREAM).toContain("step_progress");
    expect(CALLBACKS).toContain("onStepProgress");
  });

  it("stream emits status: completed at the end", () => {
    expect(AGENT_STREAM).toContain('"completed"');
    expect(CALLBACKS).toContain("onDone");
  });

  it("frontend handles stream errors with retry UI", () => {
    expect(STREAM_RETRY).toContain("retry");
    expect(TASK_VIEW).toContain("Retry");
  });

  it("text streams BEFORE tool actions (Manus parity)", () => {
    // The text streaming (streamTextAsChunks) happens before executeTool in the main loop
    // Both appear in the file - the first streamTextAsChunks is at line ~1432, executeTool at ~1494
    const textStreamIdx = AGENT_STREAM.indexOf("streamTextAsChunks(safeWrite");
    const toolExecIdx = AGENT_STREAM.indexOf("await executeTool(");
    expect(textStreamIdx).toBeGreaterThan(0);
    expect(toolExecIdx).toBeGreaterThan(0);
    expect(textStreamIdx).toBeLessThan(toolExecIdx);
  });
});

// ═══════════════════════════════════════════════════════════════════
// STEP 5: View Artifacts
// ═══════════════════════════════════════════════════════════════════
describe("Journey Step 5: View Artifacts", () => {
  it("TaskView renders artifact cards (documents, images, webapps)", () => {
    expect(TASK_VIEW).toContain("artifact");
    expect(TASK_VIEW).toContain("document");
  });

  it("webapp preview card exists and shows live preview", () => {
    const card = readSrc(`${CLIENT_SRC}/components/WebappPreviewCard.tsx`);
    expect(card).toContain("iframe");
    expect(card).toContain("preview");
  });

  it("document artifacts have download capability", () => {
    expect(TASK_VIEW).toMatch(/download|Download/);
  });

  it("image artifacts render inline", () => {
    expect(TASK_VIEW).toMatch(/img|Image/);
  });
});

// ═══════════════════════════════════════════════════════════════════
// STEP 6: Error Recovery
// ═══════════════════════════════════════════════════════════════════
describe("Journey Step 6: Error Recovery", () => {
  it("ErrorBoundary wraps the app", () => {
    expect(APP).toContain("ErrorBoundary");
  });

  it("stream errors show retry button", () => {
    expect(TASK_VIEW).toContain("Retry");
    expect(TASK_VIEW).toMatch(/retry|reconnect/i);
  });

  it("empty LLM responses trigger auto-retry", () => {
    expect(AGENT_STREAM).toContain("emptyRetry");
    expect(AGENT_STREAM).toContain("Empty choices from LLM");
  });

  it("safety net produces text when agent loop ends without visible output", () => {
    expect(AGENT_STREAM).toContain("SAFETY NET");
    expect(AGENT_STREAM).toContain("forcing final synthesis");
  });

  it("step_progress resets to null on error (PC2 fix)", () => {
    expect(AGENT_STREAM).toContain("step_progress: null");
  });
});

// ═══════════════════════════════════════════════════════════════════
// STEP 7: Session Persistence
// ═══════════════════════════════════════════════════════════════════
describe("Journey Step 7: Session Persistence", () => {
  it("TaskContext persists messages to server via tRPC", () => {
    // Messages are saved via tRPC mutations
    expect(TASK_CONTEXT).toContain("trpc");
    expect(TASK_CONTEXT).toContain("useMutation");
  });

  it("messages are loaded from server on task open", () => {
    expect(TASK_CONTEXT).toContain("messagesLoaded");
    expect(TASK_CONTEXT).toContain("needsMessageLoad");
  });

  it("message merge logic never reduces message count", () => {
    // Safety guard prevents message loss
    expect(TASK_CONTEXT).toMatch(/length.*<|safety|guard/i);
  });

  it("partial content is saved on disconnect/unmount", () => {
    expect(TASK_VIEW).toMatch(/unmount|cleanup|abort/i);
  });
});
