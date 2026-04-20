# V9 Prompt Analysis — Key Actionable Items for P13

## Core Insight
The v9 prompt is a comprehensive AFK-mode operational framework. For our interactive P13 pass, we extract the IMMEDIATELY ACTIONABLE items that improve the codebase, not the full AFK infrastructure (which is a multi-day effort).

## Immediately Actionable (P13 scope)

### 1. REPO_STATE_VERIFY
- Run `pnpm test` to get live test count
- Check docs/parity/ artifacts exist
- Update PARITY_BACKLOG.md if any tracking lags

### 2. RED_AUDIT
- Current state per PARITY_BACKLOG: 60 GREEN, 2 YELLOW (#53 Microsoft 365, #62 Veo3), 0 RED, 5 N/A
- v9 assumes 5 RED — this is STALE. Phase 13 already shipped #42, #43, #47 to GREEN.
- Need to update V9_RED_AUDIT.md to reflect current reality

### 3. TIERED_OPTIONS.md
- Document 20+ external dependencies with 3 tiers + upgrade triggers
- This is a documentation task, not a code task

### 4. PER_ASPECT_SCORECARD
- Score 62 × 7 matrix — documentation task

### 5. AI_REASONING_TRACES.md
- Capture ≥3 end-to-end reasoning chains
- Documentation task

### 6. AUTOMATION_PARITY_MATRIX.md + AUTOMATION_SECURITY_AUDIT.md
- Document 5 surfaces × 4 demos × per-tier status
- Verify 6 security requirements

### 7. §L.28 Persona Bootstrap
- Create ≥30 persona profiles in docs/parity/personas/
- Run initial persona sweep

### 8. V9_CONVERGENCE_LOG.md
- Initialize and track passes

### 9. CONVERGENCE_DIRECTIVE_CHECK_V9.md
- Word-by-word v9 directive re-read

## Deferred (requires AFK mode / multi-day)
- Full §L.26 perpetual build loop
- §L.27 live Manus benchmarking (needs Manus Pro access)
- §L.28 full persona rotation (200+ passes)
- 168-hour autonomous operation
- Cross-model judge validation

## Priority Order for P13
1. Fix remaining code issues (prompt caching ✅, replay ✅, settings ✅)
2. Run convergence passes (TypeScript + tests + build)
3. Create key v9 documentation artifacts
4. Virtual user validation
5. Checkpoint
