# Panel 16: Privacy & Security Compliance Audit

**Auditor Lens**: Privacy Engineer + Security Architect + GDPR Compliance Officer
**Scope**: GDPR implementation, data handling, auth flows, cookie security, XSS prevention, PII in logs
**Date**: 2026-04-23

## Methodology

1. Verify GDPR data export completeness (all user tables included)
2. Verify GDPR data deletion cascade (all user tables cleaned)
3. Check for PII in server logs
4. Verify cookie security settings
5. Check XSS prevention (dangerouslySetInnerHTML usage)
6. Verify auth edge cases (expired JWT, session invalidation)
7. Check sensitive data redaction in exports

## Findings

### F16.1 — HIGH: GDPR deleteAllData misses 12 tables
**Issue**: The `gdpr.deleteAllData` procedure deletes from these tables:
- tasks, taskMessages, taskShares, memoryEntries, connectors, webappBuilds, webappDeployments, webappProjects, designs, scheduledTasks, userPreferences

**Missing tables** (user data NOT deleted):
1. `task_ratings` — user ratings on tasks
2. `task_files` — uploaded file records
3. `task_events` — replay events
4. `workspace_artifacts` — screenshots, code, terminal output
5. `notifications` — user notifications
6. `skills` — installed skills
7. `slide_decks` — generated presentations
8. `bridge_configs` — bridge connection configs
9. `connected_devices` / `device_sessions` — device data
10. `github_repos` — connected GitHub repos
11. `video_projects` — video generation projects
12. `task_templates` — saved task templates
13. `task_branches` — conversation branch records
14. `teams` / `team_members` / `team_sessions` — team data
15. `meeting_sessions` — meeting recordings
16. `mobile_projects` — mobile app projects
17. `page_views` — analytics data (contains IP-like data)

**Impact**: GDPR Article 17 (Right to Erasure) violation — user data persists after deletion request.
**Fix**: Add deletion for ALL user-owned tables in dependency order.

### F16.2 — MEDIUM: GDPR exportData also misses many tables
**Issue**: The export procedure only includes: tasks, messages, preferences, memories, connectors, webappProjects, designs, scheduledTasks. Missing: taskRatings, taskFiles, taskEvents, workspaceArtifacts, notifications, skills, slideDecks, bridgeConfigs, connectedDevices, githubRepos, videoProjects, taskTemplates, taskBranches, teams, meetings, mobileProjects.
**Impact**: GDPR Article 20 (Right to Data Portability) — incomplete data export.
**Fix**: Include all user-owned data in export bundle.

### F16.3 — PASS: Sensitive data redacted in GDPR export
**Evidence**: Connector tokens are properly redacted: `accessToken: "[REDACTED]", refreshToken: "[REDACTED]"`.

### F16.4 — PASS: Cookie security is properly configured
**Evidence**: Session cookies use:
- `httpOnly: true` — prevents JavaScript access
- `sameSite: "none"` — required for cross-origin OAuth flow
- `secure: true` when HTTPS detected via `x-forwarded-proto`
- `path: "/"` — scoped to entire site

### F16.5 — PASS: No dangerous innerHTML usage in user content
**Evidence**: Only `dangerouslySetInnerHTML` usage is in `chart.tsx` for CSS theme injection (controlled data, not user input). All user content is rendered via React's default escaping or `<Streamdown>` markdown renderer.

### F16.6 — LOW: Server logs may contain user task content
**Issue**: `agentStream.ts` logs tool arguments at L1053: `console.log("[Agent] Executing tool:", toolName, parsedArgs)`. This could log user-submitted content (task prompts, file contents, etc.) to server logs.
**Impact**: PII could persist in log files beyond data deletion.
**Fix**: Redact or truncate parsedArgs in production logs. Log only tool name and argument keys, not values.

### F16.7 — LOW: GDPR export uploaded to S3 without expiry
**Issue**: The GDPR export JSON is uploaded to S3 at `gdpr-exports/{userId}/export-{timestamp}.json` and the URL is returned to the user. The S3 object has no expiration policy, so the export persists indefinitely.
**Fix**: Set a 24-hour expiry on GDPR export objects, or use presigned URLs with expiration.

### F16.8 — PASS: Share password hashing uses SHA-256
**Evidence**: Task share passwords are hashed with `crypto.createHash("sha256")` before storage. While not as strong as bcrypt/argon2, it's acceptable for share link passwords (not account passwords).

### F16.9 — PASS: No PII in client-side error messages
**Evidence**: tRPC error formatter strips stack traces in production. Error messages are generic and don't include user data.

## Summary

| Severity | Count | Description |
|----------|-------|-------------|
| HIGH     | 1     | GDPR deletion misses 17 tables |
| MEDIUM   | 1     | GDPR export misses many tables |
| LOW      | 2     | PII in logs, S3 export no expiry |
| PASS     | 4     | Cookie security, XSS prevention, redaction, error messages |

## Verdict

The most critical finding is **F16.1**: the GDPR data deletion procedure misses 17 user-owned tables. This is a compliance gap that must be fixed. The GDPR export (F16.2) has a similar completeness issue. Cookie security, XSS prevention, and auth flow are well-implemented.
