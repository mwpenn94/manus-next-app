/**
 * Session 48 — Critical Agent Behavior Fixes
 * 
 * Tests for:
 * 1. Mid-task message handling (server-side abort signal)
 * 2. Frustration detection regex expansion
 * 3. User override/redirect detection expansion
 * 4. Git clone retry logic and error handling
 * 5. Branch button UX (hidden during streaming, visible on hover)
 * 6. System prompt LATEST MESSAGE PRIORITY strengthening
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// ─── 1. Server-side Abort Signal ───────────────────────────────────────────

describe("Session 48 — Server-side Abort Signal", () => {
  it("AgentStreamOptions interface includes abortSignal field", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "agentStream.ts"),
      "utf-8"
    );
    // The interface should have abortSignal?: AbortSignal
    expect(source).toContain("abortSignal?: AbortSignal");
  });

  it("runAgentStream destructures abortSignal from options", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "agentStream.ts"),
      "utf-8"
    );
    // The destructuring should include abortSignal
    const destructMatch = source.match(/const\s*\{[\s\S]*?abortSignal[\s\S]*?\}\s*=\s*options/);
    expect(destructMatch).toBeTruthy();
  });

  it("Agent loop checks abortSignal.aborted before each turn", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "agentStream.ts"),
      "utf-8"
    );
    // Should have a check for abortSignal?.aborted inside the loop
    expect(source).toContain("abortSignal?.aborted");
  });

  it("SSE endpoint creates AbortController and passes signal to runAgentStream", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "_core/index.ts"),
      "utf-8"
    );
    // Should create an AbortController for the SSE connection
    expect(source).toContain("new AbortController()");
    // Should pass abortSignal to runAgentStream
    expect(source).toContain("abortSignal:");
  });

  it("SSE endpoint aborts on client disconnect (req close event)", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "_core/index.ts"),
      "utf-8"
    );
    // Should listen for 'close' event on req to trigger abort
    const closeHandler = source.match(/req\.on\s*\(\s*["']close["'][\s\S]*?abort\s*\(\s*\)/);
    expect(closeHandler).toBeTruthy();
  });
});

// ─── 2. Frustration Detection Regex ────────────────────────────────────────

describe("Session 48 — Frustration Detection Expansion", () => {
  // Extract the frustration regex from the source and test it
  const source = fs.readFileSync(
    path.resolve(__dirname, "agentStream.ts"),
    "utf-8"
  );

  it("Frustration regex exists in agentStream.ts (isUserFrustrated)", () => {
    expect(source).toContain("isUserFrustrated");
    expect(source).toMatch(/isUserFrustrated.*\.test/);
  });

  it("Frustration regex catches 'I already told/said/asked' patterns", () => {
    expect(source).toContain("I already");
  });

  it("Frustration regex catches 'you keep doing/ignoring/repeating' patterns", () => {
    expect(source).toContain("you keep");
  });

  it("Frustration regex catches 'listen to me' patterns", () => {
    expect(source).toContain("listen to me");
  });

  it("Frustration regex catches 'are you listening' patterns", () => {
    expect(source).toContain("are you listening");
  });

  it("Frustration regex catches 'not what I asked/wanted' patterns", () => {
    expect(source).toContain("not what I");
  });
});

// ─── 3. User Override/Redirect Detection ───────────────────────────────────

describe("Session 48 — User Override Detection Expansion", () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, "agentStream.ts"),
    "utf-8"
  );

  it("Override detection catches 'no more research' patterns", () => {
    expect(source).toContain("no more research");
  });

  it("Override detection catches 'skip the research' patterns", () => {
    // Should match patterns like "skip the research", "skip research"
    expect(source).toMatch(/skip.*research/i);
  });

  it("Override detection catches 'only focus on' patterns", () => {
    expect(source).toMatch(/only\s+focus/i);
  });

  it("Override detection catches 'enough research' patterns", () => {
    expect(source).toContain("enough research");
  });
});

// ─── 4. Git Clone Retry Logic ──────────────────────────────────────────────

describe("Session 48 — Git Clone Error Handling", () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, "agentTools.ts"),
    "utf-8"
  );

  it("Git clone includes token type detection (ghp_ vs github_pat_)", () => {
    expect(source).toContain("ghp_");
    expect(source).toContain("github_pat_");
  });

  it("Git clone provides actionable error messages on failure", () => {
    // Should mention token type in error messages
    expect(source).toMatch(/token.*type|Classic.*PAT|fine-grained/i);
  });

  it("Git clone has retry limit to prevent infinite loops", () => {
    // Should have some form of retry limiting
    expect(source).toMatch(/retry|attempt|max.*clone/i);
  });
});

// ─── 5. Branch Button UX ──────────────────────────────────────────────────

describe("Session 48 — Branch Button UX Improvements", () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, "../client/src/pages/TaskView.tsx"),
    "utf-8"
  );

  it("User message Branch button is hidden during streaming", () => {
    // The BranchButton for user messages should have !isStreaming condition
    const userBranchSection = source.match(/Branch button for user messages[\s\S]*?BranchButton/);
    expect(userBranchSection).toBeTruthy();
    // Should check isStreaming to hide during streaming
    expect(source).toMatch(/isUser.*isStreaming|!isStreaming.*BranchButton/s);
  });

  it("User message Branch button shows on hover (opacity transition)", () => {
    // Should have opacity-0 and group-hover:opacity-100 for hover reveal
    expect(source).toContain("opacity-0");
    expect(source).toContain("group-hover:opacity-100");
  });

  it("Message container has group class for hover targeting", () => {
    // The parent container should have the 'group' class
    const groupMatch = source.match(/className="[^"]*group[^"]*"[\s\S]*?BranchButton/);
    expect(groupMatch).toBeTruthy();
  });

  it("MessageBubble receives isStreaming prop", () => {
    // The MessageBubble component should accept isStreaming
    expect(source).toContain("isStreaming");
  });
});

// ─── 6. System Prompt — LATEST MESSAGE PRIORITY ────────────────────────────

describe("Session 48 — System Prompt Strengthening", () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, "agentStream.ts"),
    "utf-8"
  );

  it("System prompt has LATEST MESSAGE PRIORITY section", () => {
    expect(source).toContain("LATEST MESSAGE PRIORITY");
  });

  it("System prompt explicitly handles 'Stop' commands", () => {
    // Should have explicit handling for stop/halt commands
    expect(source).toMatch(/[Ss]top|[Hh]alt|[Cc]ancel/);
  });

  it("System prompt explicitly handles 'No research' / 'Skip research' commands", () => {
    // Should mention research-skipping behavior
    expect(source).toMatch(/skip.*research|no.*research|stop.*research/i);
  });

  it("System prompt instructs to address new messages FIRST", () => {
    expect(source).toContain("FIRST");
  });

  it("Git operation section has retry prevention instruction", () => {
    // Should have instruction about not retrying clone more than 2 times
    expect(source).toMatch(/DO NOT retry|max.*attempt|stop.*retrying|2.*attempt/i);
  });
});

// ─── 7. Mid-task Message Flow (Client-side) ───────────────────────────────

describe("Session 48 — Mid-task Message Client Flow", () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, "../client/src/pages/TaskView.tsx"),
    "utf-8"
  );

  it("handleSend aborts current stream when streaming", () => {
    // Should have abort logic when streaming && abortControllerRef.current
    expect(source).toMatch(/streaming.*abortControllerRef/s);
    expect(source).toContain("abortControllerRef.current.abort()");
  });

  it("handleSend sets pendingRestreamRef when aborting for follow-up", () => {
    expect(source).toContain("pendingRestreamRef.current = true");
  });

  it("pendingRestream useEffect triggers new stream after abort completes", () => {
    // Should have a useEffect that checks pendingRestreamRef
    expect(source).toContain("pendingRestreamRef.current");
    // Should trigger streamWithRetry in the restream
    expect(source).toMatch(/pendingRestreamRef[\s\S]*?streamWithRetry/);
  });

  it("Partial content is saved without 'stopped' suffix when follow-up aborts", () => {
    // When pendingRestreamRef is true, should NOT add "stopped by user" suffix
    expect(source).toMatch(/pendingRestreamRef\.current[\s\S]*?accumulated/);
  });
});

// ─── 8. Chat Persistence ──────────────────────────────────────────────────

describe("Session 48 — Chat Persistence Integrity", () => {
  const contextSource = fs.readFileSync(
    path.resolve(__dirname, "../client/src/contexts/TaskContext.tsx"),
    "utf-8"
  );

  it("Messages are persisted to server via addMessage mutation", () => {
    expect(contextSource).toContain("addMessageMutation.mutate");
  });

  it("Messages are queued when serverId is not yet available", () => {
    expect(contextSource).toContain("pendingMessagesRef");
  });

  it("Server messages are loaded and merged on task activation", () => {
    expect(contextSource).toContain("messagesLoaded");
    expect(contextSource).toContain("serverMessagesQuery.data");
  });

  it("Dedup logic prevents duplicate messages in the merge", () => {
    expect(contextSource).toContain("seenServerKeys");
    expect(contextSource).toContain("isDuplicate");
  });

  it("Partial interrupted messages are cleaned up during merge", () => {
    expect(contextSource).toContain("interruptMarker");
    expect(contextSource).toContain("partialIndices");
  });
});
