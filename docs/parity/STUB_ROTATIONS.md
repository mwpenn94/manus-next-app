# STUB_ROTATIONS — manus-next-app

> Tracks stub-to-real implementation rotations.

## Rotation Log

| Date | Component | From (Stub) | To (Real) | Verified |
|---|---|---|---|---|
| 2026-04-17 | Auth | Mock session | Manus OAuth | YES (E2E) |
| 2026-04-18 | LLM | Hardcoded responses | Forge API invokeLLM | YES (vitest) |
| 2026-04-18 | Storage | Local filesystem | S3 storagePut/storageGet | YES (vitest) |
| 2026-04-18 | Payments | Mock billing | Stripe Checkout Sessions | YES (webhook test) |
| 2026-04-19 | Streaming | Polling | SSE with auto-continuation | YES (E2E) |
| 2026-04-22 | LLM Retry | Single call | invokeLLMWithRetry (3x backoff) | YES (vitest) |

## Current Stubs

Per STUB_AUDIT.md: **0 stubs remain** in production code.
The only stub is `packages/eval/src/auth-stub.ts` which is legitimate test infrastructure.

## Rotation Policy

All stubs must be rotated to real implementations before GATE_A approval.
Each rotation must be verified by at least one test (unit, integration, or E2E).
