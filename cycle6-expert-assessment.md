# Cycle 6 Expert Assessment

## Current State
- `deploy_webapp` in agentTools.ts ALREADY runs `npm run build` for React/Vite projects
- `deployFromGitHub` in routers.ts does NOT run build — it fetches static files from GitHub
- Schema has `buildCommand`, `outputDir`, `installCommand`, `nodeVersion` on webappProjects
- No preview URL per deployment (only project-level `publishedUrl`)
- No build step in deployFromGitHub (only static file fetch)

## Gaps to Close (Manus-aligned)

### Gap 1: Build Step in deployFromGitHub
The deployFromGitHub procedure fetches files from GitHub API and looks for index.html.
For React/Next.js repos, there's no pre-built dist/ — the repo has src/ files.
Need: Clone repo → npm install → npm run build → deploy dist/ output.
This is what Manus does when deploying from GitHub.

### Gap 2: Preview URLs per Deployment
Each deployment should get a unique preview URL (like Vercel preview deploys).
Currently only the project-level publishedUrl is updated.
Need: Store per-deployment preview URL so users can compare versions.

### Gap 3: Build Step in Webhook Auto-Deploy
The webhook handler calls deployFromGitHub which has the same gap.
Once Gap 1 is fixed, this is automatically fixed.

## Implementation Plan
1. Add `cloneAndBuild` helper that clones a GitHub repo, runs install + build
2. Update deployFromGitHub to use cloneAndBuild when package.json exists
3. Add previewUrl to webappDeployments schema
4. Generate unique preview URLs per deployment
5. Write comprehensive E2E tests
6. 3 consecutive fresh/novel convergence passes
