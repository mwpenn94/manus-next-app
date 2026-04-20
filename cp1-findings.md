# Convergence Pass 1 Findings

## TypeScript: CLEAN (0 errors)
## Tests: CLEAN (254/254 passing, 15 files)

## Log Analysis

### Browser Console
- axe-core accessibility advisory: "Some page content is not contained by landmarks" — this is a dev-only advisory from @axe-core/react, not a runtime error. It's about ARIA landmark regions. Low priority but worth noting.

### Network Errors
- **payment.createCheckout 500**: "Invalid email address: Kxu5vNQUbDfRdbuLbAN34X" — Stripe checkout fails because the user's email in the DB is their Manus OpenID (not a real email). This is a real bug — when creating a Stripe checkout session, we pass `customer_email` which is the user's Manus ID, not their actual email.
  - **SEVERITY: MEDIUM** — Affects billing page checkout flow
  - **FIX NEEDED**: Don't pass customer_email if it's not a valid email format

### Dev Server Errors
- **Scheduler Poll error**: "Failed query: select ... from scheduled_tasks" — The scheduled_tasks table doesn't exist in the DB yet. Need to run `pnpm db:push`.
  - **SEVERITY: LOW** — Scheduler is a background feature, error is suppressed after first occurrence
  - **FIX NEEDED**: Run db:push to create the table, or make scheduler gracefully handle missing table

- **trust proxy warning**: Already addressed — stale log from before restart
- **@db/schema import error**: Already fixed — stale log from a previous server startup

## Issues Requiring Fix
1. **Stripe checkout email validation** — customer_email receives Manus OpenID instead of email
2. **Scheduler table missing** — needs db:push or graceful handling

## Verdict: NOT CLEAN — 2 issues found, counter resets to 0
