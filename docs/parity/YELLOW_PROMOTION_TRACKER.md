# YELLOW Capability Promotion Tracker (§L.33)

**Created:** 2026-04-22T11:35:00Z
**Updated:** 2026-04-22T04:55:00Z
**Purpose:** Track promotion path for YELLOW capabilities to GREEN.
**Source of truth:** `packages/eval/capabilities/*.yaml` — 12 capabilities with `status: YELLOW`

## YELLOW Capabilities (12)

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

### #30 built-in-ai
| Attribute | Value |
|-----------|-------|
| Current Status | YELLOW |
| Blocker | Partial LLM integration (Forge API only) |
| Missing | Multi-model routing, model comparison features |
| Promotion Criteria | Full model selection with performance comparison |

### #31 cloud-infrastructure
| Attribute | Value |
|-----------|-------|
| Current Status | YELLOW |
| Blocker | Partial (S3 + TiDB only) |
| Missing | Additional cloud services (CDN, queue, cache) |
| Promotion Criteria | Full cloud infrastructure management |

### #35 project-analytics
| Attribute | Value |
|-----------|-------|
| Current Status | YELLOW |
| Blocker | Basic metrics only |
| Missing | Detailed analytics dashboard, usage trends, cost tracking |
| Promotion Criteria | Comprehensive analytics with visualizations |

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

### #41 github-integration
| Attribute | Value |
|-----------|-------|
| Current Status | YELLOW |
| Blocker | Basic sync only (push/pull) |
| Missing | PR management, issue tracking, webhook handling |
| Promotion Criteria | Full GitHub workflow from within the app |

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
| High | #18 data-analysis, #30 built-in-ai | Core user-facing features |
| Medium | #10 one-shot-success, #41 github-integration, #48 version-rollback | Quality + developer workflow |
| Low | #15 design-view, #19 multimedia, #26 sandbox, #31 cloud, #35 analytics, #38 code-control, #40 integrations | Infrastructure-heavy, lower user demand |

## Promotion Plan

General pattern for promoting YELLOW → GREEN:
1. Implement missing functionality
2. Add vitest tests covering the new code
3. Update capability YAML status to GREEN
4. Re-run LLM judge to confirm score ≥0.80
5. Update TIER_LAUNCHES.md and SCORING_REPORT.md
