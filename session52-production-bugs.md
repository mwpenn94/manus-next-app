# Session 52: Real Production Bug Analysis from Screen Recording

## Bug 1: Git Clone Auth Failure (CRITICAL)
- OAuth token type `oauth_app` is being used but doesn't have clone permissions
- Every clone attempt fails with auth error regardless of failover layers
- The failover service EXISTS in code but clearly doesn't work in production
- Root cause: Need to trace what token is ACTUALLY being passed to git clone

## Bug 2: Message Disappearing (CRITICAL)
- At 03:21-03:28: Input field clears when tapped during active AI generation
- At 05:25-05:28: User sends "no!" → message briefly appears → disappears completely
- Messages sent during task execution vanish from chat history

## Bug 3: Mid-Task Message Crash (CRITICAL)
- At 01:24 & 01:42: Red error "Something went wrong" during "Conducting deeper research"
- At 05:12: Same error after navigating away from active task
- Sending messages during task execution doesn't interrupt — AI ignores for ~1 minute

## Bug 4: Manus Verify → "Service Unavailable" (CRITICAL)
- At 04:45-04:48: "Verify via Manus" → black page → "Service Unavailable"
- This is the OAuth flow failing completely

## Bug 5: "Refresh failed: No refresh token available" (CRITICAL)
- At 06:48 & 06:50: After PAT connection succeeds, grey banner shows refresh token error
- The app is trying to refresh a token that doesn't exist for PAT-based auth
- This means the connector system is treating PAT auth like OAuth and trying to refresh

## Priority Order:
1. Fix refresh token error (causes cascade failures)
2. Fix git clone auth (trace actual token being used)
3. Fix message disappearing during task execution
4. Fix mid-task message crash
5. Fix Manus Verify (may be external service issue)
