/**
 * Pass 55 Tests — PDF Extra Blank Page Fix + Webapp Creation Hang Fix
 *
 * 1. PDF: Footer placement uses FOOTER_Y = A4_HEIGHT - 40 (inside page bounds)
 * 2. PDF: Blank trailing pages are detected and excluded from page numbering
 * 3. PDF: Short content produces exactly 1 page (no extra blank page)
 * 4. Webapp: Scope-creep detection excludes app-building pipeline
 * 5. Webapp: App-building pipeline continuation forces deploy after create_webapp
 * 6. Webapp: deploy_webapp check in conversation prevents premature scope-creep break
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// ── PDF Extra Blank Page Fix Tests ──

describe("PDF extra blank page fix", () => {
  const docGenPath = path.resolve(__dirname, "documentGeneration.ts");
  const docGenSource = fs.readFileSync(docGenPath, "utf-8");

  it("should use FOOTER_Y = A4_HEIGHT - 40 for footer placement (inside page bounds)", () => {
    // The old code used A4_HEIGHT - PAGE_BOTTOM + 20 = 841.89 - 72 + 20 = 789.89
    // which was past the usable area boundary (769.89), potentially triggering a new page.
    // The new code uses A4_HEIGHT - 40 = 801.89, which is safely within the page.
    expect(docGenSource).toContain("const FOOTER_Y = A4_HEIGHT - 40");
    expect(docGenSource).not.toContain("A4_HEIGHT - PAGE_BOTTOM + 20");
  });

  it("should detect and skip blank trailing pages in page numbering", () => {
    // The fix checks if the last page's y position is near the top margin,
    // indicating it's a blank page that shouldn't be numbered.
    expect(docGenSource).toContain("doc.y <= PAGE_TOP + 5");
    expect(docGenSource).toContain("pageCount = pageCount - 1");
  });

  it("should use lineBreak: false in footer text to prevent wrapping", () => {
    expect(docGenSource).toContain("lineBreak: false");
  });

  it("should temporarily set bottom margin to 0 to prevent auto-pagination in footer", () => {
    // The key fix: PDFKit triggers auto-pagination when text Y is below
    // (pageHeight - bottomMargin). By setting bottom margin to 0 temporarily,
    // we can write in the footer area without creating a new page.
    expect(docGenSource).toContain("doc.page.margins.bottom = 0");
    expect(docGenSource).toContain("doc.page.margins.bottom = origBottom");
  });

  it("should handle switching back to last page after footer injection", () => {
    // PDFKit requires ending on the last page
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

    // Check the PDF for page count indicators
    const pdfString = pdfBuffer.toString("latin1");
    expect(pdfString).toContain("%PDF-");

    // Use /Count in the Pages tree to check total page count
    // PDFKit writes /Count N in the /Pages object
    const countMatch = pdfString.match(/\/Count\s+(\d+)/);
    expect(countMatch).toBeTruthy();
    const totalPages = parseInt(countMatch![1]);
    // Short content should produce exactly 1 page (the bug was producing 2)
    expect(totalPages).toBe(1);
  });

  it("should produce multiple pages for long content", async () => {
    const { generatePDF } = await import("./documentGeneration");
    // Generate content that definitely spans multiple pages
    const longContent = Array.from({ length: 100 }, (_, i) =>
      `## Section ${i + 1}\n\nThis is paragraph ${i + 1} with enough text to take up space on the page. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`
    ).join("\n\n");

    const pdfBuffer = await generatePDF("Long Test", longContent);
    expect(pdfBuffer).toBeTruthy();
    expect(pdfBuffer.length).toBeGreaterThan(0);

    const pdfString = pdfBuffer.toString("latin1");
    // Use /Count in the Pages tree to check total page count
    const countMatch = pdfString.match(/\/Count\s+(\d+)/);
    expect(countMatch).toBeTruthy();
    const totalPages = parseInt(countMatch![1]);
    // 100 sections with headings + paragraphs should span many pages
    expect(totalPages).toBeGreaterThan(1);
  });
});

// ── Webapp Creation Hang Fix Tests ──

describe("Webapp creation hang fix (scope-creep bypass for app pipeline)", () => {
  const agentStreamPath = path.resolve(__dirname, "agentStream.ts");
  const agentStreamSource = fs.readFileSync(agentStreamPath, "utf-8");

  it("should detect app-building tools in conversation history", () => {
    // The fix checks if create_webapp, create_file, edit_file, install_deps, or run_command
    // have been used in the conversation
    expect(agentStreamSource).toContain("usedAppBuildingTools");
    expect(agentStreamSource).toContain("create_webapp");
    expect(agentStreamSource).toContain("create_file");
    expect(agentStreamSource).toContain("edit_file");
    expect(agentStreamSource).toContain("install_deps");
  });

  it("should check if deploy_webapp has been called", () => {
    // The fix tracks whether deploy_webapp has been called
    expect(agentStreamSource).toContain("hasDeployed");
    expect(agentStreamSource).toContain("deploy_webapp");
  });

  it("should define isAppBuildingPipeline as usedAppBuildingTools && !hasDeployed", () => {
    expect(agentStreamSource).toContain("isAppBuildingPipeline = usedAppBuildingTools && !hasDeployed");
  });

  it("should exclude app-building pipeline from scope-creep detection", () => {
    // The scope-creep check should include !isAppBuildingPipeline condition
    expect(agentStreamSource).toContain("!isAppBuildingPipeline");
    // The old code only checked !wantsContinuous && completedToolCalls >= 1
    // The new code adds && !isAppBuildingPipeline
    expect(agentStreamSource).toMatch(/completedToolCalls\s*>=\s*1\s*&&\s*!isAppBuildingPipeline/);
  });

  it("should force continuation when in app-building pipeline without deploy", () => {
    // When isAppBuildingPipeline is true, the agent should continue
    expect(agentStreamSource).toContain("App-building pipeline:");
    expect(agentStreamSource).toContain("forcing continuation");
    expect(agentStreamSource).toContain("NOT deployed it yet");
    expect(agentStreamSource).toContain("call deploy_webapp");
  });

  it("should still have the system prompt instruction to auto-deploy", () => {
    expect(agentStreamSource).toContain("AUTO-DEPLOY when complete");
    expect(agentStreamSource).toContain("deploy_webapp");
  });

  it("should preserve scope-creep detection for non-app-building tasks", () => {
    // The scope-creep regex should still exist
    expect(agentStreamSource).toContain("SCOPE-CREEP DETECTED");
    expect(agentStreamSource).toContain("scopeCreepSignals");
  });
});
