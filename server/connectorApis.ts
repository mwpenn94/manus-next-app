/**
 * Connector API Operations
 * 
 * Provides real API operations for each connected service.
 * Each connector exposes a set of actions the agent can invoke during task execution.
 * Tokens are decrypted and injected automatically from the connector record.
 */

export interface ConnectorAction {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, { type: string; required?: boolean; description: string }>;
}

export interface ConnectorApiResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// ── Google Drive API ──

export const googleDriveActions: ConnectorAction[] = [
  {
    id: "list_files",
    name: "List Files",
    description: "List files and folders in Google Drive",
    parameters: {
      query: { type: "string", description: "Search query (Google Drive search syntax)" },
      folderId: { type: "string", description: "Parent folder ID (default: root)" },
      pageSize: { type: "number", description: "Number of results (max 100)" },
    },
  },
  {
    id: "read_file",
    name: "Read File",
    description: "Read the content of a file from Google Drive",
    parameters: {
      fileId: { type: "string", required: true, description: "Google Drive file ID" },
      mimeType: { type: "string", description: "Export MIME type for Google Docs (e.g., text/plain, application/pdf)" },
    },
  },
  {
    id: "create_file",
    name: "Create File",
    description: "Create a new file in Google Drive",
    parameters: {
      name: { type: "string", required: true, description: "File name" },
      content: { type: "string", required: true, description: "File content (text or base64)" },
      mimeType: { type: "string", description: "MIME type of the content" },
      folderId: { type: "string", description: "Parent folder ID" },
    },
  },
  {
    id: "update_file",
    name: "Update File",
    description: "Update an existing file's content in Google Drive",
    parameters: {
      fileId: { type: "string", required: true, description: "Google Drive file ID" },
      content: { type: "string", required: true, description: "New file content" },
      mimeType: { type: "string", description: "MIME type of the content" },
    },
  },
  {
    id: "share_file",
    name: "Share File",
    description: "Share a file with specific users or make it public",
    parameters: {
      fileId: { type: "string", required: true, description: "Google Drive file ID" },
      email: { type: "string", description: "Email to share with" },
      role: { type: "string", description: "Permission role: reader, writer, commenter" },
      type: { type: "string", description: "Permission type: user, anyone" },
    },
  },
];

export async function executeGoogleDrive(
  accessToken: string,
  action: string,
  params: Record<string, unknown>
): Promise<ConnectorApiResult> {
  const headers = { Authorization: `Bearer ${accessToken}` };

  switch (action) {
    case "list_files": {
      const query = params.query as string || "";
      const folderId = params.folderId as string || "root";
      const pageSize = Math.min(params.pageSize as number || 20, 100);
      const q = query
        ? `${query} and '${folderId}' in parents and trashed=false`
        : `'${folderId}' in parents and trashed=false`;
      const url = new URL("https://www.googleapis.com/drive/v3/files");
      url.searchParams.set("q", q);
      url.searchParams.set("pageSize", String(pageSize));
      url.searchParams.set("fields", "files(id,name,mimeType,modifiedTime,size,webViewLink)");
      url.searchParams.set("orderBy", "modifiedTime desc");
      const resp = await fetch(url.toString(), { headers });
      if (!resp.ok) return { success: false, error: `Drive API error: ${resp.status} ${await resp.text()}` };
      const data = await resp.json();
      return { success: true, data: data.files };
    }

    case "read_file": {
      const fileId = params.fileId as string;
      if (!fileId) return { success: false, error: "fileId is required" };
      const mimeType = params.mimeType as string;
      // If mimeType specified, export (for Google Docs/Sheets/Slides)
      const url = mimeType
        ? `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(mimeType)}`
        : `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      const resp = await fetch(url, { headers });
      if (!resp.ok) return { success: false, error: `Drive read error: ${resp.status}` };
      const content = await resp.text();
      return { success: true, data: { content, fileId } };
    }

    case "create_file": {
      const name = params.name as string;
      const content = params.content as string;
      const mimeType = params.mimeType as string || "text/plain";
      const folderId = params.folderId as string;
      if (!name || !content) return { success: false, error: "name and content are required" };

      // Multipart upload
      const metadata: Record<string, unknown> = { name, mimeType };
      if (folderId) metadata.parents = [folderId];

      const boundary = "===boundary===";
      const body = [
        `--${boundary}`,
        "Content-Type: application/json; charset=UTF-8",
        "",
        JSON.stringify(metadata),
        `--${boundary}`,
        `Content-Type: ${mimeType}`,
        "",
        content,
        `--${boundary}--`,
      ].join("\r\n");

      const resp = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
        method: "POST",
        headers: { ...headers, "Content-Type": `multipart/related; boundary=${boundary}` },
        body,
      });
      if (!resp.ok) return { success: false, error: `Drive create error: ${resp.status} ${await resp.text()}` };
      const file = await resp.json();
      return { success: true, data: { id: file.id, name: file.name, webViewLink: file.webViewLink } };
    }

    case "update_file": {
      const fileId = params.fileId as string;
      const content = params.content as string;
      const mimeType = params.mimeType as string || "text/plain";
      if (!fileId || !content) return { success: false, error: "fileId and content are required" };
      const resp = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": mimeType },
        body: content,
      });
      if (!resp.ok) return { success: false, error: `Drive update error: ${resp.status}` };
      const file = await resp.json();
      return { success: true, data: { id: file.id, name: file.name } };
    }

    case "share_file": {
      const fileId = params.fileId as string;
      if (!fileId) return { success: false, error: "fileId is required" };
      const permission: Record<string, string> = {
        role: (params.role as string) || "reader",
        type: (params.type as string) || (params.email ? "user" : "anyone"),
      };
      if (params.email) permission.emailAddress = params.email as string;
      const resp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(permission),
      });
      if (!resp.ok) return { success: false, error: `Drive share error: ${resp.status}` };
      return { success: true, data: { shared: true, fileId } };
    }

    default:
      return { success: false, error: `Unknown Google Drive action: ${action}` };
  }
}

// ── Slack API ──

export const slackActions: ConnectorAction[] = [
  {
    id: "list_channels",
    name: "List Channels",
    description: "List channels the bot has access to",
    parameters: {
      limit: { type: "number", description: "Max channels to return (default 50)" },
    },
  },
  {
    id: "send_message",
    name: "Send Message",
    description: "Send a message to a Slack channel",
    parameters: {
      channel: { type: "string", required: true, description: "Channel ID or name" },
      text: { type: "string", required: true, description: "Message text (supports Slack markdown)" },
      thread_ts: { type: "string", description: "Thread timestamp to reply in a thread" },
    },
  },
  {
    id: "read_history",
    name: "Read Channel History",
    description: "Read recent messages from a channel",
    parameters: {
      channel: { type: "string", required: true, description: "Channel ID" },
      limit: { type: "number", description: "Number of messages (default 20, max 100)" },
    },
  },
  {
    id: "search_messages",
    name: "Search Messages",
    description: "Search for messages across channels",
    parameters: {
      query: { type: "string", required: true, description: "Search query" },
      count: { type: "number", description: "Number of results (default 20)" },
    },
  },
];

export async function executeSlack(
  accessToken: string,
  action: string,
  params: Record<string, unknown>
): Promise<ConnectorApiResult> {
  const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

  switch (action) {
    case "list_channels": {
      const limit = Math.min(params.limit as number || 50, 200);
      const resp = await fetch(`https://slack.com/api/conversations.list?limit=${limit}&types=public_channel,private_channel`, { headers });
      const data = await resp.json() as Record<string, any>;
      if (!data.ok) return { success: false, error: `Slack error: ${data.error}` };
      return {
        success: true,
        data: data.channels.map((ch: any) => ({
          id: ch.id,
          name: ch.name,
          topic: ch.topic?.value,
          memberCount: ch.num_members,
          isPrivate: ch.is_private,
        })),
      };
    }

    case "send_message": {
      const channel = params.channel as string;
      const text = params.text as string;
      if (!channel || !text) return { success: false, error: "channel and text are required" };
      const body: Record<string, unknown> = { channel, text };
      if (params.thread_ts) body.thread_ts = params.thread_ts;
      const resp = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const data = await resp.json() as Record<string, any>;
      if (!data.ok) return { success: false, error: `Slack error: ${data.error}` };
      return { success: true, data: { ts: data.ts, channel: data.channel } };
    }

    case "read_history": {
      const channel = params.channel as string;
      if (!channel) return { success: false, error: "channel is required" };
      const limit = Math.min(params.limit as number || 20, 100);
      const resp = await fetch(`https://slack.com/api/conversations.history?channel=${channel}&limit=${limit}`, { headers });
      const data = await resp.json() as Record<string, any>;
      if (!data.ok) return { success: false, error: `Slack error: ${data.error}` };
      return {
        success: true,
        data: data.messages.map((msg: any) => ({
          user: msg.user,
          text: msg.text,
          ts: msg.ts,
          type: msg.type,
        })),
      };
    }

    case "search_messages": {
      const query = params.query as string;
      if (!query) return { success: false, error: "query is required" };
      const count = Math.min(params.count as number || 20, 100);
      const resp = await fetch(`https://slack.com/api/search.messages?query=${encodeURIComponent(query)}&count=${count}`, { headers });
      const data = await resp.json() as Record<string, any>;
      if (!data.ok) return { success: false, error: `Slack error: ${data.error}` };
      return {
        success: true,
        data: data.messages?.matches?.map((m: any) => ({
          text: m.text,
          channel: m.channel?.name,
          user: m.username,
          ts: m.ts,
          permalink: m.permalink,
        })) || [],
      };
    }

    default:
      return { success: false, error: `Unknown Slack action: ${action}` };
  }
}

// ── Notion API ──

export const notionActions: ConnectorAction[] = [
  {
    id: "list_pages",
    name: "List Pages",
    description: "Search for pages in the connected Notion workspace",
    parameters: {
      query: { type: "string", description: "Search query (empty for all pages)" },
      pageSize: { type: "number", description: "Number of results (default 20)" },
    },
  },
  {
    id: "read_page",
    name: "Read Page",
    description: "Read the content of a Notion page",
    parameters: {
      pageId: { type: "string", required: true, description: "Notion page ID" },
    },
  },
  {
    id: "create_page",
    name: "Create Page",
    description: "Create a new page in a Notion database or as a child of another page",
    parameters: {
      parentId: { type: "string", required: true, description: "Parent page or database ID" },
      parentType: { type: "string", description: "Parent type: page_id or database_id (default: page_id)" },
      title: { type: "string", required: true, description: "Page title" },
      content: { type: "string", description: "Page content as markdown (converted to blocks)" },
    },
  },
  {
    id: "query_database",
    name: "Query Database",
    description: "Query a Notion database with optional filters",
    parameters: {
      databaseId: { type: "string", required: true, description: "Notion database ID" },
      filter: { type: "object", description: "Notion filter object (optional)" },
      pageSize: { type: "number", description: "Number of results (default 20)" },
    },
  },
  {
    id: "update_page",
    name: "Update Page Properties",
    description: "Update properties of a Notion page",
    parameters: {
      pageId: { type: "string", required: true, description: "Notion page ID" },
      properties: { type: "object", required: true, description: "Properties to update (Notion property format)" },
    },
  },
];

export async function executeNotion(
  accessToken: string,
  action: string,
  params: Record<string, unknown>
): Promise<ConnectorApiResult> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28",
  };

  switch (action) {
    case "list_pages": {
      const query = params.query as string || "";
      const pageSize = Math.min(params.pageSize as number || 20, 100);
      const body: Record<string, unknown> = { page_size: pageSize };
      if (query) body.query = query;
      const resp = await fetch("https://api.notion.com/v1/search", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!resp.ok) return { success: false, error: `Notion error: ${resp.status} ${await resp.text()}` };
      const data = await resp.json() as Record<string, any>;
      return {
        success: true,
        data: data.results?.map((page: any) => ({
          id: page.id,
          type: page.object,
          title: page.properties?.title?.title?.[0]?.plain_text ||
                 page.properties?.Name?.title?.[0]?.plain_text ||
                 "Untitled",
          url: page.url,
          lastEdited: page.last_edited_time,
        })) || [],
      };
    }

    case "read_page": {
      const pageId = params.pageId as string;
      if (!pageId) return { success: false, error: "pageId is required" };
      // Get page properties
      const pageResp = await fetch(`https://api.notion.com/v1/pages/${pageId}`, { headers });
      if (!pageResp.ok) return { success: false, error: `Notion page error: ${pageResp.status}` };
      const page = await pageResp.json() as Record<string, any>;
      // Get page blocks (content)
      const blocksResp = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`, { headers });
      const blocks = blocksResp.ok ? await blocksResp.json() as Record<string, any> : { results: [] };
      // Convert blocks to readable text
      const content = blocks.results?.map((block: any) => {
        const type = block.type;
        const data = block[type];
        if (!data) return "";
        if (data.rich_text) return data.rich_text.map((t: any) => t.plain_text).join("");
        if (data.text) return data.text.map((t: any) => t.plain_text).join("");
        return `[${type} block]`;
      }).filter(Boolean).join("\n") || "";
      return { success: true, data: { id: page.id, url: page.url, properties: page.properties, content } };
    }

    case "create_page": {
      const parentId = params.parentId as string;
      const parentType = (params.parentType as string) || "page_id";
      const title = params.title as string;
      const content = params.content as string;
      if (!parentId || !title) return { success: false, error: "parentId and title are required" };

      const body: Record<string, unknown> = {
        parent: { [parentType]: parentId },
        properties: {
          title: { title: [{ text: { content: title } }] },
        },
      };

      // Convert simple markdown content to Notion blocks
      if (content) {
        const lines = content.split("\n").filter(Boolean);
        body.children = lines.map((line: string) => {
          if (line.startsWith("# ")) {
            return { object: "block", type: "heading_1", heading_1: { rich_text: [{ text: { content: line.slice(2) } }] } };
          } else if (line.startsWith("## ")) {
            return { object: "block", type: "heading_2", heading_2: { rich_text: [{ text: { content: line.slice(3) } }] } };
          } else if (line.startsWith("- ")) {
            return { object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: line.slice(2) } }] } };
          } else {
            return { object: "block", type: "paragraph", paragraph: { rich_text: [{ text: { content: line } }] } };
          }
        });
      }

      const resp = await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!resp.ok) return { success: false, error: `Notion create error: ${resp.status} ${await resp.text()}` };
      const newPage = await resp.json() as Record<string, any>;
      return { success: true, data: { id: newPage.id, url: newPage.url } };
    }

    case "query_database": {
      const databaseId = params.databaseId as string;
      if (!databaseId) return { success: false, error: "databaseId is required" };
      const pageSize = Math.min(params.pageSize as number || 20, 100);
      const body: Record<string, unknown> = { page_size: pageSize };
      if (params.filter) body.filter = params.filter;
      const resp = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!resp.ok) return { success: false, error: `Notion query error: ${resp.status} ${await resp.text()}` };
      const data = await resp.json() as Record<string, any>;
      return {
        success: true,
        data: data.results?.map((row: any) => ({
          id: row.id,
          properties: row.properties,
          url: row.url,
        })) || [],
      };
    }

    case "update_page": {
      const pageId = params.pageId as string;
      const properties = params.properties as Record<string, unknown>;
      if (!pageId || !properties) return { success: false, error: "pageId and properties are required" };
      const resp = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ properties }),
      });
      if (!resp.ok) return { success: false, error: `Notion update error: ${resp.status}` };
      const updated = await resp.json() as Record<string, any>;
      return { success: true, data: { id: updated.id, url: updated.url } };
    }

    default:
      return { success: false, error: `Unknown Notion action: ${action}` };
  }
}

// ── Linear API (GraphQL) ──

export const linearActions: ConnectorAction[] = [
  {
    id: "list_issues",
    name: "List Issues",
    description: "List issues assigned to you or in a project",
    parameters: {
      projectId: { type: "string", description: "Filter by project ID" },
      status: { type: "string", description: "Filter by status (e.g., In Progress, Done)" },
      limit: { type: "number", description: "Number of results (default 20)" },
    },
  },
  {
    id: "create_issue",
    name: "Create Issue",
    description: "Create a new issue in Linear",
    parameters: {
      title: { type: "string", required: true, description: "Issue title" },
      description: { type: "string", description: "Issue description (markdown)" },
      teamId: { type: "string", required: true, description: "Team ID" },
      priority: { type: "number", description: "Priority (0=none, 1=urgent, 2=high, 3=medium, 4=low)" },
      assigneeId: { type: "string", description: "Assignee user ID" },
      labelIds: { type: "array", description: "Label IDs to apply" },
    },
  },
  {
    id: "update_issue",
    name: "Update Issue",
    description: "Update an existing issue",
    parameters: {
      issueId: { type: "string", required: true, description: "Issue ID" },
      title: { type: "string", description: "New title" },
      description: { type: "string", description: "New description" },
      stateId: { type: "string", description: "New state/status ID" },
      priority: { type: "number", description: "New priority" },
      assigneeId: { type: "string", description: "New assignee" },
    },
  },
  {
    id: "list_projects",
    name: "List Projects",
    description: "List projects in the workspace",
    parameters: {
      limit: { type: "number", description: "Number of results (default 20)" },
    },
  },
  {
    id: "list_teams",
    name: "List Teams",
    description: "List teams in the workspace",
    parameters: {},
  },
];

async function linearGraphQL(
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<ConnectorApiResult> {
  const resp = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      Authorization: accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!resp.ok) return { success: false, error: `Linear API error: ${resp.status}` };
  const data = await resp.json() as Record<string, any>;
  if (data.errors) return { success: false, error: data.errors[0]?.message || "GraphQL error" };
  return { success: true, data: data.data };
}

export async function executeLinear(
  accessToken: string,
  action: string,
  params: Record<string, unknown>
): Promise<ConnectorApiResult> {
  switch (action) {
    case "list_issues": {
      const limit = Math.min(params.limit as number || 20, 50);
      let filter = "";
      if (params.projectId) filter += `, filter: { project: { id: { eq: "${params.projectId}" } } }`;
      const query = `query { issues(first: ${limit}${filter}, orderBy: updatedAt) { nodes { id identifier title state { name } priority assignee { name } project { name } updatedAt } } }`;
      const result = await linearGraphQL(accessToken, query);
      if (!result.success) return result;
      return { success: true, data: (result.data as any).issues.nodes };
    }

    case "create_issue": {
      const title = params.title as string;
      const teamId = params.teamId as string;
      if (!title || !teamId) return { success: false, error: "title and teamId are required" };
      const input: Record<string, unknown> = { title, teamId };
      if (params.description) input.description = params.description;
      if (params.priority !== undefined) input.priority = params.priority;
      if (params.assigneeId) input.assigneeId = params.assigneeId;
      if (params.labelIds) input.labelIds = params.labelIds;
      const query = `mutation CreateIssue($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id identifier title url } } }`;
      const result = await linearGraphQL(accessToken, query, { input });
      if (!result.success) return result;
      const issueData = (result.data as any).issueCreate;
      return { success: issueData.success, data: issueData.issue };
    }

    case "update_issue": {
      const issueId = params.issueId as string;
      if (!issueId) return { success: false, error: "issueId is required" };
      const input: Record<string, unknown> = {};
      if (params.title) input.title = params.title;
      if (params.description) input.description = params.description;
      if (params.stateId) input.stateId = params.stateId;
      if (params.priority !== undefined) input.priority = params.priority;
      if (params.assigneeId) input.assigneeId = params.assigneeId;
      const query = `mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) { issueUpdate(id: $id, input: $input) { success issue { id identifier title state { name } } } }`;
      const result = await linearGraphQL(accessToken, query, { id: issueId, input });
      if (!result.success) return result;
      const updateData = (result.data as any).issueUpdate;
      return { success: updateData.success, data: updateData.issue };
    }

    case "list_projects": {
      const limit = Math.min(params.limit as number || 20, 50);
      const query = `query { projects(first: ${limit}, orderBy: updatedAt) { nodes { id name state progress { scope completed } teams { nodes { name } } } } }`;
      const result = await linearGraphQL(accessToken, query);
      if (!result.success) return result;
      return { success: true, data: (result.data as any).projects.nodes };
    }

    case "list_teams": {
      const query = `query { teams { nodes { id name key description } } }`;
      const result = await linearGraphQL(accessToken, query);
      if (!result.success) return result;
      return { success: true, data: (result.data as any).teams.nodes };
    }

    default:
      return { success: false, error: `Unknown Linear action: ${action}` };
  }
}

// ── GitHub API (enhanced beyond basic OAuth) ──

export const githubActions: ConnectorAction[] = [
  {
    id: "list_repos",
    name: "List Repositories",
    description: "List repositories for the authenticated user",
    parameters: {
      sort: { type: "string", description: "Sort by: updated, created, pushed, full_name" },
      limit: { type: "number", description: "Number of results (default 20)" },
    },
  },
  {
    id: "create_issue",
    name: "Create Issue",
    description: "Create an issue in a repository",
    parameters: {
      owner: { type: "string", required: true, description: "Repository owner" },
      repo: { type: "string", required: true, description: "Repository name" },
      title: { type: "string", required: true, description: "Issue title" },
      body: { type: "string", description: "Issue body (markdown)" },
      labels: { type: "array", description: "Label names to apply" },
    },
  },
  {
    id: "list_issues",
    name: "List Issues",
    description: "List issues in a repository",
    parameters: {
      owner: { type: "string", required: true, description: "Repository owner" },
      repo: { type: "string", required: true, description: "Repository name" },
      state: { type: "string", description: "Filter by state: open, closed, all" },
      limit: { type: "number", description: "Number of results (default 20)" },
    },
  },
  {
    id: "create_pr",
    name: "Create Pull Request",
    description: "Create a pull request",
    parameters: {
      owner: { type: "string", required: true, description: "Repository owner" },
      repo: { type: "string", required: true, description: "Repository name" },
      title: { type: "string", required: true, description: "PR title" },
      body: { type: "string", description: "PR body (markdown)" },
      head: { type: "string", required: true, description: "Head branch" },
      base: { type: "string", description: "Base branch (default: main)" },
    },
  },
  {
    id: "read_file",
    name: "Read File",
    description: "Read a file from a repository",
    parameters: {
      owner: { type: "string", required: true, description: "Repository owner" },
      repo: { type: "string", required: true, description: "Repository name" },
      path: { type: "string", required: true, description: "File path" },
      ref: { type: "string", description: "Branch or commit ref" },
    },
  },
];

export async function executeGitHub(
  accessToken: string,
  action: string,
  params: Record<string, unknown>
): Promise<ConnectorApiResult> {
  const headers = { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" };

  switch (action) {
    case "list_repos": {
      const sort = params.sort as string || "updated";
      const limit = Math.min(params.limit as number || 20, 100);
      const resp = await fetch(`https://api.github.com/user/repos?sort=${sort}&per_page=${limit}`, { headers });
      if (!resp.ok) return { success: false, error: `GitHub error: ${resp.status}` };
      const repos = await resp.json() as any[];
      return {
        success: true,
        data: repos.map((r: any) => ({
          name: r.full_name,
          description: r.description,
          language: r.language,
          stars: r.stargazers_count,
          updatedAt: r.updated_at,
          url: r.html_url,
          isPrivate: r.private,
        })),
      };
    }

    case "create_issue": {
      const { owner, repo, title, body, labels } = params as Record<string, any>;
      if (!owner || !repo || !title) return { success: false, error: "owner, repo, and title are required" };
      const issueBody: Record<string, unknown> = { title };
      if (body) issueBody.body = body;
      if (labels) issueBody.labels = labels;
      const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(issueBody),
      });
      if (!resp.ok) return { success: false, error: `GitHub create issue error: ${resp.status} ${await resp.text()}` };
      const issue = await resp.json() as Record<string, any>;
      return { success: true, data: { number: issue.number, url: issue.html_url, title: issue.title } };
    }

    case "list_issues": {
      const { owner, repo, state } = params as Record<string, any>;
      if (!owner || !repo) return { success: false, error: "owner and repo are required" };
      const limit = Math.min(params.limit as number || 20, 100);
      const stateParam = state || "open";
      const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=${stateParam}&per_page=${limit}`, { headers });
      if (!resp.ok) return { success: false, error: `GitHub list issues error: ${resp.status}` };
      const issues = await resp.json() as any[];
      return {
        success: true,
        data: issues.map((i: any) => ({
          number: i.number,
          title: i.title,
          state: i.state,
          user: i.user?.login,
          labels: i.labels?.map((l: any) => l.name),
          url: i.html_url,
          createdAt: i.created_at,
        })),
      };
    }

    case "create_pr": {
      const { owner, repo, title, body, head, base } = params as Record<string, any>;
      if (!owner || !repo || !title || !head) return { success: false, error: "owner, repo, title, and head are required" };
      const prBody: Record<string, unknown> = { title, head, base: base || "main" };
      if (body) prBody.body = body;
      const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(prBody),
      });
      if (!resp.ok) return { success: false, error: `GitHub create PR error: ${resp.status} ${await resp.text()}` };
      const pr = await resp.json() as Record<string, any>;
      return { success: true, data: { number: pr.number, url: pr.html_url, title: pr.title } };
    }

    case "read_file": {
      const { owner, repo, path, ref } = params as Record<string, any>;
      if (!owner || !repo || !path) return { success: false, error: "owner, repo, and path are required" };
      let url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
      if (ref) url += `?ref=${ref}`;
      const resp = await fetch(url, { headers });
      if (!resp.ok) return { success: false, error: `GitHub read file error: ${resp.status}` };
      const file = await resp.json() as Record<string, any>;
      const content = file.encoding === "base64" ? Buffer.from(file.content, "base64").toString("utf-8") : file.content;
      return { success: true, data: { path: file.path, content, sha: file.sha, size: file.size } };
    }

    default:
      return { success: false, error: `Unknown GitHub action: ${action}` };
  }
}

// ── Microsoft 365 API (Graph) ──

export const microsoft365Actions: ConnectorAction[] = [
  {
    id: "list_files",
    name: "List OneDrive Files",
    description: "List files in OneDrive root or a specific folder",
    parameters: {
      folderId: { type: "string", description: "Folder ID (default: root)" },
      limit: { type: "number", description: "Number of results (default 20)" },
    },
  },
  {
    id: "read_emails",
    name: "Read Emails",
    description: "Read recent emails from Outlook",
    parameters: {
      limit: { type: "number", description: "Number of emails (default 10)" },
      filter: { type: "string", description: "OData filter (e.g., isRead eq false)" },
    },
  },
  {
    id: "send_email",
    name: "Send Email",
    description: "Send an email via Outlook",
    parameters: {
      to: { type: "string", required: true, description: "Recipient email address" },
      subject: { type: "string", required: true, description: "Email subject" },
      body: { type: "string", required: true, description: "Email body (HTML supported)" },
    },
  },
  {
    id: "list_events",
    name: "List Calendar Events",
    description: "List upcoming calendar events",
    parameters: {
      limit: { type: "number", description: "Number of events (default 10)" },
      startDateTime: { type: "string", description: "Start date (ISO format)" },
    },
  },
];

export async function executeMicrosoft365(
  accessToken: string,
  action: string,
  params: Record<string, unknown>
): Promise<ConnectorApiResult> {
  const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

  switch (action) {
    case "list_files": {
      const folderId = params.folderId as string || "root";
      const limit = Math.min(params.limit as number || 20, 100);
      const url = `https://graph.microsoft.com/v1.0/me/drive/${folderId === "root" ? "root" : `items/${folderId}`}/children?$top=${limit}&$select=id,name,size,lastModifiedDateTime,webUrl,folder,file`;
      const resp = await fetch(url, { headers });
      if (!resp.ok) return { success: false, error: `OneDrive error: ${resp.status} ${await resp.text()}` };
      const data = await resp.json() as Record<string, any>;
      return {
        success: true,
        data: data.value?.map((item: any) => ({
          id: item.id,
          name: item.name,
          size: item.size,
          isFolder: !!item.folder,
          lastModified: item.lastModifiedDateTime,
          webUrl: item.webUrl,
        })) || [],
      };
    }

    case "read_emails": {
      const limit = Math.min(params.limit as number || 10, 50);
      let url = `https://graph.microsoft.com/v1.0/me/messages?$top=${limit}&$select=id,subject,from,receivedDateTime,isRead,bodyPreview&$orderby=receivedDateTime desc`;
      if (params.filter) url += `&$filter=${params.filter}`;
      const resp = await fetch(url, { headers });
      if (!resp.ok) return { success: false, error: `Outlook error: ${resp.status}` };
      const data = await resp.json() as Record<string, any>;
      return {
        success: true,
        data: data.value?.map((msg: any) => ({
          id: msg.id,
          subject: msg.subject,
          from: msg.from?.emailAddress?.address,
          receivedAt: msg.receivedDateTime,
          isRead: msg.isRead,
          preview: msg.bodyPreview,
        })) || [],
      };
    }

    case "send_email": {
      const { to, subject, body } = params as Record<string, any>;
      if (!to || !subject || !body) return { success: false, error: "to, subject, and body are required" };
      const message = {
        message: {
          subject,
          body: { contentType: "HTML", content: body },
          toRecipients: [{ emailAddress: { address: to } }],
        },
      };
      const resp = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
        method: "POST",
        headers,
        body: JSON.stringify(message),
      });
      if (!resp.ok) return { success: false, error: `Send email error: ${resp.status} ${await resp.text()}` };
      return { success: true, data: { sent: true, to, subject } };
    }

    case "list_events": {
      const limit = Math.min(params.limit as number || 10, 50);
      const start = params.startDateTime as string || new Date().toISOString();
      const url = `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${start}&endDateTime=${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()}&$top=${limit}&$select=id,subject,start,end,location,organizer`;
      const resp = await fetch(url, { headers });
      if (!resp.ok) return { success: false, error: `Calendar error: ${resp.status}` };
      const data = await resp.json() as Record<string, any>;
      return {
        success: true,
        data: data.value?.map((event: any) => ({
          id: event.id,
          subject: event.subject,
          start: event.start?.dateTime,
          end: event.end?.dateTime,
          location: event.location?.displayName,
          organizer: event.organizer?.emailAddress?.address,
        })) || [],
      };
    }

    default:
      return { success: false, error: `Unknown Microsoft 365 action: ${action}` };
  }
}

// ── Unified Connector Executor ──

export interface ConnectorCatalogEntry {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  actions: ConnectorAction[];
}

export const CONNECTOR_CATALOG: ConnectorCatalogEntry[] = [
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Access, create, and manage files in Google Drive",
    icon: "google-drive",
    category: "storage",
    actions: googleDriveActions,
  },
  {
    id: "slack",
    name: "Slack",
    description: "Send messages, read channels, and search conversations",
    icon: "slack",
    category: "communication",
    actions: slackActions,
  },
  {
    id: "notion",
    name: "Notion",
    description: "Read and create pages, query databases in Notion",
    icon: "notion",
    category: "productivity",
    actions: notionActions,
  },
  {
    id: "linear",
    name: "Linear",
    description: "Manage issues, projects, and teams in Linear",
    icon: "linear",
    category: "project-management",
    actions: linearActions,
  },
  {
    id: "github",
    name: "GitHub",
    description: "Manage repositories, issues, and pull requests",
    icon: "github",
    category: "development",
    actions: githubActions,
  },
  {
    id: "microsoft-365",
    name: "Microsoft 365",
    description: "Access OneDrive files, Outlook email, and Calendar",
    icon: "microsoft",
    category: "productivity",
    actions: microsoft365Actions,
  },
];

/**
 * Execute a connector action with the given access token.
 * This is the unified entry point used by the agent tools.
 */
export async function executeConnectorAction(
  connectorId: string,
  accessToken: string,
  action: string,
  params: Record<string, unknown>
): Promise<ConnectorApiResult> {
  switch (connectorId) {
    case "google-drive":
      return executeGoogleDrive(accessToken, action, params);
    case "slack":
      return executeSlack(accessToken, action, params);
    case "notion":
      return executeNotion(accessToken, action, params);
    case "linear":
      return executeLinear(accessToken, action, params);
    case "github":
      return executeGitHub(accessToken, action, params);
    case "microsoft-365":
      return executeMicrosoft365(accessToken, action, params);
    default:
      return { success: false, error: `No API executor for connector: ${connectorId}` };
  }
}
