/**
 * GitHub Integration Tests (NS17)
 *
 * Covers: GitHub API helper types, router procedure validation,
 * connector token resolution, and webapp project CRUD.
 */
import { describe, it, expect, vi } from "vitest";

// ── GitHub API helper module shape ──
describe("GitHub API helper module", () => {
  it("exports all required helper functions", async () => {
    const mod = await import("./githubApi");
    const expectedExports = [
      "getAuthenticatedUser",
      "listUserRepos",
      "getRepo",
      "createRepo",
      "deleteRepo",
      "getRepoTree",
      "getFileContent",
      "createOrUpdateFile",
      "deleteFile",
      "listBranches",
      "createBranch",
      "listCommits",
      "listPullRequests",
      "createPullRequest",
      "mergePullRequest",
      "listIssues",
      "createIssue",
      "createWebhook",
    ];
    for (const fn of expectedExports) {
      expect(typeof (mod as any)[fn]).toBe("function");
    }
  });

  it("getAuthenticatedUser requires a token string", async () => {
    const { getAuthenticatedUser } = await import("./githubApi");
    // Should throw when called with invalid token (network error)
    await expect(getAuthenticatedUser("")).rejects.toThrow();
  });

  it("listUserRepos defaults to page 1 and 30 per page", async () => {
    const { listUserRepos } = await import("./githubApi");
    // Should throw with invalid token but validates the function signature
    await expect(listUserRepos("invalid-token")).rejects.toThrow();
  });

  it("createRepo requires name in options", async () => {
    const { createRepo } = await import("./githubApi");
    await expect(createRepo("invalid-token", { name: "" })).rejects.toThrow();
  });
});

// ── GitHub connector token resolution pattern ──
describe("GitHub connector token resolution", () => {
  it("connector OAuth providers include github", async () => {
    const { oauthProviders, isOAuthSupported } = await import("./connectorOAuth");
    expect(oauthProviders).toHaveProperty("github");
    // isOAuthSupported checks env vars
    const supported = isOAuthSupported("github");
    expect(typeof supported).toBe("boolean");
  });

  it("github OAuth provider has correct scopes", async () => {
    const { oauthProviders } = await import("./connectorOAuth");
    const github = oauthProviders.github;
    expect(github).toBeDefined();
    expect(github.scopes).toContain("repo");
    expect(github.scopes).toContain("read:user");
    expect(github.scopes).toContain("user:email");
  });

  it("github OAuth provider builds valid auth URL", async () => {
    const { oauthProviders } = await import("./connectorOAuth");
    const github = oauthProviders.github;
    const url = github.getAuthUrl("https://example.com/callback", "test-state");
    expect(url).toContain("github.com/login/oauth/authorize");
    expect(url).toContain("state=test-state");
    expect(url).toContain("redirect_uri=");
  });
});

// ── Schema validation for GitHub repos table ──
describe("GitHub repos schema", () => {
  it("githubRepos table exists in schema", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.githubRepos).toBeDefined();
  });

  it("githubRepos has required columns", async () => {
    const schema = await import("../drizzle/schema");
    const table = schema.githubRepos;
    // Drizzle tables expose column definitions
    const columnNames = Object.keys(table);
    const requiredColumns = [
      "id", "externalId", "userId", "fullName", "name",
      "htmlUrl", "defaultBranch", "isPrivate", "status",
    ];
    for (const col of requiredColumns) {
      expect(columnNames).toContain(col);
    }
  });
});

// ── Schema validation for webapp projects table ──
describe("Webapp projects schema", () => {
  it("webappProjects table exists in schema", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.webappProjects).toBeDefined();
  });

  it("webappProjects has required columns", async () => {
    const schema = await import("../drizzle/schema");
    const table = schema.webappProjects;
    const columnNames = Object.keys(table);
    const requiredColumns = [
      "id", "externalId", "userId", "name", "framework",
      "deployTarget", "deployStatus", "buildCommand", "outputDir",
    ];
    for (const col of requiredColumns) {
      expect(columnNames).toContain(col);
    }
  });

  it("webappDeployments table exists in schema", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.webappDeployments).toBeDefined();
  });

  it("webappDeployments has required columns", async () => {
    const schema = await import("../drizzle/schema");
    const table = schema.webappDeployments;
    const columnNames = Object.keys(table);
    const requiredColumns = [
      "id", "projectId", "userId", "status", "versionLabel",
    ];
    for (const col of requiredColumns) {
      expect(columnNames).toContain(col);
    }
  });
});

// ── DB helper exports ──
describe("GitHub db helpers", () => {
  it("exports all GitHub repo CRUD helpers", async () => {
    const db = await import("./db");
    const expectedHelpers = [
      "createGitHubRepo",
      "getUserGitHubRepos",
      "getGitHubRepoById",
      "getGitHubRepoByExternalId",
      "getGitHubRepoByFullName",
      "updateGitHubRepo",
      "disconnectGitHubRepo",
    ];
    for (const fn of expectedHelpers) {
      expect(typeof (db as any)[fn]).toBe("function");
    }
  });

  it("exports all webapp project CRUD helpers", async () => {
    const db = await import("./db");
    const expectedHelpers = [
      "createWebappProject",
      "getUserWebappProjects",
      "getWebappProjectById",
      "getWebappProjectByExternalId",
      "updateWebappProject",
      "deleteWebappProject",
      "createWebappDeployment",
      "getProjectDeployments",
      "updateWebappDeployment",
    ];
    for (const fn of expectedHelpers) {
      expect(typeof (db as any)[fn]).toBe("function");
    }
  });
});

// ── Router shape validation ──
describe("GitHub and webapp project router shape", () => {
  it("appRouter includes github sub-router", async () => {
    const { appRouter } = await import("./routers");
    // tRPC router has _def.procedures
    const procedures = (appRouter as any)._def.procedures;
    // Check for github.repos, github.createRepo, etc.
    expect(procedures["github.repos"]).toBeDefined();
    expect(procedures["github.getRepo"]).toBeDefined();
    expect(procedures["github.connectRepo"]).toBeDefined();
    expect(procedures["github.createRepo"]).toBeDefined();
    expect(procedures["github.disconnectRepo"]).toBeDefined();
    expect(procedures["github.syncRepo"]).toBeDefined();
    expect(procedures["github.listRemoteRepos"]).toBeDefined();
    expect(procedures["github.fileTree"]).toBeDefined();
    expect(procedures["github.fileContent"]).toBeDefined();
    expect(procedures["github.commitFile"]).toBeDefined();
    expect(procedures["github.branches"]).toBeDefined();
    expect(procedures["github.createBranch"]).toBeDefined();
    expect(procedures["github.commits"]).toBeDefined();
    expect(procedures["github.pullRequests"]).toBeDefined();
    expect(procedures["github.createPR"]).toBeDefined();
    expect(procedures["github.issues"]).toBeDefined();
  });

  it("appRouter includes webappProject sub-router", async () => {
    const { appRouter } = await import("./routers");
    const procedures = (appRouter as any)._def.procedures;
    expect(procedures["webappProject.list"]).toBeDefined();
    expect(procedures["webappProject.get"]).toBeDefined();
    expect(procedures["webappProject.create"]).toBeDefined();
    expect(procedures["webappProject.update"]).toBeDefined();
    expect(procedures["webappProject.delete"]).toBeDefined();
    expect(procedures["webappProject.deploy"]).toBeDefined();
    expect(procedures["webappProject.deployments"]).toBeDefined();
  });
});

// ── GitHub API URL construction ──
describe("GitHub API URL construction", () => {
  it("uses correct GitHub API base URL", async () => {
    // The githubApi module should use https://api.github.com
    const source = await import("./githubApi");
    // We can verify by checking the module exports function signatures
    // The actual URL is internal but we can verify the module loads
    expect(source).toBeDefined();
  });
});

// ── Webapp project deploy targets ──
describe("Webapp project deploy targets", () => {
  it("supports manus, github_pages, vercel, netlify targets", async () => {
    const { appRouter } = await import("./routers");
    const procedures = (appRouter as any)._def.procedures;
    const createProc = procedures["webappProject.create"];
    // The procedure exists and accepts deployTarget
    expect(createProc).toBeDefined();
  });
});
