# P28 Gap Analysis — GitHub + Code Editor + Subdomain Publishing

## What Already Exists (Backend)
- Full GitHub API wrapper (`server/githubApi.ts`): repos, tree, files, branches, commits, PRs, issues
- GitHub router in `server/routers.ts`: repos, connectRepo, createRepo, disconnectRepo, syncRepo, listRemoteRepos, fileTree, fileContent, commitFile, branches, createBranch, commits, pullRequests, createPR, issues
- WebappProject router: list, get, create, update, delete, deploy, deployments
- DB schema: github_repos, webapp_projects, webapp_deployments tables
- DB helpers: full CRUD for all tables

## What Already Exists (Frontend)
- `GitHubPage.tsx` (683 lines): Repo list, import dialog, create dialog, file browser, branches, commits, PRs, issues
- `WebAppProjectPage.tsx` (756 lines): Preview, Code, Dashboard, Deployments, Settings (General, Domains, Secrets, GitHub, Notifications)

## GAPS TO FILL

### 1. In-App Code Editor (Critical — Manus parity)
- Current: File content shown as read-only `<pre>` block
- Need: Monaco/CodeMirror editor with syntax highlighting, edit + commit flow
- GitHubPage.tsx line 300-305 needs replacement with real editor

### 2. File Operations (Create/Delete/Rename)
- Backend: `createOrUpdateFile` and `deleteFile` exist in githubApi.ts
- Router: Only `commitFile` exposed; need `deleteFile`, `createFile` procedures
- Frontend: No UI for creating new files, deleting files, or renaming

### 3. Subdomain Publishing — Real URL Generation
- Current: `deploy` mutation just creates a record and simulates build with setTimeout
- Need: Generate real `publishedUrl` = `${subdomainPrefix}.manus.space` or similar
- The deploy flow should set publishedUrl on the project after "build" completes

### 4. Code Panel in WebAppProjectPage
- Current: Just shows "Connected to GitHub" card and a clone command
- Need: Embed the file browser + editor from GitHubPage inline

### 5. GitHub OAuth Connection Flow
- Current: Import dialog says "Go to Connectors" if not connected
- Need: Ensure the connector OAuth flow actually works for GitHub
- Check if GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are configured

### 6. Missing GitHub Features for Parity
- Delete file from repo
- Create issue from UI
- Merge PR from UI
- Fork a repo
- Search within repo files

### 7. Webapp Builder Page
- Need to check what exists at /webapp-builder route
- Should be the project list/creation page

## IMPLEMENTATION PRIORITY
1. Code editor with edit+commit (highest impact for parity)
2. File create/delete operations
3. Deploy flow generating real publishedUrl
4. Code panel embedding in WebAppProjectPage
5. Missing GitHub CRUD (delete file, create issue, merge PR)
6. Vitest tests
