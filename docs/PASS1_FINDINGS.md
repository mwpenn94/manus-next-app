# Pass 1: Automated Infrastructure Audit Findings

**Date:** 2026-04-23T08:18:20Z
**Lens:** Automated scripts — bundle analysis, dead code, dependency audit

## Summary

| Category | Count | Severity |
|---|---|---|
| TypeScript errors | 0 | None |
| Unused dependencies | 21 | Low-Medium |
| TODO/FIXME comments | 0 | None |
| Console statements (client) | 28 | Low |
| Missing alt text | 14 | Medium (a11y) |
| Large files (>500 lines) | 27 | Low (maintainability) |
| Hardcoded secrets | 0 | None (false positives: `sk-` matched X-Task-Id headers and demo data) |
| Test files / Source files | 72 / 32 | Excellent (2.25 ratio) |

## Detailed Findings

### F1.1: Unused Dependencies (21)
These are npm packages listed in package.json but not directly imported in source code:

**Scoped packages (likely unused placeholders):**
- `@mwpenn94/manus-next-agent` through `@mwpenn94/manus-next-voice` (12 packages) — These appear to be placeholder/future packages. They are not imported anywhere.

**Potentially unused utilities:**
- `@codemirror/view` — May be used dynamically or via re-export
- `@hookform/resolvers` — Form validation library, not imported
- `@types/ws` — Type package, may be needed for compilation
- `cron-parser` — Used in scheduler, may be imported dynamically
- `duck-duck-scrape` — Web search tool, may be imported dynamically
- `jszip` — ZIP handling, may be imported dynamically
- `kokoro-js` — TTS engine, may be imported dynamically
- `playwright` — E2E testing, used in test scripts
- `tailwindcss-animate` — CSS animations, used via Tailwind config

**Assessment:** Most of these are either dynamically imported (server-side tools) or used in configuration files. The 12 `@mwpenn94/*` packages are the only genuinely unused ones — they appear to be future integration points. No action required as they don't affect bundle size (tree-shaken).

### F1.2: Missing Alt Text (14 images)
14 `<img>` tags without `alt` attributes across components. These need accessible alt text for screen readers.

**Files affected:**
- CheckpointCard.tsx, InteractiveOutputCard.tsx, ManusDialog.tsx
- MediaCapturePanel.tsx, SandboxViewer.tsx, WebappPreviewCard.tsx
- DesignView.tsx, Home.tsx, Library.tsx, ReplayPage.tsx (2)
- TaskView.tsx (3)

### F1.3: Large Files (27 files >500 lines)
Largest files:
- `server/routers.ts` (3,209 lines) — Should be split into feature routers
- `client/src/pages/TaskView.tsx` (2,991 lines) — Core page, complex but cohesive
- `server/agentTools.ts` (2,543 lines) — Tool definitions, naturally large
- `server/db.ts` (1,758 lines) — Database helpers, could be split
- `client/src/pages/SettingsPage.tsx` (1,245 lines) — Many settings tabs
- `client/src/pages/Library.tsx` (1,150 lines) — Library view with filters
- `client/src/components/AppLayout.tsx` (1,118 lines) — Main layout

### F1.4: Console Statements in Client (28)
28 console.log/warn/error statements in client code. Most are error handlers (appropriate) but some may be debug leftovers.

### F1.5: Hardcoded Secrets (0 actual)
All 15 grep matches were false positives:
- `X-Task-Id` headers containing "task" substring
- Demo data in WebhooksPage with `sk_live_abc1` (clearly placeholder)
- No actual API keys or secrets found in source code.

## Actionable Items

1. **Fix 14 missing alt attributes** — Medium priority (accessibility)
2. **Review 28 client console statements** — Low priority (remove debug logs)
3. **Consider splitting large files** — Low priority (maintainability, no functional impact)
4. **Unused @mwpenn94/* packages** — Informational only (no bundle impact)

## Pass 1 Verdict: CLEAN (0 critical, 14 medium a11y issues)
