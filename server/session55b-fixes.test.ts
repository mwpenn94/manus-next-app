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

describe("Session 55b: GitHub Query Guard REMOVED (replaced by intent-based routing)", () => {
  const streamContent = fs.readFileSync(AGENT_STREAM_PATH, "utf-8");

  it("isGitHubRepoQuery variable no longer exists", () => {
    expect(streamContent).not.toContain("const isGitHubRepoQuery");
    expect(streamContent).not.toContain("let isGitHubRepoQuery");
  });

  it("guard enforcement logic is gone", () => {
    expect(streamContent).not.toContain("SYSTEM ENFORCEMENT: Research tools are PERMANENTLY BLOCKED");
    expect(streamContent).not.toContain("research is NEVER allowed for repo queries");
  });

  it("system prompt still has READ vs BUILD intent routing for GitHub queries", () => {
    expect(streamContent).toContain("READ intents");
    expect(streamContent).toContain("BUILD intents");
    expect(streamContent).toContain("github_ops");
    expect(streamContent).toContain("github_assess");
  });

  it("removal comment explains the rationale", () => {
    expect(streamContent).toContain("GitHub Query Guard was removed");
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
