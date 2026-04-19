# DISTRACTION_BACKLOG — manus-next-app

**Spec version:** v8.3
**Last updated:** April 18, 2026

Per §G, this file tracks ideas that surfaced during execution but were classified as distractions from the critical path. Items here are NOT rejected — they are deferred until Phase B has bandwidth.

## Deferred Distractions

| # | Distraction | Why Deferred | Revisit When |
|---|-------------|-------------|--------------|
| D-01 | Custom animation library | Framer Motion sufficient; custom lib is bikeshedding | Phase B if user feedback requests smoother transitions |
| D-02 | GraphQL layer alongside tRPC | tRPC covers all needs; GraphQL adds complexity | Only if external API consumers need public GraphQL |
| D-03 | Migrate MySQL/TiDB to PostgreSQL | Current DB works; migration risk outweighs benefit | Only if PostgreSQL-specific features become blocking |
| D-04 | Custom design system package | Tailwind + shadcn/ui covers needs; premature extraction | Phase B if multiple downstream apps need shared components |
| D-05 | Server-side rendering (SSR) | SPA adequate for agent UI; SSR adds complexity | Only if SEO becomes a requirement |
| D-06 | Microservices architecture | Monolith appropriate for current scale | Only at >10k concurrent users |
| D-07 | Custom markdown renderer | Streamdown handles rendering well | Only if Streamdown has unfixable bugs |
| D-08 | E2E Playwright suite | Vitest provides sufficient coverage | Phase B for regression protection |
| D-09 | Real-time collaboration | Single-user agent tool; collaboration is different product | Only if product direction changes |
| D-10 | Monaco code editor | Read-only code display is sufficient | Only if users need in-workspace editing |
| D-11 | WebSocket migration from SSE | SSE works well for server-to-client streaming | Only if bidirectional real-time needed |
| D-12 | Dark/light theme auto-detection | Dark theme is the design choice | Phase B if user feedback requests light mode |

## Classification Criteria

Per §G, an item is a distraction if it does not directly advance any of the 62 in-scope capabilities toward GREEN, adds architectural complexity without measurable quality improvement, or addresses a hypothetical future need rather than a current gap.
