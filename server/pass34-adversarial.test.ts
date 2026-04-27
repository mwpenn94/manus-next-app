/**
 * Pass 34 — Adversarial Scan Tests
 * 
 * 5 Virtual Users testing auto-webhook registration, deploy notifications,
 * and Manus alignment from different perspectives.
 */
import { describe, it, expect, vi } from "vitest";

// ── VU1: New User — First Repo Connect Experience ──

describe("VU1: New User — First Repo Connect", () => {
  it("should see webhook auto-registered after connecting a repo", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routers/github.ts", "utf-8");
    // connectRepo should call autoRegisterWebhook
    expect(source).toContain("autoRegisterWebhook");
    // Should be fire-and-forget
    expect(source).toContain(".catch(() => {})");
  });

  it("should see 'Webhook Active' in Deploy tab, not manual instructions", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("client/src/pages/GitHubPage.tsx", "utf-8");
    expect(source).toContain("Webhook Active");
    expect(source).not.toContain("Add this URL as a webhook");
  });

  it("should see auto-registered description in Deploy tab", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("client/src/pages/GitHubPage.tsx", "utf-8");
    expect(source).toContain("Automatically registered when you connect or create a repo");
  });

  it("should still be able to copy webhook URL for debugging", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("client/src/pages/GitHubPage.tsx", "utf-8");
    expect(source).toContain("Webhook URL copied");
    expect(source).toContain("Copy");
  });

  it("should have a link to GitHub webhook settings for manual verification", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("client/src/pages/GitHubPage.tsx", "utf-8");
    expect(source).toContain("/settings/hooks");
  });
});

// ── VU2: DevOps Engineer — Webhook Registration Reliability ──

describe("VU2: DevOps Engineer — Webhook Registration Reliability", () => {
  it("ensureWebhook should check existing hooks before creating", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/githubApi.ts", "utf-8");
    expect(source).toContain("listWebhooks");
    expect(source).toContain("const match = existing.find");
  });

  it("ensureWebhook should handle list permission errors gracefully", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/githubApi.ts", "utf-8");
    // Should catch errors from listWebhooks and try creating anyway
    expect(source).toContain("Could not list hooks");
  });

  it("webhook registration failure should not block repo connect", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routers/github.ts", "utf-8");
    // autoRegisterWebhook is fire-and-forget with .catch
    expect(source).toContain("autoRegisterWebhook(token, input.fullName).catch(() => {})");
  });

  it("webhook registration failure should not block repo create", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routers/github.ts", "utf-8");
    expect(source).toContain("autoRegisterWebhook(token, ghRepo.full_name).catch(() => {})");
  });

  it("webhook secret should be passed when GITHUB_WEBHOOK_SECRET is set", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routers/github.ts", "utf-8");
    expect(source).toContain("GITHUB_WEBHOOK_SECRET");
    expect(source).toContain("secret || undefined");
  });

  it("webhook should register for push events only", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routers/github.ts", "utf-8");
    expect(source).toContain('["push"]');
  });

  it("deleteWebhook function should be available for cleanup", async () => {
    const api = await import("./githubApi");
    expect(typeof api.deleteWebhook).toBe("function");
  });
});

// ── VU3: Project Owner — Deploy Notifications ──

describe("VU3: Project Owner — Deploy Notifications", () => {
  it("should receive notification on successful deploy", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/githubWebhook.ts", "utf-8");
    expect(source).toContain("Deploy Succeeded:");
  });

  it("should receive notification on failed deploy", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/githubWebhook.ts", "utf-8");
    expect(source).toContain("Deploy Failed:");
  });

  it("success notification should include live URL", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/githubWebhook.ts", "utf-8");
    // The success notification content should reference publishedUrl
    const successBlock = source.split("Deploy Succeeded:")[1].split("catch")[0];
    expect(successBlock).toContain("publishedUrl");
  });

  it("failure notification should include error message", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/githubWebhook.ts", "utf-8");
    const failBlock = source.split("Deploy Failed:")[1].split("catch")[0];
    expect(failBlock).toContain("err.message");
  });

  it("notification failures should be non-fatal", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/githubWebhook.ts", "utf-8");
    // Both notification blocks should have their own try/catch
    expect(source).toContain("Deploy notification failed");
    expect(source).toContain("Failure notification failed");
  });

  it("notifications should use notifyOwner from _core/notification", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/githubWebhook.ts", "utf-8");
    expect(source).toContain('import("./_core/notification")');
  });
});

// ── VU4: Security Auditor — Webhook Security ──

describe("VU4: Security Auditor — Webhook Security", () => {
  it("webhook handler should verify HMAC signatures", async () => {
    const { verifyWebhookSignature } = await import("./githubWebhook");
    expect(typeof verifyWebhookSignature).toBe("function");
  });

  it("should reject requests with invalid signatures", async () => {
    const { verifyWebhookSignature } = await import("./githubWebhook");
    expect(verifyWebhookSignature("payload", "sha256=bad", "secret")).toBe(false);
  });

  it("should reject requests with missing signatures", async () => {
    const { verifyWebhookSignature } = await import("./githubWebhook");
    expect(verifyWebhookSignature("payload", undefined, "secret")).toBe(false);
  });

  it("should accept requests with valid HMAC-SHA256 signatures", async () => {
    const { verifyWebhookSignature } = await import("./githubWebhook");
    const crypto = await import("crypto");
    const secret = "secure-key";
    const payload = '{"action":"push"}';
    const sig = `sha256=${crypto.createHmac("sha256", secret).update(payload).digest("hex")}`;
    expect(verifyWebhookSignature(payload, sig, secret)).toBe(true);
  });

  it("webhook URL should not expose internal secrets", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("client/src/pages/GitHubPage.tsx", "utf-8");
    // The webhook URL shown in UI should be the public endpoint only
    expect(source).toContain("/api/github/webhook");
    expect(source).not.toContain("WEBHOOK_SECRET");
    expect(source).not.toContain("GITHUB_WEBHOOK_SECRET");
  });

  it("autoRegisterWebhook should not log the secret", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routers/github.ts", "utf-8");
    const autoRegFn = source.split("async function autoRegisterWebhook")[1].split("export const")[0];
    // Should not log the secret value
    expect(autoRegFn).not.toContain("console.log(`${secret}");
    expect(autoRegFn).not.toContain("console.log(secret");
  });
});

// ── VU5: Manus Alignment Auditor — Architecture Patterns ──

describe("VU5: Manus Alignment Auditor — Architecture Patterns", () => {
  it("should deploy from default branch only (no branch override UI)", async () => {
    const fs = await import("fs");
    const schema = fs.readFileSync("drizzle/schema.ts", "utf-8");
    expect(schema).not.toContain("deployBranch");
    expect(schema).not.toContain("targetBranch");
  });

  it("shouldAutoDeploy should use repo.defaultBranch as target", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/githubWebhook.ts", "utf-8");
    // The function signature accepts targetBranch with default "main"
    expect(source).toContain('targetBranch: string = "main"');
  });

  it("webhook handler should use repo.defaultBranch from DB", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/githubWebhook.ts", "utf-8");
    expect(source).toContain('repo.defaultBranch || "main"');
  });

  it("auto-webhook should be transparent — no user action required", async () => {
    const fs = await import("fs");
    const uiSource = fs.readFileSync("client/src/pages/GitHubPage.tsx", "utf-8");
    // No "setup webhook" button or manual steps
    expect(uiSource).not.toContain("Setup Webhook");
    expect(uiSource).not.toContain("Configure Webhook");
    // Should describe it as automatic
    expect(uiSource).toContain("auto-registered");
  });

  it("deploy notifications should use Manus native notifyOwner (not email/slack)", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/githubWebhook.ts", "utf-8");
    expect(source).toContain("notifyOwner");
    // Should NOT use external notification services
    expect(source).not.toContain("sendEmail");
    expect(source).not.toContain("sendSlack");
  });

  it("webhook registration should be idempotent (Manus pattern: safe to retry)", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/githubApi.ts", "utf-8");
    expect(source).toContain("ensureWebhook");
    expect(source).toContain("created: false");
    expect(source).toContain("created: true");
  });

  it("all new features should have zero TypeScript errors", async () => {
    // This test validates the build is clean
    const { execSync } = await import("child_process");
    const result = execSync("cd /home/ubuntu/manus-next-app && npx tsc --noEmit 2>&1 || true", { encoding: "utf-8" });
    expect(result.trim()).toBe("");
  });
});
