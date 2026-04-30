import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { 
  createGitHubRepo,
  disconnectGitHubRepo,
  getGitHubRepoByExternalId,
  getGitHubRepoByFullName,
  getGitHubRepoById,
  getUserConnectors,
  getUserGitHubRepos,
  updateGitHubRepo,
 } from "../db";
import { connectors } from "../../drizzle/schema";

/**
 * Auto-register webhook on a repo after connect/create.
 * Fire-and-forget: failures are logged but don't block the main flow.
 * Idempotent: skips if webhook already exists for this URL.
 */
async function autoRegisterWebhook(token: string, fullName: string): Promise<void> {
  try {
    const { ensureWebhook } = await import("../githubApi");
    const [owner, repo] = fullName.split("/");
    // Use the deployed domain if available, otherwise fall back to env
    // Use deployed URL — never fall back to localhost in production
    const baseUrl = process.env.VITE_APP_URL || (process.env.VITE_APP_DOMAIN ? `https://${process.env.VITE_APP_DOMAIN}` : "");
    if (!baseUrl) {
      console.warn(`[AutoWebhook] Skipping webhook registration — no VITE_APP_URL or VITE_APP_DOMAIN configured`);
      return;
    }
    const webhookUrl = `${baseUrl}/api/github/webhook`;
    const secret = process.env.GITHUB_WEBHOOK_SECRET || "";
    const { created } = await ensureWebhook(token, owner, repo, webhookUrl, secret || undefined, ["push"]);
    if (created) {
      console.log(`[AutoWebhook] Registered webhook on ${fullName}`);
    } else {
      console.log(`[AutoWebhook] Webhook already exists on ${fullName}`);
    }
  } catch (err: any) {
    // Non-fatal: user may not have admin access to the repo
    console.warn(`[AutoWebhook] Failed to register webhook on ${fullName}: ${err.message}`);
  }
}

export const githubRouter = router({
    /** List user's connected GitHub repos */
    repos: protectedProcedure.query(async ({ ctx }) => {
      return getUserGitHubRepos(ctx.user.id);
    }),
    /** Get a single repo by externalId */
    getRepo: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .query(async ({ ctx, input }) => {
        const repo = await getGitHubRepoByExternalId(input.externalId);
        if (!repo || repo.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Repo not found" });
        return repo;
      }),
    /** Import/connect a GitHub repo from the user's GitHub account */
    connectRepo: protectedProcedure
      .input(z.object({
        fullName: z.string(),
        name: z.string(),
        description: z.string().optional(),
        htmlUrl: z.string(),
        cloneUrl: z.string().optional(),
        sshUrl: z.string().optional(),
        defaultBranch: z.string().optional(),
        isPrivate: z.boolean().optional(),
        language: z.string().optional(),
        starCount: z.number().optional(),
        forkCount: z.number().optional(),
        openIssuesCount: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if already connected
        const existing = await getGitHubRepoByFullName(ctx.user.id, input.fullName);
        if (existing && existing.status !== "disconnected") {
          return { id: existing.id, externalId: existing.externalId, alreadyConnected: true };
        }
        if (existing) {
          await updateGitHubRepo(existing.id, { status: "connected", lastSyncAt: new Date() });
          return { id: existing.id, externalId: existing.externalId, alreadyConnected: false };
        }
        const id = await createGitHubRepo({
          userId: ctx.user.id,
          fullName: input.fullName,
          name: input.name,
          description: input.description ?? null,
          htmlUrl: input.htmlUrl,
          cloneUrl: input.cloneUrl ?? null,
          sshUrl: input.sshUrl ?? null,
          defaultBranch: input.defaultBranch ?? "main",
          isPrivate: input.isPrivate ? 1 : 0,
          language: input.language ?? null,
          starCount: input.starCount ?? 0,
          forkCount: input.forkCount ?? 0,
          openIssuesCount: input.openIssuesCount ?? 0,
          lastSyncAt: new Date(),
          status: "connected",
        });
        const repo = await getGitHubRepoById(id);
        // Auto-register webhook (fire-and-forget)
        const conns = await getUserConnectors(ctx.user.id);
        const ghConn = conns.find(c => c.connectorId === "github" && c.status === "connected");
        if (ghConn) {
          const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
          if (token) autoRegisterWebhook(token, input.fullName).catch(() => {});
        }
        return { id, externalId: repo?.externalId ?? "", alreadyConnected: false };
      }),
    /** Create a new GitHub repo */
    createRepo: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        isPrivate: z.boolean().optional(),
        autoInit: z.boolean().optional(),
        gitignoreTemplate: z.string().optional(),
        licenseTemplate: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Get GitHub token from connector
        const connectors = await getUserConnectors(ctx.user.id);
        const ghConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");
        if (!ghConn) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub not connected. Please connect GitHub in Connectors first." });
        const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
        if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub token not available" });
        const { createRepo: ghCreateRepo } = await import("../githubApi");
        const ghRepo = await ghCreateRepo(token, {
          name: input.name,
          description: input.description,
          private: input.isPrivate,
          auto_init: input.autoInit ?? true,
        });
        // Save to our DB
        const id = await createGitHubRepo({
          userId: ctx.user.id,
          fullName: ghRepo.full_name,
          name: ghRepo.name,
          description: ghRepo.description,
          htmlUrl: ghRepo.html_url,
          cloneUrl: ghRepo.clone_url,
          sshUrl: ghRepo.ssh_url,
          defaultBranch: ghRepo.default_branch,
          isPrivate: ghRepo.private ? 1 : 0,
          language: ghRepo.language,
          starCount: ghRepo.stargazers_count,
          forkCount: ghRepo.forks_count,
          openIssuesCount: ghRepo.open_issues_count,
          lastSyncAt: new Date(),
          status: "connected",
        });
        const repo = await getGitHubRepoById(id);
        // Auto-register webhook on newly created repo (fire-and-forget)
        autoRegisterWebhook(token, ghRepo.full_name).catch(() => {});
        return { id, externalId: repo?.externalId ?? "", fullName: ghRepo.full_name };
      }),
    /** Disconnect a repo */
    disconnectRepo: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const repo = await getGitHubRepoByExternalId(input.externalId);
        if (!repo || repo.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Repo not found" });
        await disconnectGitHubRepo(repo.id, ctx.user.id);
        return { success: true };
      }),
    /** Sync repo metadata from GitHub API */
    syncRepo: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const repo = await getGitHubRepoByExternalId(input.externalId);
        if (!repo || repo.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Repo not found" });
        const connectors = await getUserConnectors(ctx.user.id);
        const ghConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");
        if (!ghConn) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub not connected" });
        const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
        if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub token not available" });
        const { getRepo } = await import("../githubApi");
        const [owner, repoName] = repo.fullName.split("/");
        const ghRepo = await getRepo(token, owner, repoName);
        await updateGitHubRepo(repo.id, {
          description: ghRepo.description,
          defaultBranch: ghRepo.default_branch,
          isPrivate: ghRepo.private ? 1 : 0,
          language: ghRepo.language,
          starCount: ghRepo.stargazers_count,
          forkCount: ghRepo.forks_count,
          openIssuesCount: ghRepo.open_issues_count,
          pushedAt: ghRepo.pushed_at ? new Date(ghRepo.pushed_at) : null,
          lastSyncAt: new Date(),
          status: "connected",
        });
        return { success: true };
      }),
    /** List remote repos from GitHub (for import picker) */
    listRemoteRepos: protectedProcedure
      .input(z.object({ page: z.number().optional(), perPage: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const connectors = await getUserConnectors(ctx.user.id);
        const ghConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");
        if (!ghConn) return { repos: [], connected: false };
        const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
        if (!token) return { repos: [], connected: false };
        const { listUserRepos } = await import("../githubApi");
        const repos = await listUserRepos(token, input.page ?? 1, input.perPage ?? 30);
        return { repos, connected: true };
      }),
    /** Get file tree for a repo */
    fileTree: protectedProcedure
      .input(z.object({ externalId: z.string(), branch: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        const repo = await getGitHubRepoByExternalId(input.externalId);
        if (!repo || repo.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Repo not found" });
        const connectors = await getUserConnectors(ctx.user.id);
        const ghConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");
        if (!ghConn) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub not connected" });
        const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
        if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub token not available" });
        const { getRepoTree } = await import("../githubApi");
        const [owner, repoName] = repo.fullName.split("/");
        const tree = await getRepoTree(token, owner, repoName, input.branch || repo.defaultBranch || "main");
        return tree;
      }),
    /** Get file content */
    fileContent: protectedProcedure
      .input(z.object({ externalId: z.string(), path: z.string(), ref: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        const repo = await getGitHubRepoByExternalId(input.externalId);
        if (!repo || repo.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Repo not found" });
        const connectors = await getUserConnectors(ctx.user.id);
        const ghConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");
        if (!ghConn) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub not connected" });
        const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
        if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub token not available" });
        const { getFileContent } = await import("../githubApi");
        const [owner, repoName] = repo.fullName.split("/");
        return getFileContent(token, owner, repoName, input.path, input.ref);
      }),
    /** Commit a file change */
    commitFile: protectedProcedure
      .input(z.object({
        externalId: z.string(),
        path: z.string(),
        content: z.string(), // base64
        message: z.string(),
        sha: z.string().optional(),
        branch: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const repo = await getGitHubRepoByExternalId(input.externalId);
        if (!repo || repo.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Repo not found" });
        const connectors = await getUserConnectors(ctx.user.id);
        const ghConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");
        if (!ghConn) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub not connected" });
        const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
        if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub token not available" });
        const { createOrUpdateFile } = await import("../githubApi");
        const [owner, repoName] = repo.fullName.split("/");
        return createOrUpdateFile(token, owner, repoName, input.path, {
          message: input.message,
          content: input.content,
          sha: input.sha,
          branch: input.branch,
        });
      }),
    /** Delete a file */
    deleteFile: protectedProcedure
      .input(z.object({
        externalId: z.string(),
        path: z.string(),
        message: z.string(),
        sha: z.string(),
        branch: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const repo = await getGitHubRepoByExternalId(input.externalId);
        if (!repo || repo.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Repo not found" });
        const connectors = await getUserConnectors(ctx.user.id);
        const ghConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");
        if (!ghConn) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub not connected" });
        const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
        if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub token not available" });
        const { deleteFile: ghDeleteFile } = await import("../githubApi");
        const [owner, repoName] = repo.fullName.split("/");
        return ghDeleteFile(token, owner, repoName, input.path, {
          message: input.message,
          sha: input.sha,
          branch: input.branch,
        });
      }),
    /** Create an issue */
    createIssue: protectedProcedure
      .input(z.object({
        externalId: z.string(),
        title: z.string(),
        body: z.string().optional(),
        labels: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const repo = await getGitHubRepoByExternalId(input.externalId);
        if (!repo || repo.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Repo not found" });
        const connectors = await getUserConnectors(ctx.user.id);
        const ghConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");
        if (!ghConn) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub not connected" });
        const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
        if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub token not available" });
        const { createIssue: ghCreateIssue } = await import("../githubApi");
        const [owner, repoName] = repo.fullName.split("/");
        return ghCreateIssue(token, owner, repoName, { title: input.title, body: input.body, labels: input.labels });
      }),
    /** Merge a pull request */
    mergePR: protectedProcedure
      .input(z.object({
        externalId: z.string(),
        pullNumber: z.number(),
        mergeMethod: z.enum(["merge", "squash", "rebase"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const repo = await getGitHubRepoByExternalId(input.externalId);
        if (!repo || repo.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Repo not found" });
        const connectors = await getUserConnectors(ctx.user.id);
        const ghConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");
        if (!ghConn) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub not connected" });
        const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
        if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub token not available" });
        const { mergePullRequest } = await import("../githubApi");
        const [owner, repoName] = repo.fullName.split("/");
        return mergePullRequest(token, owner, repoName, input.pullNumber, { merge_method: input.mergeMethod ?? "merge" });
      }),
    /** List branches */
    branches: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .query(async ({ ctx, input }) => {
        const repo = await getGitHubRepoByExternalId(input.externalId);
        if (!repo || repo.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Repo not found" });
        const connectors = await getUserConnectors(ctx.user.id);
        const ghConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");
        if (!ghConn) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub not connected" });
        const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
        if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub token not available" });
        const { listBranches } = await import("../githubApi");
        const [owner, repoName] = repo.fullName.split("/");
        return listBranches(token, owner, repoName);
      }),
    /** Create a branch */
    createBranch: protectedProcedure
      .input(z.object({ externalId: z.string(), branchName: z.string(), fromSha: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const repo = await getGitHubRepoByExternalId(input.externalId);
        if (!repo || repo.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Repo not found" });
        const connectors = await getUserConnectors(ctx.user.id);
        const ghConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");
        if (!ghConn) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub not connected" });
        const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
        if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub token not available" });
        const { createBranch: ghCreateBranch } = await import("../githubApi");
        const [owner, repoName] = repo.fullName.split("/");
        return ghCreateBranch(token, owner, repoName, input.branchName, input.fromSha);
      }),
    /** List commits */
    commits: protectedProcedure
      .input(z.object({ externalId: z.string(), branch: z.string().optional(), perPage: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const repo = await getGitHubRepoByExternalId(input.externalId);
        if (!repo || repo.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Repo not found" });
        const connectors = await getUserConnectors(ctx.user.id);
        const ghConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");
        if (!ghConn) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub not connected" });
        const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
        if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub token not available" });
        const { listCommits } = await import("../githubApi");
        const [owner, repoName] = repo.fullName.split("/");
        return listCommits(token, owner, repoName, { sha: input.branch, per_page: input.perPage ?? 20 });
      }),
    /** List pull requests */
    pullRequests: protectedProcedure
      .input(z.object({ externalId: z.string(), state: z.enum(["open", "closed", "all"]).optional() }))
      .query(async ({ ctx, input }) => {
        const repo = await getGitHubRepoByExternalId(input.externalId);
        if (!repo || repo.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Repo not found" });
        const connectors = await getUserConnectors(ctx.user.id);
        const ghConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");
        if (!ghConn) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub not connected" });
        const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
        if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub token not available" });
        const { listPullRequests } = await import("../githubApi");
        const [owner, repoName] = repo.fullName.split("/");
        return listPullRequests(token, owner, repoName, input.state ?? "open");
      }),
    /** Create a pull request */
    createPR: protectedProcedure
      .input(z.object({
        externalId: z.string(),
        title: z.string(),
        body: z.string().optional(),
        head: z.string(),
        base: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const repo = await getGitHubRepoByExternalId(input.externalId);
        if (!repo || repo.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Repo not found" });
        const connectors = await getUserConnectors(ctx.user.id);
        const ghConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");
        if (!ghConn) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub not connected" });
        const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
        if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub token not available" });
        const { createPullRequest } = await import("../githubApi");
        const [owner, repoName] = repo.fullName.split("/");
        return createPullRequest(token, owner, repoName, { title: input.title, body: input.body, head: input.head, base: input.base });
      }),
    /** List issues */
    issues: protectedProcedure
      .input(z.object({ externalId: z.string(), state: z.enum(["open", "closed", "all"]).optional() }))
      .query(async ({ ctx, input }) => {
        const repo = await getGitHubRepoByExternalId(input.externalId);
        if (!repo || repo.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Repo not found" });
        const connectors = await getUserConnectors(ctx.user.id);
        const ghConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");
        if (!ghConn) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub not connected" });
        const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
        if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub token not available" });
        const { listIssues } = await import("../githubApi");
        const [owner, repoName] = repo.fullName.split("/");
        return listIssues(token, owner, repoName, input.state ?? "open");
      }),

    /** Multi-file commit via Git Trees API — atomic batch commit */
    multiCommit: protectedProcedure
      .input(z.object({
        externalId: z.string(),
        branch: z.string(),
        message: z.string(),
        files: z.array(z.object({
          path: z.string(),
          content: z.string().nullable(), // null = delete
        })).min(1).max(100),
      }))
      .mutation(async ({ ctx, input }) => {
        const repo = await getGitHubRepoByExternalId(input.externalId);
        if (!repo || repo.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Repo not found" });
        const conns = await getUserConnectors(ctx.user.id);
        const ghConn = conns.find(c => c.connectorId === "github" && c.status === "connected");
        if (!ghConn) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub not connected" });
        const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
        if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub token not available" });
        const { createTreeCommit } = await import("../githubApi");
        const [owner, repoName] = repo.fullName.split("/");
        return createTreeCommit(token, {
          owner,
          repo: repoName,
          branch: input.branch,
          message: input.message,
          files: input.files,
        });
      }),

    /** Compare two branches — ahead/behind counts and file diffs */
    compareBranches: protectedProcedure
      .input(z.object({
        externalId: z.string(),
        base: z.string(),
        head: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        const repo = await getGitHubRepoByExternalId(input.externalId);
        if (!repo || repo.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Repo not found" });
        const conns = await getUserConnectors(ctx.user.id);
        const ghConn = conns.find(c => c.connectorId === "github" && c.status === "connected");
        if (!ghConn) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub not connected" });
        const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
        if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub token not available" });
        const { compareBranches: ghCompare } = await import("../githubApi");
        const [owner, repoName] = repo.fullName.split("/");
        return ghCompare(token, owner, repoName, input.base, input.head);
      }),

    /** Get detailed diff for a single commit */
    commitDiff: protectedProcedure
      .input(z.object({
        externalId: z.string(),
        commitSha: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        const repo = await getGitHubRepoByExternalId(input.externalId);
        if (!repo || repo.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Repo not found" });
        const conns = await getUserConnectors(ctx.user.id);
        const ghConn = conns.find(c => c.connectorId === "github" && c.status === "connected");
        if (!ghConn) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub not connected" });
        const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
        if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub token not available" });
        const { getCommitDiff } = await import("../githubApi");
        const [owner, repoName] = repo.fullName.split("/");
        return getCommitDiff(token, owner, repoName, input.commitSha);
      }),

    /** Commit multiple files and trigger deploy in one action */
    commitAndDeploy: protectedProcedure
      .input(z.object({
        externalId: z.string(),
        branch: z.string(),
        message: z.string(),
        files: z.array(z.object({
          path: z.string(),
          content: z.string().nullable(),
        })).min(1).max(100),
        webappProjectExternalId: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const repo = await getGitHubRepoByExternalId(input.externalId);
        if (!repo || repo.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Repo not found" });
        const conns = await getUserConnectors(ctx.user.id);
        const ghConn = conns.find(c => c.connectorId === "github" && c.status === "connected");
        if (!ghConn) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub not connected" });
        const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
        if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub token not available" });

        // Step 1: Multi-file commit
        const { createTreeCommit } = await import("../githubApi");
        const [owner, repoName] = repo.fullName.split("/");
        const commitResult = await createTreeCommit(token, {
          owner,
          repo: repoName,
          branch: input.branch,
          message: input.message,
          files: input.files,
        });

        // Step 2: Trigger deploy if webapp project is linked
        let deployResult = null;
        if (input.webappProjectExternalId) {
          try {
            const { getWebappProjectByExternalId, createWebappDeployment, updateWebappProject } = await import("../db");
            const project = await getWebappProjectByExternalId(input.webappProjectExternalId);
            if (project && project.userId === ctx.user.id) {
              await updateWebappProject(project.id, { deployStatus: "building" });
              const depId = await createWebappDeployment({
                projectId: project.id,
                userId: ctx.user.id,
                versionLabel: `git-${commitResult.sha.slice(0, 7)}`,
                commitSha: commitResult.sha,
                commitMessage: input.message,
                status: "building",
              });
              deployResult = {
                deploymentId: depId,
                status: "building",
                commitSha: commitResult.sha,
                projectName: project.name,
              };
            }
          } catch (err: any) {
            console.error("[commitAndDeploy] Deploy trigger failed:", err.message);
            deployResult = { error: err.message, status: "failed" };
          }
        }

        return {
          commit: commitResult,
          deploy: deployResult,
        };
      }),

    /** Fork a repository to the authenticated user's account */
    forkRepo: protectedProcedure
      .input(z.object({
        owner: z.string(),
        repo: z.string(),
        organization: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const conns = await getUserConnectors(ctx.user.id);
        const ghConn = conns.find(c => c.connectorId === "github" && c.status === "connected");
        if (!ghConn) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub not connected" });
        const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
        if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub token not available" });
        const { forkRepo: ghFork } = await import("../githubApi");
        return ghFork(token, input.owner, input.repo, input.organization);
      }),
  });
