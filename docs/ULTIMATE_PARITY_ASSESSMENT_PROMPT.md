# Ultimate Parity Assessment & Recursive Optimization Protocol v2

You are executing the most comprehensive quality assessment and optimization protocol ever designed for a web application. This protocol synthesizes the expertise of 16 specialist roles, 4 virtual user personas, automated tooling across 26 page-viewport combinations, and recursive convergence methodology into a single executable process.

**Scope**: The work being assessed is the Sovereign AI web application — a Manus-aligned agentic task execution platform. The assessment covers every layer: frontend UI/UX, backend architecture, database design, API contracts, security posture, accessibility compliance, performance characteristics, brand alignment, mobile experience, internationalization readiness, test coverage, deployment health, product completeness, animation quality, content strategy, and privacy compliance.

**Convergence Rule**: This protocol runs recursively. Each full pass produces findings. Findings are fixed, then the pass is re-run. Convergence requires **3 consecutive passes with 0 HIGH or CRITICAL findings**. If any pass produces a fix, the convergence counter resets to 0.

**Execution Assets**: This protocol is supported by executable Playwright scripts stored alongside the codebase. Each script encodes the automated checks described below and produces machine-readable JSON results plus human-readable Markdown reports.

| Script | Purpose | Output |
|--------|---------|--------|
| `test-expert-panel-assessment.mjs` | Runs all 16 expert panels | `expert-panel-results.json`, `expert-panel-report.md` |
| `test-virtual-users.mjs` | Runs all 4 virtual user personas | Console output with per-persona results |
| `test-v10-visual-audit.mjs` | Runs visual audit across 26 page-viewport combos | `screenshots/` directory + console findings |
| `test-zindex-debug.mjs` | Z-index stacking analysis | Console output with blocked elements |

---

## §1 — Expert Panel Assessments

Each panel below represents a world-class specialist evaluating the application through their domain lens. Every panel MUST evaluate every page at both mobile (390×844) and desktop (1440×900) viewports unless noted otherwise. Findings are classified as CRITICAL (blocks deployment), HIGH (must fix before release), MEDIUM (should fix), or LOW (nice to have).

**Panels 1–12 have automated Playwright checks** implemented in `test-expert-panel-assessment.mjs`. **Panels 13–16 require manual code review or LLM-assisted analysis** — they cannot be fully automated via browser inspection alone.

### Panel 1: UX Designer (Senior, 15+ years)

**Evaluates**: Visual hierarchy, whitespace rhythm, typography scale, layout balance, information density, cognitive load, visual flow, Gestalt principles, affordance clarity, feedback loops.

**Automated checks**:
- Heading hierarchy: H1 ≥ 20px, H2 ≥ 16px, H3 ≥ 14px
- DOM nesting depth: flag if > 20 levels
- Text contrast: luminance analysis on all visible text elements (threshold: luminance > 0.85 on light theme)
- Spacing consistency: verify Tailwind spacing scale adherence

**Manual review criteria**:
- Does each page have a clear visual entry point?
- Is the information hierarchy scannable in under 3 seconds?
- Are interactive elements visually distinct from static content?
- Does whitespace create breathing room without wasting screen real estate?
- Are animations purposeful (guide attention, confirm action) vs decorative?

### Panel 2: Accessibility Engineer (WCAG 2.1 AA Certified)

**Evaluates**: Screen reader compatibility, keyboard navigation, focus management, ARIA attributes, color contrast ratios, touch targets, semantic HTML, form labels, error announcements, skip navigation.

**Automated checks**:
- All `<img>` elements have `alt` text or `role="presentation"`
- All `<button>` elements have accessible names (text content, `aria-label`, `aria-labelledby`, or `title`)
- All form inputs (`<input>`, `<textarea>`, `<select>`) have associated labels (`<label for>`, `aria-label`, `aria-labelledby`, or `placeholder`)
- All `role="switch"` elements have `aria-checked` and `aria-label`
- All `role="dialog"` elements contain focusable children
- All interactive elements are reachable via Tab key
- No `tabindex` values > 0 (disrupts natural tab order)

**Manual review criteria**:
- Can a screen reader user complete the core task flow (create task, view results)?
- Are error states announced to assistive technology?
- Do focus traps exist in modals and are they properly managed?
- Is skip-to-main-content available and functional?

### Panel 3: Performance Engineer (Core Web Vitals Specialist)

**Evaluates**: Page load time, DOM size, bundle size, render performance, memory usage, network waterfall, lazy loading, code splitting, caching strategy.

**Automated checks**:
- Page load time: < 3s GOOD, 3-5s MEDIUM, > 5s HIGH
- DOM element count: < 1500 GOOD, 1500-3000 MEDIUM, > 3000 HIGH
- Inline style count: < 20 GOOD, 20-50 MEDIUM, > 50 LOW
- Console error count on page load: 0 GOOD, any HIGH
- Network request count on initial load

**Manual review criteria**:
- Are images lazy-loaded below the fold?
- Is code splitting applied to route-level components?
- Are heavy libraries (framer-motion, chart.js) tree-shaken?
- Are API calls deduplicated (no redundant fetches)?

### Panel 4: Security Researcher (OWASP Top 10 Specialist)

**Evaluates**: XSS vectors, CSRF protection, authentication flow, session management, secret exposure, input sanitization, CSP headers, dependency vulnerabilities.

**Automated checks**:
- No API keys, secrets, or tokens in page source (regex patterns for `sk-`, `api_key`, `secret`, `password`)
- No `eval()` in inline scripts
- No `dangerouslySetInnerHTML` without sanitization
- Authentication cookies have `HttpOnly`, `Secure`, `SameSite` flags
- No sensitive data in localStorage/sessionStorage

**Manual review criteria**:
- Are all user inputs sanitized before rendering?
- Are tRPC procedures properly gated (`protectedProcedure` vs `publicProcedure`)?
- Is the OAuth flow resistant to redirect manipulation?
- Are file uploads validated for type and size on both client and server?

### Panel 5: Mobile UX Specialist (iOS/Android, 10+ years)

**Evaluates**: Touch targets, responsive breakpoints, gesture support, viewport overflow, safe area insets, mobile navigation patterns, thumb-zone optimization, input zoom prevention.

**Automated checks**:
- All interactive elements ≥ 32×32px (ideally 44×44px) on mobile viewport
- No horizontal scroll (page width ≤ viewport width + 5px tolerance)
- Elements inside scroll containers with `overflow-y: auto` are excluded from touch target checks when scrolled out of view
- Off-screen elements (x < 0 or y < 0) are excluded from all checks
- Parent element size is checked as fallback for small interactive children (icon buttons inside larger wrappers)

**Known false-positive patterns** (encoded in script):
- Skip-to-content links (1×1px, intentionally hidden, visible on focus only)
- Clear/reset buttons inside input fields when sidebar is collapsed (off-screen x < 0)
- Toggle/switch components (inherently small, checked via parent wrapper)

**Manual review criteria**:
- Is the mobile sidebar/drawer pattern intuitive (swipe to open/close)?
- Are form inputs sized to prevent iOS zoom (font-size ≥ 16px)?
- Is the bottom navigation area (thumb zone) utilized for primary actions?
- Do long-press and swipe gestures have discoverable alternatives?

### Panel 6: Brand/Identity Designer (Manus Alignment Specialist)

**Evaluates**: Manus design language adherence, color palette consistency, typography system, logo usage, naming conventions, tone of voice, visual identity coherence.

**Automated checks**:
- No "Manus Next" branding in visible text (should be "Manus")
- Font family count ≤ 5 across all pages
- Color palette adherence to CSS custom properties (no hardcoded hex outside design tokens)

**Manual review criteria**:
- Does the warm cream background (#f8f8f7) match Manus's light theme?
- Is the greeting pattern ("Hello." / "What can I do for you?") consistent?
- Do suggestion cards match Manus's visual weight and spacing?
- Is the sidebar structure minimal and aligned with Manus's navigation hierarchy?
- Does the agent message style (plain prose, no bubbles for agent) match Manus?
- Is the workspace panel header "Manus's Computer"?

### Panel 7: Frontend Architect (React/TypeScript, 12+ years)

**Evaluates**: Component architecture, state management, type safety, code organization, error boundaries, render optimization, hook patterns, dependency management.

**Automated checks**:
- Zero TypeScript errors (`tsc --noEmit`)
- Zero console errors on any page load (excluding expected 404s for test routes and network errors in dev)
- Zero failed tests (`vitest run`)

**Code review criteria**:
- Are components following single-responsibility principle?
- Are custom hooks extracting reusable logic?
- Are React Query/tRPC patterns consistent (optimistic updates where appropriate)?
- Are error boundaries wrapping route-level components?
- Is prop drilling avoided (context or composition used instead)?
- Are `useEffect` dependencies correct (no missing deps, no infinite loops)?
- Are unstable references stabilized (`useMemo`, `useState` initializer)?

### Panel 8: QA Lead (Test Strategy, Edge Cases)

**Evaluates**: Error states, empty states, loading states, boundary conditions, data validation, 404 handling, offline behavior, concurrent user scenarios.

**Automated checks**:
- 404 page renders correctly for unknown routes (contains "404" or "Not Found")
- Empty state messaging exists on data-dependent pages (Library, Memory, Schedule, Projects)
- Loading indicators present during data fetches

**Manual review criteria**:
- What happens when the API returns an error? Is it gracefully displayed?
- What happens with extremely long text inputs?
- What happens when the user double-clicks a submit button?
- Are optimistic updates rolled back on mutation failure?
- Do all "coming soon" placeholders show toast notifications?

### Panel 9: Product Manager (User Journey Completeness)

**Evaluates**: Core user flows, feature discoverability, onboarding experience, value proposition clarity, task completion rates, navigation coherence.

**Automated checks**:
- Home page has task input (textarea or text input)
- Home page has suggestion cards (discoverable entry points)
- Sidebar has clear navigation to all major sections

**Manual review criteria**:
- Can a new user understand what the app does within 10 seconds?
- Can a user complete the core flow (create task → see results) without confusion?
- Are all sidebar navigation items functional (not dead links)?
- Is the settings page organized logically?
- Are keyboard shortcuts discoverable (help overlay via ⌘/)?

### Panel 10: DevOps Engineer (Deployment & Infrastructure)

**Evaluates**: Build health, deployment readiness, environment configuration, error monitoring, logging, health checks, CI/CD compatibility.

**Automated checks**:
- Build succeeds without errors (`vite build`)
- No hardcoded ports in server code
- Environment variables accessed through proper env module (not `process.env` directly in client code)

**Manual review criteria**:
- Are error boundaries catching and logging unhandled exceptions?
- Is the dev server configuration production-compatible?
- Are database migrations idempotent?
- Are S3 uploads using proper key patterns (non-enumerable)?

### Panel 11: Data Engineer (Schema & Query Design)

**Evaluates**: Database schema normalization, index strategy, query efficiency, data integrity constraints, migration safety, relationship modeling.

**Code review criteria**:
- Are foreign keys properly defined?
- Are indexes on frequently queried columns?
- Are timestamps stored as UTC milliseconds?
- Are Stripe IDs stored as references (not duplicating Stripe data)?
- Are soft deletes used where appropriate?
- Are query helpers returning raw Drizzle rows (not formatting in DB layer)?

### Panel 12: Internationalization Expert (i18n/L10n)

**Evaluates**: Locale readiness, character encoding, RTL support preparation, date/number formatting, string externalization, HTML lang attribute.

**Automated checks**:
- `<html>` element has `lang` attribute
- `<meta charset="UTF-8">` present
- Date/time displays use `toLocaleString()` or equivalent

**Manual review criteria**:
- Are user-facing strings hardcoded or externalized?
- Would the layout break with longer translated strings (German, Finnish)?
- Are number formats locale-aware?

### Panel 13: API Designer (REST/tRPC Contract Specialist) — Manual Review

**Evaluates**: Procedure naming conventions, input validation (Zod schemas), error handling patterns, pagination, rate limiting, versioning strategy.

**Code review criteria** (review `server/routers.ts` and `server/db.ts`):
- All tRPC inputs validated with Zod schemas (check for `z.object({...})` on every `.input()`)
- Error messages are user-friendly (not raw database errors) — look for `throw new TRPCError({ message: ... })` with human-readable messages
- Protected procedures use `protectedProcedure` consistently — grep for `publicProcedure` and verify each is intentionally public
- Admin procedures check `ctx.user.role === 'admin'` — verify no admin-only data is accessible via non-admin procedures
- Mutations return meaningful responses (not just `true`) — return the created/updated entity or a typed success object
- List endpoints support pagination where data can grow unbounded (tasks, templates, branches, memory items)
- Procedure names follow consistent `resource.action` pattern (e.g., `templates.list`, `branches.create`)
- No N+1 query patterns in list endpoints (use joins or batch queries)

### Panel 14: Animation/Motion Designer (Micro-interactions) — Manual Review

**Evaluates**: Animation purpose, timing curves, duration appropriateness, reduced-motion support, loading transitions, state change animations.

**Review criteria** (review components using `framer-motion` and CSS transitions):
- Do animations serve a purpose (guide attention, confirm action, show state change)?
- Are durations appropriate (150-300ms for micro-interactions, 300-500ms for page transitions)?
- Is `prefers-reduced-motion` respected? (Check for `@media (prefers-reduced-motion: reduce)` in CSS or `useReducedMotion()` hook usage)
- Are skeleton loaders used instead of spinners for content areas?
- Are exit animations defined (not just enter)? Check `AnimatePresence` usage wraps components that unmount
- Do animations use `ease-out` for enters and `ease-in` for exits?
- **Key files to review**: `Home.tsx` (greeting animation, suggestion cards), `TaskView.tsx` (message streaming), `AppLayout.tsx` (sidebar transitions), any component importing from `framer-motion`

### Panel 15: Content Strategist (Copy & Microcopy) — Manual Review

**Evaluates**: Button labels, error messages, empty states, tooltips, placeholder text, onboarding copy, consistency of voice and tone.

**Review criteria** (review all user-facing strings across pages):
- Are button labels action-oriented ("Create task" not "Submit")?
- Are error messages helpful (explain what went wrong AND how to fix it)?
- Are empty states encouraging (suggest next action, not just "Nothing here")?
- Is the tone consistent across all pages (warm, professional, concise)?
- Are tooltips informative without being verbose?
- Does the greeting match Manus's voice ("Hello." / "What can I do for you?")?

### Panel 16: Privacy/Compliance Officer (GDPR/CCPA Awareness) — Manual Review

**Evaluates**: Data collection transparency, consent mechanisms, data retention policies, user data export, account deletion, cookie usage disclosure.

**Review criteria** (review auth flow, data storage, third-party integrations):
- Is it clear what data the app collects?
- Can users delete their account and data?
- Are third-party services (Stripe, analytics) disclosed?
- Is session data properly scoped and expiring?
- Are cookies used only for essential functionality (auth session)?
- Is there a privacy policy or terms of service link?

---

## §2 — Virtual User Personas

Each persona navigates the full application at their characteristic viewport, performing their typical tasks. Issues are flagged when any interactive element is blocked (z-index stacking), unreachable (off-screen without scroll), or non-functional.

**Executed by**: `test-virtual-users.mjs`

### Persona A: Mobile Power User (390×844)
- Opens app on iPhone, creates tasks via voice and text
- Navigates between tasks rapidly using sidebar
- Checks analytics and billing on the go
- Tests: sidebar drawer, touch targets, horizontal overflow, input zoom

### Persona B: Desktop New User (1440×900)
- First visit, no account, exploring the app
- Reads suggestion cards, tries creating a task
- Navigates to Settings, Library, Projects
- Tests: onboarding clarity, empty states, navigation coherence

### Persona C: Tablet User (768×1024)
- Uses iPad in portrait mode
- Manages projects and reviews task history
- Tests: intermediate breakpoint, sidebar behavior, content reflow

### Persona D: Small Desktop (1280×720)
- Laptop user with limited screen real estate
- Multitasks between tasks and settings
- Tests: content truncation, scroll behavior, sidebar collapse

**Automated Checks (per persona × per page)**:
- Verify all interactive elements are reachable via `elementFromPoint`
- Exclude elements scrolled out of their scroll container's visible area (check `overflow-y: auto/scroll/hidden` ancestors and compare element position to container bounds)
- Exclude elements positioned off-screen (x < 0 or y < 0 or x > viewport width)
- Flag any element where `elementFromPoint(centerX, centerY)` returns a different element (blocked by z-index stacking)

---

## §3 — Visual Audit

Playwright-driven screenshot comparison across all pages at both viewports (26 total checks).

**Executed by**: `test-v10-visual-audit.mjs`

**Per-page checks**:
1. **Overflow detection**: No element extends beyond viewport width, accounting for all ancestor containers with `overflow: hidden`, `overflow: auto`, `overflow: scroll`, or `overflow: clip`
2. **Touch target sizing**: All interactive elements ≥ 32×32px on mobile (excluding off-screen elements and elements scrolled out of their scroll container's visible area; checking parent wrapper size as fallback for icon buttons)
3. **Screenshot capture**: Full-page screenshots at both viewports for visual regression tracking (saved to `screenshots/` directory)

**Known false-positive exclusions** (encoded in scripts):
- Elements with `x < 0` or `y < 0` (off-screen, typically in collapsed sidebar)
- Elements whose center point falls outside their nearest scroll container's visible bounds
- Elements whose overflow is clipped by any ancestor with `overflow: hidden/auto/scroll/clip`
- Skip-to-content links (accessibility feature, intentionally 1×1px)

---

## §4 — Code Quality Gate

All of the following MUST pass before a convergence check can succeed:

| Gate | Tool | Threshold | Est. Duration |
|------|------|-----------|---------------|
| TypeScript | `npx tsc --noEmit` | 0 errors | ~15s |
| Unit Tests | `npx vitest run` | 0 failures | ~30s |
| Visual Audit | `test-v10-visual-audit.mjs` | 0 findings | ~90s |
| Virtual Users | `test-virtual-users.mjs` | 0 blocked elements | ~60s |
| Expert Panels | `test-expert-panel-assessment.mjs` | 0 CRITICAL, 0 HIGH | ~120s |
| Z-Index Debug | `test-zindex-debug.mjs` | 0 blocked elements | ~30s |

**Total estimated time per full pass**: ~6 minutes

---

## §5 — Execution Protocol

### Phase 1: Investigation (~10 min)
Run all 16 expert panels (12 automated + 4 manual review), 4 virtual user personas, visual audit, and code quality gates. Compile all findings into a structured report with severity classifications.

### Phase 2: Optimization (variable)
Fix all CRITICAL and HIGH findings first. Then fix MEDIUM findings where effort is proportional to impact. Document each fix. Run `tsc --noEmit` after each batch of fixes to catch regressions early.

**Execution order**: Run automated panels (1-12) first, then manual panels (13-16). Automated panels may surface issues that manual review would duplicate. Manual panels should focus on issues that automation cannot detect.

**MEDIUM finding policy**: MEDIUM findings do NOT block convergence but SHOULD be tracked. After convergence is declared, list all remaining MEDIUM/LOW findings as "accepted risk" in the final report. If a MEDIUM finding is trivial to fix (< 5 min), fix it during the optimization phase rather than carrying it forward.

### Phase 3: Validation (~6 min)
Re-run all automated assessments. If any new findings appear at HIGH or CRITICAL, return to Phase 2. If only MEDIUM/LOW remain, proceed.

### Phase 4: Convergence Check
If this pass produced 0 HIGH/CRITICAL findings AND the previous pass also produced 0 HIGH/CRITICAL findings, increment the convergence counter. If the counter reaches 3, declare convergence. If any fix was applied in this pass, reset the counter to 0.

### Phase 5: Report
Generate a comprehensive report documenting:
- Total passes executed
- Findings per pass (by panel, severity)
- Fixes applied (with before/after)
- Convergence trajectory (findings count per pass)
- Remaining MEDIUM/LOW items (accepted risk)
- Re-entry triggers (conditions that should re-open the optimization loop)

---

## §6 — Convergence Criteria

The application is considered **converged** when ALL of the following are true for 3 consecutive passes:

1. **Zero TypeScript errors** — `npx tsc --noEmit` returns clean
2. **Zero test failures** — all vitest specs pass
3. **Zero visual regressions** — Playwright visual audit reports 0 findings
4. **Zero virtual user issues** — all 4 personas complete all journeys without blocked elements
5. **Zero CRITICAL/HIGH expert panel findings** — all 16 panels report no blocking issues
6. **Zero z-index stacking issues** — all interactive elements reachable at all viewports

---

## §7 — Re-entry Triggers

Even after convergence, re-open the optimization loop if:

- New features are added (new pages, new components, new API endpoints)
- Dependencies are upgraded (React, Tailwind, tRPC major versions)
- Design system changes (color palette, typography, spacing scale)
- User feedback reports issues not caught by automated checks
- Accessibility audit by a real screen reader user reveals gaps
- Performance regression detected in production metrics
- Security vulnerability disclosed in a dependency
- Manus design language evolves (re-audit brand alignment)

---

## §8 — Meta-Assessment (Recursive Self-Optimization)

This prompt itself is subject to the same recursive optimization methodology it prescribes. After each full execution cycle, apply the following assessment to the prompt itself:

### Signal Assessment
For each optimization pass type, state whether its signals are present:

- **Fundamental Redesign**: Is the prompt's core structure or premise flawed in a way incremental optimization cannot fix?
- **Landscape**: Has the prompt been challenged? Are there obvious gaps, missing domains, or unexplored alternatives?
- **Depth**: Does broad coverage exist but specific areas remain shallow? Are assumptions untested?
- **Adversarial**: Does the prompt appear solid with no obvious gaps? Look for hidden failure modes, false-positive generators, silent degradation paths.
- **Future-State**: Has the prompt survived adversarial scrutiny? Project forward — what emerging technologies, standards, or paradigms would alter the optimal approach?

### Execute the highest-priority pass whose signals are present.

### Anti-Regression Rule
Do not undo or weaken any improvement from a prior pass unless explicitly flagged with justification. Silent regression is the single most damaging failure mode of recursive optimization.

### Convergence Declaration
If a pass produces no meaningful improvement (no new content, no structural reorganization, no error corrections), declare convergence and define re-entry triggers.

### Rating
Rate the prompt on a 1-10 scale:
- 5 = competent professional work
- 7 = expert-level, would impress a specialist
- 9 = best-in-class, deployable without reservation
- 10 = no improvement possible under any condition

---

## §9 — Lessons Learned (Operational Knowledge)

The following patterns were discovered during actual execution of this protocol and are encoded here to prevent future executors from repeating the same investigations:

### False Positive: Scroll Container Elements
Elements inside a container with `overflow-y: auto` or `overflow-y: scroll` may report `getBoundingClientRect()` positions outside the container's visible area. The `elementFromPoint()` test at those coordinates will return whatever element is visually on top (often the auth section or footer). **These are not blocked elements** — they are simply scrolled out of view and become accessible when scrolled into view. All assessment scripts must check whether an element's center falls within its nearest scroll container's visible bounds before flagging it.

### False Positive: Ancestor Overflow Clipping
Elements may report `right` values beyond the viewport width, but if any ancestor has `overflow: hidden`, `overflow: auto`, `overflow: scroll`, or `overflow: clip`, the element is visually clipped and not actually overflowing. All overflow detection must walk the ancestor chain.

### False Positive: Off-Screen Sidebar Elements
When the sidebar is collapsed on mobile, elements inside it have `x < 0`. These are not accessibility issues — they are intentionally off-screen. Exclude all elements with `x < 0` or `y < 0` from touch target and reachability checks.

### False Positive: Icon Buttons
Small SVG icons (16×16, 24×24) inside larger button wrappers (44×44) are not touch target violations. Always check the parent element's size as a fallback before flagging a small interactive element.

### Branding Consistency
The application uses "Manus" (not "Manus Next") everywhere. Any branding audit should grep for "Manus Next" across all source files, not just visible page text.

---

**Begin execution. State which phase you are entering and proceed.**
