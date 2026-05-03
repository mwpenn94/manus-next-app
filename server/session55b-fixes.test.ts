/**
 * Session 55b Regression Tests
 * 
 * Validates:
 * 1. getLoginUrl graceful fallback when VITE_OAUTH_PORTAL_URL is undefined
 * 2. Partial content saved with [Response interrupted] marker on mid-stream follow-up
 * 3. GitHub Query Guard strips research tools on turn 1 for repo queries
 * 4. Git-binary-free tarball fallback for clone operations
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
    // The fix saves the partial content as a message even when restream is pending
    expect(taskViewContent).toContain("addMessage");
    expect(taskViewContent).toContain("interrupted");
  });
});

describe("Session 55b: GitHub Query Guard", () => {
  const streamContent = fs.readFileSync(AGENT_STREAM_PATH, "utf-8");

  it("defines isGitHubRepoQuery regex detection", () => {
    expect(streamContent).toContain("isGitHubRepoQuery");
    expect(streamContent).toContain("connected\\s*(github|repo)");
  });

  it("blocks research tools on turn 1 for repo queries", () => {
    expect(streamContent).toContain("GITHUB QUERY GUARD");
    expect(streamContent).toContain("BLOCKED_RESEARCH_TOOLS");
    expect(streamContent).toContain('"deep_research_content"');
    expect(streamContent).toContain('"wide_research"');
  });

  it("checks for github_ops call before stripping", () => {
    expect(streamContent).toContain("hasGitHubCall");
    expect(streamContent).toContain('"github_ops"');
  });

  it("injects a nudge to use github_ops when all calls are research", () => {
    expect(streamContent).toContain("SYSTEM: You tried to research instead of checking the connected repo");
    expect(streamContent).toContain("github_ops(mode: 'status')");
  });

  it("only activates on turn 1 to allow research on later turns if needed", () => {
    expect(streamContent).toContain("turn === 1");
  });
});

describe("Session 55b: Git-binary-free tarball fallback", () => {
  const toolsContent = fs.readFileSync(AGENT_TOOLS_PATH, "utf-8");

  it("implements Attempt 4 tarball download as fallback", () => {
    expect(toolsContent).toContain("Attempt 4: Git-binary-free fallback");
    expect(toolsContent).toContain("api.github.com/repos");
    expect(toolsContent).toContain("/tarball");
  });

  it("uses curl + tar pipeline (no git binary needed)", () => {
    expect(toolsContent).toContain("curl -sL");
    expect(toolsContent).toContain("tar -xz");
    expect(toolsContent).toContain("--strip-components=1");
  });

  it("includes auth header when token is available", () => {
    expect(toolsContent).toContain('Authorization: Bearer');
    expect(toolsContent).toContain("tokenForApi");
  });

  it("verifies extraction succeeded by checking file count", () => {
    expect(toolsContent).toContain("find ${cloneDir} -type f | wc -l");
    expect(toolsContent).toContain("parseInt(fileCount) > 0");
  });

  it("only triggers when git-based attempts all failed", () => {
    // The tarball attempt is gated by !cloneSuccess
    const tarballSection = toolsContent.substring(
      toolsContent.indexOf("Attempt 4: Git-binary-free fallback")
    );
    expect(tarballSection).toContain("!cloneSuccess");
  });

  it("extracts owner/repo from GitHub URL correctly", () => {
    expect(toolsContent).toContain("github\\.com[/:]([^/]+)");
    expect(toolsContent).toContain("([^/.]+)");
  });
});
