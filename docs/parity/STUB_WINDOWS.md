# STUB_WINDOWS — Stub Implementation Windows & Upgrade Paths

> Documents every stub/mock/simulated implementation in Manus Next, with clear upgrade paths to production-grade implementations.

**Date:** 2026-04-19 | **Version:** v8.4

---

## What Is a Stub Window?

A **stub window** is a period during which a capability uses a simulated, mocked, or partial implementation instead of a full production backend. Each stub has:

1. **Current behavior** — what the user sees today
2. **Limitation** — what doesn't work
3. **Upgrade trigger** — what external resource or decision unblocks the real implementation
4. **Estimated effort** — time to upgrade once unblocked

---

## Active Stub Windows

### SW-001: Computer Use (#25)
| Aspect | Detail |
|--------|--------|
| Current | Bridge package stub with architecture documentation |
| Limitation | No actual desktop OS control (mouse/keyboard/screen) |
| Upgrade trigger | Tauri or Electron build pipeline with OS-level permissions |
| Estimated effort | 40-60 hours (native app build + OS integration) |
| Priority | Medium — most users interact via browser |

### SW-002: Stripe Payments (#34)
| Aspect | Detail |
|--------|--------|
| Current | BillingPage.tsx with plan cards and usage display |
| Limitation | No actual payment processing |
| Upgrade trigger | Owner runs `webdev_add_feature("stripe")` and provides Stripe keys |
| Estimated effort | 2-4 hours (Stripe integration is scaffolded) |
| Priority | High — blocks monetization |

### SW-003: Figma Import (#39)
| Aspect | Detail |
|--------|--------|
| Current | Design View canvas exists with AI image generation |
| Limitation | Cannot import Figma files directly |
| Upgrade trigger | Owner provides Figma API token |
| Estimated effort | 8-16 hours (Figma API → component tree → React) |
| Priority | Medium — design canvas works without Figma |

### SW-004: Desktop App (#46)
| Aspect | Detail |
|--------|--------|
| Current | Bridge package stub, Tauri config documented |
| Limitation | No native desktop application binary |
| Upgrade trigger | Tauri/Electron build pipeline setup |
| Estimated effort | 20-30 hours (native build + auto-update + signing) |
| Priority | Low — web app is fully functional |

### SW-005: Messaging Agent (#52)
| Aspect | Detail |
|--------|--------|
| Current | Architecture documented, connector framework ready |
| Limitation | No WhatsApp/Telegram/SMS integration |
| Upgrade trigger | WhatsApp Business API or Telegram Bot API keys |
| Estimated effort | 16-24 hours (webhook receiver + message routing) |
| Priority | Medium — depends on user demand |

---

## Closed Stub Windows (Upgraded to GREEN)

| ID | Capability | Closed Date | How |
|----|-----------|-------------|-----|
| SW-101 | Skills (#12-14) | 2026-04-19 | skill.execute tRPC with LLM execution |
| SW-102 | Design View (#15) | 2026-04-19 | Canvas with AI image gen + text layers |
| SW-103 | Slides (#16) | 2026-04-19 | slides.generate tRPC with LLM |
| SW-104 | Mail (#20) | 2026-04-19 | send_email agent tool + connector |
| SW-105 | Meeting Minutes (#21) | 2026-04-19 | MeetingsPage + transcript generation |
| SW-106 | Cloud Browser (#22) | 2026-04-19 | cloud_browser agent tool |
| SW-107 | Browser Operator (#23) | 2026-04-19 | browse_web + cloud_browser tools |
| SW-108 | Screenshot Verify (#24) | 2026-04-19 | screenshot_verify agent tool |
| SW-109 | Web App Builder (#27-29) | 2026-04-19 | WebAppBuilderPage with preview + publish |
| SW-110 | Connectors (#49) | 2026-04-19 | connector.execute tRPC |
| SW-111 | MCP (#50) | 2026-04-19 | Webhook-based MCP via connectors |
| SW-112 | Slack (#51) | 2026-04-19 | Slack connector with webhook |
| SW-113 | Collab (#56) | 2026-04-19 | Task sharing + TeamPage |
| SW-114 | Team Billing (#57) | 2026-04-19 | TeamPage with member management |
| SW-115 | Shared Session (#58) | 2026-04-19 | Task sharing via signed URL |
| SW-116 | Zapier (#65) | 2026-04-19 | Zapier connector with webhook |

---

## Stub Window Policy

1. **No stub may persist beyond 2 sprints** without an explicit owner decision to defer
2. **All stubs must have documented upgrade paths** (this file)
3. **Stubs must provide graceful degradation** — user sees informative UI, not errors
4. **Stubs must be tracked in PARITY_BACKLOG.md** as YELLOW status
5. **Closing a stub window requires**: implementation + test + PARITY_BACKLOG update to GREEN
