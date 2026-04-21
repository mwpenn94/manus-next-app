/**
 * P22 Tests — PlusMenu Wiring + Scrollbar Polish + Prompt Injection
 *
 * Covers: All 16 PlusMenu items wired to real navigation/actions,
 * Firefox scrollbar styling, onInjectPrompt callback in TaskView,
 * no remaining "Feature coming soon" placeholder toasts.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "..");

function readFile(relPath: string): string {
  return readFileSync(resolve(root, relPath), "utf-8");
}

describe("P22-1 — PlusMenu: All items wired to real actions", () => {
  const plusMenu = readFile("client/src/components/PlusMenu.tsx");

  it("imports useLocation from wouter for navigation", () => {
    expect(plusMenu).toContain('import { useLocation } from "wouter"');
  });

  it("uses navigate() from useLocation", () => {
    expect(plusMenu).toContain("useLocation()");
  });

  it("has route for Connect My Computer → /connect-device", () => {
    expect(plusMenu).toContain('route: "/connect-device"');
  });

  it("has route for Add Skills → /skills", () => {
    expect(plusMenu).toContain('route: "/skills"');
  });

  it("has route for Build website → /webapp-builder", () => {
    expect(plusMenu).toContain('route: "/webapp-builder"');
  });

  it("has route for Scheduled tasks → /schedule", () => {
    expect(plusMenu).toContain('route: "/schedule"');
  });

  it("has route for Create video → /video", () => {
    expect(plusMenu).toContain('route: "/video"');
  });

  it("has route for Generate audio → /client-inference", () => {
    expect(plusMenu).toContain('route: "/client-inference"');
  });

  it("has route for Playbook → /library", () => {
    expect(plusMenu).toContain('route: "/library"');
  });

  it("has prompt for Create slides", () => {
    expect(plusMenu).toContain('prompt: "Create a slide deck about "');
  });

  it("has prompt for Create image", () => {
    expect(plusMenu).toContain('prompt: "Generate an image of "');
  });

  it("has prompt for Edit image", () => {
    expect(plusMenu).toContain('prompt: "Edit this image: "');
  });

  it("has prompt for Wide Research", () => {
    expect(plusMenu).toContain('prompt: "Do wide research on "');
  });

  it("has prompt for Create spreadsheet", () => {
    expect(plusMenu).toContain('prompt: "Create a spreadsheet for "');
  });

  it("navigates when route-based item is clicked", () => {
    expect(plusMenu).toContain("if (item.route)");
    expect(plusMenu).toContain("navigate(item.route)");
  });

  it("calls onInjectPrompt when prompt-based item is clicked", () => {
    expect(plusMenu).toContain("if (item.prompt)");
    expect(plusMenu).toContain("onInjectPrompt(item.prompt)");
  });

  it("does NOT contain 'Feature coming soon' toast", () => {
    expect(plusMenu).not.toContain("Feature coming soon");
  });

  it("all 16 items have implemented: true", () => {
    const implementedCount = (plusMenu.match(/implemented: true/g) || []).length;
    expect(implementedCount).toBeGreaterThanOrEqual(16);
  });

  it("exposes onInjectPrompt prop", () => {
    expect(plusMenu).toContain("onInjectPrompt?:");
  });
});

describe("P22-2 — TaskView: onInjectPrompt wired to PlusMenu", () => {
  const taskView = readFile("client/src/pages/TaskView.tsx");

  it("passes onInjectPrompt callback to PlusMenu", () => {
    expect(taskView).toContain("onInjectPrompt=");
  });

  it("injects prompt into setInput", () => {
    expect(taskView).toMatch(/onInjectPrompt.*setInput/s);
  });

  it("focuses textarea after prompt injection", () => {
    expect(taskView).toContain("ta.focus()");
  });
});

describe("P22-3 — Firefox scrollbar styling", () => {
  const indexCss = readFile("client/src/index.css");

  it("has scrollbar-width: thin for Firefox", () => {
    expect(indexCss).toContain("scrollbar-width: thin");
  });

  it("has scrollbar-color for Firefox", () => {
    expect(indexCss).toContain("scrollbar-color:");
  });

  it("has webkit scrollbar styles for Chrome/Edge", () => {
    expect(indexCss).toContain("::-webkit-scrollbar");
  });
});

describe("P22-4 — No placeholder toasts in codebase", () => {
  it("PlusMenu has zero 'coming soon' strings", () => {
    const plusMenu = readFile("client/src/components/PlusMenu.tsx");
    expect(plusMenu).not.toMatch(/coming soon/i);
  });

  it("Photos section buttons trigger onAddFiles, not toast", () => {
    const plusMenu = readFile("client/src/components/PlusMenu.tsx");
    // PhotosSection should call onAddFiles, not toast
    expect(plusMenu).toContain("onAddFiles()");
    expect(plusMenu).not.toContain("Photo library");
  });
});
