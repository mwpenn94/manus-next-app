# Expert Assessment: Chat & App Dev/Management/Publishing Features

## Scope
The work being optimized is the chat-driven app development, management, and publishing pipeline — from user prompt to live deployed app — across agentStream.ts, agentTools.ts, WebAppProjectPage.tsx, GitHubPage.tsx, and their supporting backend routers.

## Signal Assessment

- **Fundamental Redesign**: Absent. Core architecture (LLM agent loop + tool execution + SSE streaming + project management UI) is sound.
- **Landscape**: PRESENT. Several gaps exist between current implementation and Manus parity+:
  1. Preview panel shows only publishedUrl, not a live dev server preview during development
  2. Code panel is shallow — no in-browser file tree/editor when no GitHub repo connected
  3. No build log streaming during deployment
  4. Notification switches fire toasts but don't persist to backend (except analytics reports)
  5. "Add Variable" button in Secrets shows a toast instead of an actual add dialog
  6. Deploy dialog has no version label input field
  7. No rollback capability on deployments panel
  8. Clone command uses project.name instead of actual GitHub repo URL
  9. Download button opens publishedUrl instead of downloading project files
  10. No environment variable add/edit/delete CRUD
  11. No webhook configuration UI for GitHub
  12. Deploy from GitHub button exists but the backend may not have real CI/CD pipeline
  13. SEO analysis is LLM-powered but results aren't persisted
  14. No build settings validation before deploy
  15. Duplicate project navigates to wrong route pattern (/webapp-project/ vs /projects/webapp/)
- **Depth**: PRESENT. Several areas are shallow implementations (toast-only, no persistence).
- **Adversarial**: Not yet applicable — landscape gaps must be fixed first.
- **Future-State**: Not yet applicable.

## Executing: Landscape Pass

### Critical Gaps to Fix (ordered by impact)

1. **Env var CRUD** — Secrets tab needs real add/edit/delete dialog, not just display
2. **Deploy version label** — Deploy dialog needs a text input for version_label
3. **Deployment rollback** — Deployments panel needs a "Rollback" button per deployment
4. **Build log streaming** — Deploy should show real-time build output
5. **Notification persistence** — Switch states should save to project envVars or a dedicated field
6. **Clone command URL** — Should use actual GitHub repo URL, not project.name
7. **Duplicate route mismatch** — Should navigate to /projects/webapp/ not /webapp-project/
8. **Preview during dev** — Should show dev server preview URL when available, not just publishedUrl
9. **Download as ZIP** — Should trigger actual file download, not open publishedUrl
10. **File browser without GitHub** — Code panel should show project files even without GitHub
