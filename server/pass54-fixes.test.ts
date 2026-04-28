import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Pass 54 — Webapp creation & PDF generation fixes", () => {
  // ── Webapp HTML fallback template ──

  describe("Webapp HTML fallback template", () => {
    const agentToolsPath = path.resolve(__dirname, "agentTools.ts");
    const agentToolsContent = fs.readFileSync(agentToolsPath, "utf-8");

    it("should have inline <style> block in the HTML fallback (no CDN dependency)", () => {
      // The fallback template should include inline CSS, not rely on Tailwind CDN
      expect(agentToolsContent).toContain("<style>");
      expect(agentToolsContent).toContain("background: #0a0a0a");
      expect(agentToolsContent).toContain("color: #fff");
    });

    it("should NOT use Tailwind CDN in the HTML fallback", () => {
      // Find the fallback section (after "Falling back to HTML template")
      const fallbackIdx = agentToolsContent.indexOf("Falling back to HTML template");
      expect(fallbackIdx).toBeGreaterThan(-1);
      const fallbackSection = agentToolsContent.slice(fallbackIdx, fallbackIdx + 2000);
      // The fallback section should not reference cdn.tailwindcss.com
      expect(fallbackSection).not.toContain("cdn.tailwindcss.com");
    });

    it("should include actual CSS in styles.css for the fallback (not just a comment)", () => {
      // The fallback writes styles.css — it should have real CSS, not just /* Custom styles */
      const fallbackIdx = agentToolsContent.indexOf("Falling back to HTML template");
      const fallbackSection = agentToolsContent.slice(fallbackIdx, fallbackIdx + 3000);
      // Check that styles.css content includes actual CSS rules
      expect(fallbackSection).toContain("min-height: 100vh");
      expect(fallbackSection).toContain("font-family:");
    });

    it("should include visible content in the HTML template (h1 and p tags)", () => {
      const fallbackIdx = agentToolsContent.indexOf("Falling back to HTML template");
      const fallbackSection = agentToolsContent.slice(fallbackIdx, fallbackIdx + 2000);
      expect(fallbackSection).toContain("<h1>");
      expect(fallbackSection).toContain("<p>");
    });

    it("should use dark background with light text for visibility", () => {
      const fallbackIdx = agentToolsContent.indexOf("Falling back to HTML template");
      const fallbackSection = agentToolsContent.slice(fallbackIdx, fallbackIdx + 2000);
      // Dark background
      expect(fallbackSection).toContain("#0a0a0a");
      // Light text
      expect(fallbackSection).toContain("#fff");
    });
  });

  // ── PDF generation x-position reset ──

  describe("PDF generation x-position reset", () => {
    const docGenPath = path.resolve(__dirname, "documentGeneration.ts");
    const docGenContent = fs.readFileSync(docGenPath, "utf-8");

    it("should reset doc.x before rendering headings", () => {
      const headingSection = docGenContent.slice(
        docGenContent.indexOf('case "heading"'),
        docGenContent.indexOf('case "paragraph"')
      );
      expect(headingSection).toContain("doc.x = PAGE_LEFT");
    });

    it("should reset doc.x before rendering paragraphs", () => {
      const paragraphSection = docGenContent.slice(
        docGenContent.indexOf('case "paragraph"'),
        docGenContent.indexOf('case "list_item"')
      );
      expect(paragraphSection).toContain("doc.x = PAGE_LEFT");
    });

    it("should reset doc.x before rendering list items", () => {
      const listSection = docGenContent.slice(
        docGenContent.indexOf('case "list_item"'),
        docGenContent.indexOf('case "code"')
      );
      expect(listSection).toContain("doc.x = PAGE_LEFT");
    });

    it("should reset doc.x before rendering blockquotes", () => {
      const bqSection = docGenContent.slice(
        docGenContent.indexOf('case "blockquote"'),
        docGenContent.indexOf('case "table"')
      );
      expect(bqSection).toContain("doc.x = PAGE_LEFT");
    });

    it("should reset doc.x after table cell rendering to prevent drift", () => {
      const tableSection = docGenContent.slice(
        docGenContent.indexOf('case "table"'),
        docGenContent.indexOf('case "hr"')
      );
      // Should have x reset after cell loop
      const xResets = tableSection.match(/doc\.x = PAGE_LEFT/g);
      expect(xResets).not.toBeNull();
      // At least 2 resets: one after cells, one after table
      expect(xResets!.length).toBeGreaterThanOrEqual(2);
    });

    it("should use PAGE_WIDTH constraint on all text blocks", () => {
      // Every text() call for content blocks should have a width constraint
      expect(docGenContent).toContain('width: PAGE_WIDTH');
      expect(docGenContent).toContain('width: PAGE_WIDTH - 20'); // list items
      expect(docGenContent).toContain('width: PAGE_WIDTH - 24'); // blockquotes
    });
  });

  // ── Deploy webapp asset rewriting ──

  describe("Deploy webapp asset rewriting", () => {
    const agentToolsPath = path.resolve(__dirname, "agentTools.ts");
    const agentToolsContent = fs.readFileSync(agentToolsPath, "utf-8");

    it("should upload non-HTML files first to get their S3 URLs", () => {
      expect(agentToolsContent).toContain('if (file.relPath === "index.html") continue');
    });

    it("should rewrite asset references in HTML to use S3 URLs", () => {
      expect(agentToolsContent).toContain("assetUrlMap");
      expect(agentToolsContent).toContain("htmlContent = htmlContent.replace");
    });

    it("should handle both relative and absolute asset paths", () => {
      // The regex should handle both /path and path (with optional leading slash)
      expect(agentToolsContent).toContain("/?${escapedPath}");
    });
  });
});
