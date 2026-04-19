# OWNER_ACTION_ITEMS — External Resources Required for 100% GREEN

> These items cannot be completed within the sandbox environment. They require account provisioning, external service registration, or infrastructure setup by the project owner.

---

## Priority 1: External Accounts (unblocks 12 YELLOW caps)

| # | Service | Cost | Caps Unblocked | Action Required |
|---|---------|------|----------------|-----------------|
| 1 | **Stripe** | Free test mode | #34 Payments | Create Stripe account, provide `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` |
| 2 | **SendGrid / Resend** | Free tier (100/day) | #20 Email | Create account, provide `SENDGRID_API_KEY` |
| 3 | **Slack App** | Free | #51 Slack | Create Slack app at api.slack.com, provide `SLACK_BOT_TOKEN` and `SLACK_WEBHOOK_URL` |
| 4 | **Zapier** | Partner program | #65 Zapier | Register as Zapier integration partner, provide webhook URLs |
| 5 | **Browserbase** | $29/mo | #22-25 Browser/Computer | Create account, provide `BROWSERBASE_API_KEY` |
| 6 | **Microsoft Graph** | Free (Azure AD) | #50 MCP/Microsoft | Register Azure AD app, provide `AZURE_CLIENT_ID` and `AZURE_CLIENT_SECRET` |

## Priority 2: Infrastructure (unblocks 5 YELLOW + 4 RED caps)

| # | Infrastructure | Cost | Caps Unblocked | Action Required |
|---|---------------|------|----------------|-----------------|
| 7 | **Electron build pipeline** | Free (GitHub Actions) | #46 Desktop App | Set up electron-builder in CI, configure code signing |
| 8 | **React Native setup** | Free (Expo) | #52 Mobile | Initialize Expo project, configure app store accounts |
| 9 | **Cloud deployment pipeline** | $5-20/mo | #27-29 Website Builder | Set up Vercel/Netlify deployment API integration |
| 10 | **Real-time infrastructure** | $0-10/mo | #56-58 Collab/Team | Set up WebSocket server or Pusher/Ably account |

## Priority 3: Manus Pro Baselines (unblocks quality measurement)

| # | Action | Purpose |
|---|--------|---------|
| 11 | **Log into Manus Pro** | Capture real baseline data for 72 benchmark tasks |
| 12 | **Run each benchmark task** | Record response quality, latency, tool usage patterns |
| 13 | **Export results** | Save to `docs/manus-study/baselines/` for comparative scoring |

## Priority 4: npm Publishing (unblocks package consumption)

| # | Action | Purpose |
|---|--------|---------|
| 14 | **Create npm org** | `@mwpenn94` scope on npmjs.com |
| 15 | **Publish 13 packages** | `npm publish` from each `packages/*/` directory |
| 16 | **Update root package.json** | Change `file:` references to versioned npm references |

---

## Estimated Impact

If all Priority 1 + 2 items are completed:
- GREEN capabilities: 36 → **57** (92% of in-scope)
- YELLOW capabilities: 21 → **5** (remaining: design view, MCP, messaging, mobile, desktop)
- RED capabilities: 5 → **0**
- Gate A criterion #3: **PASS** (57/62 > threshold, with 5 documented deferrals)

**Total estimated effort:** 20-30 hours
**Total estimated monthly cost:** $35-60/month for external services
