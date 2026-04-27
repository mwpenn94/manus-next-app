# Pass 33 Expert Assessment — Deep Manus Alignment

## Expert Panel: Assess Phase

### 1. Auto-Refresh Cron Scheduling
**Current state**: scheduledConnectorRefresh.ts exists at /api/scheduled/connector-refresh. Route registered.
**Gap**: No actual cron job scheduled to call this endpoint. Needs a `schedule` tool call to create the recurring task.
**Manus alignment**: ✅ Follows the Manus scheduled task pattern exactly — POST to endpoint with auto-injected cookies.
**Decision**: Schedule a 30-minute interval cron job.

### 2. Inline Diff Viewer
**Current state**: CodeMirror editor exists. No diff/merge extension installed.
**Options**:
  - A) Install @codemirror/merge for side-by-side diff (heavy dependency, ~100KB)
  - B) Build a lightweight unified diff view using text comparison (Manus-aligned: minimal, purposeful)
  - C) Use a simple "Changes" toggle that shows added/removed lines with color coding
**Manus alignment analysis**: Manus native does NOT have an inline diff viewer in its code editor. It shows files as-is. However, GitHub's native diff view is the gold standard. The question is: does adding a diff viewer serve the Manus user who's editing code through the connector?
**Expert verdict**: YES — but keep it lightweight. A simple toggle between "Edit" and "Review Changes" modes using a basic text diff algorithm. No heavy CodeMirror merge dependency. This aligns with Manus's "invisible infrastructure" principle — the diff is a tool, not a feature.
**Decision**: Build a lightweight unified diff component using a simple line-by-line comparison. Toggle between Edit/Review modes.

### 3. Deploy Triggers
**Current state**: 
  - GitHub webhook handler EXISTS and is FULLY WIRED at /api/github/webhook
  - Handles push events to default branch and merged PRs
  - Triggers deployFromGitHub pipeline for linked projects
  - HMAC-SHA256 signature verification
  - Rate limited (100/min)
**Gap**: The webhook handler is complete. What's missing:
  - A) UI to configure webhook URL and copy it for GitHub repo settings
  - B) Task-chat-triggered deploy (user says "deploy" in task chat → triggers deploy)
**Manus alignment**: 
  - Webhook config UI: ✅ Manus shows integration setup inline on connector detail pages
  - Task-chat deploy: ✅ Deeply Manus-aligned — Manus IS a chat-first agent. Triggering deploy via natural language in the task chat is the most Manus-native pattern possible.
**Decision**: 
  - Add webhook URL display + copy button in Deploy tab
  - Add a "Deploy from Chat" capability — a tRPC procedure that the task system can invoke

### 4. What NOT to build (Manus divergence rejection)
- ❌ Full CI/CD pipeline visualization (diverges from Manus simplicity)
- ❌ Build log streaming in real-time (the deploy tab already shows status)
- ❌ Multiple deploy environments (staging/production) — Manus has one deployment target
- ❌ Rollback UI for deployments — Manus uses checkpoint rollback, not deploy rollback

## Optimize Phase Plan
1. Schedule the auto-refresh cron (30-min interval)
2. Build lightweight DiffViewer component (line-by-line comparison, no heavy deps)
3. Add "Review Changes" toggle to file editor
4. Add webhook URL display in Deploy tab
5. Wire task-chat deploy trigger

## Validate Phase Plan
- Depth scan: diff edge cases (empty files, binary, large files, identical content)
- Adversarial scan: 5 virtual users testing diff, deploy, and auto-refresh flows
- Synthesis: convergence check
