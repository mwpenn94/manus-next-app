# Convergence Review — Task Error State

## Observations from Screenshot:
1. **Error message still shows raw text** — "⚠️ Cannot read properties of undefined (reading 'length')" is displayed. This means our `isStreamErrorMessage` filter isn't matching this exact format. The message has a ⚠️ emoji prefix which our regex doesn't account for.

2. **Stale task recovery banner IS showing** — "This task appears to be stalled. Send a message to resume it." with amber Retry button is visible at the bottom. This confirms our fix works!

3. **Task status shows "Running"** — The header still shows green "Running" badge. This is correct since the DB status is still "running" (the task was stuck before our fix).

4. **User messages visible** — "You errored out. Try again" and "Hello?" are shown correctly with Branch buttons.

## Issue to Fix:
- The `isStreamErrorMessage` function doesn't match the ⚠️-prefixed format. The raw error from the server was stored as "⚠️ Cannot read properties of undefined (reading 'length')" but our pattern matching looks for "Cannot read properties" without the emoji prefix.

## Fix Needed:
- Update `isStreamErrorMessage` to also match messages starting with ⚠️ or containing the raw error pattern anywhere in the string.
