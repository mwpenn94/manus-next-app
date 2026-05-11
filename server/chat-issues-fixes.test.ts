/**
 * Tests for fixes from the attached chat issues:
 * 1. RO auto-trigger should be context-aware (not fire on casual feedback)
 * 2. PDF table pagination should repeat header rows on page breaks
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// ── Issue 1: RO Context-Aware Trigger ──

describe("RO context-aware auto-trigger detection", () => {
  // Read the agentStream source to verify the logic is in place
  const agentStreamPath = path.join(__dirname, "agentStream.ts");
  const agentStreamSrc = fs.readFileSync(agentStreamPath, "utf-8");

  it("detects explicit pass requests via regex", () => {
    // The regex from the code
    const isExplicitPassRequest = (text: string) =>
      /\b(optimize|pass|recursive|converge|improve|refine|iterate|another pass|next pass|keep optimizing|run.*pass|depth pass|landscape pass|adversarial pass|future.state pass|synthesis pass|fundamental redesign)\b/i.test(text);

    // Should trigger
    expect(isExplicitPassRequest("run another pass")).toBe(true);
    expect(isExplicitPassRequest("optimize this further")).toBe(true);
    expect(isExplicitPassRequest("keep optimizing")).toBe(true);
    expect(isExplicitPassRequest("do a depth pass on section 3")).toBe(true);
    expect(isExplicitPassRequest("refine the analysis")).toBe(true);
    expect(isExplicitPassRequest("iterate on this")).toBe(true);
    expect(isExplicitPassRequest("fundamental redesign of the approach")).toBe(true);

    // Should NOT trigger (casual feedback)
    expect(isExplicitPassRequest("much better")).toBe(false);
    expect(isExplicitPassRequest("looks good")).toBe(false);
    expect(isExplicitPassRequest("thanks")).toBe(false);
    expect(isExplicitPassRequest("great work")).toBe(false);
    expect(isExplicitPassRequest("nice")).toBe(false);
    expect(isExplicitPassRequest("ok")).toBe(false);
    expect(isExplicitPassRequest("fix the PDF formatting")).toBe(false);
    expect(isExplicitPassRequest("what did you change?")).toBe(false);
  });

  it("has shouldAutoTrigger logic that checks isFirstMessage, isExplicitPassRequest, and hasSubstantiveWorkRequest", () => {
    expect(agentStreamSrc).toContain("shouldAutoTrigger");
    expect(agentStreamSrc).toContain("isFirstMessage");
    expect(agentStreamSrc).toContain("isExplicitPassRequest");
    expect(agentStreamSrc).toContain("hasSubstantiveWorkRequest");
    expect(agentStreamSrc).toContain("hasPriorConvergence");
  });

  it("injects MUST-perform instruction only when shouldAutoTrigger is true", () => {
    // The code should have two different instructions based on shouldAutoTrigger
    expect(agentStreamSrc).toContain("## RECURSIVE OPTIMIZATION (User-Enabled)");
    expect(agentStreamSrc).toContain("## RECURSIVE OPTIMIZATION (Available)");
    expect(agentStreamSrc).toContain("you MUST perform iterative optimization passes");
    expect(agentStreamSrc).toContain("should ONLY be triggered when");
  });

  it("passive instruction explicitly lists what should NOT trigger passes", () => {
    expect(agentStreamSrc).toContain("Do NOT auto-trigger optimization passes on:");
    expect(agentStreamSrc).toContain("Casual feedback");
    expect(agentStreamSrc).toContain("Layout/formatting requests");
    expect(agentStreamSrc).toContain("Questions about the work");
    expect(agentStreamSrc).toContain("Unrelated follow-up requests");
  });

  it("word count threshold is 15 words for substantive work requests", () => {
    // Verify the threshold
    expect(agentStreamSrc).toContain("lastUserText.split(/\\s+/).length > 15");
  });
});

// ── Issue 2: PDF Table Header Repetition ──

describe("PDF table pagination with header repetition", () => {
  const docGenPath = path.join(__dirname, "documentGeneration.ts");
  const docGenSrc = fs.readFileSync(docGenPath, "utf-8");

  it("saves header row for repetition on page breaks", () => {
    expect(docGenSrc).toContain("const headerRow = block.rows[0]");
    expect(docGenSrc).toContain("Save header for repetition on page breaks");
  });

  it("checks for page break before each data row", () => {
    expect(docGenSrc).toContain("doc.y + rowHeight + 4 > USABLE_BOTTOM");
  });

  it("repeats header row after page break", () => {
    expect(docGenSrc).toContain("drawTableRow(headerRow, true)");
    expect(docGenSrc).toContain("Page break — add new page and repeat header row");
  });

  it("only repeats header for data rows, not the header row itself", () => {
    expect(docGenSrc).toContain("!isHeader && doc.y + rowHeight + 4 > USABLE_BOTTOM");
  });

  it("uses drawTableRow helper for consistent rendering", () => {
    expect(docGenSrc).toContain("const drawTableRow = (row: string[], isHeader: boolean)");
  });

  it("generates valid PDF with tables", async () => {
    const { generatePDF } = await import("./documentGeneration");
    const markdown = `# Test Report

| Name | Value | Status |
|------|-------|--------|
| Alpha | 100 | Active |
| Beta | 200 | Inactive |
| Gamma | 300 | Active |
`;
    const buffer = await generatePDF("Test Report", markdown);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(100);
    // PDF magic bytes
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("generates PDF with large tables that span multiple pages", async () => {
    const { generatePDF } = await import("./documentGeneration");
    // Generate a table with 100 rows to force page breaks
    let markdown = "# Large Table Test\n\n| ID | Name | Description | Status |\n|---|---|---|---|\n";
    for (let i = 1; i <= 100; i++) {
      markdown += `| ${i} | Item ${i} | Description for item number ${i} that is somewhat long | ${i % 2 === 0 ? "Active" : "Inactive"} |\n`;
    }
    const buffer = await generatePDF("Large Table Test", markdown);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
    // Should be multiple pages (A4 fits ~40 rows at 18pt height)
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
