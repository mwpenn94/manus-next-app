# Expert Assess Pass 1 — Findings

## What Already Exists (Functional)

### GitHub Integration
- **Server**: Full `github` router with 15+ procedures: list, import, create, disconnect, sync, fileTree, getFile, createOrUpdateFile, deleteFile, createIssue, mergePR, branches, createBranch, commits, listRemoteRepos
- **Server**: `githubApi.ts` — 285-line module with 20+ exported functions wrapping GitHub REST API
- **Server**: `connectorOAuth.ts` — Full GitHub OAuth flow (authorize URL, code exchange, token storage)
- **Server**: OAuth callback at `/api/connector/oauth/callback` with server-side token exchange
- **Client**: `ConnectorsPage.tsx` — OAuth popup flow for GitHub connection
- **Client**: `GitHubPage.tsx` — 926-line page with file browser, branch management, PR list, commit history, issue tracking
- **Client**: `CodeEditor.tsx` — Lazy-loaded syntax-highlighted code editor

### Webapp Dev/Management/Publishing
- **Server**: `webapp` router with list, get, create, update, publish procedures
- **Server**: Publish uploads HTML to S3 and returns live URL
- **Client**: `WebAppBuilderPage.tsx`, `WebAppProjectPage.tsx` — webapp management pages
- **Client**: `WebappPreviewCard.tsx` — iframe preview with device toggles, publishedUrl support
- **Client**: `DeploymentCard.tsx` — deployment status with Visit Site, Manage, Publish buttons
- **Client**: `AppPublishPage.tsx` — publish management

### Chat + Task Flow
- **Server**: Full task CRUD, SSE streaming, agent tool execution
- **Client**: `TaskView.tsx` — 4000+ line task view with streaming, workspace panel, collapsible
- **Client**: `buildStreamCallbacks.ts` — SSE event handlers for all artifact types
- **Client**: Suggestion chips, TaskCompletedCard, TaskRating, Listen/Branch buttons

## Critical Gaps for E2E Parity+

### Gap 1: GitHub Page File Editor — No Save/Commit Flow
The GitHubPage has a file browser and CodeEditor, but need to verify the save-to-commit flow works E2E.

### Gap 2: GitHub → Webapp Pipeline
No connection between GitHub repo and webapp preview/publish. User can't:
- Preview a repo as a running webapp
- Deploy a GitHub repo to a live domain
- This is a major Manus parity gap

### Gap 3: Browser/Device Automation
No Playwright or CDP integration exists yet for virtual user QA.

### Gap 4: Connector OAuth → GitHub Page Flow
Need to verify the flow from ConnectorsPage OAuth → GitHubPage repo listing works seamlessly.

## Priority Order
1. Verify existing GitHub E2E flow works (OAuth → import → browse → edit → commit)
2. Add GitHub → webapp preview/deploy pipeline
3. Add Playwright virtual user QA
4. Convergence passes
