/**
 * content-reset.test.ts — Tests for the content_reset SSE event that prevents
 * duplicated/looping responses when continuation systems fire.
 *
 * Root cause: When continuation systems reset finalContent="" on the server,
 * the client's accumulated buffer still contained all previously streamed deltas,
 * causing visible duplication. The fix sends a content_reset SSE event before
 * each reset so the client clears its buffer in sync.
 *
 * Also tests that the persistence pipeline produces consistent content between
 * client (accumulated) and server (finalContent) after resets.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const AGENT_STREAM_PATH = path.resolve("server/agentStream.ts");
const STREAM_WITH_RETRY_PATH = path.resolve("client/src/lib/streamWithRetry.ts");
const BUILD_CALLBACKS_PATH = path.resolve("client/src/lib/buildStreamCallbacks.ts");

const agentStreamSrc = fs.readFileSync(AGENT_STREAM_PATH, "utf-8");
const streamWithRetrySrc = fs.readFileSync(STREAM_WITH_RETRY_PATH, "utf-8");
const buildCallbacksSrc = fs.readFileSync(BUILD_CALLBACKS_PATH, "utf-8");

describe("content_reset SSE event — server emission", () => {
  it("emits content_reset before EVERY post-streaming finalContent reset", () => {
    // Find all places where finalContent = "" is set
    const resetLines: number[] = [];
    const lines = agentStreamSrc.split("\n");
    lines.forEach((line, i) => {
      if (/finalContent\s*=\s*""/.test(line)) {
        resetLines.push(i + 1);
      }
    });
    // Should have at least 10 reset points (8 with content_reset + initial declaration + shouldNudge)
    expect(resetLines.length).toBeGreaterThanOrEqual(10);

    // For each reset AFTER text streaming (line ~1906+), verify content_reset is sent nearby
    // The initial declaration and shouldNudge are exempt (text not yet streamed)
    const postStreamingResets = resetLines.filter(lineNum => {
      const lineContent = lines[lineNum - 1];
      // Exempt: initial declaration (let finalContent = "")
      if (/let\s+finalContent\s*=\s*""/.test(lineContent)) return false;
      // Exempt: shouldNudge reset (before text streaming, ~line 1880 area)
      // Check a wider window (20 lines) for the nudge context
      const widerPrev = lines.slice(Math.max(0, lineNum - 20), lineNum + 5).join("\n");
      if (widerPrev.includes("Researching in more depth") && widerPrev.includes("shouldNudge")) return false;
      return true;
    });

    // Each post-streaming reset should have content_reset within 3 lines before it
    for (const lineNum of postStreamingResets) {
      const nearbyBefore = lines.slice(Math.max(0, lineNum - 4), lineNum).join("\n");
      expect(nearbyBefore).toContain("content_reset");
    }
  });

  it("sends content_reset as a proper SSE JSON payload", () => {
    // Verify the exact format: sendSSE(safeWrite, { content_reset: true })
    const contentResetCalls = agentStreamSrc.match(/sendSSE\(safeWrite,\s*\{\s*content_reset:\s*true\s*\}\)/g);
    expect(contentResetCalls).not.toBeNull();
    expect(contentResetCalls!.length).toBe(8); // Exactly 8 post-streaming reset points
  });

  it("anti-shallow MAX/LIMITLESS sends content_reset before Conducting deeper research", () => {
    const antiShallowSection = agentStreamSrc.match(
      /anti-shallow:[\s\S]{0,300}content_reset[\s\S]{0,200}Conducting deeper research/
    );
    expect(antiShallowSection).not.toBeNull();
  });

  it("anti-premature-completion sends content_reset before Producing the requested content", () => {
    const antiPrematureSection = agentStreamSrc.match(
      /Anti-premature-completion[\s\S]{0,300}content_reset[\s\S]{0,200}Producing the requested content/
    );
    expect(antiPrematureSection).not.toBeNull();
  });

  it("quality gate shallow sends content_reset before forcing elaboration", () => {
    const qualityGateSection = agentStreamSrc.match(
      /Quality gate: response too shallow[\s\S]{0,300}content_reset[\s\S]{0,200}finalContent\s*=\s*""/
    );
    expect(qualityGateSection).not.toBeNull();
  });

  it("first-turn apology interception sends content_reset", () => {
    const apologySection = agentStreamSrc.match(
      /First-turn apology interception[\s\S]{0,300}content_reset[\s\S]{0,200}finalContent\s*=\s*""/
    );
    expect(apologySection).not.toBeNull();
  });

  it("stuck detection sends content_reset before FINAL INSTRUCTION", () => {
    const stuckSection = agentStreamSrc.match(
      /content_reset[\s\S]{0,500}FINAL INSTRUCTION/
    );
    expect(stuckSection).not.toBeNull();
  });

  it("stuck correction strategy sends content_reset", () => {
    // The correction strategy reset should have content_reset nearby
    const correctionSection = agentStreamSrc.match(
      /content_reset[\s\S]{0,200}correctionStrategy/
    );
    expect(correctionSection).not.toBeNull();
  });

  it("generation nudge sends content_reset before Producing the requested output", () => {
    const genNudgeSection = agentStreamSrc.match(
      /generation request with 0 tool calls[\s\S]{0,300}content_reset[\s\S]{0,200}Producing the requested output/
    );
    expect(genNudgeSection).not.toBeNull();
  });

  it("quality gate acknowledgment sends content_reset", () => {
    const ackSection = agentStreamSrc.match(
      /Quality gate: response is just an acknowledgment[\s\S]{0,300}content_reset[\s\S]{0,200}finalContent\s*=\s*""/
    );
    expect(ackSection).not.toBeNull();
  });
});

describe("content_reset SSE event — client parser (streamWithRetry)", () => {
  it("defines onContentReset in StreamCallbacks interface", () => {
    expect(streamWithRetrySrc).toContain("onContentReset?: () => void");
  });

  it("dispatches content_reset events to onContentReset callback", () => {
    expect(streamWithRetrySrc).toContain("data.content_reset && callbacks.onContentReset");
  });

  it("has onContentReset documented with a JSDoc comment", () => {
    expect(streamWithRetrySrc).toMatch(/Content reset.*emitted when the server suppresses/);
  });
});

describe("content_reset SSE event — client handler (buildStreamCallbacks)", () => {
  it("implements onContentReset handler", () => {
    expect(buildCallbacksSrc).toContain("onContentReset:");
  });

  it("resets state.accumulated to empty string", () => {
    expect(buildCallbacksSrc).toMatch(/onContentReset[\s\S]{0,500}state\.accumulated\s*=\s*""/);
  });

  it("resets accumulatedRef.current to empty string", () => {
    expect(buildCallbacksSrc).toMatch(/onContentReset[\s\S]{0,500}accumulatedRef\.current\s*=\s*""/);
  });

  it("calls setStreamContent with empty string", () => {
    expect(buildCallbacksSrc).toMatch(/onContentReset[\s\S]{0,500}setStreamContent\(""\)/);
  });

  it("logs the reset with the previous buffer length", () => {
    expect(buildCallbacksSrc).toMatch(/Content reset.*clearing accumulated buffer/);
  });
});

describe("content_reset — persistence consistency", () => {
  it("server onComplete persists finalContent which matches client accumulated after reset", () => {
    // After content_reset, both server finalContent and client accumulated start fresh.
    // The server's onComplete callback persists finalContent:
    const onCompleteSection = fs.readFileSync(
      path.resolve("server/_core/index.ts"), "utf-8"
    );
    // Verify onComplete receives content (which is finalContent from agentStream)
    expect(onCompleteSection).toMatch(/onComplete:\s*async\s*\(content\)/);
    // Verify it persists to DB
    expect(onCompleteSection).toContain("addTaskMessage");
    // Verify it does dedup check
    expect(onCompleteSection).toContain("isDup");
  });

  it("client addMessage dedup uses full content comparison for short messages", () => {
    const taskContextSrc = fs.readFileSync(
      path.resolve("client/src/contexts/TaskContext.tsx"), "utf-8"
    );
    // The dedup guard should use full content comparison
    expect(taskContextSrc).toMatch(/existingContent === msgContent/);
    // And prefix match for short messages
    expect(taskContextSrc).toMatch(/existingContent\.slice\(0, 150\) === msgContent\.slice\(0, 150\)/);
  });

  it("server merge on reload deduplicates by role:content key", () => {
    const taskContextSrc = fs.readFileSync(
      path.resolve("client/src/contexts/TaskContext.tsx"), "utf-8"
    );
    // The merge logic uses role:content.trim() as the dedup key
    expect(taskContextSrc).toMatch(/\$\{m\.role\}:\$\{m\.content\.trim\(\)\}/);
  });
});

describe("content_reset — no regression on exempt reset points", () => {
  it("initial finalContent declaration does NOT have content_reset", () => {
    // The line "let finalContent = ''" should NOT have content_reset before it
    const initMatch = agentStreamSrc.match(/let finalContent\s*=\s*""/);
    expect(initMatch).not.toBeNull();
    const initIndex = agentStreamSrc.indexOf("let finalContent = \"\"");
    const nearbyBefore = agentStreamSrc.slice(Math.max(0, initIndex - 200), initIndex);
    expect(nearbyBefore).not.toContain("content_reset");
  });

  it("shouldNudge reset (before text streaming) does NOT have content_reset", () => {
    // The shouldNudge path resets finalContent before text is streamed,
    // so no content_reset is needed
    const nudgeSection = agentStreamSrc.match(
      /Researching in more depth[\s\S]{0,500}finalContent\s*=\s*""/
    );
    expect(nudgeSection).not.toBeNull();
    // The content between "Researching in more depth" and its finalContent="" should NOT have content_reset
    const nudgeText = nudgeSection![0];
    expect(nudgeText).not.toContain("content_reset");
  });
});
