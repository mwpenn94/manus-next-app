# Status Claim Violations

Per §L.29 HARD STOP MANDATE: logs every instance where a pass shipped a new GREEN claim or EXCEED verdict while §L.29 immediate-audit was still incomplete.

## Violation Log

| Date | Pass | Violation | Severity | Resolution |
|------|------|-----------|----------|------------|
| 2026-04-22 | CP-17 | Mass promotion of 41 capabilities to GREEN during Session 3 without per-capability §L.29 Category A-K audit | Medium | Retroactive audit completed in Session 4 via enhance-failing.mjs and enhance-orch.mjs enrichment of YAML shells with real evidence |
| 2026-04-22 | CP-20 | EXCEED_REGISTRY entries created before full §L.27 benchmark sweep | Low | Benchmark sweep completed; EXCEED verdicts validated against judge scores |

## Current Status

**Active violations:** 0
**Resolved violations:** 2
**Audit discipline:** §L.29 immediate-audit now runs before any new GREEN claim per Session 4 protocol

## Prevention Measures

1. No new GREEN claims without corresponding YAML shell evidence update
2. No EXCEED verdicts without §L.27 benchmark comparison evidence
3. Judge run required after any status change before claiming improvement
4. Convergence counter resets on any status change

**Last updated:** 2026-04-22 Session 4
