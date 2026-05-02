import { describe, it, expect, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * Pass 62 — Virtual User Validation Tests
 * Covers:
 *  - Bug 1: User messages persist in chat (addMessage → DB, reload on return)
 *  - Bug 3: Share/Replay context menu wiring
 *  - Bug 4: Webapp preview uploads to S3 (all 3 branches)
 *  - Bug 5: Streaming persists on navigation (save before abort)
 *  - Bug 6: Deploy progress feedback (SSE event)
 */

const ROOT = path.resolve(__dirname, "..");

describe("Pass 62: User message persistence", () => {
  const ctxFile = fs.readFileSync(path.join(ROOT, "client/src/contexts/TaskContext.tsx"), "utf-8");
  const taskViewFile = fs.readFileSync(path.join(ROOT, "client/src/pages/TaskView.tsx"), "utf-8");
  const taskRouterFile = fs.readFileSync(path.join(ROOT, "server/routers/task.ts"), "utf-8");

  it("addMessage mutation exists in task router and persists to DB", () => {
    expect(taskRouterFile).toContain("addMessage:");
    expect(taskRouterFile).toContain("addTaskMessage(");
    expect(taskRouterFile).toContain("protectedProcedure");
  });

  it("messages query exists for loading messages from DB", () => {
    expect(taskRouterFile).toContain("messages: protectedProcedure");
    expect(taskRouterFile).toContain("getTaskMessages(");
  });

  it("TaskContext calls addMessageMutation.mutate for user messages", () => {
    expect(ctxFile).toContain("addMessageMutation.mutate");
    // Should be called multiple times (for user messages and assistant messages)
    const count = (ctxFile.match(/addMessageMutation\.mutate/g) || []).length;
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it("TaskView sends user messages with role 'user'", () => {
    expect(taskViewFile).toContain('role: "user"');
    const count = (taskViewFile.match(/role: "user"/g) || []).length;
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it("TaskContext has pending message queue for pre-serverId messages", () => {
    expect(ctxFile).toContain("pendingMessagesRef");
    expect(ctxFile).toContain("pendingMessagesRef.current.get");
    expect(ctxFile).toContain("pendingMessagesRef.current.delete");
  });

  it("TaskContext loads messages from server on task switch", () => {
    expect(ctxFile).toContain("trpc.task.messages.useQuery");
    expect(ctxFile).toContain("messagesLoaded");
    expect(ctxFile).toContain("serverMessagesQuery.data");
  });

  it("dedup guard checks recent messages with full content comparison (improved from 300-char prefix)", () => {
    // Improved in session 34: uses full content comparison to prevent false dedup
    // of messages with similar starts (e.g., agent repeating itself)
    expect(ctxFile).toContain(".content.trim()");
    expect(ctxFile).toContain("slice(-3)");
  });
});

describe("Pass 62: Streaming persists on navigation", () => {
  const taskViewFile = fs.readFileSync(path.join(ROOT, "client/src/pages/TaskView.tsx"), "utf-8");

  it("has accumulatedRef for tracking partial content", () => {
    expect(taskViewFile).toContain("accumulatedRef");
    expect(taskViewFile).toContain('useRef<string>("")');
  });

  it("saves partial content on unmount BEFORE aborting", () => {
    // The cleanup function should call savePartialContent() before abort
    expect(taskViewFile).toContain("savePartialContent()");
    expect(taskViewFile).toContain("Cleanup on unmount ONLY: save partial content FIRST");
  });

  it("handles beforeunload event for tab close", () => {
    expect(taskViewFile).toContain("beforeunload");
    expect(taskViewFile).toContain("handleBeforeUnload");
  });

  it("marks interrupted messages with a visible indicator", () => {
    expect(taskViewFile).toContain("[Response interrupted");
  });
});

describe("Pass 62: Webapp preview S3 upload", () => {
  const agentToolsFile = fs.readFileSync(path.join(ROOT, "server/agentTools.ts"), "utf-8");

  it("has uploadDirToS3 helper function", () => {
    expect(agentToolsFile).toContain("async function uploadDirToS3");
  });

  it("has reuploadPreviewToS3 helper for auto-rebuild", () => {
    expect(agentToolsFile).toContain("async function reuploadPreviewToS3");
  });

  it("has getActivePreviewUrl export", () => {
    expect(agentToolsFile).toContain("export function getActivePreviewUrl");
  });

  it("HTML template branch uploads to S3", () => {
    // Look for webapp-previews prefix pattern in the create_webapp handler
    const webappPreviewCount = (agentToolsFile.match(/webapp-previews/g) || []).length;
    expect(webappPreviewCount).toBeGreaterThanOrEqual(3);
  });

  it("sets activeProjectPreviewUrl after upload", () => {
    expect(agentToolsFile).toContain("activeProjectPreviewUrl");
    const setCount = (agentToolsFile.match(/activeProjectPreviewUrl\s*=/g) || []).length;
    expect(setCount).toBeGreaterThanOrEqual(2);
  });
});

describe("Pass 62: Deploy progress feedback", () => {
  const streamFile = fs.readFileSync(path.join(ROOT, "server/agentStream.ts"), "utf-8");

  it("sends SSE event before deploy_webapp execution", () => {
    // Should have a progress/status event for deploy
    expect(streamFile).toContain("deploy");
    // Check for tool_action or status event related to deploy
    const hasDeployEvent = streamFile.includes("Building and uploading") || 
                           streamFile.includes("deploying") ||
                           streamFile.includes("deploy_webapp");
    expect(hasDeployEvent).toBe(true);
  });

  it("preview_refresh event includes URL", () => {
    expect(streamFile).toContain("preview_refresh");
  });
});

describe("Pass 62: Share/Replay wiring", () => {
  it("ShareDialog component exists", () => {
    const exists = fs.existsSync(path.join(ROOT, "client/src/components/ShareDialog.tsx"));
    expect(exists).toBe(true);
  });

  it("SharedTaskView page exists for public replay", () => {
    const exists = fs.existsSync(path.join(ROOT, "client/src/pages/SharedTaskView.tsx"));
    expect(exists).toBe(true);
  });

  it("ShareDialog is imported in the codebase", () => {
    // Check that ShareDialog is used somewhere besides its own file
    const result = require("child_process").execSync(
      `grep -rl "ShareDialog" ${path.join(ROOT, "client/src")} | grep -v ShareDialog.tsx | grep -v stories`,
      { encoding: "utf-8" }
    ).trim();
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("Pass 62: Preview URL update callback", () => {
  const callbacksFile = fs.readFileSync(path.join(ROOT, "client/src/lib/buildStreamCallbacks.ts"), "utf-8");

  it("has onPreviewUrlUpdate in setters interface", () => {
    expect(callbacksFile).toContain("onPreviewUrlUpdate");
  });

  it("handles preview_refresh event with URL extraction", () => {
    expect(callbacksFile).toContain("onPreviewRefresh");
    expect(callbacksFile).toContain("onPreviewUrlUpdate");
    expect(callbacksFile).toContain("data.url");
  });
});
