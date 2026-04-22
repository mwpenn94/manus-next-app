# YELLOW Capability Promotion Tracker (§L.33)

**Created:** 2026-04-22T11:35:00Z
**Updated:** 2026-04-22T04:55:00Z
**Purpose:** Track promotion path for YELLOW capabilities to GREEN.
**Source of truth:** `packages/eval/capabilities/*.yaml` — 9 capabilities with `status: YELLOW` (3 promoted to GREEN on 2026-04-22)

## Recently Promoted to GREEN (3)

| # | Capability | Old Score | New Score | Promoted | Reason |
|---|-----------|-----------|-----------|----------|--------|
| 30 | built-in-ai | 0.563 | 0.843 | 2026-04-22 | LLM fully integrated (10 invokeLLM calls), image gen available |
| 35 | project-analytics | 0.455 | 0.843 | 2026-04-22 | Full 367-line recharts analytics dashboard with trends/metrics |
| 41 | github-integration | 0.490 | 0.828 | 2026-04-22 | GitHub sync + dedicated GitHubPage.tsx + 39 router references |

## Remaining YELLOW Capabilities (9)

### #10 one-shot-success
| Attribute | Value |
|-----------|-------|
| Current Status | YELLOW |
| Blocker | Requires higher first-attempt task completion accuracy |
| Missing | Improved prompt engineering, better tool selection heuristics |
| Promotion Criteria | LLM judge score ≥0.80 on one-shot benchmark |

### #15 design-view
| Attribute | Value |
|-----------|-------|
| Current Status | YELLOW |
| Blocker | Visual design preview not implemented |
| Missing | Design renderer, live preview panel |
| Promotion Criteria | User can preview generated designs in-app |

### #18 data-analysis
| Attribute | Value |
|-----------|-------|
| Current Status | YELLOW |
| Blocker | Partial — chart generation pipeline incomplete |
| Missing | Chart rendering (Chart.js/Plotly integration), data visualization |
| Promotion Criteria | Agent can analyze CSV/JSON data and produce charts |

### #19 multimedia-processing
| Attribute | Value |
|-----------|-------|
| Current Status | YELLOW |
| Blocker | Video/audio processing pipeline incomplete |
| Missing | End-to-end pipeline: upload → process → store → serve |
| Promotion Criteria | Agent can process uploaded media files |

### #26 sandbox-runtime
| Attribute | Value |
|-----------|-------|
| Current Status | YELLOW |
| Blocker | Partial sandbox emulation only |
| Missing | Full code execution environment, file system isolation |
| Promotion Criteria | Agent can execute arbitrary code safely in sandbox |

### #31 cloud-infrastructure
| Attribute | Value |
|-----------|-------|
| Current Status | YELLOW |
| Blocker | Partial (S3 + TiDB only) |
| Missing | Additional cloud services (CDN, queue, cache) |
| Promotion Criteria | Full cloud infrastructure management |

### #38 code-control
| Attribute | Value |
|-----------|-------|
| Current Status | YELLOW |
| Blocker | Partial git integration |
| Missing | Full version control UI, diff viewer, branch management |
| Promotion Criteria | In-app code editing with version control |

### #40 third-party-integrations
| Attribute | Value |
|-----------|-------|
| Current Status | YELLOW |
| Blocker | Limited to Stripe only |
| Missing | Additional integrations (Slack, email, calendar, etc.) |
| Promotion Criteria | 3+ third-party integrations working end-to-end |

### #48 version-rollback
| Attribute | Value |
|-----------|-------|
| Current Status | YELLOW |
| Blocker | Checkpoint-based rollback only |
| Missing | Granular file-level rollback, diff comparison |
| Promotion Criteria | User can rollback individual files or specific changes |

## Promotion Priority

| Priority | Capabilities | Rationale |
|----------|-------------|-----------|
| High | #18 data-analysis, #48 version-rollback | Core user-facing features |
| Medium | #10 one-shot-success, #31 cloud-infrastructure, #40 third-party-integrations | Quality + infrastructure |
| Low | #15 design-view, #19 multimedia, #26 sandbox, #38 code-control | Infrastructure-heavy, lower user demand |

## Promotion Plan

General pattern for promoting YELLOW → GREEN:
1. Implement missing functionality
2. Add vitest tests covering the new code
3. Update capability YAML status to GREEN
4. Re-run LLM judge to confirm score ≥0.80
5. Update TIER_LAUNCHES.md and SCORING_REPORT.md
