# V9 State-Aware Parity Prompt — Execution Notes

## Scope Definition
The work is: executing the v9 state-aware parity prompt against the manus-next-app codebase, fulfilling 100% of its requirements including §L.27 benchmarks, §L.28 persona testing, §L.29 false-positive elimination, and all associated artifacts.

## Key Sections Identified

### §L.27 — Live Manus Side-by-Side Benchmarks
- Minimum 20 benchmark tasks across 8 capability categories
- Blinded side-A/side-B scoring with cross-judge validation
- EXCEED/MATCH/LAG verdicts per task
- Artifacts: TASK_CATALOG.md, EXCEED_REGISTRY.md, benchmark runs

### §L.28 — Live Virtual User Testing (Persona Journeys)
- ≥30 personas across 7 categories (professional, accessibility, device, language, emotional, edge-case, Manus-refugee)
- ≥6 accessibility, ≥5 device, ≥6 professional, ≥3 language, ≥3 emotional, ≥3 edge-case, ≥4 Manus-refugee
- 20-pass rotation sweeps (5 personas), 200-pass full catalog sweeps
- Multi-session, cross-surface, collaborative scenarios
- Artifacts: PERSONA_<ID>.md (≥30), persona-runs/, PERSONA_EXCEED_REGISTRY.md, sweep summaries

### §L.29 — False-Positive Elimination Protocol
- Categories A through J of false positives
- HARD STOP MANDATE: no new GREEN claims until audit complete
- Immediate audit steps:
  - Step 0a: STUB_AUDIT — grep for stub patterns
  - Step 0a-bis: DEPENDENCY_AUDIT — verify package.json deps
  - Step 0a-ter: COMMIT_DENSITY_AUDIT
  - Step 0b: OWNER_DOGFOOD pass
  - Step 0c: SIDE_EFFECT_VERIFICATION audit
  - Step 0d: TEST_TYPE_BREAKDOWN
  - Step 0e: STATUS_FRESHNESS scan
  - Step 0f-0g: Additional verification

### Known Category J Gaps (from package.json analysis)
- NO playwright/@playwright/test
- NO @octokit/rest
- NO cloudflare SDK
- NO WebRTC libs (simple-peer/mediasoup-client)
- NO OCR libs (tesseract.js)

### Verified Repo State (2026-04-22)
- 113+ commits, HEAD f0b2763
- 57 GREEN / 0 YELLOW / 5 RED / 5 N/A capabilities
- 1387 vitest tests passing
- Design system: "Warm Void" (not Editorial Command Center)
- 13 workspace packages in packages/

## Execution Priority Order
1. §L.29 immediate audit (Steps 0a through 0g) — MUST complete first
2. §L.27 benchmark infrastructure verification
3. §L.28 persona catalog verification
4. Fix any false positives found
5. Push all artifacts to GitHub
