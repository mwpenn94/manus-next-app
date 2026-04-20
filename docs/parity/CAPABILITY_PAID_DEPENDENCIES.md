# CAPABILITY_PAID_DEPENDENCIES — Manus Next v9

**Spec version:** v9 | **Audit date:** April 20, 2026

> Flags every capability that has a paid dependency at any tier, with the free-tier workaround and the trigger that would force a paid upgrade.

---

## Capabilities with Zero Paid Dependencies (Free Forever)

These capabilities use only Manus platform built-ins or browser APIs and will never require a paid service:

| # | Capability | Free Provider |
|---|-----------|---------------|
| 1 | Chat Mode | Manus invokeLLM + SSE |
| 2 | Agent Mode | Manus invokeLLM + tool loop |
| 3 | 1.6 Max tier | Mode toggle (client-side) |
| 4 | Speed/Quality Mode | Mode toggle (client-side) |
| 6 | Cross-session memory | Manus TiDB |
| 7 | Task sharing | Manus TiDB + signed URLs |
| 8 | Task replay | Manus TiDB + event log |
| 9 | Notifications | Manus TiDB + notifyOwner |
| 10 | One-shot success | Client-side cost indicator |
| 11 | Projects | Manus TiDB |
| 17 | Scheduled Tasks | Server-side polling + TiDB |
| 26 | Sandbox runtime | Server-side eval |
| 30 | Built-in AI | Manus invokeLLM + generateImage |
| 31 | Cloud Infrastructure | Manus hosting |
| 32 | Access Control | Manus OAuth |
| 33 | Creator notifications | notifyOwner |
| 35 | Project Analytics | Manus Analytics |
| 36 | Custom Domains | Manus Management UI |
| 37 | Built-in SEO | HTML meta tags |
| 38 | Code Control | GitHub sync (free) |
| 41 | GitHub Integration | GitHub OAuth (free) |
| 45 | Mobile-responsive UI | CSS/Tailwind |
| 48 | Version rollback | Manus checkpoints |
| 56 | Manus Collab | Manus TiDB |
| 57 | Team billing | Manus TiDB |
| 58 | Shared session | Manus TiDB |
| 59 | Voice TTS | Browser SpeechSynthesis |
| 60 | Voice STT | Manus transcribeAudio |
| 66 | Maps | Manus Google Maps proxy |
| 67 | Data API | Manus Data API |

**Count: 30 capabilities** — zero paid dependencies at any usage level.

---

## Capabilities with Potential Paid Dependencies

These capabilities currently work for free but may require paid services at scale:

| # | Capability | Free Tier | Paid Trigger | Paid Provider | Est. Cost |
|---|-----------|-----------|--------------|---------------|-----------|
| 5 | Wide Research | DDG scraping | >100 queries/day | SerpAPI $50/mo | Low |
| 12 | Manus Skills | LLM-powered execution | Need specialized models | OpenRouter pay-per-use | Low |
| 13 | Agent Skills | Skill library | Need marketplace hosting | npm registry (free) | None |
| 14 | Project Skills | Skill execution | Same as #12 | Same as #12 | Low |
| 15 | Design View | Canvas + AI gen | Need vector editing | Fabric.js (free OSS) | None |
| 16 | Slides | LLM HTML slides | Need PPTX export | PptxGenJS (free OSS) | None |
| 18 | Data Analysis | execute_code tool | Need Python runtime | E2B $0 (100hr free) | Low |
| 19 | Multimedia | Image gen + voice | Need video gen | Replicate $0.05/video | Low |
| 20 | Mail Manus | notifyOwner | Need user-facing email | Resend $0 (100/day free) | Low |
| 21 | Meeting Minutes | Whisper transcription | Need real-time STT | AssemblyAI $0.01/min | Low |
| 22 | Cloud Browser | LLM-simulated | Need real browser | Browserbase $0 (100 sessions free) | Low |
| 23 | Browser Operator | LLM tools | Same as #22 | Same as #22 | Low |
| 24 | Screenshot verify | Vision analysis | Need real screenshots | Same as #22 | Low |
| 25 | Computer Use | Virtual desktop | Need real VM | Fly Machines $0.01/hr | Low |
| 27 | Web-app creation | Agent-powered | Need deployment | Manus hosting (free) | None |
| 28 | Live preview | iframe preview | Need hot reload | Manus hosting (free) | None |
| 29 | Publishing | S3 deploy | Need CDN | Manus CDN (free) | None |
| 34 | Payments | Stripe sandbox | Need live payments | Stripe 2.9%+$0.30/txn | Variable |
| 39 | Figma Import | URL parser + LLM | Need direct API | Figma API (free personal) | None |
| 40 | Third-party integrations | Connector framework | Need specific APIs | Varies by integration | Variable |
| 42 | App Publishing | Config generation | Need actual builds | EAS Build $0 (30/mo free) | Low |
| 43 | Mobile Development | PWA + config gen | Need native builds | EAS Build $0 (30/mo free) | Low |
| 46 | Desktop App | Tauri config gen | Need compiled binaries | GitHub Actions (free 2K min) | None |
| 47 | My Computer | WebSocket relay | Need NAT traversal | Cloudflare Tunnel (free) | None |
| 49 | Connectors | Webhook framework | Need specific APIs | Varies | Variable |
| 50 | MCP | Webhook protocol | Need MCP servers | Self-hosted (free) | None |
| 51 | Slack | Webhook execution | Need Slack app | Slack API (free) | None |
| 52 | Messaging Agent | Webhook bridge | Need official APIs | Twilio $0.005/msg | Low |
| 53 | Microsoft 365 | Azure AD OAuth scaffold | Need Graph API | Graph API (free tier) | None |
| 61 | Document gen | generate_document tool | Need complex layouts | Puppeteer (free OSS) | None |
| 62 | Video gen | FFmpeg slideshow | Need AI video | Replicate $0.05/video | Low |
| 65 | Zapier | Webhook connector | Need Zapier account | Zapier $0 (100 tasks/mo free) | Low |

**Count: 32 capabilities** — all have free-tier workarounds, paid only at scale.

---

## Risk Assessment

| Risk Level | Count | Description |
|-----------|-------|-------------|
| No risk | 30 | Zero paid dependencies ever |
| Low risk | 27 | Free tier sufficient for MVP; paid only at >1K users |
| Medium risk | 4 | May need paid tier for production quality (#34 Stripe, #22-24 Browser, #25 Computer) |
| High risk | 1 | #34 Stripe — inherently requires transaction fees for live payments |

**Total current monthly cost: $0.00** — All 62 in-scope capabilities operate at zero cost.
