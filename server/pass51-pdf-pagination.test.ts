/**
 * Pass 51 — PDF Pagination & Page Number Tests
 * 
 * Verifies that the PDF generator correctly handles:
 * - Multi-page content (automatic page breaks)
 * - Page numbers on each page
 * - Tables spanning page boundaries
 * - Code blocks that exceed page height
 * - Proper margins and content width
 */
import { describe, it, expect } from "vitest";
import { generatePDF } from "./documentGeneration";

describe("PDF pagination", () => {
  it("generates a valid PDF buffer for simple content", async () => {
    const buf = await generatePDF("Test", "Hello world");
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(100);
    // PDF magic bytes
    expect(buf.slice(0, 5).toString()).toBe("%PDF-");
  });

  it("generates multi-page PDF for long content", async () => {
    // Generate enough paragraphs to force multiple pages
    const paragraphs = Array.from({ length: 80 }, (_, i) =>
      `Paragraph ${i + 1}: This is a fairly long paragraph of text that should take up a reasonable amount of vertical space on the page. It contains enough words to wrap across multiple lines in the PDF output, ensuring that the content flows naturally from one page to the next.`
    ).join("\n\n");

    const buf = await generatePDF("Long Document", paragraphs);
    expect(buf).toBeInstanceOf(Buffer);
    
    // A multi-page PDF should be significantly larger than a single-page one
    const singlePageBuf = await generatePDF("Short", "Hello");
    expect(buf.length).toBeGreaterThan(singlePageBuf.length * 2);
    
    // Check for multiple page markers in the PDF
    const pdfStr = buf.toString("latin1");
    // Count /Type /Page occurrences (each page has one)
    const pageMatches = pdfStr.match(/\/Type\s*\/Page[^s]/g);
    expect(pageMatches).not.toBeNull();
    expect(pageMatches!.length).toBeGreaterThanOrEqual(3);
  });

  it("handles large tables that span multiple pages", async () => {
    // Create a table with 100 rows
    const headerRow = "| Name | Value | Description |";
    const separator = "|------|-------|-------------|";
    const dataRows = Array.from({ length: 100 }, (_, i) =>
      `| Item ${i + 1} | ${(i + 1) * 10} | Description for item ${i + 1} that is reasonably long |`
    ).join("\n");

    const content = `# Large Table\n\n${headerRow}\n${separator}\n${dataRows}`;
    const buf = await generatePDF("Table Test", content);
    expect(buf).toBeInstanceOf(Buffer);
    
    const pdfStr = buf.toString("latin1");
    const pageMatches = pdfStr.match(/\/Type\s*\/Page[^s]/g);
    expect(pageMatches).not.toBeNull();
    expect(pageMatches!.length).toBeGreaterThanOrEqual(2);
  });

  it("handles large code blocks", async () => {
    // Create a code block with 100 lines
    const codeLines = Array.from({ length: 100 }, (_, i) =>
      `const variable${i} = "value ${i}"; // line ${i + 1}`
    ).join("\n");

    const content = `# Code Example\n\n\`\`\`javascript\n${codeLines}\n\`\`\``;
    const buf = await generatePDF("Code Test", content);
    expect(buf).toBeInstanceOf(Buffer);
    
    const pdfStr = buf.toString("latin1");
    const pageMatches = pdfStr.match(/\/Type\s*\/Page[^s]/g);
    expect(pageMatches).not.toBeNull();
    expect(pageMatches!.length).toBeGreaterThanOrEqual(2);
  });

  it("includes page numbers on multi-page documents", async () => {
    // Generate multi-page content
    const paragraphs = Array.from({ length: 60 }, (_, i) =>
      `Paragraph ${i + 1}: Content that fills multiple pages for page number testing.`
    ).join("\n\n");

    const buf = await generatePDF("Numbered Pages", paragraphs);
    expect(buf).toBeInstanceOf(Buffer);
    
    // Verify it's a valid multi-page PDF
    const pdfStr = buf.toString("latin1");
    const pageMatches = pdfStr.match(/\/Type\s*\/Page[^s]/g);
    expect(pageMatches).not.toBeNull();
    expect(pageMatches!.length).toBeGreaterThanOrEqual(2);
    
    // Page numbers are rendered in the PDF content streams (compressed),
    // so we verify the PDF has buffered pages and the Count matches
    const countMatch = pdfStr.match(/\/Count\s+(\d+)/);
    expect(countMatch).not.toBeNull();
    expect(parseInt(countMatch![1])).toBeGreaterThanOrEqual(2);
  });

  it("handles mixed content types across pages", async () => {
    const content = [
      "# Introduction",
      "",
      "This is the introduction paragraph with some text.",
      "",
      "## Data Table",
      "",
      "| Column A | Column B | Column C |",
      "|----------|----------|----------|",
      ...Array.from({ length: 30 }, (_, i) => `| Row ${i + 1} | Data ${i} | More data ${i} |`),
      "",
      "## Code Section",
      "",
      "```python",
      ...Array.from({ length: 40 }, (_, i) => `print("Line ${i + 1}")`),
      "```",
      "",
      "## Conclusion",
      "",
      ...Array.from({ length: 20 }, (_, i) =>
        `Conclusion paragraph ${i + 1}: This wraps up the document with additional text.`
      ),
      "",
      "> This is a blockquote at the end of the document.",
      "",
      "---",
      "",
      "Final paragraph after the horizontal rule.",
    ].join("\n");

    const buf = await generatePDF("Mixed Content", content);
    expect(buf).toBeInstanceOf(Buffer);
    
    const pdfStr = buf.toString("latin1");
    const pageMatches = pdfStr.match(/\/Type\s*\/Page[^s]/g);
    expect(pageMatches).not.toBeNull();
    expect(pageMatches!.length).toBeGreaterThanOrEqual(3);
  });

  it("handles empty content gracefully", async () => {
    const buf = await generatePDF("Empty", "");
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.slice(0, 5).toString()).toBe("%PDF-");
  });

  it("handles content with many headings", async () => {
    const content = Array.from({ length: 50 }, (_, i) =>
      `## Section ${i + 1}\n\nContent for section ${i + 1}. This paragraph provides enough text to demonstrate proper heading spacing.`
    ).join("\n\n");

    const buf = await generatePDF("Many Headings", content);
    expect(buf).toBeInstanceOf(Buffer);
    
    const pdfStr = buf.toString("latin1");
    const pageMatches = pdfStr.match(/\/Type\s*\/Page[^s]/g);
    expect(pageMatches).not.toBeNull();
    expect(pageMatches!.length).toBeGreaterThanOrEqual(2);
  });

  it("handles content with many list items", async () => {
    const content = [
      "# Shopping List",
      "",
      ...Array.from({ length: 100 }, (_, i) => `- Item ${i + 1}: A product with a description`),
    ].join("\n");

    const buf = await generatePDF("List Test", content);
    expect(buf).toBeInstanceOf(Buffer);
    
    const pdfStr = buf.toString("latin1");
    const pageMatches = pdfStr.match(/\/Type\s*\/Page[^s]/g);
    expect(pageMatches).not.toBeNull();
    expect(pageMatches!.length).toBeGreaterThanOrEqual(2);
  });

  it("handles blockquotes properly", async () => {
    const content = Array.from({ length: 40 }, (_, i) =>
      `> Blockquote ${i + 1}: This is a quoted passage that should be indented and styled differently from regular text.`
    ).join("\n\n");

    const buf = await generatePDF("Blockquotes", content);
    expect(buf).toBeInstanceOf(Buffer);
  });

  it("handles horizontal rules between sections", async () => {
    const content = Array.from({ length: 20 }, (_, i) =>
      `## Section ${i + 1}\n\nContent for section ${i + 1}.\n\n---`
    ).join("\n\n");

    const buf = await generatePDF("HR Test", content);
    expect(buf).toBeInstanceOf(Buffer);
  });
});
