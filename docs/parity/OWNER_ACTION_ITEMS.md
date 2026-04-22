# OWNER_ACTION_ITEMS — External Resources for Beyond-Parity

> All 72 in-scope capabilities are GREEN. These items are optional enhancements that would further improve quality or unlock production features.

**Last updated:** April 22, 2026

---

## Priority 1: Claim Stripe Sandbox (enhances #34)

| # | Action | Status | Notes |
|---|--------|--------|-------|
| 1 | **Claim Stripe sandbox** | PENDING | Visit the claim URL in Settings > Payment. Test with card 4242 4242 4242 4242. |

Stripe is already activated and functional in test mode. Claiming the sandbox gives you access to the Stripe Dashboard for monitoring payments, viewing webhooks, and transitioning to live mode.

## Priority 2: Production Enhancements

| # | Enhancement | Benefit | Estimated Effort |
|---|-----------|---------|-----------------|
| 2 | **Real Slack bot token** | Enables slash commands and interactive messages (currently webhook-only) | 4h |
| 3 | **Figma API token** | Enables direct file parsing instead of agent-driven extraction | 4h |
| 4 | **Telegram Bot token** | Enables direct message delivery instead of webhook simulation | 4h |
| 5 | **Custom domain** | Configure in Management UI > Settings > Domains | 1h |
| 6 | **OAuth provider secrets** | GitHub, Google, Notion, Slack OAuth client IDs/secrets for full OAuth flow | 8h |
| 7 | **Microsoft 365 integration** | Azure AD app registration + Microsoft Graph API | 40h |
| 8 | **Google Veo3 Video API** | Waitlist access for advanced video generation | 30h |

## Priority 3: Manus Pro Baselines (quality measurement)

| # | Action | Purpose |
|---|--------|---------|
| 9 | **Log into Manus Pro** | Capture real baseline data for 72 benchmark tasks |
| 10 | **Run each benchmark task** | Record response quality, latency, tool usage patterns |
| 11 | **Export results** | Save to `docs/manus-study/baselines/` for comparative scoring |

---

## Current Status

| Metric | Value |
|--------|-------|
| GREEN | 72 (100% of in-scope) |
| YELLOW | 0 |
| RED | 0 |
| N/A | 0 (5 formerly-N/A promoted to GREEN) |
| Gate A | ALL CRITERIA PASS |
| Tests | 1,387 across 57 files |
| TS errors | 0 |
| Judge v9 | 72/72 passing, avg 0.862 |
| Convergence | 3/3 clean (CP-49/50/51) |
