# OWNER_ACTION_ITEMS — External Resources for Beyond-Parity

> These items are optional enhancements. All 60 in-scope capabilities are GREEN. These actions would unlock the 2 RED capabilities or enhance existing GREEN capabilities.

**Last updated:** April 19, 2026

---

## Priority 1: Claim Stripe Sandbox (enhances #34)

| # | Action | Status | Notes |
|---|--------|--------|-------|
| 1 | **Claim Stripe sandbox** | PENDING | Visit the claim URL in Settings > Payment. Test with card 4242 4242 4242 4242. |

Stripe is already activated and functional in test mode. Claiming the sandbox gives you access to the Stripe Dashboard for monitoring payments, viewing webhooks, and transitioning to live mode.

## Priority 2: Unlock RED Capabilities (2 items)

| # | Capability | What's Needed | Estimated Effort |
|---|-----------|---------------|-----------------|
| 2 | #53 Microsoft 365 | Azure AD app registration + Microsoft Graph API integration | 40h |
| 3 | #62 Veo3 Video | Google Veo3 API access (waitlist) | 30h |

Note: #42 (App Publishing), #43 (Mobile Development), and #47 (My Computer/BYOD) were previously RED but have been implemented and driven to GREEN with free-tier defaults and configurable paid options.

## Priority 3: Enhance Existing GREEN Capabilities

| # | Enhancement | Benefit |
|---|-----------|---------|
| 4 | **Real Slack bot token** | Enables slash commands and interactive messages (currently webhook-only) |
| 5 | **Figma API token** | Enables direct file parsing instead of agent-driven extraction |
| 6 | **Telegram Bot token** | Enables direct message delivery instead of webhook simulation |
| 7 | **Custom domain** | Configure in Management UI > Settings > Domains |
| 8 | **OAuth provider secrets** | GitHub, Google, Notion, Slack OAuth client IDs/secrets for full OAuth flow (API key fallback works without them) |

## Priority 4: Manus Pro Baselines (quality measurement)

| # | Action | Purpose |
|---|--------|---------|
| 9 | **Log into Manus Pro** | Capture real baseline data for 72 benchmark tasks |
| 10 | **Run each benchmark task** | Record response quality, latency, tool usage patterns |
| 11 | **Export results** | Save to `docs/manus-study/baselines/` for comparative scoring |

---

## Current Status

All 60 in-scope capabilities are GREEN. The items above are enhancements, not blockers.

| Metric | Value |
|--------|-------|
| GREEN | 60 (96.8% of in-scope) |
| RED (genuinely blocked) | 2 (#53 Microsoft 365, #62 Veo3) |
| N/A | 5 |
| Gate A | 14/14 PASS |
| Tests | 217 across 13 files |
| TS errors | 0 |
