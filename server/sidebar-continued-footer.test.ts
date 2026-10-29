import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Source-guard tests for the sidebar bottom bar.
 *
 * The project's test suite runs in a node environment (no DOM / React render
 * harness), so — like the other static-analysis guards in this repo — these
 * tests read the component source and pin the invariants that a future refactor
 * of the bottom icon bar must not silently break.
 *
 * The "Continued on Sidekick" line is a pinned footer under the bottom icon bar
 * (added on the Sidekick branch). It must stay inside the authenticated branch
 * so it never leaks into the signed-out sidebar.
 */

const source = readFileSync(
  resolve(import.meta.dirname, "../client/src/components/AppLayout.tsx"),
  "utf8",
);

describe("sidebar bottom bar — 'Continued on Sidekick' footer", () => {
  it("renders the 'Continued on Sidekick' line", () => {
    expect(source).toContain("Continued on Sidekick");
  });

  it("keeps the footer inside the authenticated branch (not the signed-out view)", () => {
    // The footer must appear after the authenticated branch opens
    // (`isAuthenticated && user ? (`) and before the signed-out `else` branch
    // (the Sign in button), so it is never shown while signed out.
    const authOpen = source.indexOf("isAuthenticated && user ? (");
    const footer = source.indexOf("Continued on Sidekick");
    const signedOut = source.indexOf("Sign in with Manus");

    expect(authOpen).toBeGreaterThan(-1);
    expect(footer).toBeGreaterThan(-1);
    expect(signedOut).toBeGreaterThan(-1);
    expect(footer).toBeGreaterThan(authOpen);
    expect(footer).toBeLessThan(signedOut);
  });

  it("keeps the bottom icon bar pinned (shrink-0) so the footer stays put", () => {
    // The bottom bar container is the pinned, non-shrinking footer region.
    expect(source).toMatch(/Bottom Icon Bar[\s\S]*?shrink-0/);
  });
});
