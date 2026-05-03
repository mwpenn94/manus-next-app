# Session 52: Root Cause Analysis (Updated with Code-Level Findings)

## Bug 1: "Refresh failed: No refresh token available"
ROOT CAUSE: When user connects GitHub via PAT, `upsertConnector` does NOT clear stale OAuth fields
(accessToken, refreshToken, tokenExpiresAt) from a previous OAuth connection. The connector refresh
timer then finds `autoRefreshEnabled=true` with a null refreshToken and fires the error toast.

FIX APPLIED:
1. `server/db.ts` upsertConnector: When config contains a PAT token, null out OAuth fields on update
2. `server/connectorRefreshTimer.ts`: Skip connectors where authMethod is "pat"
3. `server/scheduledConnectorRefresh.ts`: Same skip logic

## Bug 2: Git Clone Auth Failure
ROOT CAUSE: `resolveGitHubAuth` Layer 1 finds stale OAuth accessToken, tries it, fails, reports error
as "oauth_app token" even though PAT exists in Layer 2/3. The stale OAuth token poisons the chain.

FIX APPLIED: upsertConnector clears accessToken/refreshToken when PAT is saved.
STILL NEEDS: Verify the actual clone URL construction uses the token correctly.

## Bug 3: Messages Disappearing + Mid-Task Message Crash
ROOT CAUSE (CRITICAL — from code at line 1405-1413 of server/_core/index.ts):
```
// NOTE: Server-side onComplete persistence REMOVED (Pass 70).
// If the client disconnects mid-stream, the message is lost — but this is
// acceptable since the user can retry.
onComplete: undefined,
```

The server NEVER persists assistant messages. Only the client does via `addMessage` after stream
completion. When user sends a follow-up mid-stream:
1. Client aborts the SSE connection (triggers server abort)
2. Client saves partial content locally (line 3129-3130)
3. Client starts new stream after 500ms delay
4. But: if abort races with the addMessage call, or if the browser tab refreshes,
   the message is PERMANENTLY LOST because the server never saved it.

Additionally: There is NO server-side concurrency guard. Two streams can run simultaneously
on the same task if the abort/restart timing is unlucky.

FIX NEEDED:
1. Re-enable server-side onComplete with dedup logic (upsert, not insert)
2. Add per-task stream mutex so only one stream runs at a time per task
3. When a new stream request arrives for a task that's already streaming, abort the old one first

## Bug 4: Manus Verify Failure
NEEDS: Check the verifyViaManus procedure and the OAuth callback URL construction.

## PRIORITY ORDER:
1. Server-side message persistence (Bug 3) — data loss is unacceptable
2. Per-task stream concurrency guard (Bug 3) — prevents race conditions
3. Git clone token extraction verification (Bug 2) — functional requirement
4. Manus verify (Bug 4) — auth flow
