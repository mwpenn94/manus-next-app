# TIER_LAUNCHES — manus-next-app

> Tracks capability tier launches and promotion history.

## Tier Definitions

| Tier | Description | Criteria |
|---|---|---|
| GREEN | Fully implemented + tested | LLM judge score ≥0.80, tests pass, no stubs |
| YELLOW | Partially implemented | Some functionality, needs completion |
| RED | Not implemented | Blocked or out of scope |
| N/A | Platform-only | Requires Manus infrastructure not available in webapp |

## Current Distribution (2026-04-22)

**Source of truth:** `packages/eval/capabilities/*.yaml` status fields (67 total capabilities)

| Tier | Count | Percentage |
|---|---|---|
| GREEN | 18 | 27% |
| YELLOW | 12 | 18% |
| RED | 32 | 48% |
| N/A | 5 | 7% |

## GREEN Capabilities (18)

All 18 GREEN capabilities pass LLM judge scoring ≥0.80:

| # | Capability | Launch Date | Trigger |
|---|---|---|---|
| 1 | chat-mode | 2026-04-17 | Initial chat implementation |
| 2 | agent-mode-long-running | 2026-04-18 | SSE streaming + auto-continuation |
| 3 | max-tier-routing | 2026-04-19 | 4-tier model architecture |
| 4 | speed-quality-mode | 2026-04-19 | Speed/Quality/Max/Limitless modes |
| 5 | wide-research | 2026-04-18 | Multi-source research tool |
| 6 | cross-session-memory | 2026-04-18 | Task persistence in DB |
| 7 | task-sharing | 2026-04-18 | Share task via external ID |
| 8 | task-replay | 2026-04-18 | Replay task message history |
| 9 | event-notifications | 2026-04-18 | Creator notification system |
| 11 | projects | 2026-04-18 | Project/task management |
| 17 | scheduled-tasks | 2026-04-19 | Scheduled task execution |
| 32 | access-control | 2026-04-17 | Manus OAuth + role-based access |
| 33 | creator-notifications | 2026-04-18 | notifyOwner helper |
| 37 | built-in-seo | 2026-04-18 | Meta tags, OG, robots.txt |
| 45 | mobile-responsive | 2026-04-18 | Responsive Tailwind layout |
| 59 | voice-tts | 2026-04-19 | Text-to-speech pipeline |
| 60 | voice-stt | 2026-04-19 | Speech-to-text pipeline |
| 61 | document-generation | 2026-04-18 | Document creation tools |

## YELLOW Capabilities (12 — Promotion Candidates)

| # | Capability | Blocker | Promotion Path |
|---|---|---|---|
| 10 | one-shot-success | Requires higher first-attempt accuracy | Improve prompt engineering |
| 15 | design-view | Needs visual design preview | Implement design renderer |
| 18 | data-analysis | Partial — needs chart generation | Add chart rendering pipeline |
| 19 | multimedia-processing | Video/audio pipeline incomplete | Forge API integration |
| 26 | sandbox-runtime | Partial sandbox emulation | Expand runtime capabilities |
| 30 | built-in-ai | Partial LLM integration | Expand model selection |
| 31 | cloud-infrastructure | Partial S3/DB | Expand cloud services |
| 35 | project-analytics | Basic metrics only | Add detailed analytics |
| 38 | code-control | Partial git integration | Expand version control |
| 40 | third-party-integrations | Limited to Stripe | Add more integrations |
| 41 | github-integration | Basic sync only | Add PR/issue management |
| 48 | version-rollback | Checkpoint-based only | Add granular rollback |

## RED Capabilities (32)

These capabilities are not yet implemented. See PARITY_BACKLOG.md for prioritized implementation plan.

## N/A Capabilities (5)

Platform-only capabilities that require Manus infrastructure not replicable in a standalone webapp.
