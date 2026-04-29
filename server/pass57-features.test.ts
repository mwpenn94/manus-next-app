/**
 * Pass 57 Tests — Manus Parity+ Webapp Builder Features
 * 
 * Tests for:
 * 1. Deploy retry logic with exponential backoff
 * 2. Post-deploy static code review (5 checks)
 * 3. Quality validation prompt enhancement (auto-fix vs. clean present)
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const agentToolsPath = path.join(__dirname, "agentTools.ts");
const agentStreamPath = path.join(__dirname, "agentStream.ts");
const agentToolsSrc = fs.readFileSync(agentToolsPath, "utf-8");
const agentStreamSrc = fs.readFileSync(agentStreamPath, "utf-8");

// ── 1. Deploy Retry Logic ──

describe("Deploy retry logic with exponential backoff", () => {
  it("should define retryWithBackoff helper function", () => {
    expect(agentToolsSrc).toContain("async function retryWithBackoff");
  });

  it("should have configurable maxRetries parameter", () => {
    expect(agentToolsSrc).toContain("maxRetries");
  });

  it("should implement exponential delay (baseDelayMs * 2^attempt)", () => {
    // Check for the exponential backoff pattern
    expect(agentToolsSrc).toMatch(/baseDelayMs\s*\*\s*Math\.pow\s*\(\s*2/);
  });

  it("should use retryWithBackoff for S3 uploads in deploy_webapp", () => {
    // The storagePut call should be wrapped in retryWithBackoff
    expect(agentToolsSrc).toContain("retryWithBackoff(");
    expect(agentToolsSrc).toContain("storagePut");
  });

  it("should track failed assets and continue deployment", () => {
    expect(agentToolsSrc).toContain("failedAssets");
    // Should push to failedAssets array when retry fails
    expect(agentToolsSrc).toContain("failedAssets.push");
  });

  it("should report failed assets in the deploy result message", () => {
    expect(agentToolsSrc).toContain("asset(s) failed to upload");
  });

  it("should log retry attempts for observability", () => {
    expect(agentToolsSrc).toMatch(/console\.\w+.*retry/i);
  });

  it("should have a reasonable default retry count (3 attempts)", () => {
    // The default maxAttempts should be 3
    expect(agentToolsSrc).toContain("maxAttempts: 3");
  });
});

// ── 2. Post-Deploy Static Code Review ──

describe("Post-deploy static code review", () => {
  it("should declare codeIssues array for collecting findings", () => {
    expect(agentToolsSrc).toContain("const codeIssues: string[] = []");
  });

  it("should scan source files (html, jsx, tsx, css)", () => {
    expect(agentToolsSrc).toMatch(/\\\.\(html\|jsx\?\|tsx\?\|css\)/);
  });

  it("should cap file scanning at 20 files for performance", () => {
    expect(agentToolsSrc).toContain(".slice(0, 20)");
  });

  // Check 1: Missing onChange handlers
  it("should detect missing onChange handlers on controlled inputs", () => {
    expect(agentToolsSrc).toContain("value=\\{");
    expect(agentToolsSrc).toContain("onChange");
    expect(agentToolsSrc).toContain("form inputs will be read-only");
  });

  // Check 2: Unused state setters
  it("should detect useState setters that are never called", () => {
    expect(agentToolsSrc).toContain("useState setter");
    expect(agentToolsSrc).toContain("declared but never called");
    expect(agentToolsSrc).toContain("state will never update");
  });

  // Check 3: Unclosed HTML tags
  it("should detect unclosed div tags in HTML files", () => {
    expect(agentToolsSrc).toContain("unclosed <div> tags");
  });

  // Check 4: Broken imports
  it("should detect broken relative imports", () => {
    expect(agentToolsSrc).toContain("Broken import");
    expect(agentToolsSrc).toContain("file not found");
    // Should check multiple extensions (.ts, .tsx, .js, .jsx, index.*)
    expect(agentToolsSrc).toContain('importPath + ".ts"');
    expect(agentToolsSrc).toContain('importPath + ".tsx"');
    expect(agentToolsSrc).toContain('importPath + ".js"');
  });

  // Check 5: Empty event handlers
  it("should detect empty onClick handlers", () => {
    expect(agentToolsSrc).toContain("Empty onClick handler");
    expect(agentToolsSrc).toContain("will do nothing when clicked");
  });

  it("should include code review results in the deploy return value", () => {
    expect(agentToolsSrc).toContain("codeIssues, // Pass to agentStream");
  });

  it("should have codeIssues field in ToolResult interface", () => {
    expect(agentToolsSrc).toContain("codeIssues?: string[]");
  });

  it("should show clean message when no issues found", () => {
    expect(agentToolsSrc).toContain("Code review: No common issues detected");
  });

  it("should wrap code review in try-catch for resilience", () => {
    expect(agentToolsSrc).toContain("Code review failed (non-critical)");
  });
});

// ── 3. Quality Validation Prompt Enhancement ──

describe("Quality validation prompt with auto-fix", () => {
  it("should extract codeIssues from deploy result", () => {
    expect(agentStreamSrc).toContain("const codeIssues = result.codeIssues || []");
  });

  it("should check hasCodeIssues flag", () => {
    expect(agentStreamSrc).toContain("const hasCodeIssues = codeIssues.length > 0");
  });

  it("should inject auto-fix instructions when issues are found", () => {
    expect(agentStreamSrc).toContain("Fix these issues NOW before presenting to the user");
    expect(agentStreamSrc).toContain("Use edit_file to fix each issue");
    expect(agentStreamSrc).toContain("call deploy_webapp again");
  });

  it("should instruct NOT to present broken version", () => {
    expect(agentStreamSrc).toContain("Do NOT present the broken version");
  });

  it("should present confidently when code review is clean", () => {
    expect(agentStreamSrc).toContain("automated code review found no issues");
    expect(agentStreamSrc).toContain("present confidently since the deploy succeeded and code review passed");
  });

  it("should log code review results for observability", () => {
    expect(agentStreamSrc).toContain("Post-deploy code review found");
    expect(agentStreamSrc).toContain("Post-deploy code review: clean");
  });

  it("should have separate branches for issues vs. clean", () => {
    // The if/else structure should exist
    expect(agentStreamSrc).toContain("if (hasCodeIssues)");
    expect(agentStreamSrc).toContain("} else {");
  });
});

// ── 4. Integration: Code Review → Auto-Fix → Redeploy Pipeline ──

describe("Code review auto-fix pipeline integration", () => {
  it("should enumerate issues with numbers in the fix prompt", () => {
    // The prompt should list issues with numbers
    expect(agentStreamSrc).toContain("codeIssues.map((issue, i) => `${i + 1}. ${issue}`)");
  });

  it("should instruct specific fix actions (onChange, state setters, imports)", () => {
    expect(agentStreamSrc).toContain("add missing onChange handlers");
    expect(agentStreamSrc).toContain("connect state setters");
    expect(agentStreamSrc).toContain("fix broken imports");
  });

  it("should instruct redeploy after fixing", () => {
    expect(agentStreamSrc).toContain("call deploy_webapp again to publish the corrected version");
  });

  it("should instruct presenting the updated URL after fix", () => {
    expect(agentStreamSrc).toContain("present the updated URL to the user");
  });
});
