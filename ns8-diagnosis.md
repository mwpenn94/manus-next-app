# NS8 GitHub OAuth Diagnosis

## Root Cause

**ENV VAR NAME MISMATCH**: The platform injects `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`, but the code looks for `GITHUB_OAUTH_CLIENT_ID` and `GITHUB_OAUTH_CLIENT_SECRET`.

### Evidence
- `env | grep GITHUB` shows: `GITHUB_CLIENT_ID=***`, `GITHUB_CLIENT_SECRET=***`
- `server/_core/env.ts` declares: `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`
- `server/connectorOAuth.ts` line 44: `env.GITHUB_OAUTH_CLIENT_ID` → empty string
- `server/connectorOAuth.ts` line 278: `isOAuthSupported("github")` checks `env.GITHUB_OAUTH_CLIENT_ID && env.GITHUB_OAUTH_CLIENT_SECRET` → both empty → returns false
- `server/routers.ts` line 1018: `isOAuthSupported(input.connectorId)` returns false → returns `{ supported: false }`
- Frontend receives `{ supported: false }` → shows "OAuth not configured" toast → falls back to manual API key

## Fix Plan
1. Update `server/_core/env.ts` to map `GITHUB_CLIENT_ID` → `GITHUB_OAUTH_CLIENT_ID` (use the actual env var name)
2. OR: Change `connectorOAuth.ts` to use `GITHUB_CLIENT_ID` directly

Best approach: Update env.ts to read from the correct env var names that the platform actually injects.
The platform injects `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` (not `GITHUB_OAUTH_CLIENT_ID`).
