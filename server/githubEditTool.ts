/**
 * GitHub AI Edit Tool — Manus-Aligned Repo Editing
 *
 * Enables the agent to edit any connected GitHub repo from natural language:
 * 1. Read repo structure (file tree) via GitHub API
 * 2. Use LLM to plan which files to read
 * 3. Read those files via GitHub API
 * 4. Use LLM to generate edits (file path + new content)
 * 5. Return diffs for user confirmation
 * 6. Atomic multi-file commit via createTreeCommit
 *
 * No cloning needed. All operations via GitHub REST API.
 */
import { getRepoTree, getFileContent, createTreeCommit } from "./githubApi";
import { getUserConnectors, getUserGitHubRepos } from "./db";
import type { ToolResult } from "./agentTools";

// ── Types ──
interface FileEdit {
  path: string;
  originalContent: string | null; // null = new file
  newContent: string | null; // null = delete
  action: "create" | "modify" | "delete";
}

interface EditPlan {
  summary: string;
  edits: FileEdit[];
  commitMessage: string;
}

// ── Helpers ──

/** Get the user's GitHub token from their connector */
async function getGitHubToken(userId: number): Promise<string | null> {
  const conns = await getUserConnectors(userId);
  const ghConn = conns.find((c) => c.connectorId === "github" && c.status === "connected");
  if (!ghConn) return null;
  return ghConn.accessToken || (ghConn.config as Record<string, string>)?.token || null;
}

/** Find a repo by name or fullName from the user's connected repos */
async function findUserRepo(userId: number, repoIdentifier: string) {
  const repos = await getUserGitHubRepos(userId);
  // Try exact match on fullName first, then name, then partial match
  const normalized = repoIdentifier.toLowerCase().trim();
  return (
    repos.find((r) => r.fullName.toLowerCase() === normalized) ||
    repos.find((r) => r.name.toLowerCase() === normalized) ||
    repos.find((r) => r.fullName.toLowerCase().includes(normalized)) ||
    repos.find((r) => r.name.toLowerCase().includes(normalized)) ||
    null
  );
}

/** Read file tree and return a compact summary for the LLM */
async function getRepoStructure(token: string, owner: string, repo: string, branch: string): Promise<string> {
  try {
    const tree = await getRepoTree(token, owner, repo, branch, true);
    // Filter to relevant files (skip node_modules, .git, dist, etc.)
    const SKIP_PATTERNS = [
      /^node_modules\//,
      /^\.git\//,
      /^dist\//,
      /^build\//,
      /^\.next\//,
      /^coverage\//,
      /^\.cache\//,
      /^vendor\//,
      /^__pycache__\//,
      /\.min\.(js|css)$/,
      /\.map$/,
      /package-lock\.json$/,
      /pnpm-lock\.yaml$/,
      /yarn\.lock$/,
    ];
    const files = tree.tree
      .filter((item) => item.type === "blob")
      .filter((item) => !SKIP_PATTERNS.some((p) => p.test(item.path || "")))
      .map((item) => {
        const sizeKB = item.size ? (item.size / 1024).toFixed(1) : "?";
        return `${item.path} (${sizeKB} KB)`;
      });

    if (tree.truncated) {
      return `File tree (truncated — large repo, showing ${files.length} files):\n${files.join("\n")}`;
    }
    return `File tree (${files.length} files):\n${files.join("\n")}`;
  } catch (err: any) {
    return `Error reading repo structure: ${err.message}`;
  }
}

/** Read a single file's content from GitHub */
async function readFile(token: string, owner: string, repo: string, path: string, ref?: string): Promise<string | null> {
  try {
    const file = await getFileContent(token, owner, repo, path, ref);
    if (file.encoding === "base64" && file.content) {
      return Buffer.from(file.content, "base64").toString("utf-8");
    }
    return file.content || null;
  } catch {
    return null;
  }
}

/** Generate a unified diff-like summary for display */
function generateDiffSummary(edits: FileEdit[]): string {
  const parts: string[] = [];
  for (const edit of edits) {
    if (edit.action === "create") {
      const lines = (edit.newContent || "").split("\n");
      parts.push(`### + ${edit.path} (new file, ${lines.length} lines)`);
      // Show first 30 lines
      const preview = lines.slice(0, 30).map((l) => `+ ${l}`).join("\n");
      parts.push("```\n" + preview + (lines.length > 30 ? `\n... (${lines.length - 30} more lines)` : "") + "\n```");
    } else if (edit.action === "delete") {
      parts.push(`### - ${edit.path} (deleted)`);
    } else {
      // Modify — show a simple before/after summary
      const oldLines = (edit.originalContent || "").split("\n");
      const newLines = (edit.newContent || "").split("\n");
      parts.push(`### ~ ${edit.path} (modified: ${oldLines.length} → ${newLines.length} lines)`);
      // Show a compact diff
      const changed: string[] = [];
      const maxLines = Math.max(oldLines.length, newLines.length);
      let diffCount = 0;
      for (let i = 0; i < maxLines && diffCount < 40; i++) {
        const oldL = oldLines[i] ?? "";
        const newL = newLines[i] ?? "";
        if (oldL !== newL) {
          if (oldLines[i] !== undefined) changed.push(`- ${oldL}`);
          if (newLines[i] !== undefined) changed.push(`+ ${newL}`);
          diffCount++;
        }
      }
      if (changed.length > 0) {
        parts.push("```diff\n" + changed.join("\n") + (diffCount >= 40 ? "\n... (more changes)" : "") + "\n```");
      }
    }
  }
  return parts.join("\n\n");
}

// ── Main Tool Executor ──

export async function executeGitHubEdit(args: {
  instruction: string;
  repo?: string;
  confirm?: boolean;
  edit_plan_id?: string;
}, context?: { userId?: number }): Promise<ToolResult> {
  const { invokeLLM } = await import("./_core/llm");

  if (!context?.userId) {
    return { success: false, result: "Authentication required. Please log in to use GitHub editing." };
  }

  const token = await getGitHubToken(context.userId);
  if (!token) {
    return {
      success: false,
      result: "GitHub is not connected. Please connect your GitHub account first by visiting the GitHub page and clicking 'Connect GitHub Account'.",
    };
  }
  // Validate token is still active before proceeding
  const { validateGitHubToken } = await import("./githubApi");
  const validUser = await validateGitHubToken(token);
  if (!validUser) {
    return {
      success: false,
      result: "Your GitHub token has expired or been revoked. Please reconnect your GitHub account:\n1. Go to the GitHub page in the sidebar\n2. Click 'Disconnect' then 'Connect GitHub Account'\n3. Re-authorize the app on GitHub\n\nThis usually happens when you revoke access on GitHub's side or change your password.",
    };
  }

  // ── Step 0: Find the repo ──
  const repos = await getUserGitHubRepos(context.userId);
  if (repos.length === 0) {
    return {
      success: false,
      result: "No GitHub repositories connected. Import or create a repository first from the GitHub page.",
    };
  }

  let targetRepo: typeof repos[0] | null = null;
  if (args.repo) {
    targetRepo = await findUserRepo(context.userId, args.repo);
    if (!targetRepo) {
      const repoList = repos.map((r) => `- ${r.fullName}`).join("\n");
      return {
        success: false,
        result: `Repository "${args.repo}" not found. Your connected repos:\n${repoList}\n\nSpecify one of these, or connect the repo first.`,
      };
    }
  } else if (repos.length === 1) {
    targetRepo = repos[0];
  } else {
    // Multiple repos — ask the agent to specify
    const repoList = repos.map((r) => `- ${r.fullName}${r.description ? ` — ${r.description}` : ""}`).join("\n");
    return {
      success: false,
      result: `Multiple repos connected. Please specify which one to edit:\n${repoList}\n\nCall github_edit again with the repo parameter set to the repo name.`,
    };
  }

  const [owner, repoName] = targetRepo.fullName.split("/");
  const branch = targetRepo.defaultBranch || "main";

  // ── Step 1: If confirming a previous edit plan, execute it ──
  if (args.confirm && args.edit_plan_id) {
    // The edit plan is stored in the pending edits cache
    const plan = pendingEdits.get(args.edit_plan_id);
    if (!plan) {
      return {
        success: false,
        result: "Edit plan expired or not found. Please run github_edit again with your instruction to regenerate the plan.",
      };
    }
    pendingEdits.delete(args.edit_plan_id);

    // Execute the commit
    try {
      const files = plan.edits.map((e) => ({
        path: e.path,
        content: e.action === "delete" ? null : (e.newContent || ""),
      }));

      const result = await createTreeCommit(token, {
        owner,
        repo: repoName,
        branch,
        message: plan.commitMessage,
        files,
      });

      return {
        success: true,
        result: `✅ **Committed to ${targetRepo.fullName}** (branch: ${branch})\n\n**Commit:** ${result.sha.slice(0, 7)}\n**Message:** ${plan.commitMessage}\n**Files changed:** ${result.filesChanged}\n\n[View commit on GitHub](https://github.com/${targetRepo.fullName}/commit/${result.sha})`,
        artifactType: "terminal",
        artifactLabel: `git commit ${result.sha.slice(0, 7)}`,
      };
    } catch (err: any) {
      return {
        success: false,
        result: `Commit failed: ${err.message}. The edit plan has been discarded. You can try again with github_edit.`,
      };
    }
  }

  // ── Step 2: Read repo structure ──
  const structure = await getRepoStructure(token, owner, repoName, branch);

  // ── Step 3: Ask LLM to plan which files to read and what edits to make ──
  const planResponse = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a code editing assistant. The user wants to make changes to a GitHub repository.

Repository: ${targetRepo.fullName} (branch: ${branch})
${structure}

Based on the user's instruction, determine:
1. Which files need to be READ first to understand the current code
2. What changes need to be made

Respond with a JSON object:
{
  "files_to_read": ["path/to/file1.ts", "path/to/file2.ts"],
  "reasoning": "Brief explanation of your plan"
}

Only list files that actually need to be read to make the requested changes. Be selective — don't read the entire repo.`,
      },
      {
        role: "user",
        content: args.instruction,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "edit_plan",
        strict: true,
        schema: {
          type: "object",
          properties: {
            files_to_read: {
              type: "array",
              items: { type: "string" },
              description: "File paths to read before making edits",
            },
            reasoning: {
              type: "string",
              description: "Brief explanation of the plan",
            },
          },
          required: ["files_to_read", "reasoning"],
          additionalProperties: false,
        },
      },
    },
  });

  let filesToRead: string[] = [];
  let reasoning = "";
  try {
    const rawContent = planResponse.choices[0].message.content;
    const contentStr = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
    const parsed = JSON.parse(contentStr || "{}");
    filesToRead = parsed.files_to_read || [];
    reasoning = parsed.reasoning || "";
  } catch {
    return { success: false, result: "Failed to plan edits. Please try rephrasing your instruction." };
  }

  // ── Step 4: Read the files ──
  const fileContents: Record<string, string> = {};
  for (const filePath of filesToRead.slice(0, 20)) {
    // Cap at 20 files to avoid excessive API calls
    const content = await readFile(token, owner, repoName, filePath, branch);
    if (content !== null) {
      fileContents[filePath] = content;
    }
  }

  // ── Step 5: Ask LLM to generate the actual edits ──
  const fileContextParts = Object.entries(fileContents).map(
    ([path, content]) => `### ${path}\n\`\`\`\n${content}\n\`\`\``
  );

  const editResponse = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a code editing assistant. Generate the exact file edits needed for the user's request.

Repository: ${targetRepo.fullName} (branch: ${branch})

Current file contents:
${fileContextParts.join("\n\n")}

Repository structure:
${structure}

Respond with a JSON object containing the edits:
{
  "summary": "Brief description of all changes",
  "commit_message": "Conventional commit message (e.g., 'feat: add user authentication')",
  "edits": [
    {
      "path": "path/to/file.ts",
      "action": "modify",
      "new_content": "entire new file content here"
    },
    {
      "path": "path/to/new-file.ts",
      "action": "create",
      "new_content": "entire file content"
    },
    {
      "path": "path/to/delete.ts",
      "action": "delete",
      "new_content": null
    }
  ]
}

IMPORTANT:
- For "modify" actions, provide the COMPLETE new file content (not just the changed parts)
- For "create" actions, provide the full file content
- For "delete" actions, set new_content to null
- Write clean, production-quality code
- Follow the existing code style and conventions in the repo
- Include all necessary imports`,
      },
      {
        role: "user",
        content: args.instruction,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "edit_result",
        strict: true,
        schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            commit_message: { type: "string" },
            edits: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  path: { type: "string" },
                  action: { type: "string", enum: ["create", "modify", "delete"] },
                  new_content: { type: ["string", "null"] },
                },
                required: ["path", "action", "new_content"],
                additionalProperties: false,
              },
            },
          },
          required: ["summary", "commit_message", "edits"],
          additionalProperties: false,
        },
      },
    },
  });

  let editResult: { summary: string; commit_message: string; edits: Array<{ path: string; action: string; new_content: string | null }> };
  try {
    const rawEditContent = editResponse.choices[0].message.content;
    const editContentStr = typeof rawEditContent === "string" ? rawEditContent : JSON.stringify(rawEditContent);
    editResult = JSON.parse(editContentStr || "{}");
  } catch {
    return { success: false, result: "Failed to generate edits. Please try rephrasing your instruction." };
  }

  if (!editResult.edits || editResult.edits.length === 0) {
    return { success: true, result: "No changes needed based on your instruction. The code already matches what you described." };
  }

  // ── Step 6: Build the edit plan with diffs ──
  const editPlan: EditPlan = {
    summary: editResult.summary,
    commitMessage: editResult.commit_message,
    edits: editResult.edits.map((e) => ({
      path: e.path,
      originalContent: fileContents[e.path] ?? null,
      newContent: e.new_content,
      action: e.action as "create" | "modify" | "delete",
    })),
  };

  // Store the plan for confirmation
  const planId = `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  pendingEdits.set(planId, editPlan);

  // Auto-expire after 10 minutes
  setTimeout(() => pendingEdits.delete(planId), 10 * 60 * 1000);

  // Generate diff summary
  const diffSummary = generateDiffSummary(editPlan.edits);

  const filesSummary = editPlan.edits
    .map((e) => `- **${e.action}** \`${e.path}\``)
    .join("\n");

  return {
    success: true,
    result: `## Proposed Changes to ${targetRepo.fullName}\n\n**Plan:** ${editPlan.summary}\n**Commit message:** \`${editPlan.commitMessage}\`\n**Files:** ${editPlan.edits.length} file(s)\n${filesSummary}\n\n---\n\n${diffSummary}\n\n---\n\n**To apply these changes**, call \`github_edit\` with \`confirm: true\` and \`edit_plan_id: "${planId}"\`.\n**To discard**, just ignore or give a new instruction.`,
    artifactType: "code",
    artifactLabel: `Edit plan: ${editPlan.summary.slice(0, 60)}`,
  };
}

// ── Pending Edits Cache ──
const pendingEdits = new Map<string, EditPlan>();

/** Get count of pending edits (for testing) */
export function getPendingEditCount(): number {
  return pendingEdits.size;
}

/** Clear all pending edits (for testing) */
export function clearPendingEdits(): void {
  pendingEdits.clear();
}
