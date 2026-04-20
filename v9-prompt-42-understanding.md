# v9 Prompt (Pasted_content_42) — Key Differences from Prior v9

## What's the Same
- Same §0-§9 structure, same §L.0-§L.25 framework
- Same 62 in-scope capabilities, same 5 N/A
- Same Gate A TRUE FINAL criteria
- Same convergence rule (3-pass focus discipline, not termination → ESCALATE_DEPTH)

## What's Different / New Emphasis
1. **AFK Mode is now fully specified** — §L.24 has complete I→O→V cycle mechanics, state machine (IDENTIFY→OPTIMIZE→VALIDATE→COMMIT/REVERT→CHECKPOINT→REPORT→REALITY_CHECK→EXIT), checkpoint cadence (30min), progress reports (2hr), hard cap (200 cycles/168hr)
2. **§L.25 Autonomous Failover Doctrine** — 10-layer failover tree, HRQ is NEVER blocking in AFK mode, only 3 legitimate global halt conditions
3. **v9 artifacts list is much larger** — ~40+ AFK_* artifacts required
4. **Prompt assumes Phase 13 state** — but our repo is at a LATER state (305 tests, 60 GREEN, 2 YELLOW). The prompt's assumption of "5 RED" is stale — we already resolved #42/#43/#47 to GREEN and #53/#62 to YELLOW
5. **Q14-Q18 quality wins** are new: Q14 (tiered-options), Q15 (AI reasoning), Q16 (automation), Q17 (AFK exhaustive), Q18 (autonomous failover)

## Current Repo State vs Prompt Assumptions
- Prompt says: 57 GREEN / 5 RED / 5 N/A
- Actual: 60 GREEN / 2 YELLOW / 0 RED / 5 N/A
- Prompt says: #42/#43/#47 are RED → we already have them GREEN
- Prompt says: 166 tests → we have 305 tests
- Prompt says: Phase 13 → we're past Phase 14

## What We Need To Do (Interactive Mode — NOT AFK)
1. ✅ REPO_STATE_VERIFY — already done in prior v9 pass
2. ✅ RED_AUDIT — already done, 0 RED remaining
3. ✅ TIERED_OPTIONS — already done (30+ services × 3 tiers)
4. ✅ PER_ASPECT_SCORECARD — already done (62 × 7 matrix)
5. ✅ AI_REASONING_TRACES — already done (3 traces ≥4.0/5.0)
6. ✅ AUTOMATION demos — already done (4 demos + security audit)
7. ✅ HOLISTIC_VERIFY — already done (CONVERGENCE_DIRECTIVE_CHECK_V9.md)
8. ✅ META-CONVERGENCE — already achieved (3/3 clean passes)

## What This New Prompt Adds That We Haven't Done Yet
1. **ESCALATE_DEPTH** — per §2, 3-pass zero-finding triggers deeper search, not termination
2. **AFK artifact initialization** — ~30 AFK_* artifacts need to be created
3. **MANUS_FLAGSHIP_CURRENT.md** — need to verify current Manus flagship name/pricing
4. **Bundle size optimization** — recommended step from prior delivery
5. **Publish and test GitHub OAuth** — recommended step
6. **Test image style persistence** — recommended step

## Execution Plan
Since we're in INTERACTIVE mode (not AFK), we need:
1. Execute the 3 recommended steps (bundle optimization, GitHub OAuth test, image style test)
2. Apply ESCALATE_DEPTH per §2 — open new optimization dimensions
3. Create missing v9-specific artifacts (MANUS_FLAGSHIP_CURRENT.md, update CONVERGENCE_DIRECTIVE_CHECK_V9.md with full v9 AFK extension)
4. Run convergence sweeps at deeper depth
5. Produce updated GATE_A_TRUE_FINAL_REPORT.md
