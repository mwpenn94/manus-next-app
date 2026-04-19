# OWNER_ACTION_ITEMS — External Resources for Beyond-Parity

> These items are optional enhancements. All 57 in-scope capabilities are GREEN. These actions would unlock the 5 RED capabilities or enhance existing GREEN capabilities.

**Last updated:** April 19, 2026

---

## Priority 1: Claim Stripe Sandbox (enhances #34)

| # | Action | Status | Notes |
|---|--------|--------|-------|
| 1 | **Claim Stripe sandbox** | PENDING | Visit the claim URL in Settings > Payment. Test with card 4242 4242 4242 4242. |

Stripe is already activated and functional in test mode. Claiming the sandbox gives you access to the Stripe Dashboard for monitoring payments, viewing webhooks, and transitioning to live mode.

## Priority 2: Unlock RED Capabilities (5 items)

| # | Capability | What's Needed | Estimated Effort |
|---|-----------|---------------|-----------------|
| 2 | #42 Mobile Publishing | Capacitor/Expo build pipeline + Apple Developer ($99/yr) + Google Play ($25) | 40h |
| 3 | #43 Mobile Development | React Native/Expo project setup | 60h |
| 4 | #47 My Computer | Container-based virtual desktop runtime (e.g., Kasm, code-server) | 60h |
| 5 | #53 Microsoft 365 | Azure AD app registration + Microsoft Graph API integration | 40h |
| 6 | #62 Veo3 Video | Google Veo3 API access (waitlist) | 30h |

## Priority 3: Enhance Existing GREEN Capabilities

| # | Enhancement | Benefit |
|---|-----------|---------|
| 7 | **Real Slack bot token** | Enables slash commands and interactive messages (currently webhook-only) |
| 8 | **Figma API token** | Enables direct file parsing instead of agent-driven extraction |
| 9 | **Telegram Bot token** | Enables direct message delivery instead of webhook simulation |
| 10 | **Custom domain** | Configure in Management UI > Settings > Domains |

## Priority 4: Manus Pro Baselines (quality measurement)

| # | Action | Purpose |
|---|--------|---------|
| 11 | **Log into Manus Pro** | Capture real baseline data for 72 benchmark tasks |
| 12 | **Run each benchmark task** | Record response quality, latency, tool usage patterns |
| 13 | **Export results** | Save to `docs/manus-study/baselines/` for comparative scoring |

---

## Current Status

All 57 in-scope capabilities are GREEN. The items above are enhancements, not blockers.

| Metric | Value |
|--------|-------|
| GREEN | 57 (100% of in-scope) |
| RED (genuinely blocked) | 5 |
| N/A | 5 |
| Gate A | 14/14 PASS |
