/**
 * Test: GitHub Query Guard has been REMOVED
 *
 * The GitHub Query Guard was an anti-pattern that arbitrarily blocked tool calls
 * (web_search, read_webpage, wide_research, deep_research_content) whenever the
 * user's prompt mentioned their connected repo. This caused:
 * - Death loops when combined with demonstration mode
 * - Early termination on complex multi-intent prompts
 * - Arbitrary restriction of agent capabilities
 *
 * The system prompt already has proper READ vs BUILD intent routing (lines 270-310)
 * that guides the LLM to use github_ops/github_assess for repo queries. The LLM
 * is trusted to follow these instructions without a blunt-force tool-blocking guard.
 *
 * If the LLM occasionally calls web_search for a repo query, it will self-correct
 * from irrelevant results — which is far better than killing tool calls.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const agentStreamSource = readFileSync(
  resolve(__dirname, "agentStream.ts"),
  "utf-8"
);

describe("GitHub Query Guard removal verification", () => {
  it("isGitHubRepoQuery variable no longer exists in agentStream", () => {
    expect(agentStreamSource).not.toContain("const isGitHubRepoQuery");
    expect(agentStreamSource).not.toContain("let isGitHubRepoQuery");
  });

  it("githubGuardBlocks counter no longer exists", () => {
    expect(agentStreamSource).not.toContain("githubGuardBlocks");
  });

  it("githubOpsCompleted tracker no longer exists", () => {
    expect(agentStreamSource).not.toContain("githubOpsCompleted");
  });

  it("GITHUB QUERY GUARD enforcement block is gone", () => {
    expect(agentStreamSource).not.toContain("SYSTEM ENFORCEMENT: Research tools are PERMANENTLY BLOCKED");
    expect(agentStreamSource).not.toContain("research is NEVER allowed for repo queries");
  });

  it("no tool-blocking logic for research tools based on repo detection", () => {
    // The old guard had a BLOCKED_RESEARCH_TOOLS array specifically for repo queries
    expect(agentStreamSource).not.toContain(
      'BLOCKED_RESEARCH_TOOLS = ["deep_research_content", "wide_research", "web_search", "read_webpage"]'
    );
  });

  it("removal comment explains the rationale", () => {
    expect(agentStreamSource).toContain(
      "GitHub Query Guard was removed"
    );
    expect(agentStreamSource).toContain(
      "intent"
    );
  });

  it("system prompt still has READ vs BUILD intent routing for GitHub queries", () => {
    // The system prompt provides proper guidance without blocking tools
    expect(agentStreamSource).toContain("READ intents");
    expect(agentStreamSource).toContain("BUILD intents");
    expect(agentStreamSource).toContain("github_ops");
    expect(agentStreamSource).toContain("github_assess");
  });

  it("quality gate no longer references isGitHubRepoQuery", () => {
    // The quality gate at ~line 2573 should not have isGitHubRepoQuery
    const qualityGateArea = agentStreamSource.slice(
      agentStreamSource.indexOf("Quality gate: response too shallow") - 500,
      agentStreamSource.indexOf("Quality gate: response too shallow") + 100
    );
    expect(qualityGateArea).not.toContain("isGitHubRepoQuery");
  });

  it("depth gate no longer references isGitHubRepoQuery", () => {
    // The depth gate (shouldForceResearch) should not have isGitHubRepoQuery
    const depthGateArea = agentStreamSource.slice(
      agentStreamSource.indexOf("shouldForceResearch") - 100,
      agentStreamSource.indexOf("shouldForceResearch") + 500
    );
    expect(depthGateArea).not.toContain("isGitHubRepoQuery");
  });
});
