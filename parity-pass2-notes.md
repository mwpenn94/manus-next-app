# Parity Expert Convergence Pass 2 — Virtual User E2E Assessment

## Scope
The work being optimized: the complete e2e app development/management/publishing pipeline in Manus Next, assessed against Manus production behavior.

## Signal Assessment (one sentence per pass type)
- **Fundamental Redesign**: Absent — core architecture (agent → tools → SSE → cards → deploy) is sound and functional.
- **Landscape**: PRESENT — the Manus reference shares show several UX patterns and flow details we haven't replicated, and the virtual user walkthrough reveals friction points in the current implementation.
- **Depth**: PRESENT — several areas are shallow (preview iframe, deployment error handling, project management page).
- **Adversarial**: Absent for now — will apply after landscape and depth fixes.
- **Future-State**: Absent — premature until current-state is solid.

**Executing: Landscape pass** (highest priority with signals present)

## Virtual User E2E Walkthrough — Friction Points Found

### Flow 1: "Build me a React counter app"
1. User types prompt → agent receives it ✓
2. Agent calls create_webapp → project scaffolded ✓
3. WebappPreviewCard appears in chat ✓
4. Agent calls create_file/edit_file to build app ✓
5. Preview updates via proxy ✓
6. **GAP A**: Preview iframe in WebappPreviewCard is static — no auto-refresh when files change
7. Agent calls deploy_webapp → DeploymentCard appears ✓ (new in Session 27)
8. **GAP B**: After deployment, the WebappPreviewCard still shows "not_published" status — it doesn't update to reflect deployment
9. **GAP C**: The WebAppProjectPage (/projects/webapp/:id) is sparse — missing deployment history, file browser, build logs

### Flow 2: "Edit my app — change the counter color to blue"
1. User sends follow-up → agent receives it ✓
2. Agent calls edit_file to modify code ✓
3. **GAP D**: No visual feedback that files are being edited — Manus shows a file tree with real-time edit indicators
4. **GAP E**: No "rebuilding..." status indicator during edits — user sees no progress until agent responds

### Flow 3: "Deploy my app" (explicit deploy request)
1. User asks to deploy → agent calls deploy_webapp ✓
2. **GAP F**: If build fails, error message is plain text in chat — no structured error card with fix suggestions
3. **GAP G**: No build progress indicator — deployment can take 30+ seconds with no feedback

### Flow 4: Project Management
1. User navigates to /projects/webapp/:id ✓
2. **GAP H**: WebAppProjectPage lacks: deployment history timeline, environment variables, domain settings, build logs
3. **GAP I**: No way to trigger re-deploy from the project page — must go back to chat
4. **GAP J**: No way to delete/archive a project

### Flow 5: Chat UX During App Building
5. **GAP K**: During file creation/editing, the action group shows tool calls but doesn't show which file is being modified in a scannable way
6. **GAP L**: No live code diff view — Manus shows before/after diffs for edits
7. **GAP M**: The preview URL shown in WebappPreviewCard is the proxy URL, not a user-friendly domain

## Priority Ranking (Critical → Nice-to-have)

| Priority | Gap | Description | Effort |
|----------|-----|-------------|--------|
| CRITICAL | B | WebappPreviewCard status doesn't update after deploy | Small |
| CRITICAL | G | No build/deploy progress indicator | Medium |
| HIGH | A | Preview iframe doesn't auto-refresh on file changes | Medium |
| HIGH | F | Build failure shows plain text, not structured error card | Small |
| HIGH | K | File operations not clearly shown in action groups | Small |
| MEDIUM | D | No file tree / edit indicators during building | Large |
| MEDIUM | H | WebAppProjectPage missing deployment history | Medium |
| MEDIUM | E | No "rebuilding" status during edits | Small |
| MEDIUM | I | No re-deploy from project page | Small |
| LOW | L | No code diff view for edits | Large |
| LOW | M | Proxy URL not user-friendly | Small |
| LOW | J | No project delete/archive | Small |
| LOW | C | WebAppProjectPage sparse overall | Large |
