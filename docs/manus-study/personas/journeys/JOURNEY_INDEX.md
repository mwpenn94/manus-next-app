# §L.28 Persona Journey Index

> Maps each persona to their representative journeys.
> Each journey exercises specific benchmark tasks and validates specific UX dimensions.

## Journey Matrix

| Journey ID | Persona | Scenario | Tasks Exercised | UX Dimensions |
|---|---|---|---|---|
| P01-J1 | Marcus Chen | Debug a complex async race condition | TASK-002, TASK-007 | Keyboard shortcuts, dark mode, code quality |
| P01-J2 | Marcus Chen | Research and compare two frameworks | TASK-001, TASK-003 | Cross-session memory, reasoning depth |
| P03-J1 | Jordan Rivera | Analyze CSV dataset and create visualization | TASK-003, TASK-024 | Colorblind-safe palette, data grid |
| P05-J1 | Takeshi Yamamoto | Build and test a mobile component | TASK-009, TASK-011 | Mobile preview, touch targets |
| P07-J1 | David Thompson | Prepare client review documents | TASK-025, TASK-004 | Large text, high contrast, simple navigation |
| P07-J2 | David Thompson | Research market trends on iPad | TASK-003 | Tablet responsive, touch-friendly |
| P08-J1 | Maria Santos | Create competitive analysis report | TASK-003, TASK-004 | Document generation, export |
| P11-J1 | James Mitchell | Research prospect on mobile | TASK-003, TASK-006 | Mobile viewport (430px), voice input |
| P13-J1 | Alex Nguyen | Design accessible form wizard | TASK-010, TASK-018 | Accessibility audit, color contrast |
| P14-J1 | Maya Johnson | Write SEO-optimized blog post | TASK-004 | Dyslexia-friendly output, clear structure |
| P18-J1 | Emily Watson | Conduct literature review | TASK-001, TASK-003, TASK-004 | Citation accuracy, reasoning depth |
| P19-J1 | Kevin Park | Write essay on Chromebook | TASK-004 | Small viewport (1366px), concise output, ADHD-friendly |
| P23-J1 | Michael Torres | Generate React component via screen reader | TASK-002, TASK-012 | JAWS compatibility, ARIA, keyboard-only |
| P23-J2 | Michael Torres | Navigate dashboard via screen reader | TASK-010, TASK-021 | Focus management, semantic HTML |
| P24-J1 | Grace Liu | Create document at 200% zoom | TASK-004 | High contrast, large targets, zoom stability |
| P25-J1 | Ryan O'Brien | Fill form using switch access | TASK-023, TASK-010 | Large targets, no time limits, no drag-drop |
| P27-J1 | Daniel Kim | Create simple task list | TASK-005 | Simple language, consistent navigation, undo |
| P28-J1 | Jennifer Adams | First-time onboarding experience | TASK-004 | Clear onboarding, no jargon, guided flow |
| P29-J1 | Mike Johnson | Research travel on iPad | TASK-005 | Large text, simple navigation, patience |
| P30-J1 | Fatima Al-Rashid | Write scholarship essay on phone | TASK-004 | Small viewport (360px), simple English, mobile keyboard |
| P30-J2 | Fatima Al-Rashid | Use app on slow campus WiFi | TASK-022 | 3G throttling, loading states, graceful degradation |

## Coverage Validation

| Dimension | Journeys Covering It |
|---|---|
| Screen reader | P23-J1, P23-J2 |
| Keyboard-only | P01-J1, P23-J1, P23-J2, P25-J1 |
| High contrast / low vision | P07-J1, P24-J1 |
| Motor impairment | P25-J1 |
| Cognitive accessibility | P19-J1, P27-J1 |
| Mobile (≤430px) | P05-J1, P11-J1, P30-J1 |
| Tablet (768-1024px) | P07-J2, P29-J1 |
| Small laptop (1366px) | P19-J1, P28-J1 |
| Desktop (1440-1920px) | P01-J1, P01-J2, P03-J1, P08-J1, P13-J1, P14-J1, P18-J1 |
| Ultrawide (2560px+) | P04 (no journey yet — deferred) |
| Dark mode | P01-J1 |
| Colorblind | P03-J1 |
| ESL/multilingual | P30-J1 |
| Voice input | P11-J1 |
| Dyslexia | P14-J1 |
