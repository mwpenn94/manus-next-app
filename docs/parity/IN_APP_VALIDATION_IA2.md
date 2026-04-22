# In-App Validation IA-2 (§L.33)

**Created:** 2026-04-22T11:25:00Z
**Purpose:** In-app validation infrastructure — test runner, coverage, CI integration, telemetry hooks.

## Test Infrastructure

### Test Runner: Vitest 3.2.1

| Configuration | Value | File |
|--------------|-------|------|
| Runner | vitest | vitest.config.ts |
| Environment | node | vitest.config.ts |
| Globals | true | vitest.config.ts |
| Include pattern | `server/**/*.test.ts`, `shared/**/*.test.ts` | vitest.config.ts |
| Exclude | node_modules, dist | vitest.config.ts |
| Timeout | 10000ms | vitest.config.ts |
| Alias resolution | @shared → shared/, @server → server/ | vitest.config.ts |

### E2E Runner: Playwright 1.52.0

| Configuration | Value | File |
|--------------|-------|------|
| Runner | @playwright/test | playwright.config.ts |
| Base URL | http://localhost:3000 | playwright.config.ts |
| Projects | setup (auth), authenticated | playwright.config.ts |
| Storage state | e2e/.auth/user.json | playwright.config.ts |
| Retries | 1 | playwright.config.ts |
| Timeout | 30000ms | playwright.config.ts |

### Accessibility: axe-core

| Configuration | Value | File |
|--------------|-------|------|
| React integration | @axe-core/react | client/src/main.tsx |
| Playwright integration | @axe-core/playwright | e2e/ tests |
| Debounce | 5000ms | client/src/main.tsx |
| Rules | All WCAG 2.1 AA | Default ruleset |

## Test Coverage Summary

| Category | Files | Tests | Description |
|----------|-------|-------|-------------|
| Unit (server) | 39 | 878 | tRPC procedures, DB helpers, utilities |
| Integration (server) | 16 | 496 | Cross-procedure flows, auth chains, Stripe webhooks |
| E2E (Playwright) | 2 | 13 | Auth setup, authenticated flows |
| **Total** | **57+2** | **1,400** | |

## CI Integration

### Available Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `pnpm test` | `vitest run` | Run all unit + integration tests |
| `pnpm test:e2e` | `playwright test` | Run E2E tests (requires dev server) |
| `pnpm db:push` | `drizzle-kit generate && drizzle-kit migrate` | Push schema changes |
| `pnpm build` | `vite build && esbuild ...` | Production build |
| `pnpm lint` | `eslint .` | Lint check |

### CI Pipeline (Recommended)

```yaml
# .github/workflows/ci.yml (recommended, not yet implemented)
steps:
  1. pnpm install
  2. pnpm lint
  3. pnpm test          # Unit + integration
  4. pnpm build         # Verify production build
  5. pnpm test:e2e      # E2E (requires server start)
```

**Note:** CI pipeline YAML is not yet committed — the project uses Manus webdev_save_checkpoint for deployment, which runs tests implicitly. A GitHub Actions CI file would be needed for independent CI/CD.

## Telemetry Hooks

### Client-Side

| Hook | Source | Data Collected |
|------|--------|---------------|
| axe-core/react | @axe-core/react | Accessibility violations (dev only) |
| React Query devtools | @tanstack/react-query-devtools | Query cache state (dev only) |
| Console error tracking | debug-collector.js (Manus) | Client errors, network requests, session replay |
| Analytics | VITE_ANALYTICS_ENDPOINT | Page views, user events (Umami-compatible) |

### Server-Side

| Hook | Source | Data Collected |
|------|--------|---------------|
| tRPC error handler | server/_core/trpc.ts | Procedure errors with context |
| Express error middleware | server/_core/index.ts | Unhandled errors |
| Stripe webhook logging | server/routers.ts | Event type, ID, timestamp |
| Agent stream logging | server/agentStream.ts | Tool calls, LLM latency, error rates |

### Observability Gap

No OpenTelemetry or Sentry integration. Error tracking relies on:
1. Manus platform debug-collector (client-side)
2. Server console.error (captured in .manus-logs/)
3. Stripe Dashboard webhook logs

**Recommendation:** Add structured logging (pino) for server-side observability. OpenTelemetry integration is a YELLOW item — useful but not critical for current scope.
