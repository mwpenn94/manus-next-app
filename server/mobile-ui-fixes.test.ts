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
  it("is defined in index.css with correct padding calculation", () => {
    const css = fs.readFileSync("client/src/index.css", "utf-8");
    expect(css).toContain(".pb-mobile-nav");
    expect(css).toContain("padding-bottom: calc(3.5rem");
    expect(css).toContain("safe-area-inset-bottom");
  });

  it("is scoped to mobile viewport only (max-width: 767px)", () => {
    const css = fs.readFileSync("client/src/index.css", "utf-8");
    const mobileMediaIdx = css.indexOf("max-width: 767px");
    const pbNavIdx = css.indexOf(".pb-mobile-nav");
    expect(mobileMediaIdx).toBeGreaterThan(-1);
    expect(pbNavIdx).toBeGreaterThan(mobileMediaIdx);
  });
});

// ── 2. Key pages have pb-mobile-nav ──
describe("pb-mobile-nav applied to key pages", () => {
  const keyPages = [
    "BillingPage",
    "Library",
    "SettingsPage",
    "AnalyticsPage",
    "DiscoverPage",
    "Home",
    "GitHubPage",
    "ProfilePage",
    "MemoryPage",
    "SchedulePage",
    "ProjectsPage",
    "TeamPage",
    "ConnectorsPage",
    "SkillsPage",
    "MeetingsPage",
    "ReplayPage",
  ];

  for (const page of keyPages) {
    it(`${page}.tsx has pb-mobile-nav`, () => {
      const content = fs.readFileSync(`client/src/pages/${page}.tsx`, "utf-8");
      expect(content).toContain("pb-mobile-nav");
    });
  }
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

// ── 4. Redundant mode pill removed from TaskView ──
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
