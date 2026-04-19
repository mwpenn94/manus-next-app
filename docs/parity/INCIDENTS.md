# INCIDENTS — manus-next-app

**Spec version:** v8.3
**Last updated:** April 18, 2026

## Incident Log

### P2-001: LLM Streaming Stuck on Typing Indicator

**Severity:** P2 (degraded experience)
**Detected:** Phase 4 — user-reported
**Root cause:** `req.on('close')` fired prematurely in SSE endpoint, setting `aborted=true` before `invokeLLM` returned. All subsequent `res.write()` calls were silently skipped.
**Resolution:** Replaced premature close detection with `safeWrite()` pattern that checks `res.destroyed` instead of a flag set by close events.
**Duration:** ~2 hours from report to fix verification
**Impact:** All streaming responses were silently dropped; users saw infinite typing indicator
**Prevention:** Added `stream.test.ts` with 8 tests covering SSE event formatting

### P2-002: React Error #310 on TaskView Page

**Severity:** P2 (page crash on published site)
**Detected:** Phase 7 — user-reported from published deployment
**Root cause:** 7 `useCallback` hooks were defined after an early `return` statement in TaskView.tsx, violating the Rules of Hooks.
**Resolution:** Moved all 7 `useCallback` hooks before the conditional early return.
**Duration:** ~1 hour
**Impact:** TaskView page crashed immediately on navigation
**Prevention:** Added to code review checklist

### P3-003: Web Search Returning Empty Results

**Severity:** P3 (degraded capability)
**Detected:** Phase 7 — user-reported
**Root cause:** DDG Instant Answer API returns empty results for broad queries.
**Resolution:** Added DuckDuckGo HTML search as a new source in the pipeline.
**Duration:** ~1 hour
**Impact:** Web search tool reported "temporary issue" for many common queries

### P3-004: Document Generation Missing Download Links

**Severity:** P3 (degraded capability)
**Detected:** Phase 7 — user-reported
**Root cause:** Download URL only included in tool_result text; LLM sometimes paraphrased instead of preserving the link.
**Resolution:** Added a dedicated `document` SSE event for direct link injection.
**Duration:** ~30 minutes
**Impact:** Users told "download using the provided link" but no link was visible

## PB (Process-Block) Log

### PB-001: Upstream Packages Not Published

**Filed:** April 18, 2026
**Status:** Active
**Impact:** 13 @mwpenn94/manus-next-* packages not on npm; local stubs used
**Blocking:** PACKAGE_INSTALL_VERIFY formal completion
**Mitigation:** All capabilities implemented in-repo; stubs provide interface compatibility
