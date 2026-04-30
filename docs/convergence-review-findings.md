# UI/UX Convergence Review Findings

## Task View (Calculator App Creation Error)

### Critical Issues Found:
1. **Task still shows "Running" status** — This is the exact bug from the user's screenshot. The task errored but status never transitioned to "error". This is a pre-existing task from before our fix was deployed. The fix prevents NEW tasks from getting stuck, but existing stuck tasks need a status reset mechanism.

2. **Raw error message displayed** — "Cannot read properties of undefined (reading 'length')" is shown directly to the user. Our fix prevents this for future errors (getStreamErrorMessage now maps this to a friendly message), but existing persisted error messages in the DB still show the raw text.

3. **No response after user follow-ups** — User sent "You errored out. Try again" and "Hello?" with no agent response. The task is permanently stuck. Our fix (auto-trigger new stream on follow-up) will prevent this in the future.

### Positive:
- Task header shows title, status badge, cost (~$0.50), model (Manus Max)
- Workspace panel on right with Browser/All/Docs/Images/Code/Links tabs
- Message input at bottom with connectors badge, voice input, hands-free mode
- Branch buttons on each message for conversation branching
- Listen button for TTS

### Action Items:
1. Add a "Retry" button that appears when task is in error/stuck state
2. Add a mechanism to reset stuck "Running" tasks (e.g., detect tasks running > 5 min without activity)
3. Consider adding a "Clear error" action to remove the raw error message from display
