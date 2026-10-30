import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Source-guard tests for the sidebar footer's accessibility attributes.
 *
 * The "Continued on Sidekick" pinned footer (added on the Sidekick branch) is a
 * landmark region. To be announced correctly by assistive tech it carries
 * role="contentinfo" and an aria-label. These static guards pin that the footer
 * keeps those attributes and that they live on the SAME element as the footer
 * text, so a future refactor cannot silently drop the accessibility semantics.
 *
 * Like the other static-analysis guards in this repo, the suite runs in a node
 * environment (no DOM / React render harness), so we read the component source.
 */

const source = readFileSync(
  resolve(import.meta.dirname, "../client/src/components/AppLayout.tsx"),
  "utf8",
);

describe("sidebar footer — accessibility landmark", () => {
  it("marks the footer as a contentinfo landmark", () => {
    expect(source).toContain('role="contentinfo"');
  });

  it("gives the footer an aria-label", () => {
    expect(source).toContain('aria-label="Sidebar footer"');
  });

  it("keeps the landmark attributes on the same element as the footer text", () => {
    // role + aria-label must appear just before the "Continued on Sidekick"
    // text, on the same opening tag (no other element between them).
    const open = source.indexOf('role="contentinfo"');
    const label = source.indexOf('aria-label="Sidebar footer"');
    const text = source.indexOf("Continued on Sidekick");

    expect(open).toBeGreaterThan(-1);
    expect(label).toBeGreaterThan(-1);
    expect(text).toBeGreaterThan(-1);
    // Both attributes precede the footer text, and nothing else opens a tag
    // between the aria-label and the text (they belong to the same element).
    expect(label).toBeLessThan(text);
    expect(open).toBeLessThan(text);
    expect(source.slice(label, text).indexOf("<")).toBe(-1);
  });
});
