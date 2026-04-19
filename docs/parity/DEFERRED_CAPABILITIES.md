# DEFERRED_CAPABILITIES — manus-next-app

> Capabilities explicitly deferred from the current implementation scope, with rationale and re-entry conditions.

---

## N/A Capabilities (Out of Scope)

These 5 capabilities from the Manus spec are not applicable to this project:

| # | Capability | Reason Deferred | Re-entry Condition |
|---|-----------|----------------|--------------------|
| 62 | Desktop app (Electron) | Manus Next is a web-first product. Desktop wrapper adds complexity without user demand. | User research shows >30% of users prefer desktop app. |
| 63 | Mobile native app | React web app is mobile-responsive. Native app is premature optimization. | Mobile traffic exceeds 50% of total and PWA is insufficient. |
| 64 | Offline-first sync | Agent requires LLM API calls which need internet. Offline mode would be non-functional. | Local LLM inference (Ollama) becomes viable for agent tasks. |
| 65 | Multi-tenant white-label | Single-tenant deployment on Manus platform. White-labeling requires infrastructure changes. | Enterprise customer requests white-label deployment. |
| 66 | Plugin marketplace | Agent Skills architecture is ready but marketplace UI/distribution is premature. | >10 community-contributed skills exist and need discovery. |

## Deferred-to-Phase-2 Capabilities

These capabilities are architecturally planned but deferred to a future phase:

| # | Capability | Current Status | What Exists | What's Missing | Estimated Effort |
|---|-----------|---------------|-------------|----------------|------------------|
| 15 | Design View | Stub page | DesignView.tsx with planned features, /design route | Actual design canvas, component library browser | 3-5 days |
| 16 | Billing/Usage | Cost visibility only | Token cost estimator in TaskView header | Stripe integration, usage limits, plan management | 5-8 days |
| 17 | Client-side inference | Not started | N/A | WebLLM/WebGPU integration, model download UI | 5-8 days |
| 18 | Desktop sync | Not started | N/A | Electron wrapper, local file sync, offline queue | 8-12 days |
| 19 | Bridge (MCP) | Not started | N/A | MCP server implementation, tool registry, protocol handler | 5-8 days |
| 20 | Storybook | Config only | .storybook/ directory planned | Component stories, visual regression tests | 3-5 days |
| 21 | E2E tests | Not started | N/A | Playwright setup, critical path tests, CI integration | 3-5 days |
| 22 | I18N | Not started | N/A | IntlProvider, message catalogs, string extraction | 3-5 days |

## Deferred Infrastructure Decisions

| Decision | Current State | Deferred Action | Trigger |
|----------|--------------|----------------|---------|
| Hosting migration | Manus hosting (zero cost) | Migrate to Cloudflare Pages + Railway | Manus hosting limitations or cost changes |
| Auth migration | Manus OAuth (zero cost) | Switch to Clerk | Need for social login, MFA, or user management UI |
| Upstream packages | 13 local stubs | Publish to npm as @mwpenn94/* | Owner decision + npm account setup |
| Custom domain | manusnext-mlromfub.manus.space | Configure custom domain | Owner purchases/assigns domain |
| CDN | Manus built-in | Cloudflare CDN | Performance requirements exceed current CDN |

---

## Re-evaluation Schedule

Deferred capabilities should be re-evaluated:
- After each major version release (v9.0+)
- When user feedback explicitly requests a deferred capability
- When infrastructure costs change (Manus pricing, hosting costs)
- When upstream dependencies mature (WebLLM, MCP protocol)
