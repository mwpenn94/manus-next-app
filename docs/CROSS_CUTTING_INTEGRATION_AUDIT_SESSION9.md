# Cross-Cutting Integration Audit — Session 9

## Methodology

This audit examines end-to-end data flows, state consistency, error propagation, auth handling, date/time patterns, memory management, and navigation consistency across the entire application. Unlike previous audits that examined individual components, this audit traces paths that cross multiple layers (client → tRPC → server → DB → client).

---

## Findings

### CC-01: Missing onError Handlers on 12 Mutations (MEDIUM)

**Location**: Multiple pages
**Issue**: 12 mutations across 5 pages lack `onError` handlers, meaning errors will fail silently (no toast, no user feedback).

| Page | Mutation | Missing onError |
|------|----------|----------------|
| MemoryPage.tsx | `memory.bulkAdd` | Yes |
| SchedulePage.tsx | `schedule.create` | Yes |
| SchedulePage.tsx | `schedule.toggle` | Yes |
| MeetingsPage.tsx | `meeting.create` | Yes |
| MeetingsPage.tsx | `meeting.generateFromTranscript` | Yes |
| TaskView.tsx | `task.rateTask` | Yes |
| TaskView.tsx | `voice.transcribe` | Yes |
| WebAppBuilderPage.tsx | `webapp.create` | Yes |
| WebAppBuilderPage.tsx | `webapp.update` | Partial (has onSuccess but no onError) |

**Impact**: Users won't know why an action failed. They may retry indefinitely or assume the action succeeded.
**Fix**: Add `onError: (err) => { toast.error(err.message); }` to all mutations.

### CC-02: useEffect Cleanup Imbalance in TaskView (LOW)

**Location**: `client/src/pages/TaskView.tsx`
**Issue**: 13 useEffect hooks but only 3 cleanup functions. While not all effects need cleanup (e.g., data fetching effects), effects that add event listeners or set intervals should always have cleanup.
**Impact**: Potential memory leaks if the component unmounts while effects are still active. However, the 3 cleanup functions cover the most critical cases (event listeners).
**Status**: LOW — the critical event listeners are properly cleaned up.

### CC-03: Library and AnalyticsPage Missing Auth Import (LOW)

**Location**: `client/src/pages/Library.tsx`, `client/src/pages/AnalyticsPage.tsx`
**Issue**: These pages don't import `useAuth` but use `protectedProcedure` on the server side. The auth check happens at the tRPC layer, so the pages work correctly, but they can't show user-specific UI (e.g., "Welcome, [name]").
**Impact**: No functional issue — auth is enforced server-side. The pages just can't access user state for UI personalization.
**Status**: LOW — no security risk, just a UI limitation.

### CC-04: No Transaction Wrapping for Multi-Table Operations (LOW)

**Location**: `server/routers.ts` — GDPR deleteAllData, task branching
**Issue**: Operations that touch multiple tables (GDPR deletion across 35 tables, task branching that creates task + branch record) don't use database transactions. If the server crashes mid-operation, data could be in an inconsistent state.
**Impact**: LOW for GDPR (rare operation, deletion order handles dependencies). LOW for task branching (worst case: orphaned branch record).
**Note**: This was also flagged in ADV-03. Drizzle ORM supports `db.transaction()`.

---

## Verified Patterns

| Pattern | Status | Evidence |
|---------|--------|----------|
| **E2E Task Flow** | CORRECT | task.create → updateTaskStatus → agent stream → artifact save → library display all use consistent externalId |
| **Auth Enforcement** | CORRECT | 32/36 pages use useAuth. 4 exceptions are correct: NotFound (public), SharedTaskView (public share), AnalyticsPage (uses protectedProcedure server-side), Library (uses protectedProcedure server-side) |
| **Error Propagation** | MOSTLY CORRECT | TRPCError on server → err.message on client via onError. 12 mutations missing onError (CC-01). |
| **Date/Time Handling** | CORRECT | 55 date formatting instances use toLocaleString/toLocaleDateString (client-local). 13 instances use toISOString/getTime (UTC for API). Consistent with UTC-store, local-display pattern. |
| **Navigation Consistency** | CORRECT | All pages with back navigation use wouter's useLocation. No dead-end pages found. |
| **Loading States** | CORRECT | All data-fetching pages have loading states. Pages with 0 loading states are static pages (NotFound, DesktopAppPage, etc.) |
| **Rate Limiting** | CORRECT | 5 rate limiters cover all endpoint categories. Stream (20/min), upload (30/min), API (600/min), TTS (60/min), analytics (60/min). |
| **Cookie Security** | CORRECT | sameSite: "none", secure: true, httpOnly: true. |

---

## Summary

| Severity | Count | Findings |
|----------|-------|----------|
| HIGH | 0 | — |
| MEDIUM | 1 | CC-01 (12 mutations missing onError) |
| LOW | 3 | CC-02 (useEffect cleanup), CC-03 (auth import), CC-04 (no transactions) |

**Overall Integration Health: Strong.** The E2E data flows are consistent, auth is properly enforced, date handling follows UTC-store/local-display, and error propagation works correctly for the 180+ mutations that have onError handlers. The 12 missing onError handlers (CC-01) are the only actionable finding.
