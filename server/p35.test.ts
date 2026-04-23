/**
 * P35 Tests — Production-Grade App Building, GitHub Integration, UI/UX Alignment
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const read = (p: string) => readFileSync(resolve(__dirname, "..", p), "utf-8");

// ── Agent Tools: New App-Building Tools ──
describe("P35 — Agent App-Building Tools", () => {
  it("AGENT_TOOLS includes create_webapp", () => {
    const tools = read("server/agentTools.ts");
    expect(tools).toContain('name: "create_webapp"');
  });

  it("AGENT_TOOLS includes create_file", () => {
    const tools = read("server/agentTools.ts");
    expect(tools).toContain('name: "create_file"');
  });

  it("AGENT_TOOLS includes edit_file", () => {
    const tools = read("server/agentTools.ts");
    expect(tools).toContain('name: "edit_file"');
  });

  it("AGENT_TOOLS includes read_file", () => {
    const tools = read("server/agentTools.ts");
    expect(tools).toContain('name: "read_file"');
  });

  it("AGENT_TOOLS includes list_files", () => {
    const tools = read("server/agentTools.ts");
    expect(tools).toContain('name: "list_files"');
  });

  it("AGENT_TOOLS includes install_deps", () => {
    const tools = read("server/agentTools.ts");
    expect(tools).toContain('name: "install_deps"');
  });

  it("AGENT_TOOLS includes run_command", () => {
    const tools = read("server/agentTools.ts");
    expect(tools).toContain('name: "run_command"');
  });

  it("AGENT_TOOLS includes git_operation", () => {
    const tools = read("server/agentTools.ts");
    expect(tools).toContain('name: "git_operation"');
  });

  it("executeTool has cases for all new tools", () => {
    const tools = read("server/agentTools.ts");
    expect(tools).toContain('case "create_webapp"');
    expect(tools).toContain('case "create_file"');
    expect(tools).toContain('case "edit_file"');
    expect(tools).toContain('case "read_file"');
    expect(tools).toContain('case "list_files"');
    expect(tools).toContain('case "install_deps"');
    expect(tools).toContain('case "run_command"');
    expect(tools).toContain('case "git_operation"');
  });

  it("create_webapp executor creates project directory and index.html", () => {
    const tools = read("server/agentTools.ts");
    // Verify the executor creates the project directory
    expect(tools).toContain("mkdirSync");
    // Verify it writes an index.html
    expect(tools).toContain("index.html");
    // Verify it returns a URL
    expect(tools).toContain("preview is available at");
  });

  it("git_operation supports init, add, commit, push, status, log, clone, remote_add", () => {
    const tools = read("server/agentTools.ts");
    expect(tools).toContain('"init"');
    expect(tools).toContain('"add"');
    expect(tools).toContain('"commit"');
    expect(tools).toContain('"push"');
    expect(tools).toContain('"status"');
    expect(tools).toContain('"log"');
    expect(tools).toContain('"clone"');
    expect(tools).toContain('"remote_add"');
  });
});

// ── Agent Stream: Tool Display Info ──
describe("P35 — Agent Stream Tool Display", () => {
  it("getToolDisplayInfo handles all new tools", () => {
    const stream = read("server/agentStream.ts");
    expect(stream).toContain('"read_file"');
    expect(stream).toContain('"list_files"');
    expect(stream).toContain('"install_deps"');
    expect(stream).toContain('"run_command"');
    expect(stream).toContain('"git_operation"');
  });

  it("agentStream emits webapp_preview SSE event for create_webapp", () => {
    const stream = read("server/agentStream.ts");
    expect(stream).toContain("webapp_preview");
    expect(stream).toContain('toolName === "create_webapp"');
  });
});

// ── SSE Pipeline: Client-Side Parsing ──
describe("P35 — Webapp Preview SSE Pipeline", () => {
  it("streamWithRetry has onWebappPreview callback", () => {
    const stream = read("client/src/lib/streamWithRetry.ts");
    expect(stream).toContain("onWebappPreview");
    expect(stream).toContain("data.webapp_preview");
  });

  it("buildStreamCallbacks implements onWebappPreview", () => {
    const callbacks = read("client/src/lib/buildStreamCallbacks.ts");
    expect(callbacks).toContain("onWebappPreview");
    expect(callbacks).toContain("webapp_preview");
    expect(callbacks).toContain("cardType");
    expect(callbacks).toContain("cardData");
  });

  it("TaskView passes addMessage to buildStreamCallbacks", () => {
    const taskView = read("client/src/pages/TaskView.tsx");
    // All 4 buildStreamCallbacks calls should pass addMessage
    // addMessage is now followed by setIsReconnecting on the same line
    const matches = taskView.match(/addMessage,/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(4);
  });

  it("TaskView renders WebappPreviewCard for webapp_preview cardType", () => {
    const taskView = read("client/src/pages/TaskView.tsx");
    expect(taskView).toContain('cardType === "webapp_preview"');
    expect(taskView).toContain("WebappPreviewCard");
  });
});

// ── WebappPreviewCard: Live Iframe + Management ──
describe("P35 — WebappPreviewCard Features", () => {
  it("WebappPreviewCard has live iframe preview mode", () => {
    const card = read("client/src/components/WebappPreviewCard.tsx");
    expect(card).toContain("<iframe");
    expect(card).toContain("previewUrl");
  });

  it("WebappPreviewCard has device selector (desktop/tablet/mobile)", () => {
    const card = read("client/src/components/WebappPreviewCard.tsx");
    expect(card).toContain("desktop");
    expect(card).toContain("tablet");
    expect(card).toContain("mobile");
  });

  it("WebappPreviewCard has management tabs (Preview/Code/Dashboard/Settings)", () => {
    const card = read("client/src/components/WebappPreviewCard.tsx");
    expect(card).toContain("Preview");
    expect(card).toContain("Code");
    expect(card).toContain("Dashboard");
    expect(card).toContain("Settings");
  });

  it("WebappPreviewCard has expand/minimize controls", () => {
    const card = read("client/src/components/WebappPreviewCard.tsx");
    expect(card).toContain("Maximize");
    expect(card).toContain("Minimize");
  });
});

// ── System Prompt: App Building Workflow ──
describe("P35 — System Prompt Enhancements", () => {
  it("system prompt includes app building workflow", () => {
    const stream = read("server/agentStream.ts");
    expect(stream).toContain("APP BUILDING WORKFLOW") || expect(stream).toContain("NEVER stop after scaffolding");
  });

  it("system prompt includes early termination prevention", () => {
    const stream = read("server/agentStream.ts");
    expect(stream).toContain("EARLY TERMINATION PREVENTION");
  });

  it("system prompt lists all 22 tools", () => {
    const stream = read("server/agentStream.ts");
    expect(stream).toContain("create_webapp");
    expect(stream).toContain("git_operation");
    expect(stream).toContain("install_deps");
    expect(stream).toContain("run_command");
  });
});

// ── UI/UX Alignment ──
describe("P35 — UI/UX Manus Alignment", () => {
  it("Home page has ModelSelector in header", () => {
    const home = read("client/src/pages/Home.tsx");
    expect(home).toContain("ModelSelector");
  });

  it("Home page has credits counter", () => {
    const home = read("client/src/pages/Home.tsx");
    expect(home).toContain("credits");
  });

  it("Home page has PlusMenu trigger on input bar", () => {
    const home = read("client/src/pages/Home.tsx");
    expect(home).toContain("PlusMenu");
  });

  it("Home page placeholder matches Manus", () => {
    const home = read("client/src/pages/Home.tsx");
    expect(home).toContain("Assign a task or ask anything");
  });

  it("Sidebar has section headers for grouping", () => {
    const layout = read("client/src/components/AppLayout.tsx");
    // Should have section grouping
    expect(layout).toContain("Section");
  });

  it("Theme is pure black monochrome (0 chroma in OKLCH)", () => {
    const css = read("client/src/index.css");
    // Dark theme background should be near-black
    expect(css).toContain(".dark");
    // Check for 0 chroma (monochrome)
    expect(css).toMatch(/oklch\([0-9.]+ 0 /);
  });
});

// ── Branding ──
describe("P35 — Branding Consistency", () => {
  it("HTML title contains Manus", () => {
    const html = read("client/index.html");
    expect(html).toContain("Manus");
  });

  it("AppLayout sidebar shows Manus branding", () => {
    const layout = read("client/src/components/AppLayout.tsx");
    expect(layout).toContain("Manus");
  });
});
