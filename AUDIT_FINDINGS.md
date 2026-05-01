# Comprehensive Parity Audit — Consolidated Findings

## Total Issues: 56 across 8 subsystems

## CRITICAL (Must Fix Now — User-Facing Breakage)

| # | File | Issue | Fix |
|---|------|-------|-----|
| 1 | streamWithRetry.ts | SSE messages split across chunks cause parsing errors | Add buffer to accumulate partial chunks before splitting |
| 2 | TaskContext.tsx | Race condition: duplicate tasks when server sync runs before mutation completes | Deduplicate by externalId when merging server tasks |
| 3 | SandboxViewer.tsx | Browser view shows static screenshot instead of live iframe | Use iframe with browserUrl when available |
| 4 | WebappPreviewCard.tsx | Iframe doesn't refresh on external updates (refreshKey prop ignored) | Include refreshKey in iframe key attribute |
| 5 | documentGeneration.ts | PDF/DOCX generation uses fragile manual markdown parsing | Use markdown-it properly (already imported but unused) |
| 6 | agentStream.ts | Unhandled errors in onArtifact callback crash the stream | Wrap in try/catch |

## HIGH (Significant Parity Gaps)

| # | File | Issue | Fix |
|---|------|-------|-----|
| 7 | SandboxViewer.tsx | No syntax highlighting for code | Add react-syntax-highlighter or prism |
| 8 | SandboxViewer.tsx | Inaccurate diff (naive set comparison) | Use proper diff library |
| 9 | TaskContext.tsx | JSON.parse errors crash message rendering | Wrap in try/catch with safe defaults |
| 10 | streamWithRetry.ts | Final chunk may be lost if no trailing newline | Process remaining buffer after loop |
| 11 | WebappPreviewCard.tsx | Code/Dashboard/Settings tabs are placeholders | Implement or hide |

## MEDIUM (Polish & Alignment)

| # | File | Issue | Fix |
|---|------|-------|-----|
| 12 | TaskView.tsx | Error messages not user-friendly | Rewrite to warm tone |
| 13 | SandboxViewer.tsx | Floating toolbar buttons have no onClick | Wire up handlers |
| 14 | WebappPreviewCard.tsx | Animation timing 300ms instead of 120ms | Update to 120ms |

## Priority Execution Order (by expected value-add):
1. Fix SSE buffer (streamWithRetry) — prevents data loss
2. Fix WebappPreviewCard refresh — fixes app creation appearing broken
3. Fix TaskContext race condition — prevents duplicate tasks
4. Fix SandboxViewer browser iframe — makes workspace useful
5. Fix documentGeneration robustness — fixes file generation
6. Wrap onArtifact in try/catch — prevents stream crashes
7. Add JSON.parse safety — prevents rendering crashes
8. Hide placeholder tabs in WebappPreviewCard — cleaner UX
