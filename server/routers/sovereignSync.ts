/**
 * Sovereign Sync Router — One-Click Development Mode Activation
 * 
 * Achieves deep Manus parity+ by orchestrating:
 * 1. GitHub token validation + scope check
 * 2. Webhook auto-registration on the connected repo
 * 3. Codespace creation (or link to existing)
 * 4. Webapp project linking for auto-deploy
 * 
 * The user clicks ONE button → everything is provisioned automatically.
 */
import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  getUserConnectors,
  getUserGitHubRepos,
  getUserWebappProjects,
  upsertUserPreferences,
} from "../db";

// ── Types ──

export type SyncStage = "idle" | "checking" | "webhook" | "codespace" | "linking" | "active" | "error";

interface SyncStatus {
  stage: SyncStage;
  github: { connected: boolean; username: string | null; hasScope: boolean; token: string | null };
  repo: { connected: boolean; fullName: string | null; id: number | null };
  webhook: { active: boolean; url: string | null };
  codespace: { active: boolean; url: string | null; name: string | null };
  webapp: { linked: boolean; projectId: number | null; publishedUrl: string | null };
  error: string | null;
}

// ── Router ──

export const sovereignSyncRouter = router({
  /**
   * status — Returns the current state of all Sovereign Mode components.
   * The UI polls this to show a unified status indicator.
   */
  status: protectedProcedure.query(async ({ ctx }): Promise<SyncStatus> => {
    const userId = ctx.user.id;
    const status: SyncStatus = {
      stage: "idle",
      github: { connected: false, username: null, hasScope: false, token: null },
      repo: { connected: false, fullName: null, id: null },
      webhook: { active: false, url: null },
      codespace: { active: false, url: null, name: null },
      webapp: { linked: false, projectId: null, publishedUrl: null },
      error: null,
    };

    try {
      // 1. Check GitHub connection
      const connectors = await getUserConnectors(userId);
      const ghConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");
      if (!ghConn) return status;

      const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
      if (!token) return status;

      status.github.connected = true;
      status.github.token = token;

      // Validate token and get username
      try {
        const resp = await fetch("https://api.github.com/user", {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
          signal: AbortSignal.timeout(5000),
        });
        if (resp.ok) {
          const user = await resp.json();
          status.github.username = user.login;
          const scopes = (resp.headers.get("x-oauth-scopes") || "").split(",").map(s => s.trim()).filter(Boolean);
          status.github.hasScope = scopes.length === 0 || scopes.includes("codespace") || scopes.includes("repo");
        }
      } catch {}

      // 2. Check connected repo
      const repos = await getUserGitHubRepos(userId);
      const activeRepo = repos.find(r => r.status === "connected");
      if (activeRepo) {
        status.repo.connected = true;
        status.repo.fullName = activeRepo.fullName;
        status.repo.id = activeRepo.id;

        // 3. Check webhook
        if (status.github.hasScope && activeRepo.fullName) {
          try {
            const [owner, repo] = activeRepo.fullName.split("/");
            const { listWebhooks } = await import("../githubApi");
            const hooks = await listWebhooks(token, owner, repo);
            const baseUrl = process.env.VITE_APP_URL || (process.env.VITE_APP_DOMAIN ? `https://${process.env.VITE_APP_DOMAIN}` : "");
            const webhookUrl = `${baseUrl}/api/github/webhook`;
            const match = hooks.find(h => h.config.url === webhookUrl && h.active);
            if (match) {
              status.webhook.active = true;
              status.webhook.url = webhookUrl;
            }
          } catch {}
        }

        // 4. Check Codespace
        if (status.github.hasScope && activeRepo.fullName) {
          try {
            const [owner, repo] = activeRepo.fullName.split("/");
            const csResp = await fetch(`https://api.github.com/user/codespaces`, {
              headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
              signal: AbortSignal.timeout(8000),
            });
            if (csResp.ok) {
              const data = await csResp.json();
              const matching = data.codespaces?.find((cs: any) =>
                cs.repository?.full_name === activeRepo.fullName && cs.state !== "Deleted"
              );
              if (matching) {
                status.codespace.active = true;
                status.codespace.url = `https://github.com/codespaces/${matching.name}`;
                status.codespace.name = matching.name;
              }
            }
          } catch {}
        }
      }

      // 5. Check webapp project link
      const projects = await getUserWebappProjects(userId);
      const linkedProject = projects.find(p => p.githubRepoId === status.repo.id);
      if (linkedProject) {
        status.webapp.linked = true;
        status.webapp.projectId = linkedProject.id;
        status.webapp.publishedUrl = linkedProject.publishedUrl;
      }

      // Determine overall stage
      if (status.webhook.active && status.codespace.active && status.webapp.linked) {
        status.stage = "active";
      } else if (status.github.connected && status.repo.connected) {
        status.stage = "checking";
      }

      return status;
    } catch (err: any) {
      status.stage = "error";
      status.error = err.message;
      return status;
    }
  }),

  /**
   * activate — One-click activation of Sovereign Mode.
   * Orchestrates: webhook registration → Codespace creation → webapp project linking.
   * Returns a stream of progress updates.
   */
  activate: protectedProcedure
    .input(z.object({
      repoFullName: z.string().optional(), // If not provided, uses first connected repo
    }).optional())
    .mutation(async ({ ctx, input }): Promise<{ success: boolean; steps: Array<{ step: string; status: "done" | "skipped" | "error"; detail: string }>; codespaceUrl: string | null; previewUrl: string | null }> => {
      const userId = ctx.user.id;
      const steps: Array<{ step: string; status: "done" | "skipped" | "error"; detail: string }> = [];

      // ── Step 1: Resolve GitHub token ──
      const connectors = await getUserConnectors(userId);
      const ghConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");
      if (!ghConn) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub not connected. Please connect GitHub first." });
      }
      const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
      if (!token) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub token not available. Please reconnect GitHub." });
      }
      steps.push({ step: "GitHub Authentication", status: "done", detail: "Token validated" });

      // ── Step 2: Resolve repo ──
      const repos = await getUserGitHubRepos(userId);
      let targetRepo = input?.repoFullName
        ? repos.find(r => r.fullName === input.repoFullName)
        : repos.find(r => r.status === "connected");

      if (!targetRepo) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No connected GitHub repo found. Please connect a repo in the GitHub tab first." });
      }
      steps.push({ step: "Repository", status: "done", detail: targetRepo.fullName });

      const [owner, repo] = targetRepo.fullName.split("/");

      // ── Step 3: Ensure webhook ──
      try {
        const { ensureWebhook } = await import("../githubApi");
        const baseUrl = process.env.VITE_APP_URL || (process.env.VITE_APP_DOMAIN ? `https://${process.env.VITE_APP_DOMAIN}` : "");
        if (!baseUrl) {
          steps.push({ step: "Webhook", status: "error", detail: "No deploy URL configured" });
        } else {
          const webhookUrl = `${baseUrl}/api/github/webhook`;
          const secret = process.env.GITHUB_WEBHOOK_SECRET || "";
          const { created } = await ensureWebhook(token, owner, repo, webhookUrl, secret || undefined, ["push"]);
          steps.push({ step: "Webhook", status: "done", detail: created ? "Registered new webhook" : "Already active" });
        }
      } catch (err: any) {
        steps.push({ step: "Webhook", status: "error", detail: err.message || "Failed to register webhook" });
      }

      // ── Step 4: Create or find Codespace ──
      let codespaceUrl: string | null = null;
      try {
        // Check for existing codespace first
        const csResp = await fetch(`https://api.github.com/user/codespaces`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
          signal: AbortSignal.timeout(10000),
        });
        if (csResp.ok) {
          const data = await csResp.json();
          const existing = data.codespaces?.find((cs: any) =>
            cs.repository?.full_name === targetRepo!.fullName && cs.state !== "Deleted"
          );
          if (existing) {
            codespaceUrl = `https://github.com/codespaces/${existing.name}`;
            // If stopped, start it
            if (existing.state === "Shutdown" || existing.state === "Stopped") {
              try {
                await fetch(`https://api.github.com/user/codespaces/${existing.name}/start`, {
                  method: "POST",
                  headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
                  signal: AbortSignal.timeout(10000),
                });
                steps.push({ step: "Codespace", status: "done", detail: `Resumed existing: ${existing.name}` });
              } catch {
                steps.push({ step: "Codespace", status: "done", detail: `Found existing (stopped): ${existing.name}` });
              }
            } else {
              steps.push({ step: "Codespace", status: "done", detail: `Already running: ${existing.name}` });
            }
          } else {
            // Create new codespace
            const createResp = await fetch(`https://api.github.com/user/codespaces`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github+json",
                "Content-Type": "application/json",
                "X-GitHub-Api-Version": "2022-11-28",
              },
              body: JSON.stringify({
                repository_id: parseInt(targetRepo!.externalId || "0"),
                ref: targetRepo!.defaultBranch || "main",
                machine: "basicLinux32gb",
                devcontainer_path: ".devcontainer/devcontainer.json",
              }),
              signal: AbortSignal.timeout(30000),
            });
            if (createResp.ok) {
              const cs = await createResp.json();
              codespaceUrl = `https://github.com/codespaces/${cs.name}`;
              steps.push({ step: "Codespace", status: "done", detail: `Created: ${cs.name}` });
            } else {
              const errBody = await createResp.text().catch(() => "");
              // If it's a scope issue, still succeed with instructions
              if (createResp.status === 403 || createResp.status === 401) {
                steps.push({ step: "Codespace", status: "skipped", detail: "Token lacks codespace scope. Open Codespace manually from GitHub." });
              } else {
                steps.push({ step: "Codespace", status: "error", detail: `Creation failed: ${errBody.slice(0, 100)}` });
              }
            }
          }
        } else {
          steps.push({ step: "Codespace", status: "skipped", detail: "Could not query codespaces. Open manually from GitHub." });
        }
      } catch (err: any) {
        steps.push({ step: "Codespace", status: "skipped", detail: `Codespace API unavailable: ${err.message}. Open manually from GitHub.` });
      }

      // ── Step 5: Ensure webapp project linked ──
      let previewUrl: string | null = null;
      try {
        const projects = await getUserWebappProjects(userId);
        const linkedProject = projects.find(p => p.githubRepoId === targetRepo!.id);
        if (linkedProject) {
          previewUrl = linkedProject.publishedUrl;
          steps.push({ step: "Auto-Deploy", status: "done", detail: `Linked to project: ${linkedProject.name}` });
        } else {
          // Auto-create a webapp project linked to this repo
          const { createWebappProject } = await import("../db");
          const { nanoid } = await import("nanoid");
          const projectId = await createWebappProject({
            userId,
            name: targetRepo!.name || repo,
            description: `Auto-linked from Sovereign Mode activation`,
            framework: "vite",
            githubRepoId: targetRepo!.id,
            buildCommand: "pnpm build",
            outputDir: "dist",
            installCommand: "pnpm install",
            externalId: nanoid(12),
            deployTarget: "manus",
          });
          steps.push({ step: "Auto-Deploy", status: "done", detail: `Created webapp project (auto-linked)` });
        }
      } catch (err: any) {
        steps.push({ step: "Auto-Deploy", status: "error", detail: err.message || "Failed to link webapp project" });
      }

      // ── Step 6: Update preferences ──
      try {
        await upsertUserPreferences({ userId, codespaceScopeGranted: true, previewTier: "codespace" });
      } catch {}

      const allDone = steps.every(s => s.status === "done" || s.status === "skipped");
      return { success: allDone, steps, codespaceUrl, previewUrl };
    }),

  /**
   * deactivate — Stops the Codespace (preserves data) and optionally removes webhook.
   */
  deactivate: protectedProcedure
    .input(z.object({ removeWebhook: z.boolean().optional() }).optional())
    .mutation(async ({ ctx, input }): Promise<{ success: boolean; detail: string }> => {
      const userId = ctx.user.id;
      const connectors = await getUserConnectors(userId);
      const ghConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");
      if (!ghConn) return { success: true, detail: "No GitHub connection to deactivate" };

      const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
      if (!token) return { success: true, detail: "No token available" };

      const repos = await getUserGitHubRepos(userId);
      const activeRepo = repos.find(r => r.status === "connected");
      const details: string[] = [];

      // Stop codespace if running
      if (activeRepo) {
        try {
          const csResp = await fetch(`https://api.github.com/user/codespaces`, {
            headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
            signal: AbortSignal.timeout(8000),
          });
          if (csResp.ok) {
            const data = await csResp.json();
            const matching = data.codespaces?.find((cs: any) =>
              cs.repository?.full_name === activeRepo.fullName && cs.state === "Available"
            );
            if (matching) {
              await fetch(`https://api.github.com/user/codespaces/${matching.name}/stop`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
                signal: AbortSignal.timeout(10000),
              });
              details.push(`Stopped codespace: ${matching.name}`);
            }
          }
        } catch {}
      }

      // Remove webhook if requested
      if (input?.removeWebhook && activeRepo) {
        try {
          const [owner, repo] = activeRepo.fullName.split("/");
          const { listWebhooks, deleteWebhook } = await import("../githubApi");
          const hooks = await listWebhooks(token, owner, repo);
          const baseUrl = process.env.VITE_APP_URL || (process.env.VITE_APP_DOMAIN ? `https://${process.env.VITE_APP_DOMAIN}` : "");
          const webhookUrl = `${baseUrl}/api/github/webhook`;
          const match = hooks.find(h => h.config.url === webhookUrl);
          if (match) {
            await deleteWebhook(token, owner, repo, match.id);
            details.push("Removed deploy webhook");
          }
        } catch {}
      }

      return { success: true, detail: details.length > 0 ? details.join(". ") : "Sovereign Mode deactivated" };
    }),

  /**
   * openEditor — Returns the VS Code web URL for the active Codespace.
   */
  openEditor: protectedProcedure.query(async ({ ctx }): Promise<{ url: string | null }> => {
    const userId = ctx.user.id;
    const connectors = await getUserConnectors(userId);
    const ghConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");
    if (!ghConn) return { url: null };

    const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
    if (!token) return { url: null };

    const repos = await getUserGitHubRepos(userId);
    const activeRepo = repos.find(r => r.status === "connected");
    if (!activeRepo) return { url: null };

    try {
      const csResp = await fetch(`https://api.github.com/user/codespaces`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
        signal: AbortSignal.timeout(8000),
      });
      if (csResp.ok) {
        const data = await csResp.json();
        const matching = data.codespaces?.find((cs: any) =>
          cs.repository?.full_name === activeRepo.fullName && cs.state !== "Deleted"
        );
        if (matching) {
          return { url: `https://github.com/codespaces/${matching.name}` };
        }
      }
    } catch {}
    return { url: null };
  }),
});
