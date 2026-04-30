# Wave 2 Findings: Task Replay Analysis

## Key Parity Gaps Identified (Priority Order)

### CRITICAL (Already Implemented - Verify)
1. ✅ **Phase-based response structure** — Agent already uses structured plans
2. ✅ **Knowledge recalled badge** — Already in ActiveToolIndicator
3. ✅ **Task completed with rating** — TaskCompletedCard exists
4. ✅ **Collapsible action badges** — GroupedActionsList + StreamingStepsCollapsible
5. ✅ **Follow-up suggestions** — Just added agent-generated follow-ups
6. ✅ **Max badge per-turn** — Just added

### HIGH (Needs Attention)
7. 🔲 **"Watch again" and "Try it yourself" buttons on shared replays** — Need to add to share/replay view
8. 🔲 **Skip to results** — Replay timeline needs a "skip to end" button
9. 🔲 **Thinking indicator uses Manus logo animation** — Currently using generic spinner
10. 🔲 **Word-by-word streaming cursor** — Need blinking cursor at end of streaming text

### MEDIUM (Polish)
11. 🔲 **File attachment cards with green X icon for spreadsheets** — Need file-type-specific icons
12. 🔲 **Two-column layout with persistent task plan** — Already have plan display, verify positioning
13. 🔲 **Duration per step** — Show elapsed time per action badge

## Agent Behavior Patterns (Confirmed)
- Professional, task-oriented, no conversational filler
- Uses headings, bold, numbered lists, code blocks
- Introduces plan immediately, no "Hello! I'd be happy to help..."
- Transparent about process (shows thinking, tool use)
- Direct and confident tone
- Summarizes completed work at end

## Streaming Patterns (Confirmed)
- Word-by-word progressive text reveal
- Blinking cursor during generation
- Small animated Manus logo as thinking indicator
- "Task completed" green checkmark at end
- "Watch again" + "Try it yourself" buttons on shared replays
