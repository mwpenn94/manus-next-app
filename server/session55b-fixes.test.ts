/**
 * Session 55b Regression Tests
 * 
 * Validates:
 * 1. getLoginUrl graceful fallback when VITE_OAUTH_PORTAL_URL is undefined
 * 2. Partial content saved with [Response interrupted] marker on mid-stream follow-up
 * 3. GitHub Query Guard blocks research tools until github_ops has been called (multi-turn)
 * 4. Pure Node.js tarball fallback for clone operations (no git/curl/tar binaries)
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const CONST_PATH = path.resolve(__dirname, "../client/src/const.ts");
const TASK_VIEW_PATH = path.resolve(__dirname, "../client/src/pages/TaskView.tsx");
const AGENT_STREAM_PATH = path.resolve(__dirname, "agentStream.ts");
const AGENT_TOOLS_PATH = path.resolve(__dirname, "agentTools.ts");

describe("Session 55b: getLoginUrl graceful fallback", () => {
  const constContent = fs.readFileSync(CONST_PATH, "utf-8");

  it("checks for undefined VITE_OAUTH_PORTAL_URL before constructing URL", () => {
    expect(constContent).toContain('!oauthPortalUrl || oauthPortalUrl === "undefined"');
  });

  it("returns a fallback URL instead of throwing when env is missing", () => {
    expect(constContent).toContain("window.location.origin");
    expect(constContent).toContain("/api/oauth/callback");
  });

  it("wraps new URL() in try-catch as defense in depth", () => {
    expect(constContent).toContain("try {");
    expect(constContent).toContain("new URL(`${oauthPortalUrl}/app-auth`)");
    expect(constContent).toContain("} catch (e)");
  });

  it("logs a warning when falling back", () => {
    expect(constContent).toContain("[getLoginUrl] VITE_OAUTH_PORTAL_URL is not configured");
  });
});

describe("Session 55b: Partial content preserved on mid-stream follow-up", () => {
  const taskViewContent = fs.readFileSync(TASK_VIEW_PATH, "utf-8");

  it("saves partial content with [Response interrupted] marker when pendingRestream is true", () => {
    expect(taskViewContent).toContain("[Response interrupted");
    expect(taskViewContent).toContain("pendingRestreamRef.current");
  });

  it("adds interrupted message to task messages so it remains visible in UI", () => {
    expect(taskViewContent).toContain("addMessage");
    expect(taskViewContent).toContain("interrupted");
  });
});

describe("Session 55b: GitHub Query Guard (multi-turn)", () => {
  const streamContent = fs.readFileSync(AGENT_STREAM_PATH, "utf-8");

  it("defines isGitHubRepoQuery regex detection", () => {
    expect(streamContent).toContain("isGitHubRepoQuery");
    expect(streamContent).toContain("connected\\s*(github|repo)");
  });

  it("tracks whether github_ops has been called via githubOpsCompleted", () => {
    expect(streamContent).toContain("let githubOpsCompleted = false");
    expect(streamContent).toContain("githubOpsCompleted = true");
  });

  it("blocks research tools on ALL turns until github_ops runs (not just turn 1)", () => {
    expect(streamContent).toContain("GITHUB QUERY GUARD");
    expect(streamContent).toContain("!githubOpsCompleted");
    // Must NOT be limited to turn === 1
    const guardSection = streamContent.substring(
      streamContent.indexOf("GITHUB QUERY GUARD: Block research"),
      streamContent.indexOf("GITHUB QUERY GUARD: Block research") + 500
    );
    expect(guardSection).not.toContain("turn === 1");
  });

  it("blocks deep_research_content, wide_research, web_search, read_webpage", () => {
    expect(streamContent).toContain("BLOCKED_RESEARCH_TOOLS");
    expect(streamContent).toContain('"deep_research_content"');
    expect(streamContent).toContain('"wide_research"');
    expect(streamContent).toContain('"web_search"');
    expect(streamContent).toContain('"read_webpage"');
  });

  it("deactivates guard once github_ops is detected", () => {
    expect(streamContent).toContain("github_ops detected on turn");
    expect(streamContent).toContain("guard will deactivate");
  });

  it("injects SYSTEM ENFORCEMENT message when all calls are research", () => {
    expect(streamContent).toContain("SYSTEM ENFORCEMENT: Research tools are BLOCKED");
    expect(streamContent).toContain("github_ops(mode: 'status')");
  });
});

describe("Session 55b: Pure Node.js tarball fallback (no binaries)", () => {
  const toolsContent = fs.readFileSync(AGENT_TOOLS_PATH, "utf-8");

  it("implements Attempt 4 as pure Node.js (no git/curl/tar binaries)", () => {
    expect(toolsContent).toContain("Attempt 4: PURE NODE.JS clone fallback");
    expect(toolsContent).toContain("api.github.com/repos");
    expect(toolsContent).toContain("/tarball");
  });

  it("uses Node.js built-in fetch for download", () => {
    expect(toolsContent).toContain("await fetch(tarballUrl");
    expect(toolsContent).toContain("await response.arrayBuffer()");
  });

  it("uses Node.js built-in zlib for decompression", () => {
    expect(toolsContent).toContain("zlib.gunzipSync");
  });

  it("parses tar format manually with 512-byte blocks", () => {
    expect(toolsContent).toContain("BLOCK_SIZE = 512");
    expect(toolsContent).toContain("typeFlag");
    expect(toolsContent).toContain("parseInt(sizeStr, 8)");
  });

  it("handles GNU long name extension (type L)", () => {
    expect(toolsContent).toContain('typeFlag === "L"');
    expect(toolsContent).toContain("longName");
  });

  it("strips first path component (GitHub's owner-repo-hash prefix)", () => {
    expect(toolsContent).toContain("parts.slice(1).join");
  });

  it("includes auth header when token is available", () => {
    expect(toolsContent).toContain("Authorization");
    expect(toolsContent).toContain("Bearer");
    expect(toolsContent).toContain("tokenForApi");
  });

  it("verifies extraction succeeded by checking file count", () => {
    expect(toolsContent).toContain("fileCount > 0");
    expect(toolsContent).toContain("Pure Node.js clone succeeded");
  });

  it("only triggers when git-based attempts all failed", () => {
    const tarballSection = toolsContent.substring(
      toolsContent.indexOf("Attempt 4: PURE NODE.JS")
    );
    expect(tarballSection).toContain("!cloneSuccess");
  });

  it("extracts owner/repo from GitHub URL correctly", () => {
    expect(toolsContent).toContain("github\\.com[/:]([^/]+)");
    expect(toolsContent).toContain("([^/.]+)");
  });
});
