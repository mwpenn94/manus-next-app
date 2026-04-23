# Manus Next — Remaining Items Guide

**Date:** 2026-04-22 | **Version:** 2.0

---

## Priority Tiers

| Tier | Criteria | Timeline |
|------|----------|----------|
| P0 | Security vulnerabilities, data integrity | Immediate |
| P1 | Core feature gaps blocking production | 1-2 weeks |
| P2 | Quality improvements, polish | 2-4 weeks |
| P3 | Nice-to-have, future roadmap | Backlog |

---

## P0 Critical (4 items, 13 hours)

1. **Encrypt GitHub tokens at rest** — AES-256-GCM on github_repos.accessToken (4h)
2. **WebSocket session authentication** — JWT cookie validation on upgrade (4h)
3. **Rate limit analytics collect** — Add 60 req/min limit (1h)
4. **Data retention for page_views** — Aggregate daily, purge raw after 90 days (4h)

## P1 High (8 items, 51 hours)

5. **Content safety filter** — Keyword + LLM classifier before publishing (8h)
6. **Custom domain format validation** — Zod regex on domain field (1h)
7. **Random S3 key suffix** — UUID append to prevent enumeration (2h)
8. **Webapp code editor** — CodeMirror tab in builder page (8h)
9. **Multi-file webapp projects** — File tree, multi-file S3 publishing (16h)
10. **E2E webapp builder test** — Playwright build-to-deploy flow (4h)
11. **Stripe Customer Portal** — Self-service subscription management (4h)
12. **GDPR data export/deletion** — Wire DataControlsPage to backend (8h)

## P2 Medium (12 items, 54 hours)

13. Database indexes for analytics queries (1h)
14. Chart accessibility with aria-label and data tables (4h)
15. Skip-to-content link (1h)
16. prefers-reduced-motion support (4h)
17. Strict Content Security Policy (4h)
18. Memory deduplication (4h)
19. CloudFront custom error pages (2h)
20. WAF rules for CloudFront (4h)
21. Coverage metrics configuration (2h)
22. Component-level React Testing Library tests (16h)
23. Decompose TaskView.tsx into sub-components (8h)
24. Split routers.ts into feature routers (4h)

## P3 Low (10 items, 216 hours)

25. Webapp template gallery (16h)
26. A/B testing for published webapps (24h)
27. Wake-word detection for hands-free (16h)
28. Additional connector implementations (48h)
29. Desktop companion app (40h)
30. Monorepo package extraction (24h)
31. SNS-based SSL validation events (8h)
32. Multi-region S3 origin failover (8h)
33. Collaborative CRDT editing (24h)
34. Full-text search for library (8h)

---

## Total: 34 items, 334 estimated hours

---

*End of Remaining Items Guide v2.0*
