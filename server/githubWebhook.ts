/**
 * GitHub Webhook Handler — Receives push/PR events and triggers auto-deploy
 *
 * Manus Parity+: Auto-deploy on push to main branch (like Vercel/Netlify)
 * - HMAC-SHA256 signature verification
 * - Handles: push, pull_request (merged)
 * - Triggers deployFromGitHub pipeline for linked projects
 */
import type { Request, Response } from "express";
import crypto from "crypto";

// Webhook secret stored per-repo in the DB; fallback to env
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || "";

export interface GitHubWebhookEvent {
  action?: string;
  ref?: string;
  repository?: {
    full_name: string;
    default_branch: string;
  };
  head_commit?: {
    id: string;
    message: string;
    author: { name: string; email: string };
  };
  pull_request?: {
    merged: boolean;
    base: { ref: string };
    head: { ref: string };
    title: string;
    number: number;
  };
  sender?: { login: string };
}

/**
 * Verify GitHub webhook signature (HMAC-SHA256)
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string | undefined,
  secret: string
): boolean {
  if (!signature || !secret) return false;
  const sig = signature.startsWith("sha256=") ? signature : `sha256=${signature}`;
  const expected = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * Parse the branch name from a push event ref (refs/heads/main → main)
 */
export function parseBranchFromRef(ref: string): string {
  return ref.replace("refs/heads/", "");
}

/**
 * Determine if this event should trigger an auto-deploy
 */
export function shouldAutoDeploy(
  event: string,
  payload: GitHubWebhookEvent,
  targetBranch: string = "main"
): { shouldDeploy: boolean; branch: string; reason: string } {
  if (event === "push") {
    const branch = parseBranchFromRef(payload.ref || "");
    if (branch === targetBranch) {
      return {
        shouldDeploy: true,
        branch,
        reason: `Push to ${branch}: ${payload.head_commit?.message || "no message"}`,
      };
    }
    return { shouldDeploy: false, branch, reason: `Push to ${branch} (not target branch ${targetBranch})` };
  }

  if (event === "pull_request" && payload.action === "closed" && payload.pull_request?.merged) {
    const baseBranch = payload.pull_request.base.ref;
    if (baseBranch === targetBranch) {
      return {
        shouldDeploy: true,
        branch: baseBranch,
        reason: `PR #${payload.pull_request.number} merged into ${baseBranch}: ${payload.pull_request.title}`,
      };
    }
    return { shouldDeploy: false, branch: baseBranch, reason: `PR merged into ${baseBranch} (not target ${targetBranch})` };
  }

  return { shouldDeploy: false, branch: "", reason: `Event ${event}/${payload.action || "none"} does not trigger deploy` };
}

/**
 * Handle incoming GitHub webhook request
 */
export async function handleGitHubWebhook(req: Request, res: Response): Promise<void> {
  const event = req.headers["x-github-event"] as string;
  const delivery = req.headers["x-github-delivery"] as string;
  const signature = req.headers["x-hub-signature-256"] as string;

  if (!event) {
    res.status(400).json({ error: "Missing X-GitHub-Event header" });
    return;
  }

  // Ping event — just acknowledge
  if (event === "ping") {
    console.log(`[GitHub Webhook] Ping received (delivery: ${delivery})`);
    res.json({ ok: true, event: "ping" });
    return;
  }

  const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);

  // Verify signature if secret is configured
  if (WEBHOOK_SECRET) {
    if (!verifyWebhookSignature(rawBody, signature, WEBHOOK_SECRET)) {
      console.warn(`[GitHub Webhook] Signature verification failed (delivery: ${delivery})`);
      res.status(401).json({ error: "Invalid signature" });
      return;
    }
  }

  const payload: GitHubWebhookEvent = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const repoFullName = payload.repository?.full_name;

  if (!repoFullName) {
    res.status(400).json({ error: "Missing repository information" });
    return;
  }

  console.log(`[GitHub Webhook] ${event} on ${repoFullName} (delivery: ${delivery})`);

  try {
    // Look up linked projects for this repo
    const { getGitHubRepoByFullNameOnly, getWebappProjectsByGithubRepoId, updateWebappProject, createWebappDeployment, updateWebappDeployment, getUserConnectors } = await import("./db");

    const repo = await getGitHubRepoByFullNameOnly(repoFullName);
    if (!repo) {
      console.log(`[GitHub Webhook] No linked repo found for ${repoFullName}`);
      res.json({ ok: true, action: "ignored", reason: "No linked repo" });
      return;
    }

    const defaultBranch = repo.defaultBranch || "main";
    const { shouldDeploy, branch, reason } = shouldAutoDeploy(event, payload, defaultBranch);

    if (!shouldDeploy) {
      console.log(`[GitHub Webhook] Skipping: ${reason}`);
      res.json({ ok: true, action: "skipped", reason });
      return;
    }

    // Find projects linked to this repo
    const projects = await getWebappProjectsByGithubRepoId(repo.id);
    if (!projects || projects.length === 0) {
      console.log(`[GitHub Webhook] No projects linked to repo ${repoFullName}`);
      res.json({ ok: true, action: "ignored", reason: "No linked projects" });
      return;
    }

    // Get the repo owner's GitHub token
    const connectors = await getUserConnectors(repo.userId);
    const ghConn = connectors.find((c: any) => c.connectorId === "github" && c.status === "connected");
    if (!ghConn) {
      console.warn(`[GitHub Webhook] No GitHub connector for user ${repo.userId}`);
      res.json({ ok: true, action: "failed", reason: "No GitHub token available" });
      return;
    }

    const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;

    // Trigger deploy for each linked project
    const results: Array<{ projectId: number; status: string }> = [];

    for (const project of projects) {
      try {
        await updateWebappProject(project.id, { deployStatus: "building" });
        const depId = await createWebappDeployment({
          projectId: project.id,
          userId: repo.userId,
          versionLabel: `Auto-deploy: ${branch}`,
          commitSha: payload.head_commit?.id ?? null,
          commitMessage: reason,
          status: "building",
        });

        // Trigger async deploy (don't await — respond to webhook quickly)
        triggerAsyncDeploy(project, repo, token, branch, depId).catch((err) => {
          console.error(`[GitHub Webhook] Async deploy failed for project ${project.id}:`, err);
        });

        results.push({ projectId: project.id, status: "deploying" });
      } catch (err: any) {
        console.error(`[GitHub Webhook] Failed to start deploy for project ${project.id}:`, err);
        results.push({ projectId: project.id, status: "failed" });
      }
    }

    res.json({ ok: true, action: "deploying", results });
  } catch (err: any) {
    console.error(`[GitHub Webhook] Error:`, err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Trigger the actual deploy asynchronously (so webhook responds quickly)
 */
async function triggerAsyncDeploy(
  project: any,
  repo: any,
  token: string,
  branch: string,
  depId: number
): Promise<void> {
  const { getFileContent, getRepoTree } = await import("./githubApi");
  const { updateWebappDeployment, updateWebappProject } = await import("./db");
  const { storagePut } = await import("./storage");

  const buildLogLines: string[] = [`[${new Date().toISOString()}] Auto-deploy triggered by webhook`];
  const appendLog = async (line: string) => {
    buildLogLines.push(`[${new Date().toISOString()}] ${line}`);
    try { await updateWebappDeployment(depId, { buildLog: buildLogLines.join("\n") }); } catch {}
  };

  try {
    const [owner, repoName] = repo.fullName.split("/");
    await appendLog(`Fetching repo tree from branch: ${branch}`);

    const tree = await getRepoTree(token, owner, repoName, branch, true);
    const files = tree.tree.filter((f: any) => f.type === "blob");

    // Find index.html
    const searchPaths = ["", "public/", "dist/", "build/", "docs/"];
    let indexHtml: string | null = null;

    for (const prefix of searchPaths) {
      const indexFile = files.find((f: any) => f.path === `${prefix}index.html`);
      if (indexFile) {
        const content = await getFileContent(token, owner, repoName, indexFile.path, branch);
        if (content.content) {
          indexHtml = Buffer.from(content.content, "base64").toString("utf-8");
          break;
        }
      }
    }

    if (!indexHtml) {
      await appendLog("ERROR: No index.html found");
      await updateWebappDeployment(depId, { status: "failed", errorMessage: "No index.html found", buildLog: buildLogLines.join("\n") });
      await updateWebappProject(project.id, { deployStatus: "failed" });
      return;
    }

    await appendLog(`Found index.html (${(indexHtml.length / 1024).toFixed(1)} KB)`);

    // Upload to S3
    const deployKey = `webapp/${project.externalId}/index.html`;
    const { url } = await storagePut(deployKey, indexHtml, "text/html");
    await appendLog(`Uploaded to CDN: ${url}`);

    // Update project
    const publishedUrl = url;
    await updateWebappDeployment(depId, {
      status: "live",
      bundleUrl: publishedUrl,
      buildLog: buildLogLines.join("\n"),
      completedAt: new Date(),
    });
    await updateWebappProject(project.id, {
      deployStatus: "live",
      publishedUrl,
      lastDeployedAt: new Date(),
    });

    await appendLog("Deploy complete!");
  } catch (err: any) {
    await appendLog(`ERROR: ${err.message}`);
    await updateWebappDeployment(depId, { status: "failed", errorMessage: err.message, buildLog: buildLogLines.join("\n") });
    await updateWebappProject(project.id, { deployStatus: "failed" });
  }
}
