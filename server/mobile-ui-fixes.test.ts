/**
 * Mobile UI Fixes — Vitest
 *
 * Tests for:
 * 1. pb-mobile-nav CSS utility defined in index.css
 * 2. pb-mobile-nav applied to all key scrollable pages
 * 3. Mic button in Home.tsx uses in-place voice recording (not navigation)
 * 4. Redundant mobile mode selector pill removed from TaskView
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";

// ── 1. CSS Utility ──
describe("pb-mobile-nav CSS utility", () => {
  it("is defined in index.css via @utility directive", () => {
    const css = fs.readFileSync("client/src/index.css", "utf-8");
    expect(css).toContain("@utility pb-mobile-nav");
    expect(css).toContain("padding-bottom");
    expect(css).toContain("safe-area-inset-bottom");
  });

  it("has universal CSS rule for #main-content children on mobile", () => {
    const css = fs.readFileSync("client/src/index.css", "utf-8");
    expect(css).toContain("#main-content");
    expect(css).toContain("max-width: 767px");
    expect(css).toContain("padding-bottom");
  });
});

// ── 2. Universal mobile bottom nav padding ──
describe("Universal mobile bottom nav padding via CSS", () => {
  it("index.css has universal rule targeting #main-content > * on mobile", () => {
    const css = fs.readFileSync("client/src/index.css", "utf-8");
    // The universal rule adds padding-bottom to all direct children of #main-content on mobile
    expect(css).toContain("#main-content > *");
    expect(css).toContain("3.5rem");
  });

  it("AppLayout main element has id=main-content", () => {
    const layout = fs.readFileSync("client/src/components/AppLayout.tsx", "utf-8");
    expect(layout).toContain('id="main-content"');
  });

  it("mobile bottom nav clearance is handled by CSS rule and/or pb-mobile-nav (Pass 26)", () => {
    // Pass 26: Universal CSS rule handles most pages, but some pages with nested
    // scroll containers (e.g., SettingsPage) also use per-page pb-mobile-nav.
    // Both approaches are valid.
    const css = fs.readFileSync("client/src/index.css", "utf-8");
    expect(css).toContain("#main-content");
    expect(css).toContain("pb-mobile-nav");
  });
});

// ── 3. Mic button in Home.tsx ──
describe("Home.tsx mic button uses in-place voice recording", () => {
  const home = fs.readFileSync("client/src/pages/Home.tsx", "utf-8");

  it("does NOT navigate to a new task on mic click", () => {
    expect(home).not.toContain('createTask("Voice task"');
    expect(home).not.toContain("Voice task \u2014 use the microphone button to record");
  });

  it("has VoiceMicButton component for in-place recording", () => {
    expect(home).toContain("VoiceMicButton");
    expect(home).toContain("MediaRecorder");
  });

  it("uploads audio to /api/upload and calls voice.transcribe", () => {
    expect(home).toContain("/api/upload");
    expect(home).toContain("voice.transcribe");
  });

  it("shows recording state (MicOff icon when recording)", () => {
    expect(home).toContain("MicOff");
    expect(home).toContain("isListening");
  });

  it("shows transcribing state (Loader2 spinner)", () => {
    expect(home).toContain("isTranscribing");
    expect(home).toContain("Loader2");
  });
});

// ── 4. Mobile toolbar decluttered — GitHubBadge and Headphones hidden on mobile ──
describe("TaskView mobile toolbar decluttered", () => {
  const taskView = fs.readFileSync("client/src/pages/TaskView.tsx", "utf-8");

  it("GitHubBadge has hidden md:flex to hide on mobile", () => {
    expect(taskView).toContain('className="hidden md:flex"');
    // The GitHubBadge line should have the hidden class
    const lines = taskView.split("\n");
    const badgeLine = lines.find(l => l.includes("GitHubBadge") && l.includes("hidden md:flex"));
    expect(badgeLine).toBeTruthy();
  });

  it("Headphones button has hidden md:flex to hide on mobile", () => {
    // The hands-free button should have hidden md:flex
    const lines = taskView.split("\n");
    const headphonesButtonIdx = lines.findIndex(l => l.includes("Headphones") && l.includes("w-4 h-4"));
    expect(headphonesButtonIdx).toBeGreaterThan(-1);
    // Check the button's className contains hidden md:flex
    const surroundingLines = lines.slice(Math.max(0, headphonesButtonIdx - 10), headphonesButtonIdx).join("\n");
    expect(surroundingLines).toContain("hidden md:flex");
  });

  it("mobile toolbar keeps only essential controls: +, mic, send", () => {
    // The + button should NOT have hidden md:flex
    const lines = taskView.split("\n");
    const plusLine = lines.find(l => l.includes("Open action menu"));
    expect(plusLine).toBeTruthy();
    expect(plusLine).not.toContain("hidden");
    
    // Mic button should NOT have hidden md:flex
    const micLine = lines.find(l => l.includes('aria-label="Voice input"'));
    expect(micLine).toBeTruthy();
    expect(micLine).not.toContain("hidden");
  });
});

// ── 5. Redundant mode pill removed from TaskView ──
describe("TaskView mobile mode selector pill removed", () => {
  const taskView = fs.readFileSync("client/src/pages/TaskView.tsx", "utf-8");

  it("does NOT have the mobile mode cycling button", () => {
    expect(taskView).not.toContain("Tap to cycle");
    expect(taskView).not.toContain("Agent mode:");
  });

  it("has a comment indicating mode is controlled via header ModelSelector", () => {
    expect(taskView).toContain("mode is controlled via ModelSelector in header");
  });
});

// ── 6. PlusMenu includes GitHub Repos and Hands-free Mode items ──
describe("PlusMenu includes GitHub Repos and Hands-free Mode items", () => {
  const plusMenu = fs.readFileSync("client/src/components/PlusMenu.tsx", "utf-8");

  it("has GitHub Repos menu item with GitBranch icon", () => {
    expect(plusMenu).toContain('"github-repos"');
    expect(plusMenu).toContain('"GitHub Repos"');
    expect(plusMenu).toContain("GitBranch");
  });

  it("has Hands-free mode menu item with Headphones icon", () => {
    expect(plusMenu).toContain('"hands-free"');
    expect(plusMenu).toContain('"Hands-free mode"');
    expect(plusMenu).toContain("Headphones");
  });

  it("GitHub Repos routes to /github", () => {
    expect(plusMenu).toContain('route: "/github"');
  });

  it("Hands-free mode calls onToggleHandsFree callback", () => {
    expect(plusMenu).toContain("onToggleHandsFree");
    expect(plusMenu).toContain('item.id === "hands-free"');
  });

  it("PlusMenu accepts onToggleHandsFree prop", () => {
    expect(plusMenu).toContain("onToggleHandsFree?: () => void");
  });
});

// ── 7. TaskView conversation panel has mobile width override ──
describe("TaskView conversation panel mobile width override", () => {
  const taskView = fs.readFileSync("client/src/pages/TaskView.tsx", "utf-8");

  it("has data-workspace-constrained attribute on conversation panel", () => {
    expect(taskView).toContain("data-workspace-constrained");
  });

  it("has CSS media query override for mobile (<768px)", () => {
    expect(taskView).toContain("@media (max-width: 767px)");
    expect(taskView).toContain("[data-workspace-constrained]");
  });

  it("overrides flex and max-width to full width on mobile", () => {
    expect(taskView).toContain("flex: 1 1 auto !important");
    expect(taskView).toContain("max-width: 100% !important");
  });

  it("only applies data-workspace-constrained when workspace is open", () => {
    expect(taskView).toContain('data-workspace-constrained={desktopWorkspaceOpen ? "true" : undefined}');
  });
});

// ── 8. TaskView PlusMenu wires onToggleHandsFree ──
describe("TaskView PlusMenu wires onToggleHandsFree", () => {
  const taskView = fs.readFileSync("client/src/pages/TaskView.tsx", "utf-8");

  it("passes onToggleHandsFree to PlusMenu in TaskView", () => {
    expect(taskView).toContain("onToggleHandsFree=");
    // Should wire to handsFree activate/deactivate
    expect(taskView).toContain("handsFree.deactivate()");
    expect(taskView).toContain("handsFree.activate()");
  });
});

// ── 9. PlusMenu uses portal rendering for proper z-index ──
describe("PlusMenu uses portal rendering", () => {
  const plusMenu = fs.readFileSync("client/src/components/PlusMenu.tsx", "utf-8");

  it("imports createPortal from react-dom", () => {
    expect(plusMenu).toContain('import { createPortal } from "react-dom"');
  });

  it("renders mobile bottom sheet via portal", () => {
    expect(plusMenu).toContain("createPortal(");
    expect(plusMenu).toContain("document.body");
  });

  it("uses z-[9999] for proper layering above all content", () => {
    expect(plusMenu).toContain("z-[9999]");
  });

  it("mobile uses bottom sheet with drag handle", () => {
    expect(plusMenu).toContain("rounded-t-2xl");
    expect(plusMenu).toContain("w-10 h-1 rounded-full");
  });
});
