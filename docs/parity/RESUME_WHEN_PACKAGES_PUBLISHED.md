# RESUME_WHEN_PACKAGES_PUBLISHED.md

**Purpose:** Step-by-step checklist for Mike to integrate upstream packages when they become available on npm.

## Pre-flight

- [ ] Verify all 13 packages are published: `npm view @mwpenn94/manus-next-browser`
- [ ] Ensure Node.js 22+ and pnpm 9+ are available
- [ ] Have Clerk, Neon, Railway, Cloudflare credentials ready

## Integration Steps

### 1. Install packages
```bash
pnpm add @mwpenn94/manus-next-browser @mwpenn94/manus-next-computer \
  @mwpenn94/manus-next-webapp-builder @mwpenn94/manus-next-design-view \
  @mwpenn94/manus-next-deck @mwpenn94/manus-next-mobile \
  @mwpenn94/manus-next-desktop @mwpenn94/manus-next-connectors \
  @mwpenn94/manus-next-collab @mwpenn94/manus-next-billing \
  @mwpenn94/manus-next-messaging @mwpenn94/manus-next-skills \
  @mwpenn94/manus-next-projects
```

### 2. Replace in-app Projects with package version
- [ ] Compare `@mwpenn94/manus-next-projects` API with current `server/db.ts` project helpers
- [ ] Migrate project data if schema differs
- [ ] Update `server/routers.ts` project router to use package API
- [ ] Update `client/src/pages/ProjectsPage.tsx` to use package components

### 3. Wire browser capabilities (#22-24)
- [ ] Import `BrowserProvider` from `@mwpenn94/manus-next-browser`
- [ ] Add browser tool to `server/agentTools.ts`
- [ ] Add browser workspace tab to `client/src/pages/TaskView.tsx`
- [ ] Add screenshot verification to agent loop

### 4. Wire computer use (#25)
- [ ] Import `ComputerProvider` from `@mwpenn94/manus-next-computer`
- [ ] Add computer tool to `server/agentTools.ts`
- [ ] Add desktop workspace tab

### 5. Wire webapp builder (#27-29)
- [ ] Import builder from `@mwpenn94/manus-next-webapp-builder`
- [ ] Add webapp creation tool to agent
- [ ] Add live preview panel

### 6. Wire design view (#15)
- [ ] Import canvas from `@mwpenn94/manus-next-design-view`
- [ ] Add design view route and workspace tab

### 7. Wire slides (#16)
- [ ] Import deck engine from `@mwpenn94/manus-next-deck`
- [ ] Add slide generation tool

### 8. Wire skills (#12-14)
- [ ] Import skills framework from `@mwpenn94/manus-next-skills`
- [ ] Add skills management page
- [ ] Wire skills into agent system prompt

### 9. Wire connectors (#49-50, 65)
- [ ] Import connector framework from `@mwpenn94/manus-next-connectors`
- [ ] Add MCP protocol support
- [ ] Add Zapier webhook endpoint

### 10. Wire collaboration (#56-58)
- [ ] Import collab from `@mwpenn94/manus-next-collab`
- [ ] Add WebSocket server for real-time sync
- [ ] Add shared session UI

### 11. Wire messaging (#51-52)
- [ ] Import messaging from `@mwpenn94/manus-next-messaging`
- [ ] Add Slack bot configuration
- [ ] Add messaging agent tool

### 12. Infrastructure migration
- [ ] Set up Neon database (migrate from TiDB)
- [ ] Deploy backend to Railway
- [ ] Deploy frontend to Cloudflare Pages
- [ ] Configure Clerk auth (replace Manus OAuth)
- [ ] Set up custom domain

### 13. Post-integration validation
- [ ] Run full test suite: `pnpm test`
- [ ] Run persona validation: `node validate-personas.mjs`
- [ ] Verify all 67 capabilities in PARITY_BACKLOG.md
- [ ] Update STATE_MANIFEST.json with new status

## Estimated Time
- Package installation + basic wiring: 2-4 hours per package
- Infrastructure migration: 1-2 days
- Full integration + testing: 1-2 weeks
