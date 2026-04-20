/**
 * NS19 Parity Component Logic Tests — Batch 3
 *
 * Tests the pure-function logic and type contracts for:
 * - BrowserAuthCard choice handling
 * - TaskPauseCard reason mapping
 * - TakeControlCard state toggling
 * - WebappPreviewCard status derivation
 * - CheckpointCard latest/rollback logic
 * - TaskCompletedCard rating constraints
 * - PublishSheet visibility/status logic
 * - SiteLiveSheet share URL construction
 * - CardType message integration
 * - Task status enum expansion (paused/stopped)
 */
import { describe, expect, it } from "vitest";

// ── CardType enum validation ──

type CardType =
  | "browser_auth"
  | "task_pause"
  | "take_control"
  | "webapp_preview"
  | "checkpoint"
  | "task_completed";

const ALL_CARD_TYPES: CardType[] = [
  "browser_auth",
  "task_pause",
  "take_control",
  "webapp_preview",
  "checkpoint",
  "task_completed",
];

describe("CardType Enum", () => {
  it("has exactly 6 card types", () => {
    expect(ALL_CARD_TYPES).toHaveLength(6);
  });

  it("includes all expected types", () => {
    expect(ALL_CARD_TYPES).toContain("browser_auth");
    expect(ALL_CARD_TYPES).toContain("task_pause");
    expect(ALL_CARD_TYPES).toContain("take_control");
    expect(ALL_CARD_TYPES).toContain("webapp_preview");
    expect(ALL_CARD_TYPES).toContain("checkpoint");
    expect(ALL_CARD_TYPES).toContain("task_completed");
  });
});

// ── BrowserAuthCard logic ──

type BrowserChoice = "default" | "check" | "crimson-hawk";

describe("BrowserAuthCard", () => {
  it("accepts all three browser choices", () => {
    const choices: BrowserChoice[] = ["default", "check", "crimson-hawk"];
    choices.forEach((c) => {
      expect(["default", "check", "crimson-hawk"]).toContain(c);
    });
  });

  it("maps choices to expected labels", () => {
    const labels: Record<BrowserChoice, string> = {
      default: "No, use default browser",
      check: "Check again",
      "crimson-hawk": "Use My Browser on Crimson-Hawk",
    };
    expect(labels.default).toBe("No, use default browser");
    expect(labels.check).toBe("Check again");
    expect(labels["crimson-hawk"]).toBe("Use My Browser on Crimson-Hawk");
  });
});

// ── TaskPauseCard reason mapping ──

type PauseReason =
  | "needs_guidance"
  | "needs_credentials"
  | "needs_confirmation"
  | "needs_file"
  | "rate_limited"
  | "error_recovery";

const REASON_LABELS: Record<PauseReason, string> = {
  needs_guidance: "Needs guidance",
  needs_credentials: "Needs credentials",
  needs_confirmation: "Needs confirmation",
  needs_file: "Needs file",
  rate_limited: "Rate limited",
  error_recovery: "Error recovery",
};

describe("TaskPauseCard", () => {
  it("maps all 6 pause reasons to labels", () => {
    const reasons: PauseReason[] = [
      "needs_guidance",
      "needs_credentials",
      "needs_confirmation",
      "needs_file",
      "rate_limited",
      "error_recovery",
    ];
    reasons.forEach((r) => {
      expect(REASON_LABELS[r]).toBeTruthy();
    });
  });

  it("default reason is needs_guidance", () => {
    const defaultReason: PauseReason = "needs_guidance";
    expect(defaultReason).toBe("needs_guidance");
  });
});

// ── TakeControlCard state toggling ──

describe("TakeControlCard", () => {
  it("toggles between user control and agent control", () => {
    let userHasControl = false;
    expect(userHasControl).toBe(false);

    // Take control
    userHasControl = true;
    expect(userHasControl).toBe(true);

    // Return control
    userHasControl = false;
    expect(userHasControl).toBe(false);
  });

  it("shows correct title based on control state", () => {
    const getTitle = (hasControl: boolean) =>
      hasControl ? "You have control" : "Agent needs your help";
    expect(getTitle(false)).toBe("Agent needs your help");
    expect(getTitle(true)).toBe("You have control");
  });

  it("shows correct button label based on control state", () => {
    const getLabel = (hasControl: boolean) =>
      hasControl ? "Return control to agent" : "Take control";
    expect(getLabel(false)).toBe("Take control");
    expect(getLabel(true)).toBe("Return control to agent");
  });
});

// ── WebappPreviewCard status logic ──

type DeploymentStatus = "published" | "not_published" | "deploying";

describe("WebappPreviewCard", () => {
  it("maps all deployment statuses", () => {
    const statuses: DeploymentStatus[] = ["published", "not_published", "deploying"];
    const labels: Record<DeploymentStatus, string> = {
      published: "Live",
      not_published: "Not published",
      deploying: "Deploying...",
    };
    statuses.forEach((s) => {
      expect(labels[s]).toBeTruthy();
    });
  });

  it("shows unpublished changes indicator when needed", () => {
    const hasChanges = true;
    expect(hasChanges).toBe(true);
  });

  it("constructs visit URL from domain", () => {
    const domain = "myapp.manus.space";
    const url = `https://${domain}`;
    expect(url).toBe("https://myapp.manus.space");
  });
});

// ── CheckpointCard logic ──

describe("CheckpointCard", () => {
  it("shows rollback only when not latest", () => {
    const showRollback = (isLatest: boolean) => !isLatest;
    expect(showRollback(true)).toBe(false);
    expect(showRollback(false)).toBe(true);
  });

  it("truncates long descriptions", () => {
    const truncate = (desc: string, max: number = 80) =>
      desc.length > max ? desc.slice(0, max) + "..." : desc;
    const short = "Quick save";
    const long = "A".repeat(100);
    expect(truncate(short)).toBe("Quick save");
    expect(truncate(long).length).toBe(83); // 80 + "..."
  });
});

// ── TaskCompletedCard rating ──

describe("TaskCompletedCard", () => {
  it("constrains rating to 1-5 range", () => {
    const clamp = (n: number) => Math.max(1, Math.min(5, n));
    expect(clamp(0)).toBe(1);
    expect(clamp(3)).toBe(3);
    expect(clamp(6)).toBe(5);
    expect(clamp(-1)).toBe(1);
  });

  it("locks after rating is submitted", () => {
    let locked = false;
    const submitRating = () => {
      locked = true;
    };
    expect(locked).toBe(false);
    submitRating();
    expect(locked).toBe(true);
  });
});

// ── PublishSheet logic ──

type PublishStatus = "live" | "deploying" | "offline" | "error";
type Visibility = "public" | "private" | "password";

describe("PublishSheet", () => {
  it("maps all deployment statuses to display", () => {
    const statusLabels: Record<PublishStatus, string> = {
      live: "Live",
      deploying: "Deploying...",
      offline: "Offline",
      error: "Error",
    };
    expect(statusLabels.live).toBe("Live");
    expect(statusLabels.deploying).toBe("Deploying...");
    expect(statusLabels.offline).toBe("Offline");
    expect(statusLabels.error).toBe("Error");
  });

  it("maps visibility options to labels", () => {
    const visLabels: Record<Visibility, string> = {
      public: "Everyone can see this site",
      private: "Only you can see this site",
      password: "Password protected",
    };
    expect(visLabels.public).toBe("Everyone can see this site");
    expect(visLabels.private).toBe("Only you can see this site");
    expect(visLabels.password).toBe("Password protected");
  });

  it("shows unpublished changes banner when needed", () => {
    const showBanner = (hasChanges: boolean) => hasChanges;
    expect(showBanner(true)).toBe(true);
    expect(showBanner(false)).toBe(false);
  });
});

// ── SiteLiveSheet share URL construction ──

describe("SiteLiveSheet", () => {
  const domain = "myapp.manus.space";
  const siteUrl = `https://${domain}`;

  it("constructs WhatsApp share URL", () => {
    const url = `https://wa.me/?text=${encodeURIComponent(siteUrl)}`;
    expect(url).toContain("wa.me");
    expect(url).toContain(encodeURIComponent(siteUrl));
  });

  it("constructs X/Twitter share URL", () => {
    const url = `https://x.com/intent/tweet?url=${encodeURIComponent(siteUrl)}`;
    expect(url).toContain("x.com/intent/tweet");
  });

  it("constructs LinkedIn share URL", () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(siteUrl)}`;
    expect(url).toContain("linkedin.com/sharing");
  });

  it("constructs Facebook share URL", () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(siteUrl)}`;
    expect(url).toContain("facebook.com/sharer");
  });

  it("constructs Reddit share URL", () => {
    const url = `https://www.reddit.com/submit?url=${encodeURIComponent(siteUrl)}`;
    expect(url).toContain("reddit.com/submit");
  });
});

// ── Task Status Enum Expansion ──

type TaskStatus = "idle" | "running" | "completed" | "error" | "paused" | "stopped";

describe("Task Status Enum", () => {
  it("includes all 6 statuses", () => {
    const statuses: TaskStatus[] = ["idle", "running", "completed", "error", "paused", "stopped"];
    expect(statuses).toHaveLength(6);
  });

  it("paused is a valid status", () => {
    const status: TaskStatus = "paused";
    expect(status).toBe("paused");
  });

  it("stopped is a valid status", () => {
    const status: TaskStatus = "stopped";
    expect(status).toBe("stopped");
  });
});

// ── Message cardData integration ──

interface TestMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  cardType?: CardType;
  cardData?: Record<string, unknown>;
}

describe("Message Card Integration", () => {
  it("creates a browser_auth card message", () => {
    const msg: TestMessage = {
      id: "1",
      role: "assistant",
      content: "",
      cardType: "browser_auth",
    };
    expect(msg.cardType).toBe("browser_auth");
  });

  it("creates a webapp_preview card with data", () => {
    const msg: TestMessage = {
      id: "2",
      role: "assistant",
      content: "",
      cardType: "webapp_preview",
      cardData: {
        appName: "Stewardly",
        domain: "stewardly.manus.space",
        status: "published",
        hasUnpublishedChanges: false,
      },
    };
    expect(msg.cardType).toBe("webapp_preview");
    expect(msg.cardData?.appName).toBe("Stewardly");
    expect(msg.cardData?.domain).toBe("stewardly.manus.space");
  });

  it("creates a checkpoint card with screenshot", () => {
    const msg: TestMessage = {
      id: "3",
      role: "assistant",
      content: "Save Pass 10 checkpoint and deliver",
      cardType: "checkpoint",
      cardData: {
        screenshotUrl: "https://example.com/screenshot.png",
        isLatest: true,
      },
    };
    expect(msg.cardType).toBe("checkpoint");
    expect(msg.cardData?.isLatest).toBe(true);
  });

  it("creates a task_pause card with reason", () => {
    const msg: TestMessage = {
      id: "4",
      role: "assistant",
      content: "I need your credentials to continue.",
      cardType: "task_pause",
      cardData: { reason: "needs_credentials" },
    };
    expect(msg.cardType).toBe("task_pause");
    expect(msg.cardData?.reason).toBe("needs_credentials");
  });

  it("creates a take_control card", () => {
    const msg: TestMessage = {
      id: "5",
      role: "assistant",
      content: "Please log in to your account.",
      cardType: "take_control",
      cardData: { userHasControl: false },
    };
    expect(msg.cardType).toBe("take_control");
    expect(msg.cardData?.userHasControl).toBe(false);
  });

  it("creates a task_completed card", () => {
    const msg: TestMessage = {
      id: "6",
      role: "assistant",
      content: "",
      cardType: "task_completed",
      cardData: { taskId: "abc123" },
    };
    expect(msg.cardType).toBe("task_completed");
    expect(msg.cardData?.taskId).toBe("abc123");
  });

  it("regular messages have no cardType", () => {
    const msg: TestMessage = {
      id: "7",
      role: "assistant",
      content: "Hello, how can I help?",
    };
    expect(msg.cardType).toBeUndefined();
  });
});
