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
  const branch = ref.replace("refs/heads/", "");
  // Defense-in-depth: strip any characters that shouldn't appear in git branch names
  // Valid git ref chars: alphanumeric, /, -, _, . (no shell metacharacters)
  return branch.replace(/[^a-zA-Z0-9/_\-.]/g, "");
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

    // Detect project type: does it have package.json with a build script?
    const packageJsonFile = files.find((f: any) => f.path === "package.json");
    let needsBuild = false;
    let buildScript = "";

    if (packageJsonFile) {
      try {
        const pkgContent = await getFileContent(token, owner, repoName, "package.json", branch);
        if (pkgContent.content) {
          const pkg = JSON.parse(Buffer.from(pkgContent.content, "base64").toString("utf-8"));
          if (pkg.scripts?.build) {
            needsBuild = true;
            buildScript = pkg.scripts.build;
            await appendLog(`Detected build-required project (build script: ${buildScript})`);
          }
        }
      } catch (pkgErr: any) {
        await appendLog(`Warning: Could not parse package.json: ${pkgErr.message}`);
      }
    }

    let publishedUrl: string;

    if (needsBuild) {
      // BUILD-REQUIRED PROJECT: Clone, install, build, upload all output files
      const { execSync } = await import("child_process");
      const fs = await import("fs");
      const path = await import("path");
      const os = await import("os");

      const tmpDir = path.join(os.tmpdir(), `deploy-${project.externalId}-${Date.now()}`);
      await appendLog(`Cloning repo to temp directory...`);

      try {
        // Clone with token auth
        const cloneUrl = `https://x-access-token:${token}@github.com/${repo.fullName}.git`;
        execSync(`git clone --depth 1 --branch ${branch} ${cloneUrl} ${tmpDir}`, { timeout: 60000 });
        await appendLog(`Cloned successfully. Installing dependencies...`);

        // Install dependencies
        const hasYarnLock = fs.existsSync(path.join(tmpDir, "yarn.lock"));
        const hasPnpmLock = fs.existsSync(path.join(tmpDir, "pnpm-lock.yaml"));
        const installCmd = hasPnpmLock ? "pnpm install --frozen-lockfile" : hasYarnLock ? "yarn install --frozen-lockfile" : "npm ci --legacy-peer-deps";
        execSync(`cd ${tmpDir} && ${installCmd}`, { timeout: 120000, env: { ...process.env, CI: "true" } });
        await appendLog(`Dependencies installed. Running build...`);

        // Run build
        execSync(`cd ${tmpDir} && npm run build`, { timeout: 120000, env: { ...process.env, CI: "true", NODE_ENV: "production" } });
        await appendLog(`Build completed. Uploading output...`);

        // Find build output directory
        const distDir = fs.existsSync(path.join(tmpDir, "dist")) ? path.join(tmpDir, "dist")
          : fs.existsSync(path.join(tmpDir, "build")) ? path.join(tmpDir, "build")
          : fs.existsSync(path.join(tmpDir, "out")) ? path.join(tmpDir, "out")
          : null;

        if (!distDir || !fs.existsSync(path.join(distDir, "index.html"))) {
          await appendLog("ERROR: Build succeeded but no index.html found in output directory");
          await updateWebappDeployment(depId, { status: "failed", errorMessage: "Build output missing index.html", buildLog: buildLogLines.join("\n") });
          await updateWebappProject(project.id, { deployStatus: "failed" });
          return;
        }

        // Upload all files from build output
        const deployPrefix = `webapp/${project.externalId}`;
        const walkDir = (dir: string): string[] => {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          const results: string[] = [];
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              results.push(...walkDir(fullPath));
            } else {
              results.push(fullPath);
            }
          }
          return results;
        };

        const outputFiles = walkDir(distDir);
        let uploadedCount = 0;
        const mimeTypes: Record<string, string> = {
          ".html": "text/html", ".css": "text/css", ".js": "application/javascript",
          ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg", ".gif": "image/gif", ".svg": "image/svg+xml",
          ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2",
          ".ttf": "font/ttf", ".eot": "application/vnd.ms-fontobject",
          ".webp": "image/webp", ".avif": "image/avif", ".mp4": "video/mp4",
          ".webm": "video/webm", ".txt": "text/plain", ".xml": "application/xml",
          ".map": "application/json",
        };

        for (const filePath of outputFiles) {
          const relPath = path.relative(distDir, filePath);
          const ext = path.extname(filePath).toLowerCase();
          const mime = mimeTypes[ext] || "application/octet-stream";
          const fileContent = fs.readFileSync(filePath);
          const key = `${deployPrefix}/${relPath}`;
          await storagePut(key, fileContent, mime);
          uploadedCount++;
        }

        await appendLog(`Uploaded ${uploadedCount} files to CDN`);

        // Get the index.html URL
        const { url: indexUrl } = await storagePut(`${deployPrefix}/index.html`, fs.readFileSync(path.join(distDir, "index.html")), "text/html");
        publishedUrl = indexUrl;

        // Cleanup temp directory
        try { execSync(`rm -rf ${tmpDir}`, { timeout: 10000 }); } catch {}

      } catch (buildErr: any) {
        // Cleanup on failure
        try { execSync(`rm -rf ${tmpDir}`, { timeout: 10000 }); } catch {}
        const errMsg = buildErr.stdout?.toString()?.slice(-500) || buildErr.stderr?.toString()?.slice(-500) || buildErr.message;
        await appendLog(`ERROR: Build pipeline failed: ${errMsg}`);
        await updateWebappDeployment(depId, { status: "failed", errorMessage: `Build failed: ${errMsg.slice(0, 200)}`, buildLog: buildLogLines.join("\n") });
        await updateWebappProject(project.id, { deployStatus: "failed" });
        return;
      }
    } else {
      // STATIC PROJECT: Find and upload index.html directly from repo
      const searchPaths = ["", "public/", "dist/", "build/", "docs/"];
      let indexHtml: string | null = null;
      let foundPrefix = "";

      for (const prefix of searchPaths) {
        const indexFile = files.find((f: any) => f.path === `${prefix}index.html`);
        if (indexFile) {
          const content = await getFileContent(token, owner, repoName, indexFile.path, branch);
          if (content.content) {
            indexHtml = Buffer.from(content.content, "base64").toString("utf-8");
            foundPrefix = prefix;
            break;
          }
        }
      }

      if (!indexHtml) {
        await appendLog("ERROR: No index.html found and no build script detected");
        await updateWebappDeployment(depId, { status: "failed", errorMessage: "No index.html found and no build script in package.json", buildLog: buildLogLines.join("\n") });
        await updateWebappProject(project.id, { deployStatus: "failed" });
        return;
      }

      await appendLog(`Found index.html at ${foundPrefix || 'root'} (${(indexHtml.length / 1024).toFixed(1)} KB)`);

      // Upload index.html and any co-located static assets (CSS, JS, images)
      const deployPrefix = `webapp/${project.externalId}`;
      const { url: indexUrl } = await storagePut(`${deployPrefix}/index.html`, indexHtml, "text/html");
      publishedUrl = indexUrl;

      // Also upload co-located assets from the same directory
      const assetExtensions = [".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".woff", ".woff2", ".webp"];
      const coLocatedAssets = files.filter((f: any) => {
        if (!f.path.startsWith(foundPrefix)) return false;
        const ext = f.path.substring(f.path.lastIndexOf(".")).toLowerCase();
        return assetExtensions.includes(ext);
      }).slice(0, 50); // Limit to 50 assets to avoid timeout

      if (coLocatedAssets.length > 0) {
        await appendLog(`Uploading ${coLocatedAssets.length} co-located assets...`);
        for (const asset of coLocatedAssets) {
          try {
            const assetContent = await getFileContent(token, owner, repoName, asset.path, branch);
            if (assetContent.content) {
              const relPath = foundPrefix ? asset.path.slice(foundPrefix.length) : asset.path;
              const ext = relPath.substring(relPath.lastIndexOf(".")).toLowerCase();
              const mimeMap: Record<string, string> = {
                ".css": "text/css", ".js": "application/javascript", ".png": "image/png",
                ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
                ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff": "font/woff",
                ".woff2": "font/woff2", ".webp": "image/webp",
              };
              const mime = mimeMap[ext] || "application/octet-stream";
              const buf = Buffer.from(assetContent.content, "base64");
              await storagePut(`${deployPrefix}/${relPath}`, buf, mime);
            }
          } catch (assetErr: any) {
            await appendLog(`Warning: Failed to upload asset ${asset.path}: ${assetErr.message}`);
          }
        }
      }

      await appendLog(`Uploaded to CDN: ${publishedUrl}`);
    }

    // Update project status
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

    // Notify owner of successful deploy
    try {
      const { notifyOwner } = await import("./_core/notification");
      await notifyOwner({
        title: `Deploy Succeeded: ${repo.fullName}`,
        content: `Auto-deploy from branch \`${branch}\` completed successfully.\n\nProject: ${project.name || project.externalId}\nURL: ${publishedUrl}\nDeployment #${depId}`,
      });
    } catch (notifErr: any) {
      console.warn(`[GitHub Webhook] Deploy notification failed: ${notifErr.message}`);
    }
  } catch (err: any) {
    await appendLog(`ERROR: ${err.message}`);
    await updateWebappDeployment(depId, { status: "failed", errorMessage: err.message, buildLog: buildLogLines.join("\n") });
    await updateWebappProject(project.id, { deployStatus: "failed" });

    // Notify owner of failed deploy
    try {
      const { notifyOwner } = await import("./_core/notification");
      await notifyOwner({
        title: `Deploy Failed: ${repo.fullName}`,
        content: `Auto-deploy from branch \`${branch}\` failed.\n\nProject: ${project.name || project.externalId}\nError: ${err.message}\nDeployment #${depId}`,
      });
    } catch (notifErr: any) {
      console.warn(`[GitHub Webhook] Failure notification failed: ${notifErr.message}`);
    }
  }
}
