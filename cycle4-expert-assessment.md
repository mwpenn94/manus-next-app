# Cycle 4 Expert Assessment — Manus Parity+ Gap Analysis

## Phase A: GitHub Webhooks + Multi-Browser + Remaining Manus-Aligned Items

### A1: GitHub Webhook Receiver (Manus-aligned: auto-deploy on push)
- **Gap**: No `/api/github/webhook` endpoint exists
- **Fix**: Add Express route with HMAC signature verification, parse push/PR events, trigger auto-deploy
- **E2E**: Test webhook signature validation, event parsing, auto-deploy trigger

### A2: Multi-Browser Support (Manus-aligned: cross-browser QA)
- **Gap**: `browserAutomation.ts` hardcodes `chromium.launch()` — no Firefox/WebKit
- **Fix**: Add `browserType` parameter to `getOrCreateSession()`, add browser selector to BrowserPage UI
- **E2E**: Test session creation with different browser types, verify UA strings

### A3: GitHub List Procedure (Missing from router)
- **Gap**: The `list` procedure is not in the github router (only `repos` which lists local DB repos)
- **Status**: `listRemoteRepos` already exists — this is adequate

### A4: WebApp Builder Page Not Routed
- **Gap**: `WebAppBuilderPage.tsx` exists (731 lines) but is NOT in App.tsx routes — unreachable
- **Fix**: Add route and lazy import in App.tsx
- **E2E**: Test navigation to builder page

## Phase B: Chat + App Dev/Management/Publishing E2E Parity+

### B1: Chat → Create App → Preview → Deploy → Live URL (Full Pipeline)
- **Current**: Agent tools `create_webapp` + `deploy_webapp` work via SSE chat
- **Gap**: No direct way to trigger webapp creation from chat AND see it in projects
- **Status**: `create_webapp` auto-creates project — DONE
- **Gap**: Chat doesn't show deploy progress inline (build log)
- **Fix**: Already have `BuildLogPanel` but need to verify it's wired to chat deploy actions

### B2: App Management Dashboard
- **Current**: WebAppProjectPage has: preview, deploy, env vars, deployments, analytics, SEO, SSL
- **Gap**: No rollback confirmation dialog (just the procedure)
- **Fix**: Add rollback confirmation in UI
- **Gap**: No build log visible during chat-initiated deploys
- **Status**: Build log streaming exists via `deployBuildLog` polling

### B3: Publishing Pipeline Completeness
- **Current**: Deploy → S3 upload → CloudFront CDN → live URL
- **Gap**: No custom domain support in deploy UI (only via Manus Management UI)
- **Status**: This is by design — Manus handles domains via Settings panel

### B4: Chat Agent Tool Coverage for App Dev
- **Current tools**: create_webapp, create_file, edit_file, read_file, list_files, install_deps, run_command, git_operation, deploy_webapp
- **Gap**: No `preview_webapp` tool (agent can't tell user to preview)
- **Fix**: Agent already returns preview panel reference — adequate

## Phase C: GitHub CRUD→Preview→Publish + Browser/CDP QA with Virtual Users

### C1: GitHub Connect → CRUD → Deploy Pipeline
- **Current**: 19 GitHub procedures, full CRUD, deployFromGitHub
- **Gap**: No webhook-triggered auto-deploy (covered in Phase A)
- **Gap**: No GitHub Actions / CI-CD integration
- **Status**: CI-CD is out of scope for Manus parity (Manus doesn't have it either)

### C2: Browser QA After Deploy
- **Current**: 28 browser procedures, QA test runner, a11y audit, perf metrics, coverage
- **Gap**: No automated post-deploy QA trigger (user must manually navigate to Browser page)
- **Fix**: Add "Run QA" button on WebAppProjectPage that auto-navigates to Browser page with deployed URL

### C3: Virtual User QA Scenarios
- **Current**: `runQATestSuite` exists with step-by-step execution
- **Gap**: No pre-built QA scenarios for common app patterns (login flow, navigation, responsive)
- **Status**: BrowserPage has 4 pre-built scenarios — adequate

### C4: CDP + Playwright Integration Depth
- **Current**: CDP session, performance metrics, network interception, coverage
- **Gap**: No Lighthouse-style scoring (only raw metrics)
- **Fix**: Add computed scores from raw metrics (performance score, a11y score)
- **Status**: a11y audit already returns a score — adequate for parity

## Priority Implementation Order:
1. A4: Route WebAppBuilderPage in App.tsx (quick win)
2. A1: GitHub webhook receiver endpoint
3. A2: Multi-browser support in browserAutomation
4. C2: "Run QA" button on project page
5. Write comprehensive E2E tests for all above
6. Run 3 convergence passes
