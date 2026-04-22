# Webapp Builder Internal Capability Audit

**Date:** 2026-04-22
**Purpose:** Determine what is real vs placeholder in the in-app webapp builder

## Architecture Summary

The webapp builder consists of three layers:

| Layer | Files | Status |
|-------|-------|--------|
| Database schema | `drizzle/schema.ts` — `webapp_builds`, `webapp_projects`, `webapp_deployments`, `github_repos` | Real, migrated |
| Server procedures | `server/routers.ts` — `webapp.*`, `webappProject.*` | Real CRUD, real S3 publish |
| Frontend pages | `WebAppBuilderPage.tsx`, `WebAppProjectPage.tsx`, `WebappPreviewCard.tsx` | Real UI, wired to tRPC |

## What Is Real

1. **Build creation and persistence** — `webapp.create` saves to DB, `webapp.update` persists generated HTML, `webapp.list` retrieves history. All backed by Drizzle ORM.

2. **AI code generation** — Uses `/api/stream` endpoint (LLM via Forge API) to generate complete HTML apps from prompts. Streams response, extracts HTML from code fences.

3. **Live iframe preview** — Generated HTML is rendered in a sandboxed iframe with `srcDoc`. User can refresh, open in new tab.

4. **S3 publishing** — `webapp.publish` uploads HTML to S3 via `storagePut()`, returns a public URL. This is real file hosting.

5. **Project management** — `webappProject.create/get/list/update/delete` — full CRUD backed by DB. Stores framework, deploy target, build commands, env vars, subdomain prefix, etc.

6. **Deployment records** — `webappProject.deploy` creates deployment records, `webappProject.deployments` lists them.

7. **GitHub API helpers** — `server/githubApi.ts` has real REST wrappers for repos, files, branches, PRs, issues, webhooks.

## What Is Simulated / Placeholder

1. **Deploy build completion** (line 2484) — `setTimeout` with random duration simulates CI build. Comment says "in production, this would be async with real CI". This is the biggest gap.

2. **Published URL generation** (line 2482) — Constructs `https://{subdomain}.manus.space` but this domain doesn't actually resolve to the deployed app. The S3-published URL from `webapp.publish` is the real one.

3. **Code panel clone command** — WebAppProjectPage constructs `git clone https://github.com/{project.name}.git` which is not a real repo URL.

4. **Download ZIP button** — Present in UI but no handler attached.

5. **Dashboard analytics** — Shows page views/unique visitors but these come from project fields that are never populated by real analytics.

6. **SEO settings tab** — Form fields present but no real implementation.

7. **Payment settings tab** — References Stripe but no actual per-project billing.

8. **Notification settings** — Toggle switches present but no real webhook/notification system per-project.

## Assessment

The webapp builder is **substantially real** for its core flow: describe → generate → preview → publish to S3. The project management layer has real persistence and CRUD. The main gaps are in the deployment pipeline (simulated CI) and some management panel features (analytics, SEO, notifications) that have UI but no backing data.

## Required Fixes

1. Make deploy flow honest — label simulated CI clearly, or wire to real S3 publish
2. Fix clone command to use actual connected repo URL
3. Add honest labels to placeholder management features
4. Wire Download ZIP to actually export project code
