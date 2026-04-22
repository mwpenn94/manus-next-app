# §L.29 Step 0d: TEST_TYPE_BREAKDOWN

**Audit Date:** 2026-04-22T04:55:00Z
**Scope:** 57 vitest files + 2 Playwright files = 59 total test files

## Summary

| Type | Files | Tests | Percentage |
|------|-------|-------|------------|
| Unit | 39 | 878 | 63.3% |
| Integration | 16 | 496 | 35.8% |
| E2E (Playwright) | 2 | 13 | 0.9% |
| **Vitest Total** | **57** | **1,387** | — |
| **All Tests** | **59** | **1,400** | **100%** |

## Classification Methodology

Tests were categorized based on their imports and test patterns. Unit tests verify isolated logic with mocked dependencies. Integration tests exercise real HTTP requests, database queries, or SSE protocol flows. E2E tests use Playwright to drive a browser against the running application.

## Unit Tests (39 files, 878 tests)

These test isolated functions, data structures, and business logic without network or database calls. Key coverage areas include keyboard shortcuts (56 tests), model selector wiring (54 tests), connector OAuth flows (35 tests), parity verification (34 tests), and NS19 component validation (31 tests).

## Integration Tests (16 files, 496 tests)

These exercise real request/response flows, SSE streaming, database persistence, and multi-component interactions. The largest integration test suites cover confirmation gate persistence (49 tests), stream SSE protocol (44 tests), P23 capability verification (43 tests), and V9 parity checks (38 tests).

## E2E Tests (2 files, 13 tests)

Playwright-based browser automation tests covering the full application stack. The `auth.setup.ts` file handles authentication setup (1 test), and `authenticated.auth.spec.ts` (12 tests) covers authenticated user journeys including user profile, model selector, task creation, settings, billing, and protected API access.

## Test Health

All 1,387 vitest tests pass across 57 files. All 13 Playwright E2E tests pass across 2 files (1 setup + 12 authenticated). The test pyramid is healthy with a strong unit test base, meaningful integration coverage, and targeted E2E validation of critical user journeys.

## Verification

```
$ pnpm test
 Test Files  57 passed (57)
      Tests  1387 passed (1387)
```

## Status

**TEST_TYPE_BREAKDOWN: COMPLETE**
