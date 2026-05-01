/**
 * GitHub Create Repo Tool — Agent-callable tool for creating new GitHub repositories
 * and optionally connecting them as webapp projects for continuous deployment.
 * 
 * This gives the agent Manus-production parity: the ability to create new repos,
 * connect them as projects, push initial files, and set up webhooks for auto-deploy.
 */

import type { ToolContext } from "./agentTools";

interface CreateRepoArgs {
  name: string;
  description?: string;
  private?: boolean;
  auto_init?: boolean;
  gitignore_template?: string;
  license_template?: string;
  connect_as_project?: boolean;
  initial_files?: Array<{ path: string; content: string }>;
}

export async function executeCreateGitHubRepo(
  args: Record<string, unknown>,
  context?: ToolContext
): Promise<{ success: boolean; result: string }> {
  const {
    name,
    description,
    private: isPrivate,
    auto_init,
    gitignore_template,
    license_template,
    connect_as_project,
    initial_files,
  } = args as unknown as CreateRepoArgs;

  if (!name || typeof name !== "string") {
    return { success: false, result: "Repository name is required." };
  }

  // Validate repo name
  const validName = /^[a-zA-Z0-9._-]+$/;
  if (!validName.test(name)) {
    return { success: false, result: `Invalid repository name "${name}". Use only letters, numbers, hyphens, underscores, and dots.` };
  }

  if (!context?.userId) {
    return { success: false, result: "Authentication required. Please sign in first." };
  }

  try {
    const { getUserConnectors } = await import("./db");
    const connectors = await getUserConnectors(context.userId);
    const ghConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");

    if (!ghConn) {
      return {
        success: false,
        result: "GitHub is not connected. Please connect your GitHub account via Settings > Connectors first.",
      };
    }

    const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
    if (!token) {
      return {
        success: false,
        result: "GitHub token not available. Please reconnect GitHub via Settings > Connectors.",
      };
    }

    // 1. Create the repository on GitHub
    const { createRepo, createTreeCommit, ensureWebhook, getAuthenticatedUser } = await import("./githubApi");

    const ghRepo = await createRepo(token, {
      name,
      description: description || undefined,
      private: isPrivate ?? false,
      auto_init: auto_init ?? true,
      gitignore_template: gitignore_template || undefined,
      license_template: license_template || undefined,
    });

    const results: string[] = [
      `✅ Repository created: **${ghRepo.full_name}**`,
      `   URL: ${ghRepo.html_url}`,
      `   Visibility: ${ghRepo.private ? "Private" : "Public"}`,
      `   Default branch: ${ghRepo.default_branch}`,
    ];

    // 2. Push initial files if provided
    if (initial_files && initial_files.length > 0) {
      try {
        // Wait a moment for GitHub to initialize the repo
        await new Promise(resolve => setTimeout(resolve, 2000));
        const [owner, repoName] = ghRepo.full_name.split("/");
        await createTreeCommit(token, {
          owner,
          repo: repoName,
          branch: ghRepo.default_branch,
          message: "Initial commit: add project files",
          files: initial_files.map(f => ({
            path: f.path,
            content: f.content,
          })),
        });
        results.push(`✅ Pushed ${initial_files.length} initial file(s)`);
      } catch (err: any) {
        results.push(`⚠️ Could not push initial files: ${err.message}`);
      }
    }

    // 3. Connect as project in our DB
    const { createGitHubRepo, getGitHubRepoById } = await import("./db");
    const dbRepoId = await createGitHubRepo({
      userId: context.userId,
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
    const dbRepo = await getGitHubRepoById(dbRepoId);
    results.push(`✅ Connected to Manus Next (synced)`);

    // 4. Register webhook for auto-deploy
    try {
      const baseUrl = process.env.VITE_APP_URL || (process.env.VITE_APP_DOMAIN ? `https://${process.env.VITE_APP_DOMAIN}` : "");
      if (baseUrl) {
        const webhookUrl = `${baseUrl}/api/github/webhook`;
        const secret = process.env.GITHUB_WEBHOOK_SECRET || undefined;
        const [owner, repoName] = ghRepo.full_name.split("/");
        const { created } = await ensureWebhook(token, owner, repoName, webhookUrl, secret, ["push"]);
        if (created) {
          results.push(`✅ Webhook registered for auto-deploy on push`);
        } else {
          results.push(`✅ Webhook already active`);
        }
      }
    } catch (err: any) {
      results.push(`⚠️ Webhook registration skipped: ${err.message}`);
    }

    // 5. Optionally create a webapp project linked to this repo
    if (connect_as_project !== false) {
      try {
        const { createWebappProject } = await import("./db");
        const projectId = await createWebappProject({
          userId: context.userId,
          name: ghRepo.name,
          description: ghRepo.description || `Webapp project for ${ghRepo.full_name}`,
          githubRepoId: dbRepoId,
          deployStatus: "idle",
          framework: "static",
        });
        results.push(`✅ Webapp project created and linked (auto-deploys on push)`);
        results.push(`   Project will auto-deploy when you push to ${ghRepo.default_branch}`);
      } catch (err: any) {
        // Non-fatal — project creation might fail if createWebappProject doesn't exist yet
        results.push(`⚠️ Could not create linked webapp project: ${err.message}`);
      }
    }

    results.push("");
    results.push("**Next steps:**");
    results.push(`- Clone: \`git clone ${ghRepo.clone_url}\``);
    results.push(`- Or push existing code: \`git remote add origin ${ghRepo.clone_url} && git push -u origin ${ghRepo.default_branch}\``);
    results.push(`- Edit files directly in the GitHub tab of this app`);
    if (connect_as_project !== false) {
      results.push(`- Push changes to auto-deploy via webhook`);
    }

    return { success: true, result: results.join("\n") };
  } catch (err: any) {
    if (err.message?.includes("422")) {
      return { success: false, result: `Repository "${name}" already exists or the name is invalid. Try a different name.` };
    }
    return { success: false, result: `Failed to create repository: ${err.message}` };
  }
}
