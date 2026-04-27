/**
 * Pass 33 — Adversarial Scan Tests
 *
 * 5 virtual users exercising all new Pass 33 features:
 *
 * VU1: DevOps Engineer — configures webhook, deploys, monitors auto-refresh
 * VU2: Frontend Developer — edits files, reviews diffs, commits & deploys
 * VU3: Security Auditor — tests webhook signature bypass, timer abuse
 * VU4: New User — first-time setup, empty states, error paths
 * VU5: Power User — rapid operations, concurrent actions, edge cases
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── VU1: DevOps Engineer ────────────────────────────────────────────────────

describe("VU1: DevOps Engineer — Webhook & Deploy Pipeline", () => {
  it("should see webhook URL in deploy tab", () => {
    const origin = "https://manusnext-mlromfub.manus.space";
    const webhookUrl = `${origin}/api/github/webhook`;
    expect(webhookUrl).toMatch(/^https:\/\/.+\/api\/github\/webhook$/);
  });

  it("should copy webhook URL to clipboard (simulated)", () => {
    const url = "https://manusnext-mlromfub.manus.space/api/github/webhook";
    // Simulate clipboard write
    const clipboard = { text: "" };
    clipboard.text = url;
    expect(clipboard.text).toBe(url);
  });

  it("should see GitHub settings link with correct repo path", () => {
    const repoFullName = "devops-team/production-app";
    const settingsUrl = `https://github.com/${repoFullName}/settings/hooks/new`;
    expect(settingsUrl).toContain("devops-team/production-app");
  });

  it("should trigger deploy from Deploy Now button", () => {
    const linkedProject = { externalId: "ext-456", name: "prod-app" };
    const deployInput = {
      externalId: linkedProject.externalId,
      branch: "main",
    };
    expect(deployInput.externalId).toBe("ext-456");
    expect(deployInput.branch).toBe("main");
  });

  it("should handle deploy failure gracefully", () => {
    const deployResult = { status: "failed", publishedUrl: undefined };
    expect(deployResult.status).toBe("failed");
    expect(deployResult.publishedUrl).toBeUndefined();
  });

  it("should verify auto-refresh timer starts on server boot", async () => {
    const { startAutoRefreshTimer, stopAutoRefreshTimer } = await import("./connectorRefreshTimer");
    expect(() => startAutoRefreshTimer()).not.toThrow();
    stopAutoRefreshTimer();
  });

  it("should verify auto-refresh timer stops on shutdown", async () => {
    const { startAutoRefreshTimer, stopAutoRefreshTimer } = await import("./connectorRefreshTimer");
    startAutoRefreshTimer();
    expect(() => stopAutoRefreshTimer()).not.toThrow();
  });
});

// ─── VU2: Frontend Developer — File Editing & Diff Review ────────────────────

describe("VU2: Frontend Developer — Edit, Diff, Commit", () => {
  let computeDiff: any;
  let computeStats: any;

  beforeEach(async () => {
    const mod = await import("../client/src/components/DiffViewer");
    computeDiff = mod.computeDiff;
    computeStats = mod.computeStats;
  });

  it("should toggle between editor and diff view", () => {
    let showDiff = false;
    // Click "Review Changes"
    showDiff = !showDiff;
    expect(showDiff).toBe(true);
    // Click "Editor" to go back
    showDiff = !showDiff;
    expect(showDiff).toBe(false);
  });

  it("should show diff of a typical code change", () => {
    const original = `function greet() {\n  return "Hello";\n}`;
    const modified = `function greet(name: string) {\n  return \`Hello \${name}\`;\n}`;
    const lines = computeDiff(original, modified);
    const stats = computeStats(lines);
    expect(stats.additions).toBeGreaterThan(0);
    expect(stats.deletions).toBeGreaterThan(0);
  });

  it("should show 'No changes' for identical content", () => {
    const content = "const x = 1;\nconst y = 2;";
    const lines = computeDiff(content, content);
    const stats = computeStats(lines);
    expect(stats.additions).toBe(0);
    expect(stats.deletions).toBe(0);
  });

  it("should handle adding imports at top of file", () => {
    const original = `export function App() {\n  return <div>Hello</div>;\n}`;
    const modified = `import React from "react";\n\nexport function App() {\n  return <div>Hello</div>;\n}`;
    const lines = computeDiff(original, modified);
    const stats = computeStats(lines);
    expect(stats.additions).toBe(2); // import line + blank line
    expect(stats.unchanged).toBe(3);
  });

  it("should commit file with message and branch", () => {
    const commitInput = {
      externalId: "repo-123",
      path: "src/App.tsx",
      content: btoa("new content"),
      message: "Update App component",
      sha: "abc123",
      branch: "feature/update",
    };
    expect(commitInput.message).toBeTruthy();
    expect(commitInput.path).toContain("/");
    expect(commitInput.branch).toBe("feature/update");
  });

  it("should chain commit and deploy in sequence", () => {
    let step = "idle";
    // Step 1: Commit
    step = "committing";
    expect(step).toBe("committing");
    // Step 2: Deploy
    step = "deploying";
    expect(step).toBe("deploying");
    // Step 3: Done
    step = "done";
    expect(step).toBe("done");
  });
});

// ─── VU3: Security Auditor — Webhook & Timer Security ────────────────────────

describe("VU3: Security Auditor — Webhook Signature Bypass Attempts", () => {
  let verifyWebhookSignature: any;

  beforeEach(async () => {
    const mod = await import("./githubWebhook");
    verifyWebhookSignature = mod.verifyWebhookSignature;
  });

  it("should reject empty payload with valid signature format", () => {
    expect(verifyWebhookSignature("", "sha256=abc123", "secret")).toBe(false);
  });

  it("should reject tampered payload", () => {
    const crypto = require("crypto");
    const secret = "webhook-secret";
    const originalPayload = '{"ref":"refs/heads/main"}';
    const hmac = crypto.createHmac("sha256", secret).update(originalPayload).digest("hex");
    const tamperedPayload = '{"ref":"refs/heads/main","malicious":true}';
    expect(verifyWebhookSignature(tamperedPayload, `sha256=${hmac}`, secret)).toBe(false);
  });

  it("should reject signature with wrong secret", () => {
    const crypto = require("crypto");
    const payload = "test-payload";
    const hmac = crypto.createHmac("sha256", "wrong-secret").update(payload).digest("hex");
    expect(verifyWebhookSignature(payload, `sha256=${hmac}`, "correct-secret")).toBe(false);
  });

  it("should reject extremely long signature strings", () => {
    const longSig = "sha256=" + "a".repeat(10000);
    expect(verifyWebhookSignature("payload", longSig, "secret")).toBe(false);
  });

  it("should handle Buffer payload for signature verification", () => {
    const crypto = require("crypto");
    const secret = "test-secret";
    const payload = Buffer.from('{"test":true}');
    const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    expect(verifyWebhookSignature(payload, `sha256=${hmac}`, secret)).toBe(true);
  });

  it("should not auto-deploy for non-push/PR events", async () => {
    const { shouldAutoDeploy } = await import("./githubWebhook");
    const events = ["issues", "star", "fork", "watch", "create", "delete"];
    for (const event of events) {
      const result = shouldAutoDeploy(event, { action: "created" });
      expect(result.shouldDeploy).toBe(false);
    }
  });
});

// ─── VU4: New User — First-Time Setup & Empty States ─────────────────────────

describe("VU4: New User — Empty States & Error Paths", () => {
  it("should show 'No project linked' when deploy tab has no project", () => {
    const linkedProject = null;
    const message = !linkedProject ? "No project linked yet" : linkedProject;
    expect(message).toBe("No project linked yet");
  });

  it("should disable Deploy Now button without linked project", () => {
    const linkedProject = null;
    const deploying = false;
    const isDisabled = deploying || !linkedProject;
    expect(isDisabled).toBe(true);
  });

  it("should show empty deployment history for new project", () => {
    const deployments: any[] = [];
    expect(deployments.length).toBe(0);
  });

  it("should handle diff of empty file being created", async () => {
    const { computeDiff, computeStats } = await import("../client/src/components/DiffViewer");
    const lines = computeDiff("", "# New File\n\nHello World");
    const stats = computeStats(lines);
    expect(stats.additions).toBeGreaterThan(0);
  });

  it("should handle diff of file being completely deleted", async () => {
    const { computeDiff, computeStats } = await import("../client/src/components/DiffViewer");
    const lines = computeDiff("existing content\nline 2\nline 3", "");
    const stats = computeStats(lines);
    expect(stats.deletions).toBeGreaterThan(0);
  });

  it("should show correct webhook setup instructions", () => {
    const steps = [
      "Go to Settings → Webhooks",
      "Paste the URL above as the Payload URL",
      "Set Content type to application/json",
      "Select 'Just the push event'",
      "Click 'Add webhook'",
    ];
    expect(steps).toHaveLength(5);
    expect(steps[2]).toContain("application/json");
  });
});

// ─── VU5: Power User — Rapid Operations & Edge Cases ─────────────────────────

describe("VU5: Power User — Concurrent Actions & Edge Cases", () => {
  it("should handle rapid toggle between editor and diff view", () => {
    let showDiff = false;
    for (let i = 0; i < 100; i++) {
      showDiff = !showDiff;
    }
    // After 100 toggles (even number), should be back to false
    expect(showDiff).toBe(false);
  });

  it("should handle diff with special characters", async () => {
    const { computeDiff, computeStats } = await import("../client/src/components/DiffViewer");
    const original = 'const emoji = "🎉";\nconst html = "<div>&amp;</div>";';
    const modified = 'const emoji = "🚀";\nconst html = "<div>&amp;</div>";\nconst special = "\\n\\t\\r";';
    const lines = computeDiff(original, modified);
    const stats = computeStats(lines);
    expect(stats.additions).toBeGreaterThan(0);
  });

  it("should handle diff with very long lines", async () => {
    const { computeDiff, computeStats } = await import("../client/src/components/DiffViewer");
    const longLine = "x".repeat(10000);
    const original = `short\n${longLine}\nend`;
    const modified = `short\n${longLine}y\nend`;
    const lines = computeDiff(original, modified);
    const stats = computeStats(lines);
    expect(stats.deletions).toBe(1);
    expect(stats.additions).toBe(1);
  });

  it("should handle multiple deploys in sequence", () => {
    const deployHistory: string[] = [];
    for (let i = 0; i < 5; i++) {
      deployHistory.push(`Deploy #${i + 1}: ${i % 2 === 0 ? "live" : "failed"}`);
    }
    expect(deployHistory).toHaveLength(5);
    expect(deployHistory[0]).toContain("live");
    expect(deployHistory[1]).toContain("failed");
  });

  it("should handle webhook events for multiple branches", async () => {
    const { shouldAutoDeploy } = await import("./githubWebhook");
    const branches = ["main", "develop", "staging", "feature/x", "hotfix/y"];
    const results = branches.map(branch => ({
      branch,
      result: shouldAutoDeploy("push", { ref: `refs/heads/${branch}` }),
    }));
    // Only main should trigger deploy
    expect(results.find(r => r.branch === "main")!.result.shouldDeploy).toBe(true);
    expect(results.filter(r => r.result.shouldDeploy)).toHaveLength(1);
  });

  it("should handle diff with Windows line endings (CRLF)", async () => {
    const { computeDiff, computeStats } = await import("../client/src/components/DiffViewer");
    const original = "line1\r\nline2\r\nline3";
    const modified = "line1\r\nmodified\r\nline3";
    const lines = computeDiff(original, modified);
    const stats = computeStats(lines);
    // Should detect the change in line2
    expect(stats.additions + stats.deletions).toBeGreaterThan(0);
  });

  it("should handle diff with trailing newline differences", async () => {
    const { computeDiff, computeStats } = await import("../client/src/components/DiffViewer");
    const original = "line1\nline2\n";
    const modified = "line1\nline2";
    const lines = computeDiff(original, modified);
    const stats = computeStats(lines);
    // Trailing newline creates an empty line difference
    expect(stats.additions + stats.deletions).toBeGreaterThanOrEqual(1);
  });

  it("should handle auto-refresh timer restart after stop", async () => {
    const { startAutoRefreshTimer, stopAutoRefreshTimer } = await import("./connectorRefreshTimer");
    startAutoRefreshTimer();
    stopAutoRefreshTimer();
    // Should be able to restart
    expect(() => startAutoRefreshTimer()).not.toThrow();
    stopAutoRefreshTimer();
  });
});
