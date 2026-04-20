/**
 * GitHub API Helper — Server-side GitHub REST API wrapper
 * 
 * Uses the user's OAuth access token from the connectors table to make
 * authenticated GitHub API calls. Supports repo CRUD, file operations,
 * branches, pull requests, and commit operations.
 */

const GITHUB_API = "https://api.github.com";

interface GitHubApiOptions {
  token: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
}

async function githubFetch<T = unknown>(path: string, opts: GitHubApiOptions): Promise<T> {
  const url = path.startsWith("http") ? path : `${GITHUB_API}${path}`;
  const resp = await fetch(url, {
    method: opts.method || "GET",
    headers: {
      Authorization: `Bearer ${opts.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`GitHub API ${resp.status}: ${errBody}`);
  }
  if (resp.status === 204) return {} as T;
  return resp.json() as Promise<T>;
}

// ── User ──
export async function getAuthenticatedUser(token: string) {
  return githubFetch<{
    login: string; id: number; avatar_url: string; name: string | null;
    email: string | null; bio: string | null; public_repos: number;
  }>("/user", { token });
}

// ── Repos ──
export interface GitHubRepoData {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  default_branch: string;
  private: boolean;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  pushed_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function listUserRepos(token: string, page = 1, perPage = 30, sort = "updated") {
  return githubFetch<GitHubRepoData[]>(
    `/user/repos?sort=${sort}&per_page=${perPage}&page=${page}&affiliation=owner,collaborator,organization_member`,
    { token }
  );
}

export async function getRepo(token: string, owner: string, repo: string) {
  return githubFetch<GitHubRepoData>(`/repos/${owner}/${repo}`, { token });
}

export async function createRepo(token: string, opts: {
  name: string;
  description?: string;
  private?: boolean;
  auto_init?: boolean;
  gitignore_template?: string;
  license_template?: string;
}) {
  return githubFetch<GitHubRepoData>("/user/repos", {
    token,
    method: "POST",
    body: opts,
  });
}

export async function deleteRepo(token: string, owner: string, repo: string) {
  return githubFetch(`/repos/${owner}/${repo}`, { token, method: "DELETE" });
}

// ── File Operations ──
export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url: string;
}

export async function getRepoTree(token: string, owner: string, repo: string, sha = "HEAD", recursive = true) {
  const suffix = recursive ? "?recursive=1" : "";
  return githubFetch<{ sha: string; tree: GitHubTreeItem[]; truncated: boolean }>(
    `/repos/${owner}/${repo}/git/trees/${sha}${suffix}`,
    { token }
  );
}

export async function getFileContent(token: string, owner: string, repo: string, path: string, ref?: string) {
  const suffix = ref ? `?ref=${ref}` : "";
  return githubFetch<{
    name: string; path: string; sha: string; size: number;
    type: "file" | "dir"; encoding: string; content: string;
    html_url: string; download_url: string | null;
  }>(`/repos/${owner}/${repo}/contents/${path}${suffix}`, { token });
}

export async function createOrUpdateFile(token: string, owner: string, repo: string, path: string, opts: {
  message: string;
  content: string; // base64 encoded
  sha?: string; // required for updates
  branch?: string;
}) {
  return githubFetch<{
    content: { sha: string; html_url: string };
    commit: { sha: string; message: string; html_url: string };
  }>(`/repos/${owner}/${repo}/contents/${path}`, {
    token,
    method: "PUT",
    body: opts,
  });
}

export async function deleteFile(token: string, owner: string, repo: string, path: string, opts: {
  message: string;
  sha: string;
  branch?: string;
}) {
  return githubFetch(`/repos/${owner}/${repo}/contents/${path}`, {
    token,
    method: "DELETE",
    body: opts,
  });
}

// ── Branches ──
export interface GitHubBranch {
  name: string;
  commit: { sha: string; url: string };
  protected: boolean;
}

export async function listBranches(token: string, owner: string, repo: string) {
  return githubFetch<GitHubBranch[]>(`/repos/${owner}/${repo}/branches`, { token });
}

export async function createBranch(token: string, owner: string, repo: string, branchName: string, fromSha: string) {
  return githubFetch<{ ref: string; object: { sha: string } }>(
    `/repos/${owner}/${repo}/git/refs`,
    { token, method: "POST", body: { ref: `refs/heads/${branchName}`, sha: fromSha } }
  );
}

// ── Commits ──
export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; email: string; date: string };
    committer: { name: string; email: string; date: string };
  };
  html_url: string;
  author: { login: string; avatar_url: string } | null;
}

export async function listCommits(token: string, owner: string, repo: string, opts?: {
  sha?: string; per_page?: number; page?: number;
}) {
  const params = new URLSearchParams();
  if (opts?.sha) params.set("sha", opts.sha);
  if (opts?.per_page) params.set("per_page", String(opts.per_page));
  if (opts?.page) params.set("page", String(opts.page));
  const qs = params.toString() ? `?${params}` : "";
  return githubFetch<GitHubCommit[]>(`/repos/${owner}/${repo}/commits${qs}`, { token });
}

// ── Pull Requests ──
export interface GitHubPR {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  html_url: string;
  user: { login: string; avatar_url: string };
  head: { ref: string; sha: string };
  base: { ref: string; sha: string };
  merged: boolean;
  created_at: string;
  updated_at: string;
  merged_at: string | null;
}

export async function listPullRequests(token: string, owner: string, repo: string, state: "open" | "closed" | "all" = "open") {
  return githubFetch<GitHubPR[]>(`/repos/${owner}/${repo}/pulls?state=${state}`, { token });
}

export async function createPullRequest(token: string, owner: string, repo: string, opts: {
  title: string;
  body?: string;
  head: string;
  base: string;
}) {
  return githubFetch<GitHubPR>(`/repos/${owner}/${repo}/pulls`, {
    token,
    method: "POST",
    body: opts,
  });
}

export async function mergePullRequest(token: string, owner: string, repo: string, pullNumber: number, opts?: {
  merge_method?: "merge" | "squash" | "rebase";
  commit_title?: string;
}) {
  return githubFetch<{ sha: string; merged: boolean; message: string }>(
    `/repos/${owner}/${repo}/pulls/${pullNumber}/merge`,
    { token, method: "PUT", body: opts || {} }
  );
}

// ── Issues ──
export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  html_url: string;
  user: { login: string; avatar_url: string };
  labels: Array<{ name: string; color: string }>;
  created_at: string;
  updated_at: string;
}

export async function listIssues(token: string, owner: string, repo: string, state: "open" | "closed" | "all" = "open") {
  return githubFetch<GitHubIssue[]>(`/repos/${owner}/${repo}/issues?state=${state}`, { token });
}

export async function createIssue(token: string, owner: string, repo: string, opts: {
  title: string;
  body?: string;
  labels?: string[];
}) {
  return githubFetch<GitHubIssue>(`/repos/${owner}/${repo}/issues`, {
    token,
    method: "POST",
    body: opts,
  });
}

// ── Webhooks ──
export async function createWebhook(token: string, owner: string, repo: string, opts: {
  url: string;
  events: string[];
  secret?: string;
}) {
  return githubFetch(`/repos/${owner}/${repo}/hooks`, {
    token,
    method: "POST",
    body: {
      name: "web",
      active: true,
      events: opts.events,
      config: {
        url: opts.url,
        content_type: "json",
        secret: opts.secret,
      },
    },
  });
}
