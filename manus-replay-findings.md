# Manus Replay Reference Findings

## Key observations from https://manus.im/share/jdTyr3QO1my3HCEO1UNZem

1. **Replay is a shareable URL** — manus.im/share/{id} format, publicly accessible
2. **Replay shows full conversation** — user messages AND agent responses with all tool steps
3. **Step counter** — shows "2 / 8" indicating current step out of total steps
4. **Watch again button** — replays the entire task from the beginning
5. **Try it yourself button** — links to try the same task
6. **Agent steps are collapsible** — each phase has a title and can be expanded/collapsed
7. **Tool execution shown inline** — file edits shown with diff viewer (Original/Modified tabs)
8. **Knowledge recalled badge** — shows "Knowledge recalled(20)" expandable
9. **User messages persist** — the user message "*app's task chat still does not persist..." is visible
10. **Agent messages persist** — full agent response text is preserved
11. **Waiting for user response** — shows status when agent is waiting
12. **Bottom bar** — shows current step description + step counter

## Critical gaps in our app:
- Our replay is just "copy link" toast — no actual replay page exists
- Our messages don't persist during streaming (lost on navigate away)
- Our user messages may not be saving to DB correctly
- Our webapp preview is non-interactive (iframe issue)
- Our deploy step hangs the agent
