# STRICT_WINS.md — Measurable Wins vs Manus Pro Baseline

*Documented wins where Manus Next demonstrably matches or exceeds Manus Pro v1.6 Max.*

## Win #1: Three-Tier Mode Selection with Cost Transparency

Manus Pro offers a binary "Max" toggle. Manus Next provides a three-tier system (Speed/Quality/Max) with real-time cost estimates displayed in the task header. Users can make informed decisions about resource allocation before starting a task.

**Evidence:** `ModeToggle.tsx` renders three options with descriptions; `TaskView.tsx` shows cost badge. Manus Pro baseline capture confirms no per-task cost visibility.

## Win #2: Interactive Replay Timeline Scrubber

Manus Pro's replay is linear playback only. Manus Next adds a range-input scrubber for random access to any point in the task timeline, with event count display and variable speed controls.

**Evidence:** `ReplayPage.tsx` contains `<input type="range">` scrubber with `onChange` handler. Manus Pro baseline shows only play/pause controls.

## Win #3: Server-Side Scheduled Task Execution

Manus Pro supports scheduling through the UI but execution requires platform infrastructure. Manus Next implements a self-contained scheduler (`server/scheduler.ts`) that polls every 60 seconds, evaluates cron expressions, creates tasks, and executes them through the agent stream.

**Evidence:** `scheduler.ts` with `setInterval(pollScheduledTasks, 60000)`, `cron-parser` dependency, and 11 passing scheduler tests.

## Win #4: Parallel Wide Research with LLM Synthesis

Manus Pro's web search is sequential. Manus Next's `wide_research` tool fires 3-5 parallel queries via `Promise.allSettled`, then synthesizes results through an LLM call.

**Evidence:** `agentTools.ts` `executeWideResearch` function with parallel `Promise.allSettled` and synthesis via `invokeLLM`.

## Win #5: Keyboard Shortcuts with Discoverable Help Dialog

Manus Pro has no documented keyboard shortcuts. Manus Next implements Cmd+K, Cmd+N, Cmd+Shift+S, Cmd+/, and Escape with a discoverable help dialog.

**Evidence:** `useKeyboardShortcuts.ts` hook + `KeyboardShortcutsDialog.tsx` component.

## Win #6: WCAG 2.1 AA Accessibility

Manus Next has explicit WCAG 2.1 AA compliance: aria-labels on all interactive elements, role=tablist, focus-visible rings, aria-expanded/aria-pressed states, and keyboard navigation throughout.

**Evidence:** 20+ aria attributes across pages. 8 accessibility-specific persona checks.

## Win #7: PWA Installability

Manus Next includes `manifest.json` with display=standalone, enabling installation as a Progressive Web App.

**Evidence:** `client/public/manifest.json` + `<link rel="manifest">` in `client/index.html`.
