/**
 * Session 55 Fixes — Regression Tests
 *
 * Validates three critical production bugs:
 * 1. Git clone looping: Agent retries clone 8+ times instead of stopping after 2
 * 2. Message history loss: onComplete safety net disabled due to taskServerId race
 * 3. Missing git in production: Dockerfile didn't install git in the production stage
 *
 * Root causes:
 * - Clone looping: No programmatic budget enforcement — relied on LLM obeying soft instructions
 * - Message loss: onComplete was `taskServerId ? handler : undefined` — null when task not yet in DB
 * - Missing git: Dockerfile only installed `tini` in production stage
 */
import { describe, it, expect } from "vitest";
import fs from "fs";

const agentStreamSrc = fs.readFileSync("server/agentStream.ts", "utf-8");
const indexSrc = fs.readFileSync("server/_core/index.ts", "utf-8");
const dockerfileSrc = fs.readFileSync("Dockerfile", "utf-8");

describe("Session 55: Clone Budget Enforcement", () => {
  it("declares a MAX_CLONE_ATTEMPTS constant", () => {
    expect(agentStreamSrc).toContain("MAX_CLONE_ATTEMPTS");
    // Should be set to 2
    expect(agentStreamSrc).toMatch(/MAX_CLONE_ATTEMPTS\s*=\s*2/);
  });

  it("declares cloneAttempts and cloneBudgetExhausted tracking variables", () => {
    expect(agentStreamSrc).toContain("let cloneAttempts = 0");
    expect(agentStreamSrc).toContain("let cloneBudgetExhausted = false");
  });

  it("blocks clone attempts when budget is exhausted (pre-execution check)", () => {
    // The code should check cloneBudgetExhausted BEFORE executing the tool
    expect(agentStreamSrc).toContain('if (cloneBudgetExhausted)');
    // And it should produce a BLOCKED message
    expect(agentStreamSrc).toContain("BLOCKED: git_operation(clone) has been disabled");
  });

  it("increments cloneAttempts when a clone is attempted", () => {
    expect(agentStreamSrc).toContain("cloneAttempts++");
  });

  it("marks budget as exhausted after MAX_CLONE_ATTEMPTS failures", () => {
    expect(agentStreamSrc).toContain("cloneBudgetExhausted = true");
    // Should check cloneAttempts >= MAX_CLONE_ATTEMPTS
    expect(agentStreamSrc).toMatch(/cloneAttempts\s*>=\s*MAX_CLONE_ATTEMPTS/);
  });

  it("injects a SYSTEM ENFORCEMENT message when budget is exhausted", () => {
    expect(agentStreamSrc).toContain("SYSTEM ENFORCEMENT: git_operation(clone) has now failed");
  });

  it("breaks the tool loop when clone budget is exhausted", () => {
    // After injecting the enforcement message, it should break the for loop
    // to force the LLM to respond to the user
    const budgetExhaustedSection = agentStreamSrc.slice(
      agentStreamSrc.indexOf("CLONE BUDGET EXHAUSTED"),
      agentStreamSrc.indexOf("CLONE BUDGET EXHAUSTED") + 1000
    );
    expect(budgetExhaustedSection).toContain("break;");
  });

  it("only checks clone budget for git_operation with operation=clone", () => {
    // Should specifically check for clone operation, not all git_operation calls
    expect(agentStreamSrc).toContain('tn === "git_operation" && pa.operation === "clone"');
  });
});

describe("Session 55: Message Persistence Race Fix", () => {
  it("onComplete is ALWAYS defined (not conditional on taskServerId)", () => {
    // OLD (broken): onComplete: taskServerId ? async (content) => {...} : undefined
    // NEW (fixed): onComplete: async (content) => {...}
    expect(indexSrc).not.toMatch(/onComplete:\s*taskServerId\s*\?/);
    // Should be unconditionally defined
    expect(indexSrc).toMatch(/onComplete:\s*async\s*\(content\)/);
  });

  it("re-resolves taskServerId at completion time using taskExternalId", () => {
    // Should attempt to look up the task by externalId if taskServerId is null
    expect(indexSrc).toContain("late-resolved taskServerId");
    expect(indexSrc).toContain("getTaskByExt(taskExternalId)");
  });

  it("warns when taskServerId cannot be resolved even after re-resolution", () => {
    expect(indexSrc).toContain("no taskServerId available even after re-resolution");
  });

  it("onArtifact also re-resolves taskServerId (same race fix)", () => {
    // The onArtifact handler should also attempt late resolution
    expect(indexSrc).toContain("getTaskByExt2(taskExternalId)");
  });

  it("still performs dedup check before persisting", () => {
    // The dedup logic should still be present
    expect(indexSrc).toContain("client already persisted");
    expect(indexSrc).toContain("server_safety_net");
  });

  it("still skips persistence when stream was aborted", () => {
    expect(indexSrc).toContain("skipped (stream was aborted)");
    expect(indexSrc).toContain("streamAbortController.signal.aborted");
  });
});

describe("Session 55: Dockerfile Production Git", () => {
  it("installs git in the production stage", () => {
    // The production stage should include git
    expect(dockerfileSrc).toContain("apk add --no-cache tini git");
  });

  it("still uses node:22-alpine for production", () => {
    expect(dockerfileSrc).toContain("FROM node:22-alpine AS production");
  });

  it("still runs as non-root user", () => {
    expect(dockerfileSrc).toContain("USER manus");
  });
});

describe("Session 55: TypeScript Error Fix", () => {
  it("updateTaskStatus is called with externalId (string), not id (number)", () => {
    // The bug was: await dbUpdateStatus(taskRecord.id, "stopped")
    // Fix: await dbUpdateStatus(taskRecord.externalId, "stopped")
    expect(indexSrc).toContain('await dbUpdateStatus(taskRecord.externalId, "stopped")');
    expect(indexSrc).not.toContain('await dbUpdateStatus(taskRecord.id, "stopped")');
  });
});
