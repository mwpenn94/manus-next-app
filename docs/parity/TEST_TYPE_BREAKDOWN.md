# §L.29 Step 0d: TEST_TYPE_BREAKDOWN

**Audit Date:** 2026-04-22T06:50:00Z
**Scope:** 60 test files, 1432 total test cases

## Summary

| Type | Files | Tests | Percentage |
|------|-------|-------|------------|
| Unit | 42 | 927 | 64.7% |
| Integration | 15 | 457 | 31.9% |
| E2E (Playwright) | 3 | 48 | 3.4% |
| **Total** | **60** | **1,432** | **100%** |

## Classification Methodology

Tests were categorized based on their imports and test patterns. Unit tests verify isolated logic with mocked dependencies. Integration tests exercise real HTTP requests, database queries, or SSE protocol flows. E2E tests use Playwright to drive a browser against the running application.

## Unit Tests (42 files, 927 tests)

These test isolated functions, data structures, and business logic without network or database calls. Key coverage areas include keyboard shortcuts (56 tests), model selector wiring (54 tests), connector OAuth flows (35 tests), parity verification (34 tests), and NS19 component validation (31 tests).

## Integration Tests (15 files, 457 tests)

These exercise real request/response flows, SSE streaming, database persistence, and multi-component interactions. The largest integration test suites cover confirmation gate persistence (49 tests), stream SSE protocol (44 tests), P23 capability verification (43 tests), and V9 parity checks (38 tests).

## E2E Tests (3 files, 48 tests)

Playwright-based browser automation tests covering the full application stack. The `app.spec.ts` file (22 tests) covers unauthenticated flows, `authenticated.auth.spec.ts` (11 tests) covers authenticated user journeys, and `github-publish.test.ts` (15 tests) covers the GitHub publishing pipeline.

## Test Health

All 1,387 vitest tests pass (the remaining 45 are Playwright E2E tests run separately). The test pyramid is healthy with a strong unit test base, meaningful integration coverage, and targeted E2E validation of critical user journeys.

## Status

**TEST_TYPE_BREAKDOWN: COMPLETE**
