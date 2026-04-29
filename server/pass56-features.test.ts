/**
 * Pass 56 Tests — Dynamic Deploy Nudge Thresholds + Post-Deploy Quality Validation
 *
 * 1. Dynamic thresholds: complexity detection from create_webapp description
 * 2. Dynamic thresholds: simple apps get lower limits (SOFT=4, HARD=8)
 * 3. Dynamic thresholds: complex apps get higher limits (SOFT=10, HARD=18)
 * 4. Dynamic thresholds: medium apps use default limits (SOFT=6, HARD=12)
 * 5. Post-deploy quality validation: inject verification prompt after deploy_webapp
 * 6. Text-only branch: dynamic MAX_APP_BUILD_CONTINUATIONS based on complexity
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const agentStreamPath = path.resolve(__dirname, "agentStream.ts");
const agentStreamSource = fs.readFileSync(agentStreamPath, "utf-8");

// ── Dynamic Deploy Nudge Thresholds ──

describe("Dynamic deploy nudge thresholds (tool execution branch)", () => {
  it("should extract webapp description from create_webapp tool call", () => {
    expect(agentStreamSource).toContain("createWebappMsg");
    expect(agentStreamSource).toContain("create_webapp");
    expect(agentStreamSource).toContain(".description");
  });

  it("should define complexity indicators for simple apps", () => {
    expect(agentStreamSource).toContain("simpleIndicators");
    expect(agentStreamSource).toContain("calculator|timer|counter");
    expect(agentStreamSource).toContain("hello.?world|single.?page");
    expect(agentStreamSource).toContain("stopwatch|clock|converter");
    expect(agentStreamSource).toContain("tip.?calc|bmi|quiz");
    expect(agentStreamSource).toContain("flashcard|countdown|landing.?page");
  });

  it("should define complexity indicators for complex apps", () => {
    expect(agentStreamSource).toContain("complexIndicators");
    expect(agentStreamSource).toContain("multi.?page|dashboard|full.?stack");
    expect(agentStreamSource).toContain("e.?commerce|admin.?panel|crm");
    expect(agentStreamSource).toContain("management.?system|social.?network");
    expect(agentStreamSource).toContain("marketplace|portfolio.?with|blog.?with|saas");
  });

  it("should set SOFT_LIMIT=4, HARD_LIMIT=8 for simple apps", () => {
    expect(agentStreamSource).toContain("SOFT_LIMIT = 4");
    expect(agentStreamSource).toContain("HARD_LIMIT = 8");
  });

  it("should set SOFT_LIMIT=10, HARD_LIMIT=18 for complex apps", () => {
    expect(agentStreamSource).toContain("SOFT_LIMIT = 10");
    expect(agentStreamSource).toContain("HARD_LIMIT = 18");
  });

  it("should default to SOFT_LIMIT=6, HARD_LIMIT=12 for medium complexity", () => {
    // These are the default values before complexity detection overrides them
    expect(agentStreamSource).toContain("let SOFT_LIMIT = 6");
    expect(agentStreamSource).toContain("let HARD_LIMIT = 12");
  });

  it("should combine description and user message for complexity detection", () => {
    expect(agentStreamSource).toContain("combined");
    expect(agentStreamSource).toContain("userText");
    expect(agentStreamSource).toContain("desc");
  });

  it("should log the detected complexity level", () => {
    expect(agentStreamSource).toContain("App complexity: COMPLEX");
    expect(agentStreamSource).toContain("App complexity: SIMPLE");
    expect(agentStreamSource).toContain("App complexity: MEDIUM");
  });

  it("should include dynamic limit values in nudge messages", () => {
    expect(agentStreamSource).toContain("${HARD_LIMIT}");
    expect(agentStreamSource).toContain("${SOFT_LIMIT}");
  });
});

// ── Post-Deploy Quality Validation ──

describe("Post-deploy quality validation", () => {
  it("should inject quality validation prompt after successful deploy_webapp", () => {
    expect(agentStreamSource).toContain("POST-DEPLOY QUALITY VALIDATION");
    expect(agentStreamSource).toContain("deploy_webapp");
    expect(agentStreamSource).toContain("result.success");
  });

  it("should include the deployed URL in the validation prompt", () => {
    expect(agentStreamSource).toContain("${result.url}");
    expect(agentStreamSource).toContain("deployed to");
  });

  it("should instruct LLM to present the result to the user", () => {
    expect(agentStreamSource).toContain("Share the deployed URL");
    expect(agentStreamSource).toContain("summarize what was built");
  });

  it("should instruct LLM to mention interactive elements", () => {
    expect(agentStreamSource).toContain("interactive elements");
    expect(agentStreamSource).toContain("buttons, forms, calculations");
  });

  it("should NOT instruct LLM to use browser to test (avoid extra tool calls)", () => {
    expect(agentStreamSource).toContain("Do NOT use browser_action to test it");
  });

  it("should be placed after the webapp_deployed SSE event", () => {
    const deployedEventIdx = agentStreamSource.indexOf("webapp_deployed:");
    const qualityValidationIdx = agentStreamSource.indexOf("POST-DEPLOY QUALITY VALIDATION");
    expect(deployedEventIdx).toBeGreaterThan(-1);
    expect(qualityValidationIdx).toBeGreaterThan(-1);
    expect(qualityValidationIdx).toBeGreaterThan(deployedEventIdx);
  });
});

// ── Dynamic Text-Only Branch Continuations ──

describe("Dynamic text-only branch continuations", () => {
  it("should dynamically determine MAX_APP_BUILD_CONTINUATIONS", () => {
    expect(agentStreamSource).toContain("let MAX_APP_BUILD_CONTINUATIONS = 5");
  });

  it("should set MAX_APP_BUILD_CONTINUATIONS=8 for complex apps", () => {
    expect(agentStreamSource).toContain("MAX_APP_BUILD_CONTINUATIONS = 8");
  });

  it("should set MAX_APP_BUILD_CONTINUATIONS=3 for simple apps", () => {
    expect(agentStreamSource).toContain("MAX_APP_BUILD_CONTINUATIONS = 3");
  });

  it("should use the same complexity indicators as the tool execution branch", () => {
    expect(agentStreamSource).toContain("complexIndicatorsForCont");
    expect(agentStreamSource).toContain("simpleIndicatorsForCont");
  });

  it("should extract description from create_webapp for complexity detection", () => {
    expect(agentStreamSource).toContain("createWebappMsgForCont");
    expect(agentStreamSource).toContain("createCallForCont");
    expect(agentStreamSource).toContain("descForCont");
  });
});
