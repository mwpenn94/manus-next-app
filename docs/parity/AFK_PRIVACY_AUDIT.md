# AFK Privacy Audit

Per §L.24: per-automation-surface privacy compliance log.

## Automation Surfaces Audited

| Surface | PII Risk | Mitigation | Last Audit | Status |
|---------|----------|------------|------------|--------|
| Agent chat messages | Medium — user input may contain PII | Messages stored in DB with user-scoped access control; no cross-user leakage | 2026-04-22 | PASS |
| Task file attachments | High — uploaded files may contain sensitive data | S3 storage with non-enumerable keys; user-scoped access | 2026-04-22 | PASS |
| LLM API calls | Medium — prompts forwarded to Forge API | Forge API is first-party; no third-party LLM providers without consent | 2026-04-22 | PASS |
| Browser automation | High — may capture screenshots with PII | Screenshots stored in user-scoped S3; auto-purge after 30 days | 2026-04-22 | PASS |
| Stripe webhooks | High — payment data | Only Stripe resource IDs stored locally; no card numbers, CVV, or full payment details | 2026-04-22 | PASS |
| Analytics tracking | Low — UV/PV only | No personally identifiable analytics; aggregate counts only | 2026-04-22 | PASS |
| Session cookies | Medium — auth tokens | httpOnly + secure + sameSite=Lax; JWT with expiration | 2026-04-22 | PASS |
| Database queries | Medium — user data in DB | All queries scoped to authenticated user; admin procedures gated by role | 2026-04-22 | PASS |
| Git commits | Low — code changes only | No PII in committed code; .gitignore excludes .env and secrets | 2026-04-22 | PASS |
| Scheduled tasks | Medium — user-defined prompts | Prompts stored encrypted in DB; execution scoped to task owner | 2026-04-22 | PASS |

## Summary

**Surfaces audited:** 10
**PASS:** 10
**FAIL:** 0
**Remediation needed:** None

**Last updated:** 2026-04-22 Session 4
