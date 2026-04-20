# Owner Action Items — Final (Post-Prompt-42)

**Generated:** 2026-04-20T02:58 UTC  
**Status:** DEEPER META-CONVERGENCE achieved  

---

## Immediate (P0 — Do Now)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 1 | **Publish** — click Publish in Management UI to deploy all changes | 1 min | Deploys OAuth fix, image validation, video page, style persistence, bundle optimization |
| 2 | **Test GitHub OAuth** — after publishing, go to Connectors → GitHub → Connect → OAuth and verify redirect to GitHub authorization page | 5 min | Validates NS8 env var fix end-to-end |

---

## Short-Term (P1 — This Week)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 3 | **Test image generation** — create a task, generate an image, verify the URL loads permanently (not AccessDenied) | 5 min | Validates NS10 URL validation + S3 re-upload |
| 4 | **Test style preferences** — in a task, say "use flat top-down style for all images" then generate 3+ images and verify style carries through | 10 min | Validates NS10 extractSessionStylePreferences() |
| 5 | **Claim Stripe sandbox** — visit the claim URL before 2026-06-18 to activate test payment environment | 5 min | Enables payment testing with 4242 card |

---

## Medium-Term (P2 — This Month)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 6 | **Azure AD app** — create Azure AD app registration for Microsoft 365 connector, provide CLIENT_ID/SECRET via Settings → Secrets | 30 min | Activates #53 from YELLOW → GREEN |
| 7 | **Google/Slack/Notion OAuth** — create OAuth apps on each platform and add credentials | 1 hr each | Enables OAuth flow for remaining connectors |
| 8 | **Custom domain** — configure a custom domain via Settings → Domains if desired | 15 min | Professional branding |

---

## Long-Term (P3 — Backlog)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 9 | **Veo3 API key** — when Google Veo3 API becomes publicly available, add VEO3_API_KEY | 15 min | Activates #62 from YELLOW → GREEN |
| 10 | **Stripe live keys** — after KYC verification, enter live keys in Settings → Payment | 30 min | Enables real payments |
| 11 | **Dependency updates** — run `pnpm audit fix` periodically to address transitive vulnerabilities | 15 min | Security hygiene |

---

## Already Completed (No Action Needed)

| Item | Status |
|------|--------|
| Bundle optimization (985KB → 291KB) | DONE |
| GitHub OAuth env var fix | DONE |
| Image AccessDenied fix | DONE |
| Style preference auto-injection | DONE |
| Agent anti-auto-demonstration guard | DONE |
| File upload UX improvement | DONE |
| ReplayPage error state | DONE |
| Dead code cleanup (AppLayout) | DONE |
| All 84 parity artifacts | DONE |
| 305 tests passing | DONE |
