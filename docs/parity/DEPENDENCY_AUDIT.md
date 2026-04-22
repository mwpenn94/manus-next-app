# §L.29 Step 0a-bis: DEPENDENCY_AUDIT

**Audit Date:** 2026-04-22T06:35:00Z
**Auditor:** manus-agent (automated package.json analysis + import verification)
**Scope:** Root package.json (102 runtime deps, 31 dev deps) + 13 workspace packages

## Summary

| Category | Count | Status |
|----------|-------|--------|
| Runtime dependencies | 102 | All referenced in code |
| Dev dependencies | 31 | All used in build/test/dev tooling |
| Workspace packages | 13 | All referenced in package.json |
| Missing deps for GREEN caps | 0 | None found |
| Missing deps for YELLOW caps | 2 | Azure AD SDK, Veo3 SDK (expected — §L.25 degraded) |

## v9 Prompt Category J Claims vs Reality

The v9 prompt (§L.29) claimed several Category J gaps based on a prior package.json snapshot. The current state:

| Claimed Missing | Actual Status | Evidence |
|----------------|---------------|----------|
| `playwright` | PRESENT (runtime) | `package.json` line: `"playwright": ...` |
| `@playwright/test` | PRESENT (devDep) | `package.json` devDependencies |
| `@axe-core/playwright` | PRESENT (devDep) | `package.json` devDependencies |
| `@octokit/rest` | NOT NEEDED | GitHub integration uses `gh` CLI via Manus platform, not direct API |
| `cloudflare` SDK | NOT NEEDED | Hosting uses Manus built-in hosting, not Cloudflare Workers |
| `simple-peer`/`mediasoup-client` | NOT NEEDED | No WebRTC capability claimed; bridge uses WebSocket |
| `tesseract.js` | NOT NEEDED | OCR uses LLM vision (screenshot_verify tool), not local OCR |
| `@sentry/node` + `@sentry/react` | NOT NEEDED | Error tracking uses built-in Manus Analytics + axe-core |
| `@opentelemetry/*` | NOT NEEDED | Observability uses built-in logging + Manus Analytics |

## Key Dependencies by Capability Area

### Core Infrastructure
`express`, `@trpc/server`, `drizzle-orm`, `mysql2`, `jose`, `dotenv`, `zod`, `superjson`

### AI/LLM
`@mwpenn94/manus-next-agent`, `@mwpenn94/manus-next-tools` (wraps server/_core/llm.ts)

### Storage & Media
`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `pdfkit`, `docx`, `jszip`

### Voice & TTS
`@mwpenn94/manus-next-voice`, `edge-tts-universal`, `kokoro-js`

### Payments
`stripe` (runtime) — Stripe integration fully active

### Testing
`vitest`, `@playwright/test`, `@axe-core/react`, `@axe-core/playwright`, `@storybook/react`

### Frontend
`react`, `react-dom`, `wouter`, `framer-motion`, `recharts`, `@uiw/react-codemirror`, `lucide-react`, `sonner`, `streamdown`, `cmdk`

## Category J Findings

**Total Category J false positives found: 0**

All GREEN capabilities have their required dependencies installed. The v9 prompt's Category J claims were based on a stale package.json snapshot that predated the installation of `playwright`, `@playwright/test`, and `@axe-core/playwright`.

The remaining "missing" packages (`@octokit/rest`, `cloudflare`, `simple-peer`, `tesseract.js`, `@sentry/*`, `@opentelemetry/*`) are not needed because the architecture uses different approaches (Manus platform services, LLM vision, built-in analytics) rather than those specific libraries.

## Status

**DEPENDENCY_AUDIT: PASS** — No demotions required.
