# Manus Next — Testing Coverage Report

**Date:** 2026-04-22 | **Version:** 2.0

---

## Summary

| Metric | Value |
|--------|-------|
| Test files (Vitest) | 62 |
| Test files (Playwright) | 2 |
| Total tests | 1,540 |
| Pass rate | 100% |
| Execution time | 11.8 seconds |

---

## Test File Inventory (62 Vitest + 2 Playwright)

Categories: Core Agent (10) + Auth (5) + Webapp (4) + Voice (4) + Billing (4) + Parity (16) + Feature (19) = 62 Vitest, plus 2 Playwright E2E files.

### Core Agent (10 files, ~225 tests)

| File | Focus |
|------|-------|
| `stream.test.ts` | SSE streaming, agent loop |
| `agentTools.test.ts` | 14 built-in tools |
| `routers.test.ts` | Core tRPC procedures |
| `chatPersistence.test.ts` | Message persistence |
| `messagePersistence.test.ts` | Message CRUD |
| `continuation-fix.test.ts` | Continuation handling |
| `limitless-continuation.test.ts` | Long conversations |
| `dedup-stress.test.ts` | Message deduplication |
| `promptCache.test.ts` | Prompt LRU cache |
| `mediaContext.test.ts` | Media processing |

### Auth and Security (5 files, ~50 tests)

| File | Focus |
|------|-------|
| `auth.logout.test.ts` | Logout flow |
| `idor.test.ts` | Cross-user access prevention |
| `confirmation-gate-persistence.test.ts` | Confirmation gate |
| `github-oauth.test.ts` | GitHub OAuth flow |
| `connectorOAuth.test.ts` | Connector OAuth |

### Webapp Builder (4 files, ~85 tests)

| File | Focus |
|------|-------|
| `webapp-seo.test.ts` | SEO metadata |
| `session7-features.test.ts` | GitHub, deploy, analytics |
| `session8-features.test.ts` | CloudFront, aria-live, geo |
| `session8-round3.test.ts` | GeoIP, WebSocket, SSL |

### Voice and Media (4 files, ~40 tests)

| File | Focus |
|------|-------|
| `voiceStream.test.ts` | Voice WebSocket |
| `video.test.ts` | Video generation |
| `pdfExtraction.test.ts` | PDF extraction |
| `documentGeneration.test.ts` | Document gen |

### Billing and Integration (4 files, ~45 tests)

| File | Focus |
|------|-------|
| `stripe.test.ts` | Stripe integration |
| `github.test.ts` | GitHub API |
| `github-publish.test.ts` | GitHub publishing |
| `bridge.test.ts` | Bridge connections |

### Parity and Regression (16 files, ~200 tests)

p15, p16, p17, p18, p19, p20, p21, p22, p23, p24, p25, p25b, p26, p32, p33, p35 test files covering progressive feature parity.

### Feature Tests (19 files, ~150 tests)

parity, v9-parity, features, preferences, stylePreferences, taskRating, workspace, keyboard-shortcuts, model-selector-wiring, paste-workflow, presence-indicator, redCaps, automationContext, ns19-parity, ns19-components, demonstrate-all, false-positive-elimination, phase3, phase4

Note: parity.test.ts and v9-parity.test.ts are general feature parity tests, not p-series progression tests.

### E2E (2 Playwright files)

| File | Focus |
|------|-------|
| `e2e-flows.spec.ts` | End-to-end user flows |
| `pwa.spec.ts` | PWA functionality |

---

## Coverage Gaps

| Area | Gap | Priority |
|------|-----|----------|
| Frontend components | No React Testing Library tests | Medium |
| Visual regression | No screenshot comparison | Low |
| Load testing | No analytics pipeline load test | Medium |
| E2E webapp builder | No Playwright build-to-deploy test | High |
| Coverage metrics | No Istanbul/c8 configured | Medium |
| Accessibility | No axe-core automated testing | Medium |

---

*End of Testing Coverage Report v2.0*
