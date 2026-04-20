# ANGLE_HISTORY.md — §L.26 Angle Rotation Tracker

> Records the angle used per build loop pass. On pass start, agent reads this file, picks an angle not used in last 10 passes.
> If all 34 used within 10 passes, combines two per §L.26 escalation.

## Angle Catalog (34 base angles)

1. Correctness (spec alignment)
2. Edge cases (boundary values, empty/max inputs)
3. Error states (what happens when X fails)
4. Performance (latency, throughput, Core Web Vitals)
5. Bundle size (JS/CSS weight, tree-shaking)
6. Memory (leak detection, large-data-set behavior)
7. Type safety (strict TS, no `any`, proper generics)
8. Dead code (unused exports, unreachable branches)
9. Test coverage (uncovered lines, uncovered scenarios)
10. Flaky tests (race conditions in tests themselves)
11. Race conditions (concurrent request handling)
12. Offline (service worker, cached state)
13. Slow network (3G throttling, timeouts)
14. Accessibility — keyboard only (tab order, focus traps)
15. Accessibility — screen reader (ARIA, semantic HTML)
16. Accessibility — contrast (WCAG AA/AAA, dark/light mode)
17. Accessibility — touch targets (≥44×44px on mobile)
18. Responsive (viewport widths 320/375/768/1024/1440/2560)
19. Dark mode (theme coherence, contrast in both)
20. i18n (RTL support, character-count overflow, date/number formats)
21. Security (input validation, XSS, CSRF, auth bypass)
22. Observability (logging gaps, trace correlation, alert coverage)
23. CI speed (test parallelization, cache hits)
24. Dev ergonomics (README accuracy, setup friction, error messages)
25. Docs staleness (code vs docs drift)
26. Migration safety (forward/backward compat, zero-downtime)
27. Input validation (boundary + adversarial payloads)
28. Graceful degradation (fallback when dep fails)
29. Mobile UX (touch ergonomics, gesture support, portrait/landscape)
30. Cross-browser (Chrome / Safari / Firefox / mobile Safari / mobile Chrome)
31. Oldest supported device/browser (iOS Safari 15, Android WebView 90)
32. Hostile input (malformed data from users or APIs)
33. Cost observability (per-request $ attribution)
34. Privacy/compliance (GDPR/CCPA/HIPAA-appropriate handling)

## N/A Angles (excluded from rotation for this repo)

| Angle | Rationale | Date |
|---|---|---|
| 20. i18n | English-only product, no i18n plans currently | 2026-04-20 |

## Pass History

| Pass | Angle | Date | Notes |
|---|---|---|---|
| 1 | infrastructure (§L.26 bootstrap) | 2026-04-20 | PARITY.md creation, ANGLE_HISTORY.md init |
