# §L.27 Benchmark Task Catalog

> Minimum 20 tasks. Covers all 8 capability categories (plan / execute / verify / memory / tool-use / reasoning / browser / computer-use).
> Each task: `{prompt, success-criteria, scoring-rubric}`.
> Mandatory coverage: ≥3 mobile, ≥3 accessibility, ≥3 desktop responsive, ≥3 reasoning-depth, ≥2 offline/slow-network, ≥2 error-recovery.

## Task Index

| ID | Category | Coverage Dimension | Title |
|---|---|---|---|
| TASK-001 | reasoning | reasoning-depth | Architecture trade-off evaluation |
| TASK-002 | execute | code-generation | Build a searchable todo list component |
| TASK-003 | tool-use | research | Multi-source price comparison |
| TASK-004 | execute | document-generation | PDF summary with key facts extraction |
| TASK-005 | plan | reasoning-depth + agentic | Multi-step trip planning with email draft |
| TASK-006 | browser | browser-automation | Extract structured data from a live webpage |
| TASK-007 | verify | error-recovery | Handle malformed API response gracefully |
| TASK-008 | memory | cross-session | Recall prior conversation context accurately |
| TASK-009 | execute | mobile | Build responsive card layout for 320px viewport |
| TASK-010 | verify | accessibility | Keyboard-only navigation through a form wizard |
| TASK-011 | execute | mobile | Touch-friendly action menu with swipe gestures |
| TASK-012 | verify | accessibility | Screen reader verbalization of data table |
| TASK-013 | execute | desktop-responsive | Multi-panel dashboard at 2560px ultrawide |
| TASK-014 | reasoning | reasoning-depth | Database schema design trade-off analysis |
| TASK-015 | plan | offline/slow-network | Service worker caching strategy design |
| TASK-016 | verify | error-recovery | Recover from timed-out dependency mid-workflow |
| TASK-017 | execute | mobile | Mobile-first checkout flow with form validation |
| TASK-018 | verify | accessibility | Color contrast decisions for data visualization |
| TASK-019 | tool-use | multi-modal | Image analysis with structured output |
| TASK-020 | reasoning | reasoning-depth | Security threat model for OAuth implementation |
| TASK-021 | execute | desktop-responsive | Keyboard shortcut system with right-click context menu |
| TASK-022 | verify | offline/slow-network | Graceful degradation under 3G throttling |
| TASK-023 | computer-use | browser-automation | Fill and submit a multi-step web form |
| TASK-024 | execute | desktop-responsive | Responsive data grid with sort/filter at 1440px |
| TASK-025 | plan | agentic-multi-step | Client review document preparation workflow |

---

## Task Definitions

### TASK-001 — Architecture Trade-off Evaluation
- **Category:** reasoning
- **Coverage:** reasoning-depth
- **Prompt:** "Compare microservices vs monolith architecture for a financial advisory SaaS with 500 concurrent users, 3 dev team members, and a 6-month MVP timeline. Provide a recommendation with explicit trade-offs."
- **Success criteria:** Covers ≥5 dimensions (scalability, team size, deployment complexity, cost, time-to-market). States explicit trade-offs for each. Recommendation is justified with evidence. Reversibility discussed.
- **Scoring rubric:** §L.2 7-dim + reasoning-depth (Coverage / Justification / Trade-off transparency / Reversibility / Novelty)

### TASK-002 — Searchable Todo List Component
- **Category:** execute
- **Coverage:** code-generation
- **Prompt:** "Build a React component for a searchable list of todos with filter-by-status (all/active/completed), add/delete/toggle functionality, and keyboard shortcuts."
- **Success criteria:** Component runs, passes axe-core, all CRUD operations work, search filters correctly, keyboard shortcuts documented and functional.
- **Scoring rubric:** §L.2 7-dim + cycle-count-to-success

### TASK-003 — Multi-source Price Comparison
- **Category:** tool-use
- **Coverage:** research
- **Prompt:** "Find the current price of Bitcoin on three different sources and compare. Show source, price, timestamp, and variance analysis."
- **Success criteria:** Three distinct sources cited, prices within 5% of each other (or variance explained), reasoning shown, timestamps included.
- **Scoring rubric:** §L.2 7-dim + source-diversity score

### TASK-004 — PDF Summary Extraction
- **Category:** execute
- **Coverage:** document-generation
- **Prompt:** "Summarize a 10-page financial report PDF in 200 words, extracting key metrics (revenue, growth rate, profit margin) into a structured table."
- **Success criteria:** Summary ≤200 words, key facts accurate, structured table present, no hallucinated data.
- **Scoring rubric:** §L.2 7-dim + faithfulness score

### TASK-005 — Multi-step Trip Planning
- **Category:** plan
- **Coverage:** reasoning-depth + agentic-multi-step
- **Prompt:** "Plan a 3-day trip to Tokyo under $1500 including flights, hotel, and activities. Then draft an email to the selected hotel asking about availability for specific dates."
- **Success criteria:** Plan within budget, itemized costs, email well-written and professional, steps sequenced correctly, contingency mentioned.
- **Scoring rubric:** §L.2 7-dim + step-sequencing score

### TASK-006 — Structured Data Extraction from Webpage
- **Category:** browser
- **Coverage:** browser-automation
- **Prompt:** "Navigate to a product listing page and extract: product name, price, rating, and availability for the top 10 items. Return as structured JSON."
- **Success criteria:** 10 items extracted, all 4 fields present per item, JSON valid, data matches page content.
- **Scoring rubric:** §L.2 7-dim + extraction-accuracy

### TASK-007 — Malformed API Response Handling
- **Category:** verify
- **Coverage:** error-recovery
- **Prompt:** "Given an API endpoint that returns malformed JSON 30% of the time, implement a robust client that retries with exponential backoff, validates response schema, and returns a meaningful error to the user on persistent failure."
- **Success criteria:** Retry logic correct, backoff exponential, schema validation present, user-facing error message is helpful (not raw stack trace), handles timeout.
- **Scoring rubric:** §L.2 7-dim + robustness score

### TASK-008 — Cross-session Memory Recall
- **Category:** memory
- **Coverage:** cross-session
- **Prompt:** "In a previous conversation, I mentioned my company uses React 19, has 12 employees, and our main product is a CRM for real estate agents. Without me repeating this, answer: What tech stack should I use for our new analytics dashboard?"
- **Success criteria:** References prior context (React 19, company size, CRM domain), recommendation appropriate for stated constraints, doesn't ask for already-provided info.
- **Scoring rubric:** §L.2 7-dim + context-recall accuracy

### TASK-009 — Responsive Card Layout (320px)
- **Category:** execute
- **Coverage:** mobile
- **Prompt:** "Build a responsive card grid that displays 12 product cards. At 320px viewport: single column, touch-friendly tap targets (≥44px), no horizontal scroll. At 768px: 2 columns. At 1024px+: 3 columns."
- **Success criteria:** No horizontal overflow at 320px, tap targets ≥44px, column count correct at each breakpoint, images lazy-loaded, smooth transitions.
- **Scoring rubric:** §L.2 7-dim + mobile-UX score

### TASK-010 — Keyboard-only Form Wizard
- **Category:** verify
- **Coverage:** accessibility
- **Prompt:** "Test a 4-step form wizard using only keyboard navigation. Verify: Tab moves forward through fields, Shift+Tab moves backward, Enter submits current step, Escape cancels, focus is trapped within the active step, progress indicator is accessible."
- **Success criteria:** All navigation works without mouse, focus visible on every interactive element, no focus trap escapes, screen reader announces step changes.
- **Scoring rubric:** §L.2 7-dim + WCAG AA compliance score

### TASK-011 — Touch-friendly Action Menu
- **Category:** execute
- **Coverage:** mobile
- **Prompt:** "Build a mobile action menu that opens on long-press, supports swipe-to-dismiss, has haptic feedback indicators, and meets 44×44px minimum touch targets. Include edit, delete, share, and archive actions."
- **Success criteria:** Long-press triggers menu, swipe dismisses, all targets ≥44px, actions functional, no accidental triggers on scroll.
- **Scoring rubric:** §L.2 7-dim + touch-ergonomics score

### TASK-012 — Screen Reader Data Table
- **Category:** verify
- **Coverage:** accessibility
- **Prompt:** "Create an accessible data table with sortable columns, pagination, and row selection. Verify VoiceOver/NVDA announces: column headers, sort state, current page, selected rows, and row count."
- **Success criteria:** All ARIA attributes correct, sort state announced on change, pagination controls labeled, row selection announced, table caption present.
- **Scoring rubric:** §L.2 7-dim + screen-reader-fidelity score

### TASK-013 — Ultrawide Dashboard (2560px)
- **Category:** execute
- **Coverage:** desktop-responsive
- **Prompt:** "Build a multi-panel analytics dashboard optimized for 2560px ultrawide monitors. Include: sidebar navigation, 3-column main area with charts, data table, and activity feed. Panels should be resizable."
- **Success criteria:** No wasted whitespace at 2560px, panels resizable via drag, content readable, charts scale properly, sidebar collapsible.
- **Scoring rubric:** §L.2 7-dim + desktop-UX score

### TASK-014 — Database Schema Trade-off Analysis
- **Category:** reasoning
- **Coverage:** reasoning-depth
- **Prompt:** "Design a database schema for a multi-tenant SaaS with: per-tenant data isolation, shared infrastructure, audit logging, soft deletes, and GDPR compliance. Compare row-level security vs schema-per-tenant vs shared-table approaches."
- **Success criteria:** ≥3 approaches compared, trade-offs explicit (cost, complexity, performance, compliance), recommendation justified, migration path discussed, GDPR implications addressed.
- **Scoring rubric:** §L.2 7-dim + reasoning-depth

### TASK-015 — Service Worker Caching Strategy
- **Category:** plan
- **Coverage:** offline/slow-network
- **Prompt:** "Design a service worker caching strategy for a financial dashboard that shows real-time stock prices, historical charts, and user portfolio. Define: what to cache, cache invalidation rules, offline fallback behavior, and sync-on-reconnect protocol."
- **Success criteria:** Distinguishes between real-time (no cache), historical (cache-first), and user data (stale-while-revalidate). Offline fallback shows last-known data with staleness indicator. Sync protocol handles conflicts.
- **Scoring rubric:** §L.2 7-dim + offline-resilience score

### TASK-016 — Timed-out Dependency Recovery
- **Category:** verify
- **Coverage:** error-recovery
- **Prompt:** "Implement a workflow that depends on 3 external APIs (payment, email, analytics). If payment times out: retry 3x with backoff, then queue for manual review. If email fails: queue and continue. If analytics fails: log and continue. Show the user appropriate status for each."
- **Success criteria:** Correct priority handling (payment critical, email important, analytics optional), retry logic per-service, user sees per-service status, no silent failures.
- **Scoring rubric:** §L.2 7-dim + graceful-degradation score

### TASK-017 — Mobile Checkout Flow
- **Category:** execute
- **Coverage:** mobile
- **Prompt:** "Build a mobile-first checkout flow with: address form (with autocomplete), payment method selection, order summary, and confirmation. Optimize for thumb-zone reachability on iPhone SE (375px)."
- **Success criteria:** All interactive elements in thumb zone, form validation inline (not modal), keyboard doesn't obscure inputs, total updates in real-time, confirmation is clear.
- **Scoring rubric:** §L.2 7-dim + mobile-UX score

### TASK-018 — Color Contrast for Data Visualization
- **Category:** verify
- **Coverage:** accessibility
- **Prompt:** "Design a color palette for a financial chart showing 6 data series that meets WCAG AAA contrast requirements against both light and dark backgrounds. Include colorblind-safe alternatives (deuteranopia, protanopia, tritanopia)."
- **Success criteria:** All 6 colors pass AAA contrast (7:1) against both backgrounds, colorblind simulation shows distinguishable series, palette documented with hex values and contrast ratios.
- **Scoring rubric:** §L.2 7-dim + accessibility-compliance score

### TASK-019 — Image Analysis with Structured Output
- **Category:** tool-use
- **Coverage:** multi-modal
- **Prompt:** "Analyze a photograph of a restaurant receipt and extract: restaurant name, date, itemized list (item + price), subtotal, tax, tip, and total. Return as structured JSON."
- **Success criteria:** All fields extracted correctly, prices parsed as numbers, date in ISO format, handles handwritten tip amount, JSON valid.
- **Scoring rubric:** §L.2 7-dim + extraction-accuracy

### TASK-020 — OAuth Security Threat Model
- **Category:** reasoning
- **Coverage:** reasoning-depth
- **Prompt:** "Produce a security threat model for an OAuth 2.0 + PKCE implementation in a single-page application. Cover: token storage, CSRF, redirect URI validation, token refresh, session fixation, and supply-chain attacks on the OAuth library."
- **Success criteria:** ≥6 threat categories addressed, each with: threat description, likelihood, impact, mitigation, residual risk. STRIDE or similar framework used. Specific to SPA context (not generic).
- **Scoring rubric:** §L.2 7-dim + reasoning-depth

### TASK-021 — Keyboard Shortcut System
- **Category:** execute
- **Coverage:** desktop-responsive
- **Prompt:** "Implement a keyboard shortcut system with: global shortcuts (Cmd+K search, Cmd+/ help), context-sensitive shortcuts (within editor, within list), shortcut conflict detection, and a discoverable shortcut palette (Cmd+Shift+P)."
- **Success criteria:** Shortcuts work globally and contextually, conflicts detected and reported, palette shows all available shortcuts with descriptions, shortcuts customizable.
- **Scoring rubric:** §L.2 7-dim + desktop-UX score

### TASK-022 — 3G Throttling Graceful Degradation
- **Category:** verify
- **Coverage:** offline/slow-network
- **Prompt:** "Test the application under simulated 3G conditions (750kbps down, 250kbps up, 100ms RTL). Verify: initial load completes within 10s, critical content visible within 3s, images lazy-load with placeholders, API calls show loading states, no layout shift on content arrival."
- **Success criteria:** LCP <10s on 3G, FCP <3s, CLS <0.1, all API calls show loading indicators, images have aspect-ratio placeholders, no timeout errors shown to user.
- **Scoring rubric:** §L.2 7-dim + slow-network-resilience score

### TASK-023 — Multi-step Web Form Submission
- **Category:** computer-use
- **Coverage:** browser-automation
- **Prompt:** "Using browser automation, fill and submit a 3-page registration form: page 1 (personal info), page 2 (preferences with checkboxes and dropdowns), page 3 (file upload + terms acceptance). Verify confirmation page appears."
- **Success criteria:** All fields filled correctly, file uploaded, terms checkbox checked, form submitted, confirmation page content verified, no manual intervention needed.
- **Scoring rubric:** §L.2 7-dim + automation-reliability score

### TASK-024 — Responsive Data Grid (1440px)
- **Category:** execute
- **Coverage:** desktop-responsive
- **Prompt:** "Build a data grid component for 1440px desktop showing 1000 rows with: virtual scrolling, column sorting, multi-column filtering, column resizing, row selection, and CSV export. Performance target: 60fps scroll."
- **Success criteria:** Virtual scrolling renders only visible rows, sort/filter instant (<100ms), column resize smooth, CSV export includes filtered/selected rows, 60fps maintained during scroll.
- **Scoring rubric:** §L.2 7-dim + performance score

### TASK-025 — Client Review Document Preparation
- **Category:** plan
- **Coverage:** agentic-multi-step
- **Prompt:** "As a financial advisor's assistant, prepare client review documents for 3 households: gather portfolio data, generate performance summaries, create comparison charts, draft talking points, and organize into a presentation-ready package. Each household has different risk profiles and goals."
- **Success criteria:** 3 distinct documents, each with: portfolio summary, performance vs benchmark, risk assessment, recommended actions, talking points. Documents personalized per household. Package organized logically.
- **Scoring rubric:** §L.2 7-dim + agentic-orchestration score

---

## Coverage Summary

| Mandatory Dimension | Required | Actual | Tasks |
|---|---|---|---|
| Mobile-specific | ≥3 | 3 | TASK-009, TASK-011, TASK-017 |
| Accessibility-specific | ≥3 | 3 | TASK-010, TASK-012, TASK-018 |
| Desktop responsive | ≥3 | 3 | TASK-013, TASK-021, TASK-024 |
| Reasoning-depth | ≥3 | 4 | TASK-001, TASK-005, TASK-014, TASK-020 |
| Offline/slow-network | ≥2 | 2 | TASK-015, TASK-022 |
| Error-recovery | ≥2 | 2 | TASK-007, TASK-016 |
| Remaining (browser, document, code, research, multi-modal, agentic, voice) | ≥4 | 8 | TASK-002, TASK-003, TASK-004, TASK-006, TASK-008, TASK-019, TASK-023, TASK-025 |
| **Total** | **≥20** | **25** | — |

## Category Coverage

| Category | Tasks | Count |
|---|---|---|
| plan | TASK-005, TASK-015, TASK-025 | 3 |
| execute | TASK-002, TASK-004, TASK-009, TASK-011, TASK-013, TASK-017, TASK-021, TASK-024 | 8 |
| verify | TASK-007, TASK-010, TASK-012, TASK-016, TASK-018, TASK-022 | 6 |
| memory | TASK-008 | 1 |
| tool-use | TASK-003, TASK-019 | 2 |
| reasoning | TASK-001, TASK-014, TASK-020 | 3 |
| browser | TASK-006 | 1 |
| computer-use | TASK-023 | 1 |
| **Total** | — | **25** |

## Retired Tasks

None yet. See `RETIRED_TASKS.md` when tasks are retired.

## Targets

Primary: manus-live (manus.im)
See `TARGETS.md` for multi-competitor extension.
