# Testing Strategy — Sovereign AI Platform

## Overview

The test suite uses Vitest with a focus on structural verification, GDPR compliance, and service-layer correctness. Tests are co-located with server code in `server/*.test.ts`.

## Test Categories

| Category | Files | Description |
|----------|-------|-------------|
| Auth | `auth.logout.test.ts` | Session management, logout flow |
| GDPR | `gdpr.test.ts` | Verifies all userId-bearing tables are included in deleteAllData |
| Security | `security.test.ts` | Input validation, XSS prevention, CSRF protection |
| Agent Stack | `agent-stack.test.ts` | AEGIS/ATLAS/Sovereign service layer unit tests |
| Routers | `routers.test.ts` | tRPC procedure structure verification |
| False Positives | `false-positive-elimination.test.ts` | Ensures no dead code or unreachable procedures |
| Deploy | `deploy.test.ts` | Build artifact verification |
| Session Tests | `session*.test.ts` | Feature-specific regression tests from development sessions |
| Cycle Tests | `cycle*.test.ts` | Optimization cycle regression tests |

## Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
npx vitest run server/agent-stack.test.ts

# Run tests matching a pattern
npx vitest run -t "AEGIS"
```

## Test Utilities

The `server/test-utils/readRouterSource.ts` utility aggregates source code from the main `server/routers.ts` and all files in `server/routers/` for string-scanning tests. This allows tests to verify implementation details even after routers are extracted into sub-files.

## Coverage Gaps

As documented in `GAP_ANALYSIS.md`, the ATLAS and Sovereign layers need dedicated integration test files beyond the unit tests in `agent-stack.test.ts`.
