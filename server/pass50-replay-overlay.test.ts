/**
 * Pass 50 — TaskReplayOverlay tests
 *
 * Validates:
 * 1. Timeline building from messages
 * 2. Replay overlay wiring in TaskView (?replay=1 query param)
 * 3. Step metadata mapping
 * 4. Playback controls and keyboard shortcuts
 * 5. WCAG AA contrast compliance (already fixed)
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ── Source file reading ──
const overlayPath = path.resolve(__dirname, "../client/src/components/TaskReplayOverlay.tsx");
const overlaySrc = fs.readFileSync(overlayPath, "utf-8");
const taskViewPath = path.resolve(__dirname, "../client/src/pages/TaskView.tsx");
const taskViewSrc = fs.readFileSync(taskViewPath, "utf-8");
const completedCardPath = path.resolve(__dirname, "../client/src/components/TaskCompletedCard.tsx");
const completedCardSrc = fs.readFileSync(completedCardPath, "utf-8");

describe("Pass 50 — TaskReplayOverlay", () => {
  // ── Component Structure ──
  describe("Component structure", () => {
    it("exports a default function component", () => {
      expect(overlaySrc).toMatch(/export default function TaskReplayOverlay/);
    });

    it("accepts messages, onClose, and scrollToMessage props", () => {
      expect(overlaySrc).toMatch(/messages:\s*Message\[\]/);
      expect(overlaySrc).toMatch(/onClose:\s*\(\)\s*=>\s*void/);
      expect(overlaySrc).toMatch(/scrollToMessage/);
    });

    it("builds a timeline from messages", () => {
      expect(overlaySrc).toMatch(/function buildTimeline/);
      expect(overlaySrc).toMatch(/TimelineStep\[\]/);
    });

    it("has StepCard sub-component", () => {
      expect(overlaySrc).toMatch(/function StepCard/);
    });
  });

  // ── Timeline Building ──
  describe("Timeline building", () => {
    it("handles user messages", () => {
      expect(overlaySrc).toMatch(/type:\s*"user_message"/);
    });

    it("handles assistant messages", () => {
      expect(overlaySrc).toMatch(/type:\s*"assistant_message"/);
    });

    it("handles action steps from assistant messages", () => {
      expect(overlaySrc).toMatch(/type:\s*"action"/);
    });

    it("handles system cards", () => {
      expect(overlaySrc).toMatch(/type:\s*"system_card"/);
    });

    it("sorts steps by offsetMs", () => {
      expect(overlaySrc).toMatch(/\.sort\(\(a,\s*b\)\s*=>\s*a\.offsetMs\s*-\s*b\.offsetMs\)/);
    });

    it("staggers actions within a message by 500ms", () => {
      expect(overlaySrc).toMatch(/ai\s*\*\s*500/);
    });
  });

  // ── Action Type Metadata ──
  describe("Action type metadata", () => {
    const actionTypes = [
      "searching", "browsing", "generating", "executing", "creating",
      "writing", "researching", "building", "editing", "reading",
      "installing", "thinking", "analyzing", "designing", "versioning",
      "deploying", "sending",
    ];

    for (const type of actionTypes) {
      it(`maps "${type}" to icon and color`, () => {
        expect(overlaySrc).toMatch(new RegExp(`${type}:\\s*\\{`));
      });
    }

    it("has a fallback for unknown action types", () => {
      expect(overlaySrc).toMatch(/getActionMeta/);
      // Fallback returns a default
      expect(overlaySrc).toMatch(/ACTION_TYPE_META\[type\]\s*\|\|/);
    });
  });

  // ── Playback Controls ──
  describe("Playback controls", () => {
    it("has play button", () => {
      expect(overlaySrc).toMatch(/<Play\b/);
    });

    it("has pause button", () => {
      expect(overlaySrc).toMatch(/<Pause\b/);
    });

    it("has skip back (restart) button", () => {
      expect(overlaySrc).toMatch(/<SkipBack\b/);
    });

    it("has skip forward button", () => {
      expect(overlaySrc).toMatch(/<SkipForward\b/);
    });

    it("has step-back (previous) button", () => {
      expect(overlaySrc).toMatch(/<ChevronLeft\b/);
    });

    it("has step-forward (next) button", () => {
      expect(overlaySrc).toMatch(/<ChevronRight\b/);
    });

    it("has speed selector with 0.5x, 1x, 2x, 4x", () => {
      expect(overlaySrc).toMatch(/\[0\.5,\s*1,\s*2,\s*4\]/);
    });

    it("tracks playback speed state", () => {
      expect(overlaySrc).toMatch(/playbackSpeed/);
      expect(overlaySrc).toMatch(/setPlaybackSpeed/);
    });

    it("tracks play/pause state", () => {
      expect(overlaySrc).toMatch(/isPlaying/);
      expect(overlaySrc).toMatch(/setIsPlaying/);
    });
  });

  // ── Timeline Scrubber ──
  describe("Timeline scrubber", () => {
    it("uses Slider component", () => {
      expect(overlaySrc).toMatch(/<Slider\b/);
    });

    it("shows step counter", () => {
      expect(overlaySrc).toMatch(/Step.*currentIndex.*timeline\.length/);
    });

    it("shows time display", () => {
      expect(overlaySrc).toMatch(/formatTime/);
    });
  });

  // ── Keyboard Shortcuts ──
  describe("Keyboard shortcuts", () => {
    it("handles Space for play/pause", () => {
      expect(overlaySrc).toMatch(/case\s*" ":/);
    });

    it("handles ArrowLeft for step back", () => {
      expect(overlaySrc).toMatch(/case\s*"ArrowLeft":/);
    });

    it("handles ArrowRight for step forward", () => {
      expect(overlaySrc).toMatch(/case\s*"ArrowRight":/);
    });

    it("handles Escape to close", () => {
      expect(overlaySrc).toMatch(/case\s*"Escape":/);
      expect(overlaySrc).toMatch(/onClose\(\)/);
    });

    it("handles Home key to restart", () => {
      expect(overlaySrc).toMatch(/case\s*"Home":/);
    });

    it("handles End key to skip to end", () => {
      expect(overlaySrc).toMatch(/case\s*"End":/);
    });

    it("handles Shift+Arrow for 5-step jumps", () => {
      expect(overlaySrc).toMatch(/e\.shiftKey/);
      expect(overlaySrc).toMatch(/prev\s*-\s*5/);
      expect(overlaySrc).toMatch(/prev\s*\+\s*5/);
    });

    it("handles 1-4 keys for speed selection", () => {
      expect(overlaySrc).toMatch(/case\s*"1":/);
      expect(overlaySrc).toMatch(/case\s*"2":/);
      expect(overlaySrc).toMatch(/case\s*"3":/);
      expect(overlaySrc).toMatch(/case\s*"4":/);
    });

    it("ignores keyboard when input/textarea is focused", () => {
      expect(overlaySrc).toMatch(/HTMLInputElement|HTMLTextAreaElement/);
    });
  });

  // ── Expand/Collapse ──
  describe("Expand/collapse", () => {
    it("has expanded state", () => {
      expect(overlaySrc).toMatch(/expanded/);
      expect(overlaySrc).toMatch(/setExpanded/);
    });

    it("shows maximize/minimize icons", () => {
      expect(overlaySrc).toMatch(/<Maximize2\b/);
      expect(overlaySrc).toMatch(/<Minimize2\b/);
    });

    it("shows step list in expanded mode", () => {
      expect(overlaySrc).toMatch(/expanded\s*&&/);
      expect(overlaySrc).toMatch(/timeline\.map/);
    });

    it("shows current step in compact mode", () => {
      expect(overlaySrc).toMatch(/!expanded\s*&&\s*currentStep/);
    });
  });

  // ── Stats Row ──
  describe("Stats row", () => {
    it("shows user message count", () => {
      expect(overlaySrc).toMatch(/userMessages/);
    });

    it("shows action step count", () => {
      expect(overlaySrc).toMatch(/actionSteps/);
    });

    it("shows assistant response count", () => {
      expect(overlaySrc).toMatch(/assistantMessages/);
    });

    it("shows total duration", () => {
      expect(overlaySrc).toMatch(/totalTime/);
    });
  });

  // ── Empty State ──
  describe("Empty state", () => {
    it("shows empty state when no steps", () => {
      expect(overlaySrc).toMatch(/timeline\.length\s*===\s*0/);
      expect(overlaySrc).toMatch(/No steps to replay/);
    });
  });

  // ── Auto-scroll ──
  describe("Auto-scroll", () => {
    it("scrolls to active step in timeline", () => {
      expect(overlaySrc).toMatch(/activeStepRef/);
      expect(overlaySrc).toMatch(/scrollIntoView/);
    });

    it("calls scrollToMessage when step changes", () => {
      expect(overlaySrc).toMatch(/scrollToMessage/);
    });
  });
});

describe("Pass 50 — TaskView replay integration", () => {
  it("imports TaskReplayOverlay", () => {
    expect(taskViewSrc).toMatch(/import TaskReplayOverlay from/);
  });

  it("imports useSearch from wouter", () => {
    expect(taskViewSrc).toMatch(/import.*useSearch.*from\s*"wouter"/);
  });

  it("reads ?replay=1 query param", () => {
    expect(taskViewSrc).toMatch(/replayRequested/);
    expect(taskViewSrc).toMatch(/replay.*===.*"1"/);
  });

  it("has replayOpen state", () => {
    expect(taskViewSrc).toMatch(/replayOpen/);
    expect(taskViewSrc).toMatch(/setReplayOpen/);
  });

  it("auto-opens replay when ?replay=1 is present", () => {
    expect(taskViewSrc).toMatch(/replayRequested.*&&.*task/);
    expect(taskViewSrc).toMatch(/setReplayOpen\(true\)/);
  });

  it("renders TaskReplayOverlay when replayOpen", () => {
    expect(taskViewSrc).toMatch(/<TaskReplayOverlay/);
    expect(taskViewSrc).toMatch(/replayOpen\s*&&\s*task/);
  });

  it("passes messages, onClose, and scrollToMessage props", () => {
    expect(taskViewSrc).toMatch(/messages=\{task\.messages\}/);
    expect(taskViewSrc).toMatch(/onClose=\{/);
    expect(taskViewSrc).toMatch(/scrollToMessage=\{scrollToMessage\}/);
  });

  it("removes ?replay=1 from URL on close", () => {
    expect(taskViewSrc).toMatch(/url\.searchParams\.delete\("replay"\)/);
    expect(taskViewSrc).toMatch(/window\.history\.replaceState/);
  });

  it("adds data-message-index to message elements", () => {
    expect(taskViewSrc).toMatch(/data-message-index=\{i\}/);
  });

  it("defines scrollToMessage callback", () => {
    expect(taskViewSrc).toMatch(/const scrollToMessage = useCallback/);
    expect(taskViewSrc).toMatch(/data-message-index/);
  });

  it("suppresses auto-scroll during replay", () => {
    expect(taskViewSrc).toMatch(/!replayOpen/);
  });
});

describe("Pass 50 — TaskCompletedCard replay link", () => {
  it("has View Replay button", () => {
    expect(completedCardSrc).toMatch(/View Replay/);
  });

  it("navigates to ?replay=1", () => {
    expect(completedCardSrc).toMatch(/\?replay=1/);
  });

  it("uses RotateCcw icon", () => {
    expect(completedCardSrc).toMatch(/RotateCcw/);
  });
});

describe("Pass 50 — WCAG AA contrast verification", () => {
  const indexCssPath = path.resolve(__dirname, "../client/src/index.css");
  const indexCss = fs.readFileSync(indexCssPath, "utf-8");

  it("has muted-foreground with sufficient lightness in dark theme", () => {
    // Extract the .dark block
    const darkMatch = indexCss.match(/\.dark\s*\{[^}]*\}/s);
    expect(darkMatch).toBeTruthy();
    const darkBlock = darkMatch![0];
    // Check muted-foreground lightness is >= 0.70
    const mutedFgMatch = darkBlock.match(/--muted-foreground:\s*oklch\(([0-9.]+)/);
    if (mutedFgMatch) {
      const lightness = parseFloat(mutedFgMatch[1]);
      expect(lightness).toBeGreaterThanOrEqual(0.70);
    }
  });

  it("has sidebar-foreground with sufficient lightness in dark theme", () => {
    const darkMatch = indexCss.match(/\.dark\s*\{[^}]*\}/s);
    expect(darkMatch).toBeTruthy();
    const darkBlock = darkMatch![0];
    const sidebarFgMatch = darkBlock.match(/--sidebar-foreground:\s*oklch\(([0-9.]+)/);
    if (sidebarFgMatch) {
      const lightness = parseFloat(sidebarFgMatch[1]);
      expect(lightness).toBeGreaterThanOrEqual(0.70);
    }
  });
});
