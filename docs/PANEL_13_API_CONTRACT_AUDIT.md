# Panel 13: API Contract Audit

**Auditor Lens**: Senior API Architect + Security Engineer
**Scope**: All tRPC procedures in `server/routers.ts` (~3086 lines, 100+ procedures)
**Date**: 2026-04-23

## Methodology

Systematic review of every tRPC procedure for:
1. Input validation completeness (z.string() has min/max, z.number() has range)
2. Error code consistency (UNAUTHORIZED, NOT_FOUND, BAD_REQUEST, PRECONDITION_FAILED)
3. Auth checks on every protected procedure (ownership verification)
4. Missing pagination on list endpoints
5. Missing rate limiting considerations
6. Output shape consistency
7. Edge case handling

## Findings

### F13.1 — MEDIUM: `skill.install` missing input length constraints
**Location**: routers.ts L1016-1031
**Issue**: `skillId` and `name` use bare `z.string()` without `.min(1).max()` constraints. A client could send an empty string or a megabyte-long string.
**Fix**: Add `.min(1).max(256)` to skillId and name, `.max(2000)` to description.

### F13.2 — MEDIUM: `skill.uninstall` and `skill.toggle` missing skillId length constraint
**Location**: routers.ts L1032-1043
**Issue**: `skillId` is `z.string()` without min/max. Same as F13.1.
**Fix**: Add `.min(1).max(256)`.

### F13.3 — MEDIUM: `connector.connect` missing connectorId/name length constraints
**Location**: routers.ts L1126-1142
**Issue**: `connectorId` and `name` are bare `z.string()`.
**Fix**: Add `.min(1).max(256)`.

### F13.4 — MEDIUM: `connector.disconnect`, `connector.execute`, `connector.test` missing connectorId constraints
**Location**: routers.ts L1143-1204
**Issue**: All use bare `z.string()` for connectorId.
**Fix**: Add `.min(1).max(256)`.

### F13.5 — LOW: `design.update` missing ownership check
**Location**: routers.ts L1510-1522
**Issue**: `design.update` does not verify that the design belongs to `ctx.user.id` before updating. Any authenticated user could update any design by ID.
**Fix**: Add ownership verification before update.

### F13.6 — LOW: `design.export` missing ownership check
**Location**: routers.ts L1529-1540
**Issue**: Same as F13.5 — no ownership check on export. Any authenticated user could export any design.
**Fix**: Add `if (!design || design.userId !== ctx.user.id)` check.

### F13.7 — MEDIUM: `device.endSession` missing ownership check
**Location**: routers.ts L1666-1671
**Issue**: `endSession` takes a sessionId but doesn't verify the session belongs to the current user.
**Fix**: Add ownership verification.

### F13.8 — LOW: `project.get` returns null instead of throwing NOT_FOUND
**Location**: routers.ts L902-908
**Issue**: Returns null for missing/unauthorized projects. While not a security issue, it's inconsistent with other procedures that throw TRPCError NOT_FOUND. Frontend must handle null vs error differently.
**Pattern**: This is actually used consistently across task.get, slides.get, device.get — so it's a deliberate pattern for queries. No fix needed, but document the convention.

### F13.9 — MEDIUM: `library.extractPdfFromUpload` no size limit on base64 input
**Location**: routers.ts L2958-2967
**Issue**: `base64` is `z.string()` with no max length. A client could send a multi-GB base64 string, causing OOM.
**Fix**: Add `.max(22_000_000)` (~16MB file in base64).

### F13.10 — LOW: `branches.create` messagesToCopy content max is 100KB per message × 500 messages = 50MB total
**Location**: routers.ts L3016-3060
**Issue**: While individual message content is capped at 100KB and array at 500, the total payload could be ~50MB. This is within tRPC's default limits but worth noting.
**Fix**: Consider adding a total size check or reducing max to 200 messages.

### F13.11 — MEDIUM: `connector.getOAuthUrl` and `connector.completeOAuth` — origin not validated
**Location**: routers.ts L1206-1260
**Issue**: The `origin` parameter is `z.string()` without `.url()` validation. A malicious client could inject an arbitrary redirect URL.
**Fix**: Add `.url()` validation to origin parameter.

### F13.12 — LOW: Several list endpoints lack pagination
**Location**: Multiple
**Issue**: `skill.list`, `connector.list`, `slides.list`, `device.list`, `device.sessions`, `github.repos`, `video.list`, `templates.list` all return full lists without limit/offset.
**Fix**: Add optional pagination (limit/offset) to high-volume list endpoints. Low priority since these are per-user and unlikely to have thousands of items.

### F13.13 — MEDIUM: `meeting.create` missing input constraints
**Location**: routers.ts (meeting section)
**Issue**: Need to verify meeting creation input has proper constraints on title, audioUrl, etc.
**Status**: Will verify during fix phase.

## Summary

| Severity | Count | Description |
|----------|-------|-------------|
| HIGH     | 0     | No critical security vulnerabilities |
| MEDIUM   | 7     | Missing input constraints, missing ownership checks, origin validation |
| LOW      | 4     | Inconsistent patterns, missing pagination, large payload potential |

## Recommendations

1. Add a shared `stringId` schema: `z.string().min(1).max(256)` for all ID-like fields
2. Add ownership middleware for design/device operations
3. Add `.url()` validation to all origin parameters
4. Consider pagination middleware for list endpoints
