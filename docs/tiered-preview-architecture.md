# Tiered Live Preview Architecture

## Overview

A three-tier system that gives users progressively more powerful live preview capabilities, auto-selecting the appropriate tier based on project type, with user ability to upgrade.

## Tier Definitions

| Tier | Name | Cost | Latency | Capability | Best For |
|------|------|------|---------|-----------|----------|
| 1 | WebContainers | Free, unlimited | <3s boot | Frontend dev server in browser | React, Vue, Svelte, static sites |
| 2 | Preview Deploy | Free (limited builds) | 30-90s | Full build + deploy per commit | Full-stack apps needing real backend |
| 3 | Cloud Sandbox | Free 60hrs/mo | 10-30s boot | Full Linux VM, hot reload, SSH | Any project, full Manus parity |

## Tier 1: StackBlitz WebContainers

**How it works**: The StackBlitz SDK boots a full Node.js environment inside the user's browser via WebAssembly. No server needed.

**Agent flow**:
1. Agent calls `github_ops(status)` → gets repo URL
2. Agent calls `live_preview(tier: 'webcontainer', repo_url, branch?)` 
3. Frontend loads StackBlitz SDK, opens repo in an iframe
4. User sees live dev server with hot reload
5. Agent can push file changes via `github_edit` → user pulls in WebContainer

**Capabilities**:
- Clone any public/connected repo
- `npm install` + `npm run dev` 
- Hot module reload on file changes
- Terminal access in browser
- Port forwarding (dev server visible in iframe)

**Limitations**:
- No database connections (no MySQL/Postgres from browser)
- No server-side APIs that need external network access
- Only Node.js runtime (no Python, Go, Rust)

## Tier 2: Vercel Preview Deployments

**How it works**: Agent creates a branch, pushes changes via GitHub API, Vercel auto-deploys the branch to a unique preview URL.

**Agent flow**:
1. Agent calls `github_ops(status)` → gets repo URL
2. Agent creates branch via `github_ops(create_branch, name: 'preview/feature-x')`
3. Agent makes changes via `github_edit(branch: 'preview/feature-x', ...)`
4. Vercel auto-detects the push, builds, deploys
5. Agent returns preview URL: `https://{project}-{branch}-{user}.vercel.app`
6. User tests → approves → Agent merges branch to main

**Capabilities**:
- Full production build (SSR, API routes, database)
- Real environment variables (configured in Vercel)
- Unique URL per branch — multiple previews simultaneously
- Automatic cleanup when branch is deleted

**Limitations**:
- 30-90 second build time per change (no hot reload)
- Requires Vercel project connected to the repo
- Free tier: 6000 build minutes/month

**Setup required**: User connects repo to Vercel (one-time, in Settings)

## Tier 3: GitHub Codespaces

**How it works**: Agent creates/starts a Codespace via GitHub API. Full Linux VM with the repo, dev server, port forwarding.

**Agent flow**:
1. Agent calls `live_preview(tier: 'codespace', repo_url)`
2. Backend calls GitHub API: `POST /repos/{owner}/{repo}/codespaces`
3. Codespace boots (10-30s), dev server starts
4. Agent gets forwarded port URL → shows in workspace iframe
5. Agent can run commands via Codespace API (`POST /codespaces/{id}/command`)
6. User sees live hot-reloading preview
7. When done, agent commits changes and stops codespace

**Capabilities**:
- Full Linux VM (git, node, python, docker, anything)
- Real database connections
- Hot reload (sub-second updates)
- Terminal access, multiple ports
- Persistent across sessions (codespace stays alive)
- Full Manus parity — this IS a sandbox

**Limitations**:
- 60 free hours/month (then $0.18/hr for 2-core)
- Requires `codespace` scope on GitHub token
- 10-30s cold start

**Setup required**: User grants codespace permission (one-time, in Settings)

## Auto-Tier Selection Logic

```
function selectTier(project, userSettings):
  // User override always wins
  if userSettings.preferredTier: return userSettings.preferredTier
  
  // Detect project type from package.json / repo contents
  if project.hasBackend or project.needsDatabase:
    if userSettings.vercelConnected: return TIER_2
    if userSettings.codespacesEnabled: return TIER_3
    return TIER_2_SETUP_REQUIRED
  
  // Frontend-only projects → WebContainers (fastest)
  if project.isFrontendOnly:
    return TIER_1
  
  // Complex projects → Codespaces
  if project.hasDocker or project.isMonorepo or project.language != 'javascript':
    return TIER_3
  
  // Default fallback
  return TIER_1
```

## Database Schema Addition

```sql
ALTER TABLE user_preferences ADD COLUMN preview_tier ENUM('auto', 'webcontainer', 'vercel', 'codespace') DEFAULT 'auto';
ALTER TABLE user_preferences ADD COLUMN vercel_token TEXT NULL;
ALTER TABLE user_preferences ADD COLUMN codespace_scope_granted BOOLEAN DEFAULT FALSE;
```

## Agent System Prompt Changes

Replace the broken "LIVE PREVIEW WORKFLOW" section with:

```
### LIVE PREVIEW WORKFLOW (Tiered)
When the user asks to BUILD, DEPLOY, RUN, HOST, RENDER, or LAUNCH a repo as a live preview:

1. Call github_ops(status) to get repo metadata
2. Call live_preview(repo_url) — the system auto-selects the best tier
3. Present the preview URL in the workspace iframe
4. For edits: use github_edit → changes appear in preview (hot reload for Tier 1/3, rebuild for Tier 2)

NEVER attempt to clone repos to the local filesystem. NEVER call git_operation(clone) for preview purposes.
The live_preview tool handles all compute externally.
```

## UI: Settings → Development Panel

New settings section showing:
- Current tier (with explanation of what it provides)
- Upgrade buttons for each tier
- Connection status for Vercel/Codespaces
- Usage meters (Codespace hours remaining, Vercel build minutes)
