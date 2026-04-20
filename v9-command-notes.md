# V9 Command — Key Extraction

## What the prompt asks for (distilled)
1. REPO_STATE_VERIFY — check docs/parity/ and docs/manus-study/ artifacts exist
2. Complete Phase 14 RED capabilities (#42/#43/#47 + identify remaining 2 RED)
3. Freemium-first tiered-option audit (§L.21) — 30+ services × 3 tiers
4. Per-aspect parity scorecard (62 caps × 7 dims)
5. AI reasoning traces (§L.22) — ≥3 end-to-end chains
6. Automation parity demos (§L.23) — 4 demos + security audit
7. Holistic verification + convergence directive check
8. Gate A TRUE FINAL report + Owner action items

## Current actual repo state (from system exploration)
- PARITY_BACKLOG.md shows: **60 GREEN / 0 YELLOW / 2 RED / 5 N/A** (not 57/5 as prompt assumes)
- The 2 RED are: #53 Microsoft Agent365, #62 Veo3 Video (NOT #42/#43/#47)
- #42, #43, #47 are ALREADY GREEN (resolved 2026-04-19)
- 293 tests passing (not 166 as prompt assumes)
- Phase 14 RED work (#42/#43/#47) is ALREADY COMPLETE

## Prompt's stale assumptions to correct
- Says "57 GREEN / 5 RED" → actually 60 GREEN / 2 RED
- Says "166 tests" → actually 293 tests
- Says Phase 14 in-progress → Phase 14 already complete for #42/#43/#47
- The 2 remaining RED (#53, #62) are different from what prompt expects

## Execution plan (adapted to actual state)
1. REPO_STATE_VERIFY — check artifacts, log gaps
2. RED_AUDIT — document #53 and #62 as the actual RED items
3. Skip Phase 14 execution for #42/#43/#47 (already done)
4. Attempt #53/#62 with freemium-first approach + failover
5. TIERED_OPTIONS audit (30+ services)
6. PER_ASPECT_SCORECARD (62 × 7)
7. AI_REASONING_TRACES (≥3 chains)
8. AUTOMATION demos + security audit
9. CONVERGENCE_DIRECTIVE_CHECK_V9
10. Gate A TRUE FINAL report
