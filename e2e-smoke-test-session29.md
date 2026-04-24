# E2E Smoke Test Session 29 — Full Pipeline Trace

## Signal Assessment (Recursive Optimization)

**Fundamental Redesign**: Absent — core architecture is sound, tRPC + SSE + S3 deploy pipeline is well-structured.
**Landscape**: Absent — broad coverage exists across all major flows.
**Depth**: PRESENT — several specific areas remain shallow or have untested assumptions.
**Adversarial**: PRESENT — hidden failure modes found in status handling and edge cases.
**Future-State**: Absent — not yet at exhaustion of current-state optimization.

**Executing: Depth pass** (highest priority with present signals)

## E2E Flow Trace Results

### Flow 1: Home → Create Task → Chat
- PASS: Home page loads correctly with greeting, input, suggestion cards
- PASS: Task creation uses optimistic local state + server persist
- PASS: Auth guard on /api/stream prevents unauthenticated abuse
- PASS: SSE heartbeat keeps connection alive

### Flow 2: Chat → Agent Creates Webapp
- PASS: create_webapp scaffolds React+Vite+Tailwind or HTML project
- PASS: Dev server starts on dynamic port, health-check polling
- PASS: DB persistence creates webappProject record
- PASS: webapp_preview SSE event emitted with projectExternalId
- PASS: Client deduplicates multiple webapp_preview events per app name
- **ISSUE 1**: WebappPreviewCard status type is "published" | "not_published" | "deploying" but buildStreamCallbacks sets status to "running" which falls through to "Not published" display. Should add "running" to the union.

### Flow 3: Preview Card → Live Preview
- PASS: Proxy at /api/webapp-preview/ forwards to dev server port
- PASS: Retry logic (3 attempts) for when dev server is still starting
- PASS: Auto-refresh via refreshKey prop when agent edits files
- PASS: Device view switching (desktop/tablet/mobile)
- **ISSUE 2**: "Open in new tab" opens /api/webapp-preview/ which only works on the dev server domain, not on the published domain. After deploy, the onVisit should switch to the published URL.

### Flow 4: Agent Deploys Webapp
- PASS: deploy_webapp builds project, uploads all files to S3
- PASS: Asset URL rewriting in index.html for S3 paths
- PASS: webapp_deployed SSE event emitted
- PASS: DeploymentCard rendered in chat with live URL, copy, manage buttons
- PASS: DB updated with deployment record
- PASS: Structured build error extraction on failure
- **ISSUE 3**: The deploy_webapp tool result has artifactType: "webapp_preview" which triggers ANOTHER webapp_preview SSE event (duplicate). Should be "webapp_deployed" or null to prevent double card.

### Flow 5: Deploy Card → Manage Project
- PASS: DeploymentCard has "Manage" button navigating to /projects/webapp/{externalId}
- PASS: WebAppProjectPage has deployment history, re-deploy, settings, delete
- **ISSUE 4**: After deploy, the WebappPreviewCard's onPublish still says "ask the agent to deploy" even though it's already deployed. Should show "View Live Site" or "Re-deploy" instead.

### Flow 6: Preview Card Status Update After Deploy
- PASS: onWebappDeployed handler finds the preview card and updates it
- **ISSUE 5**: The updateMessageCard sets status to "published" but the card was initially set with status "running" (not in the type union). The update works because it replaces the status, but the initial "running" value is wrong.

### Flow 7: Action Groups During Build
- PASS: deploy_webapp mapped to "deploying" action type with spinner
- PASS: File operations show file names in collapsed groups
- PASS: building/deploying/versioning grouped together

## Critical Issues Found

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | MEDIUM | WebappPreviewCard status type missing "running" | Add "running" to union, map to "Running" display |
| 2 | HIGH | onVisit opens proxy URL even after deploy | Switch to published URL when status is "published" |
| 3 | HIGH | deploy_webapp returns artifactType "webapp_preview" causing duplicate card | Change to "webapp_deployed" or remove |
| 4 | MEDIUM | onPublish text wrong after deploy | Update based on status |
| 5 | LOW | Initial status "running" not in type union | Align with issue 1 |
