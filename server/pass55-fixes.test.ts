/**
 * Pass 55 Tests — PDF Extra Blank Page Fix + Webapp Creation Pipeline Fix
 *
 * 1. PDF: Footer placement uses FOOTER_Y = A4_HEIGHT - 40 (inside page bounds)
 * 2. PDF: Blank trailing pages are detected and excluded from page numbering
 * 3. PDF: Short content produces exactly 1 page (no extra blank page)
 * 4. Webapp: Scope-creep detection excludes app-building pipeline
 * 5. Webapp: App-building pipeline continuation forces deploy after create_webapp
 * 6. Webapp: Deploy nudge injected after excessive file operations (soft + hard limits)
 * 7. Webapp: Escalating continuation prompts prevent infinite building loops
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// ── PDF Extra Blank Page Fix Tests ──

describe("PDF extra blank page fix", () => {
  const docGenPath = path.resolve(__dirname, "documentGeneration.ts");
  const docGenSource = fs.readFileSync(docGenPath, "utf-8");

  it("should use FOOTER_Y = A4_HEIGHT - 40 for footer placement (inside page bounds)", () => {
    expect(docGenSource).toContain("const FOOTER_Y = A4_HEIGHT - 40");
    expect(docGenSource).not.toContain("A4_HEIGHT - PAGE_BOTTOM + 20");
  });

  it("should detect and skip blank trailing pages in page numbering", () => {
    expect(docGenSource).toContain("doc.y <= PAGE_TOP + 5");
    expect(docGenSource).toContain("pageCount = pageCount - 1");
  });

  it("should use lineBreak: false in footer text to prevent wrapping", () => {
    expect(docGenSource).toContain("lineBreak: false");
  });

  it("should temporarily set bottom margin to 0 to prevent auto-pagination in footer", () => {
    expect(docGenSource).toContain("doc.page.margins.bottom = 0");
    expect(docGenSource).toContain("doc.page.margins.bottom = origBottom");
  });

  it("should handle switching back to last page after footer injection", () => {
    expect(docGenSource).toContain("range.count > pageCount");
    expect(docGenSource).toContain("doc.switchToPage(range.count - 1)");
  });

  it("should still use bufferPages: true for proper page counting", () => {
    expect(docGenSource).toContain("bufferPages: true");
  });
});

describe("PDF generates correct page count", () => {
  it("should produce a single-page PDF for short content (no extra blank page)", async () => {
    const { generatePDF } = await import("./documentGeneration");
    const shortContent = `# Test Document

This is a short document that should fit on a single page.

- Item 1
- Item 2
- Item 3

That's all.`;

    const pdfBuffer = await generatePDF("Short Test", shortContent);
    expect(pdfBuffer).toBeTruthy();
    expect(pdfBuffer.length).toBeGreaterThan(0);

    const pdfString = pdfBuffer.toString("latin1");
    expect(pdfString).toContain("%PDF-");

    const countMatch = pdfString.match(/\/Count\s+(\d+)/);
    expect(countMatch).toBeTruthy();
    const totalPages = parseInt(countMatch![1]);
    expect(totalPages).toBe(1);
  });

  it("should produce multiple pages for long content", async () => {
    const { generatePDF } = await import("./documentGeneration");
    const longContent = Array.from({ length: 100 }, (_, i) =>
      `## Section ${i + 1}\n\nThis is paragraph ${i + 1} with enough text to take up space on the page. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`
    ).join("\n\n");

    const pdfBuffer = await generatePDF("Long Test", longContent);
    expect(pdfBuffer).toBeTruthy();
    expect(pdfBuffer.length).toBeGreaterThan(0);

    const pdfString = pdfBuffer.toString("latin1");
    const countMatch = pdfString.match(/\/Count\s+(\d+)/);
    expect(countMatch).toBeTruthy();
    const totalPages = parseInt(countMatch![1]);
    expect(totalPages).toBeGreaterThan(1);
  });
});

// ── Webapp Creation Pipeline Fix Tests ──

describe("Webapp creation pipeline fix (scope-creep bypass)", () => {
  const agentStreamPath = path.resolve(__dirname, "agentStream.ts");
  const agentStreamSource = fs.readFileSync(agentStreamPath, "utf-8");

  it("should detect app-building tools in conversation history", () => {
    expect(agentStreamSource).toContain("usedAppBuildingTools");
    expect(agentStreamSource).toContain("create_webapp");
    expect(agentStreamSource).toContain("create_file");
    expect(agentStreamSource).toContain("edit_file");
    expect(agentStreamSource).toContain("install_deps");
  });

  it("should check if deploy_webapp has been called", () => {
    expect(agentStreamSource).toContain("hasDeployed");
    expect(agentStreamSource).toContain("deploy_webapp");
  });

  it("should define isAppBuildingPipeline as usedAppBuildingTools && !hasDeployed", () => {
    expect(agentStreamSource).toContain("isAppBuildingPipeline = usedAppBuildingTools && !hasDeployed");
  });

  it("should exclude app-building pipeline from scope-creep detection", () => {
    expect(agentStreamSource).toContain("!isAppBuildingPipeline");
    expect(agentStreamSource).toMatch(/completedToolCalls\s*>=\s*1\s*&&\s*!isAppBuildingPipeline/);
  });

  it("should preserve scope-creep detection for non-app-building tasks", () => {
    expect(agentStreamSource).toContain("SCOPE-CREEP DETECTED");
    expect(agentStreamSource).toContain("scopeCreepSignals");
  });
});

describe("Webapp deploy nudge after tool execution (prevents infinite building)", () => {
  const agentStreamPath = path.resolve(__dirname, "agentStream.ts");
  const agentStreamSource = fs.readFileSync(agentStreamPath, "utf-8");

  it("should count file operations in conversation after tool execution", () => {
    // The deploy nudge counts messages with create_file, edit_file, read_file, etc.
    expect(agentStreamSource).toContain("appBuildToolCount");
    expect(agentStreamSource).toContain("create_file");
    expect(agentStreamSource).toContain("edit_file");
    expect(agentStreamSource).toContain("read_file");
  });

  it("should check hasCreatedWebapp and hasDeployedWebapp in the tool execution branch", () => {
    expect(agentStreamSource).toContain("hasCreatedWebapp");
    expect(agentStreamSource).toContain("hasDeployedWebapp");
  });

  it("should define SOFT_LIMIT and HARD_LIMIT for file operations", () => {
    expect(agentStreamSource).toContain("SOFT_LIMIT = 6");
    expect(agentStreamSource).toContain("HARD_LIMIT = 12");
  });

  it("should inject soft nudge after SOFT_LIMIT file operations", () => {
    expect(agentStreamSource).toContain("soft limit");
    expect(agentStreamSource).toContain("Nudging toward deploy");
    expect(agentStreamSource).toContain("call deploy_webapp to deploy it");
  });

  it("should inject hard nudge after HARD_LIMIT file operations", () => {
    expect(agentStreamSource).toContain("HARD LIMIT");
    expect(agentStreamSource).toContain("Injecting mandatory deploy prompt");
    expect(agentStreamSource).toContain("STOP creating files NOW");
    expect(agentStreamSource).toContain("Call deploy_webapp immediately");
  });

  it("should only nudge when create_webapp was used but deploy_webapp was not", () => {
    // The condition: hasCreatedWebapp && !hasDeployedWebapp
    expect(agentStreamSource).toContain("hasCreatedWebapp && !hasDeployedWebapp");
  });
});

describe("Webapp escalating continuation prompts (text-only branch)", () => {
  const agentStreamPath = path.resolve(__dirname, "agentStream.ts");
  const agentStreamSource = fs.readFileSync(agentStreamPath, "utf-8");

  it("should track appBuildingContinuations counter", () => {
    expect(agentStreamSource).toContain("let appBuildingContinuations = 0");
    expect(agentStreamSource).toContain("appBuildingContinuations++");
  });

  it("should define MAX_APP_BUILD_CONTINUATIONS limit", () => {
    expect(agentStreamSource).toContain("MAX_APP_BUILD_CONTINUATIONS = 5");
  });

  it("should have early/gentle continuation prompts", () => {
    expect(agentStreamSource).toContain("Good progress on the webapp");
    expect(agentStreamSource).toContain("Keep it simple");
  });

  it("should have escalated continuation prompts after 3 rounds", () => {
    expect(agentStreamSource).toContain("escalating to deploy");
    expect(agentStreamSource).toContain("It is time to DEPLOY");
    expect(agentStreamSource).toContain("Do not add more features");
  });

  it("should have hard limit prompt after MAX_APP_BUILD_CONTINUATIONS", () => {
    expect(agentStreamSource).toContain("STOP BUILDING FILES IMMEDIATELY");
    expect(agentStreamSource).toContain("deploy_webapp is the ONLY tool");
    expect(agentStreamSource).toContain("FINAL instruction");
  });
});
