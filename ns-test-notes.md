# Next Steps Test Notes

## NS-1: Stripe Checkout Flow
- Billing page loads correctly with 4 products displayed
- Usage stats show real data (14 tasks, 8 completed, 2 running, 0 errors, 57% completion)
- Products: Pro Monthly $39/mo, Pro Yearly $374/yr, Team Monthly $99/mo, 100 Credits $10
- Test card hint shown at bottom: "Test with card 4242 4242 4242 4242"
- Subscribe/Buy buttons visible and functional
- Env vars: All 3 Stripe keys confirmed set (sk_test, pk_test, whsec)
- Products API: Returns 4 products with correct prices
- Webhook: Signature verification works correctly
- Checkout session: Requires real OAuth session (expected — SDK verifies against OAuth server)
- VERDICT: Stripe integration is fully wired. Clicking Subscribe opens Stripe Checkout in new tab.

## NS-1 ISSUE FOUND: Checkout fails with "Invalid email address: Kxu5vNQUbDfRdbuLbAN34X"
- The user's openId is being passed as the email address
- In routers.ts line 1825: `userEmail: ctx.user.openId ?? ""`
- Should be: `userEmail: ctx.user.email ?? ctx.user.openId ?? ""`
- The openId is a hash, not an email — Stripe rejects it
- FIX NEEDED: Use ctx.user.email field instead

## NS-1 RESULT: STRIPE CHECKOUT FLOW — SUCCESS
- Stripe Checkout page opens successfully in new tab
- Shows: "Subscribe to Manus Next Pro (Monthly) $39.00 per month"
- Product details: "Full access to all agent capabilities, unlimited tasks, priority execution"
- Email pre-filled: mwpenn94@gmail.com (correct — using user's actual email)
- Payment methods: Card, Cash App Pay, Klarna, Bank
- Promotion code field available
- Sandbox badge visible
- "Billed monthly" shown correctly
- Total due today: $39.00
- VERDICT: Stripe checkout flow works end-to-end. Email fix resolved the issue.
