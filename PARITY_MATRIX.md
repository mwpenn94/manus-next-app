# PARITY_MATRIX.md (v1.2 — Scoring as Ranges)

Last updated: 2026-04-25 Cycle 9 Post-Implementation

## Engineering Axis (5 Dimensions)

| Capability | Visual | Behavioral | Functional | Performance | A11y | Weighted |
|---|---|---|---|---|---|---|
| streaming-chat | 8.0–8.5 | 8.5–9.0 | 8.5–9.0 | 7.5–8.0 | 7.5–8.0 | 8.0–8.5 |
| task-sidebar | 8.0–8.5 | 8.0–8.5 | 8.0–8.5 | 8.0–8.5 | 7.0–7.5 | 7.8–8.3 |
| document-generation | 8.5–9.0 | 8.5–9.0 | 9.0–9.5 | 7.5–8.0 | 7.5–8.0 | 8.2–8.7 |
| browser-automation | 7.0–7.5 | 7.0–7.5 | 7.5–8.0 | 7.0–7.5 | 6.5–7.0 | 7.0–7.5 |
| role-based-access | 8.0–8.5 | 8.0–8.5 | 8.5–9.0 | 8.0–8.5 | 7.5–8.0 | 8.0–8.5 |
| qa-testing | 7.0–7.5 | 7.0–7.5 | 7.5–8.0 | 7.0–7.5 | 6.5–7.0 | 7.0–7.5 |
| voice-tts | 7.5–8.0 | 7.5–8.0 | 8.0–8.5 | 7.5–8.0 | 7.0–7.5 | 7.5–8.0 |
| error-handling | 8.0–8.5 | 8.0–8.5 | 8.0–8.5 | 7.5–8.0 | 7.5–8.0 | 7.8–8.3 |
| **Axis Average** | **7.8–8.3** | **7.8–8.3** | **8.1–8.6** | **7.5–8.0** | **7.1–7.6** | **7.7–8.2** |

## Experience Axis (5 Dimensions)

| Capability | Interaction | Motion | State-coverage | Microcopy | Flow | Weighted |
|---|---|---|---|---|---|---|
| streaming-chat | 8.5–9.0 | 7.5–8.0 | 8.5–9.0 | 8.0–8.5 | 8.5–9.0 | 8.2–8.7 |
| task-sidebar | 8.0–8.5 | 7.5–8.0 | 8.0–8.5 | 7.5–8.0 | 8.0–8.5 | 7.8–8.3 |
| document-generation | 8.5–9.0 | 7.5–8.0 | 8.5–9.0 | 8.0–8.5 | 8.5–9.0 | 8.2–8.7 |
| browser-automation | 7.0–7.5 | 6.0–6.5 | 7.0–7.5 | 7.0–7.5 | 7.0–7.5 | 6.8–7.3 |
| role-based-access | 8.0–8.5 | 7.5–8.0 | 8.0–8.5 | 7.5–8.0 | 8.0–8.5 | 7.8–8.3 |
| qa-testing | 7.0–7.5 | 6.0–6.5 | 7.0–7.5 | 6.5–7.0 | 7.0–7.5 | 6.7–7.2 |
| voice-tts | 7.5–8.0 | 7.0–7.5 | 7.5–8.0 | 7.0–7.5 | 7.5–8.0 | 7.3–7.8 |
| error-handling | 8.0–8.5 | 7.0–7.5 | 8.0–8.5 | 7.5–8.0 | 7.5–8.0 | 7.6–8.1 |
| **Axis Average** | **7.8–8.3** | **7.0–7.5** | **7.8–8.3** | **7.4–7.9** | **7.8–8.3** | **7.6–8.1** |

## Cross-Axis Weighted Total

| Metric | Range |
|---|---|
| Engineering Axis | 7.7–8.2 |
| Experience Axis | 7.6–8.1 |
| **Overall Parity Score** | **7.7–8.2** |

## Scoring Key
- 9.0–10.0: Parity+ (exceeds oracle in measurable ways)
- 8.0–8.9: Near-parity (minor gaps, production-ready)
- 7.0–7.9: Approaching parity (notable gaps, functional)
- 6.0–6.9: Sub-parity (significant gaps, needs work)
- <6.0: Far from parity (fundamental gaps)

## Cycle 9 Improvements Applied
1. **streaming-chat:** Image attachment thumbnails, TTS waveform indicator, global micro-interactions
2. **document-generation:** Inline PDF/DOCX/XLSX interactive output cards
3. **qa-testing:** URL auto-populate from window.location.origin
4. **voice-tts:** Animated pulse bars, speed control confirmed, voice catalog confirmed
5. **error-handling:** Image thumbnails, drag-drop overlay confirmed, retry banner confirmed
6. **task-sidebar:** Sidebar opacity transition on collapse
7. **Visual Polish:** TaskViewSkeleton, global CSS transitions, active:scale micro-interactions

## Gap Priority (Largest Remaining Deltas)

1. **browser-automation** (6.8–7.5): QA page URL fixed but no live Playwright execution; no screenshot diff
2. **qa-testing** (6.7–7.5): Test definitions exist but no real execution pipeline
3. **Motion dimension** (7.0–7.5): Improved with skeletons/transitions but still below 8.0
4. **A11y dimension** (7.1–7.6): Focus rings exist but no ARIA live regions for streaming content

## Temperature Calculation (v1.2 Formula)
- Previous score range midpoint: 7.45
- Current score range midpoint: 7.95
- Delta: +0.50 → temp adjustment -0.10
- New temperature: 0.35 - 0.10 = 0.25 → clamped to floor 0.30

## Convergence Status
- **NOT CONVERGED** — browser-automation and qa-testing below 8.0 floor
- **Next cycle:** Wire Playwright execution, add screenshot comparison, improve motion
