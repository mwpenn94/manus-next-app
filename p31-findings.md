# P31 OAuth Investigation Findings

## Root Causes Found

### Bug 1: `noopener,noreferrer` in window.open()
- **File**: `client/src/pages/ConnectorsPage.tsx` line 107
- **Problem**: `window.open(data.url, "_blank", "noopener,noreferrer,width=600,height=700")` 
- `noopener` sets `window.opener` to null in the popup
- The callback HTML at `/api/connector/oauth/callback` checks `if (window.opener)` to postMessage back
- With `noopener`, this check fails, so the popup shows "Connecting..." forever
- **Fix**: Removed `noopener,noreferrer`, use named window `"oauth_popup"`

### Bug 2: Mobile popup blocking
- **Problem**: On iOS Safari, `window.open()` from async callback (tRPC mutation onSuccess) is blocked
- User sees "This site is attempting to open a pop-up window" dialog
- Even if allowed, the popup may not work well on mobile
- **Fix**: Detect mobile via userAgent, use `window.location.href` redirect instead of popup
- Server callback page now falls back to same-window redirect with origin from state

### Bug 3: Callback redirect URL missing origin
- **Problem**: When `window.opener` is null, callback redirects to `/connectors?code=...` (relative)
- In mobile same-window flow, this works fine
- But the origin needs to be preserved for cross-domain scenarios
- **Fix**: Parse origin from base64url state parameter, use it in redirect URL

## Fixes Applied
1. ConnectorsPage.tsx: Mobile detection → same-window redirect, desktop → popup without noopener
2. server/_core/index.ts: buildOAuthCallbackHtml now extracts origin from state for redirect
3. Added useRef import for popup tracking

## Verification
- TS: 0 errors
- Vitest: 902 tests passing
- Server logs show no GitHub OAuth errors (the errors were client-side)
