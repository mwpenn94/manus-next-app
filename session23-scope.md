# Session 23: Parity Expert Convergence — Scope Assessment

## Scope Definition
The work being optimized is the Sovereign AI web application's alignment with Manus product parity, focusing on three specific improvements identified through signal assessment.

## Signal Assessment (per recursive optimization methodology)

- **Fundamental Redesign**: Absent — core architecture is sound, 36+ pages, full agentic pipeline
- **Landscape**: Present for accessibility — axe-core violation on scrollable task list div is a known gap
- **Depth**: Present for task input UX — the home page input area and task creation flow could be deeper aligned with Manus's model selector + credits display pattern
- **Adversarial**: Present for agent stream resilience — the context window management and message deduplication need stress-testing under long conversations

## 3 Next Steps (Parity Expert Convergence)

### Step 1: Fix Scrollable Region Focusable (Accessibility)
The axe-core `scrollable-region-focusable` rule fires because `<div class="flex-1 overflow-y-auto px-2 py-1 overscroll-contain">` at AppLayout.tsx:517 is a scrollable container with no focusable content (when task list is empty) and no tabindex. Fix: add `tabindex={0}` and `role="region"` with `aria-label`.

### Step 2: Task Input Context Bar — Model Selector + Credits Display
Manus shows a model selector dropdown (Manus Max ▼) in the header bar and credits count in the sidebar. Our app has the model selector but it's disconnected from the agent stream. Wire the selected model/mode into the actual agent stream request so the user's model choice affects LLM behavior.

### Step 3: Agent Context Window Indicator
Manus shows context window usage during long tasks. Add a context token counter that tracks approximate token usage across the conversation and displays it as a subtle progress bar in the TaskView header, warning when approaching limits.
