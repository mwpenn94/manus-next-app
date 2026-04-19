# Cost Text Truncation Analysis

Looking at the task header, I can see:
- Title: "Generate me a step by step guide to mak..." (truncated with ellipsis - expected behavior)
- "Completed" badge (green)
- "~$0.15 q..." — the cost text IS truncated, showing "~$0.15 q..." instead of "~$0.15 quality"
- Speed / Quality / Max toggle buttons

The issue: the cost container is too narrow, causing "quality" label to be cut off as "q..."
The fix: either remove the label text (just show the price) or ensure the container has enough width.

Looking at the code:
- The cost div has `hidden md:flex` so it only shows on desktop
- It shows price + mode label in a small pill
- The container doesn't have `shrink-0` or `whitespace-nowrap`

Fix: add `whitespace-nowrap shrink-0` to the cost container to prevent truncation.
