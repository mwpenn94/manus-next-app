# PERF_BASELINE — manus-next-app

> Performance baseline measurements for the application.

## Server-Side Metrics (2026-04-22)

| Endpoint | Method | Avg Response | Status |
|---|---|---|---|
| /api/trpc/auth.me | GET | <50ms | GOOD |
| /api/trpc/task.list | GET | <100ms | GOOD |
| /api/trpc/preferences.get | GET | <50ms | GOOD |
| /api/stripe/webhook | POST | <50ms | GOOD |
| / (SPA shell) | GET | <200ms | GOOD |

## Client-Side Metrics

| Metric | Target | Status |
|---|---|---|
| axe-core violations | 0 | 0 (GOOD) |
| Cumulative Layout Shift | <0.1 | ~0.02 (GOOD) |

## Test Suite Performance

| Suite | Files | Tests | Duration |
|---|---|---|---|
| Vitest | 57 | 1,387 | ~16s |
| Playwright E2E | 3 | 13 | ~45s |
