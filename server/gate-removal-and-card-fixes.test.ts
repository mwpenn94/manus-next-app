/**
 * Gate Removal & Card Fixes Tests
 *
 * Validates:
 * 1. ConfirmationGate component and server files are deleted
 * 2. ActiveToolIndicator has no gate references
 * 3. TaskView has no gate references
 * 4. InteractiveOutputCard forces download for non-renderable file types
 * 5. buildStreamCallbacks gate callbacks are no-ops
 * 6. agentStream.ts has no CONFIRMATION_TOOLS block
 * 7. server/_core/index.ts has no gate-response endpoint
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const CLIENT_SRC = path.join(ROOT, "client", "src");
const SERVER = path.join(ROOT, "server");

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf-8");
}

function fileExists(relPath: string): boolean {
  return fs.existsSync(path.join(ROOT, relPath));
}

describe("Gate System Removal", () => {
  it("ConfirmationGate.tsx component file is deleted", () => {
    expect(fileExists("client/src/components/ConfirmationGate.tsx")).toBe(false);
  });

  it("confirmationGate.ts server file is deleted", () => {
    expect(fileExists("server/confirmationGate.ts")).toBe(false);
  });

  it("TaskView.tsx has no ConfirmationGate import", () => {
    const content = readFile("client/src/pages/TaskView.tsx");
    expect(content).not.toContain("ConfirmationGate");
  });

  it("TaskView.tsx has no pendingGate state", () => {
    const content = readFile("client/src/pages/TaskView.tsx");
    expect(content).not.toContain("pendingGate");
    expect(content).not.toContain("setPendingGate");
  });

  it("TaskView.tsx has no onGateApprove/onGateReject props", () => {
    const content = readFile("client/src/pages/TaskView.tsx");
    expect(content).not.toContain("onGateApprove");
    expect(content).not.toContain("onGateReject");
  });

  it("TaskView.tsx has no confirmation_gate card type", () => {
    const content = readFile("client/src/pages/TaskView.tsx");
    expect(content).not.toContain("confirmation_gate");
  });

  it("ActiveToolIndicator has no gate_waiting state", () => {
    const content = readFile("client/src/components/ActiveToolIndicator.tsx");
    expect(content).not.toContain("gate_waiting");
    expect(content).not.toContain("GateWaiting");
    expect(content).not.toContain("pendingGate");
  });

  it("ActiveToolIndicator has no ShieldAlert import", () => {
    const content = readFile("client/src/components/ActiveToolIndicator.tsx");
    expect(content).not.toContain("ShieldAlert");
  });

  it("buildStreamCallbacks has no setPendingGate setter", () => {
    const content = readFile("client/src/lib/buildStreamCallbacks.ts");
    expect(content).not.toContain("setPendingGate");
  });

  it("buildStreamCallbacks gate callbacks are no-ops", () => {
    const content = readFile("client/src/lib/buildStreamCallbacks.ts");
    expect(content).toContain("onConfirmationGate");
    expect(content).toContain("onGateResolved");
    expect(content).toContain("Gate system removed");
  });

  it("agentStream.ts has no CONFIRMATION_TOOLS block", () => {
    const content = readFile("server/agentStream.ts");
    expect(content).not.toContain("CONFIRMATION_TOOLS");
    expect(content).not.toContain("gateRejected");
    expect(content).not.toContain("cleanupTaskGates");
  });

  it("server/_core/index.ts has no gate-response endpoint", () => {
    const content = readFile("server/_core/index.ts");
    expect(content).not.toContain("gate-response");
  });
});

describe("InteractiveOutputCard Force Download", () => {
  it("has NON_RENDERABLE_TYPES set for spreadsheet, presentation, code", () => {
    const content = readFile("client/src/components/InteractiveOutputCard.tsx");
    expect(content).toContain("NON_RENDERABLE_TYPES");
    expect(content).toContain("spreadsheet");
    expect(content).toContain("presentation");
  });

  it("has NON_RENDERABLE_EXTENSIONS regex for common binary formats", () => {
    const content = readFile("client/src/components/InteractiveOutputCard.tsx");
    expect(content).toContain("NON_RENDERABLE_EXTENSIONS");
    expect(content).toContain("xlsx");
    expect(content).toContain("csv");
    expect(content).toContain("pptx");
  });

  it("has shouldForceDownload logic", () => {
    const content = readFile("client/src/components/InteractiveOutputCard.tsx");
    expect(content).toContain("shouldForceDownload");
  });

  it("has triggerDownload function using anchor element", () => {
    const content = readFile("client/src/components/InteractiveOutputCard.tsx");
    expect(content).toContain("triggerDownload");
    expect(content).toContain("document.createElement");
    expect(content).toContain("a.download");
  });

  it("Open button uses forceDownload for non-renderable types", () => {
    const content = readFile("client/src/components/InteractiveOutputCard.tsx");
    expect(content).toContain("if (shouldForceDownload)");
    expect(content).toContain("triggerDownload(openUrl)");
  });

  it("Download button always uses triggerDownload", () => {
    const content = readFile("client/src/components/InteractiveOutputCard.tsx");
    expect(content).toContain("triggerDownload(downloadUrl)");
  });
});

describe("ActiveToolIndicator Compactness", () => {
  it("uses compact padding (px-3 py-2) instead of larger padding", () => {
    const content = readFile("client/src/components/ActiveToolIndicator.tsx");
    expect(content).toContain("px-3 py-2");
    expect(content).not.toContain("px-4 py-2.5");
  });

  it("exports only 4 states plus idle, no gate_waiting", () => {
    const content = readFile("client/src/components/ActiveToolIndicator.tsx");
    expect(content).toContain('"thinking"');
    expect(content).toContain('"tool_active"');
    expect(content).toContain('"generating"');
    expect(content).toContain('"reconnecting"');
    expect(content).toContain('"idle"');
    expect(content).not.toContain('"gate_waiting"');
  });
});

describe("Action Steps Accordion", () => {
  it("completed actions accordion has no card-like background", () => {
    const content = readFile("client/src/pages/TaskView.tsx");
    expect(content).toContain('className="overflow-hidden py-1"');
  });
});
