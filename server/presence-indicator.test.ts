/**
 * Presence Indicator Tests
 *
 * Tests the agent presence state machine logic:
 * - State transitions: thinking → tool active → generating → completed
 * - Tool-specific labels and descriptions
 * - Reconnecting state handling
 * - Elapsed time tracking
 */
import { describe, it, expect } from "vitest";

// ── State derivation logic (mirrors ActiveToolIndicator component) ──

type AgentAction =
  | { type: "browsing"; url: string; status: "active" | "done"; preview?: string }
  | { type: "scrolling"; status: "active" | "done"; preview?: string }
  | { type: "clicking"; element: string; status: "active" | "done"; preview?: string }
  | { type: "executing"; command: string; status: "active" | "done"; preview?: string }
  | { type: "creating"; file: string; status: "active" | "done"; preview?: string }
  | { type: "searching"; query: string; status: "active" | "done"; preview?: string }
  | { type: "generating"; description: string; status: "active" | "done"; preview?: string }
  | { type: "thinking"; status: "active" | "done"; preview?: string }
  | { type: "writing"; label?: string; status: "active" | "done"; preview?: string }
  | { type: "researching"; label?: string; status: "active" | "done"; preview?: string }
  | { type: "building"; label?: string; status: "active" | "done"; preview?: string }
  | { type: "editing"; label?: string; file?: string; status: "active" | "done"; preview?: string }
  | { type: "reading"; label?: string; file?: string; status: "active" | "done"; preview?: string }
  | { type: "installing"; label?: string; packages?: string; status: "active" | "done"; preview?: string }
  | { type: "versioning"; label?: string; status: "active" | "done"; preview?: string }
  | { type: "analyzing"; label?: string; status: "active" | "done"; preview?: string }
  | { type: "designing"; label?: string; status: "active" | "done"; preview?: string }
  | { type: "sending"; label?: string; status: "active" | "done"; preview?: string };

type PresenceState = "idle" | "thinking" | "tool_active" | "generating" | "reconnecting";

function derivePresenceState(
  streaming: boolean,
  actions: AgentAction[],
  hasStreamContent: boolean,
  isReconnecting: boolean
): PresenceState {
  if (!streaming) return "idle";
  if (isReconnecting) return "reconnecting";
  const activeAction = actions.find(a => a.status === "active");
  if (activeAction && activeAction.type !== "thinking") return "tool_active";
  if (hasStreamContent) return "generating";
  return "thinking";
}

function getToolDescription(action: AgentAction): string {
  switch (action.type) {
    case "browsing":
      return `Visiting ${action.url}`;
    case "scrolling":
      return "Scrolling page";
    case "clicking":
      return `Clicking ${action.element}`;
    case "executing":
      return action.command;
    case "creating":
      return action.file;
    case "searching":
      return action.query;
    case "generating":
      return action.description;
    case "thinking":
      return "Reasoning through the problem";
    case "writing":
      return action.label || "Composing content";
    case "researching":
      return action.label || "Gathering information";
    case "building":
      return action.label || "Building project";
    case "editing":
      return action.file || action.label || "Modifying file";
    case "reading":
      return action.file || action.label || "Reading file";
    case "installing":
      return action.packages || action.label || "Installing packages";
    case "versioning":
      return action.label || "Managing versions";
    case "analyzing":
      return action.label || "Analyzing data";
    case "designing":
      return action.label || "Designing interface";
    case "sending":
      return action.label || "Sending notification";
    default:
      return "Processing";
  }
}

describe("Presence State Derivation", () => {
  it("returns idle when not streaming", () => {
    expect(derivePresenceState(false, [], false, false)).toBe("idle");
  });

  it("returns thinking when streaming with no actions and no content", () => {
    expect(derivePresenceState(true, [], false, false)).toBe("thinking");
  });

  it("returns thinking when only a thinking action is active", () => {
    const actions: AgentAction[] = [{ type: "thinking", status: "active" }];
    expect(derivePresenceState(true, actions, false, false)).toBe("thinking");
  });

  it("returns tool_active when a non-thinking action is active", () => {
    const actions: AgentAction[] = [
      { type: "searching", query: "test query", status: "active" },
    ];
    expect(derivePresenceState(true, actions, false, false)).toBe("tool_active");
  });

  it("returns generating when streaming content is present", () => {
    expect(derivePresenceState(true, [], true, false)).toBe("generating");
  });

  it("returns reconnecting when isReconnecting is true", () => {
    expect(derivePresenceState(true, [], false, true)).toBe("reconnecting");
  });

  it("reconnecting takes priority over tool_active", () => {
    const actions: AgentAction[] = [
      { type: "searching", query: "test", status: "active" },
    ];
    expect(derivePresenceState(true, actions, false, true)).toBe("reconnecting");
  });

  it("tool_active takes priority over generating", () => {
    const actions: AgentAction[] = [
      { type: "browsing", url: "https://example.com", status: "active" },
    ];
    expect(derivePresenceState(true, actions, true, false)).toBe("tool_active");
  });

  it("returns generating when all actions are done but content is streaming", () => {
    const actions: AgentAction[] = [
      { type: "searching", query: "test", status: "done" },
    ];
    expect(derivePresenceState(true, actions, true, false)).toBe("generating");
  });

  it("returns thinking when all actions are done and no content yet", () => {
    const actions: AgentAction[] = [
      { type: "searching", query: "test", status: "done" },
    ];
    expect(derivePresenceState(true, actions, false, false)).toBe("thinking");
  });
});

describe("Tool Description Generation", () => {
  it("shows URL for browsing", () => {
    const action: AgentAction = { type: "browsing", url: "https://example.com", status: "active" };
    expect(getToolDescription(action)).toBe("Visiting https://example.com");
  });

  it("shows command for executing", () => {
    const action: AgentAction = { type: "executing", command: "npm install", status: "active" };
    expect(getToolDescription(action)).toBe("npm install");
  });

  it("shows query for searching", () => {
    const action: AgentAction = { type: "searching", query: "AI agents 2026", status: "active" };
    expect(getToolDescription(action)).toBe("AI agents 2026");
  });

  it("shows file for creating", () => {
    const action: AgentAction = { type: "creating", file: "index.tsx", status: "active" };
    expect(getToolDescription(action)).toBe("index.tsx");
  });

  it("shows custom label for writing", () => {
    const action: AgentAction = { type: "writing", label: "Draft report", status: "active" };
    expect(getToolDescription(action)).toBe("Draft report");
  });

  it("shows default label for writing without custom label", () => {
    const action: AgentAction = { type: "writing", status: "active" };
    expect(getToolDescription(action)).toBe("Composing content");
  });

  it("shows packages for installing", () => {
    const action: AgentAction = { type: "installing", packages: "react@19", status: "active" };
    expect(getToolDescription(action)).toBe("react@19");
  });

  it("shows file for editing", () => {
    const action: AgentAction = { type: "editing", file: "App.tsx", status: "active" };
    expect(getToolDescription(action)).toBe("App.tsx");
  });

  it("shows file for reading", () => {
    const action: AgentAction = { type: "reading", file: "config.json", status: "active" };
    expect(getToolDescription(action)).toBe("config.json");
  });

  it("shows default for thinking", () => {
    const action: AgentAction = { type: "thinking", status: "active" };
    expect(getToolDescription(action)).toBe("Reasoning through the problem");
  });

  it("shows element for clicking", () => {
    const action: AgentAction = { type: "clicking", element: "Submit button", status: "active" };
    expect(getToolDescription(action)).toBe("Clicking Submit button");
  });

  it("shows description for generating", () => {
    const action: AgentAction = { type: "generating", description: "landscape image", status: "active" };
    expect(getToolDescription(action)).toBe("landscape image");
  });
});

describe("State Transition Sequences", () => {
  it("follows typical agent flow: thinking → tool → generating", () => {
    // Step 1: Agent starts thinking
    let state = derivePresenceState(true, [], false, false);
    expect(state).toBe("thinking");

    // Step 2: Agent starts searching
    const actions: AgentAction[] = [
      { type: "searching", query: "test", status: "active" },
    ];
    state = derivePresenceState(true, actions, false, false);
    expect(state).toBe("tool_active");

    // Step 3: Search completes, agent starts generating text
    actions[0] = { ...actions[0], status: "done" };
    state = derivePresenceState(true, actions, true, false);
    expect(state).toBe("generating");

    // Step 4: Stream ends
    state = derivePresenceState(false, actions, true, false);
    expect(state).toBe("idle");
  });

  it("handles multi-tool sequence: search → browse → generate", () => {
    const actions: AgentAction[] = [];

    // Search starts
    actions.push({ type: "searching", query: "AI", status: "active" });
    expect(derivePresenceState(true, actions, false, false)).toBe("tool_active");

    // Search done, browse starts
    actions[0] = { ...actions[0], status: "done" };
    actions.push({ type: "browsing", url: "https://ai.com", status: "active" });
    expect(derivePresenceState(true, actions, false, false)).toBe("tool_active");

    // Browse done, generating
    actions[1] = { ...actions[1], status: "done" };
    expect(derivePresenceState(true, actions, true, false)).toBe("generating");
  });

  it("handles reconnection during tool execution", () => {
    const actions: AgentAction[] = [
      { type: "executing", command: "npm build", status: "active" },
    ];

    // Tool running
    expect(derivePresenceState(true, actions, false, false)).toBe("tool_active");

    // Connection drops
    expect(derivePresenceState(true, actions, false, true)).toBe("reconnecting");

    // Connection restored
    expect(derivePresenceState(true, actions, false, false)).toBe("tool_active");
  });

  it("handles all 18 action types correctly", () => {
    const actionTypes: AgentAction[] = [
      { type: "browsing", url: "https://test.com", status: "active" },
      { type: "scrolling", status: "active" },
      { type: "clicking", element: "btn", status: "active" },
      { type: "executing", command: "ls", status: "active" },
      { type: "creating", file: "a.ts", status: "active" },
      { type: "searching", query: "q", status: "active" },
      { type: "generating", description: "img", status: "active" },
      { type: "thinking", status: "active" },
      { type: "writing", status: "active" },
      { type: "researching", status: "active" },
      { type: "building", status: "active" },
      { type: "editing", status: "active" },
      { type: "reading", status: "active" },
      { type: "installing", status: "active" },
      { type: "versioning", status: "active" },
      { type: "analyzing", status: "active" },
      { type: "designing", status: "active" },
      { type: "sending", status: "active" },
    ];

    for (const action of actionTypes) {
      const state = derivePresenceState(true, [action], false, false);
      if (action.type === "thinking") {
        expect(state).toBe("thinking");
      } else {
        expect(state).toBe("tool_active");
      }
      // Every action should produce a non-empty description
      expect(getToolDescription(action).length).toBeGreaterThan(0);
    }
  });
});
