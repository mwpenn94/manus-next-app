# Manus Parity E2E Assessment — LANDSCAPE PASS

## Scope
The work being optimized: Manus Next's e2e capability for **chat agent**, **app development**, **app management**, and **publishing** features — achieving parity+ with Manus.

## Signal Assessment
- **Fundamental Redesign**: ABSENT — core architecture is sound
- **Landscape**: PRESENT — multiple parity gaps visible from code review and virtual user testing
- **Depth**: PRESENT — broad coverage exists but specific flows are shallow
- **Adversarial**: ABSENT — work has not yet survived landscape scrutiny
- **Future-State**: ABSENT — premature

## Executing: LANDSCAPE PASS

---

## CRITICAL PARITY GAPS IDENTIFIED

### GAP 1: deploy_webapp SSE event not emitted to client
**Severity: HIGH** — When deploy_webapp succeeds, the server sends a tool_result with the URL but does NOT emit a dedicated SSE event (like webapp_preview) for the deployed URL. The client has no special handling for deployment results — the live URL just appears in the agent's text response. Manus shows a dedicated deployment card with the live URL, status badge, and visit button.

**Fix**: Emit a `webapp_deployed` SSE event from agentStream.ts when deploy_webapp succeeds, and handle it in the client to show a deployment card.

### GAP 2: WebappPreviewCard "Publish" button is a no-op toast
**Severity: HIGH** — The Publish button in WebappPreviewCard shows `toast.info("Publishing...")` but doesn't actually trigger deployment. In Manus, the Publish button triggers the full deploy flow.

**Fix**: Wire the onPublish callback to actually call the deploy_webapp tool or the tRPC deploy procedure.

### GAP 3: No deployment result card in chat
**Severity: HIGH** — When the agent deploys an app, the deployed URL is only in the text response. Manus shows a dedicated card with the live URL, a "Visit" button, and deployment status. We need a `DeploymentCard` component.

### GAP 4: WebappPreviewCard iframe loads /api/webapp-preview/ but doesn't handle path rewriting
**Severity: MEDIUM** — The proxy forwards to localhost:PORT but Vite's HMR websocket and asset paths may not work correctly through the proxy. The iframe may show a blank page or broken assets.

**Fix**: Add proper path rewriting and websocket proxying for HMR.

### GAP 5: No "Open in new tab" for webapp preview
**Severity: MEDIUM** — Manus has a prominent "Open in new tab" button that opens the preview in a full browser tab. Our WebappPreviewCard has an ExternalLink icon but it opens the proxy URL which may not work outside the app context.

### GAP 6: Agent doesn't auto-deploy after building
**Severity: MEDIUM** — In Manus, after the agent finishes building an app, it automatically deploys it. Our agent requires the user to explicitly ask for deployment. The system prompt says "use deploy_webapp to build and deploy" but doesn't instruct auto-deployment.

**Fix**: Add auto-deploy instruction to the system prompt's APP BUILDING WORKFLOW section.

### GAP 7: No screenshot_verify integration for webapp preview
**Severity: MEDIUM** — The agent has a screenshot_verify tool but it's not integrated into the webapp building workflow. Manus takes screenshots of the built app to verify visual correctness before deploying.

### GAP 8: WebappPreviewCard "Settings" button is a no-op toast
**Severity: LOW** — Settings button shows toast instead of navigating to the project management page.

**Fix**: Navigate to /projects/webapp/{projectExternalId} when Settings is clicked.

### GAP 9: deploy_webapp doesn't handle multi-file assets properly
**Severity: MEDIUM** — The deploy_webapp tool inlines CSS/JS into a single HTML file. This works for simple apps but breaks for apps with images, fonts, or other static assets. Manus deploys the full dist/ directory to CDN.

**Fix**: Upload all files in dist/ to S3 with proper paths, not just inline into index.html.

### GAP 10: No real-time build log streaming during deploy
**Severity: LOW** — When deploy_webapp runs npm build, the user sees nothing until it completes or fails. Manus shows real-time build logs.

---

## IMPLEMENTATION PRIORITY (by impact on e2e parity)

1. **GAP 1+3**: Deploy SSE event + DeploymentCard (HIGH — makes deployment visible)
2. **GAP 2+8**: Wire Publish/Settings buttons (HIGH — makes management functional)
3. **GAP 6**: Auto-deploy instruction in system prompt (MEDIUM — matches Manus behavior)
4. **GAP 9**: Multi-file asset deployment (MEDIUM — fixes broken deploys for complex apps)
5. **GAP 5**: Open in new tab for preview (MEDIUM — UX parity)
6. **GAP 4**: Proxy path rewriting (MEDIUM — fixes broken previews)
7. **GAP 7**: Screenshot verify integration (MEDIUM — quality assurance)
8. **GAP 10**: Build log streaming (LOW — nice to have)
