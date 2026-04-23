# Ultimate Parity Assessment & Recursive Optimization Protocol v3

You are the undisputed greatest practitioner alive in this specific domain. This is your magnum opus — the work by which your legacy will be defined. Perfection is the floor, not the ceiling.

You are executing the most comprehensive quality assessment and optimization protocol ever designed for a web application. This protocol synthesizes the expertise of 22 specialist roles, 8 virtual user personas, 7 distinct assessment lenses, automated tooling across all page-viewport combinations, adversarial stress testing, cross-cutting integration analysis, and recursive convergence methodology into a single executable process that exhaustively leverages all capabilities of Manus.

**Scope**: The work being assessed is the Sovereign AI web application — a Manus-aligned agentic task execution platform with 36 pages, 39 components, 17 hooks, 22 agent tools, 4 execution modes, Stripe billing, GDPR compliance, voice streaming, desktop companion, GitHub integration, and a full tRPC API surface. The assessment covers every layer: frontend UI/UX, backend architecture, database design, API contracts, security posture, accessibility compliance, performance characteristics, brand alignment, mobile experience, internationalization readiness, test coverage, deployment health, product completeness, animation quality, content strategy, privacy compliance, engine capability, user journey completeness, adversarial resilience, and cross-cutting integration integrity.

**Convergence Rule**: This protocol runs recursively. Each full pass produces findings. Findings are fixed, then the pass is re-run. Convergence requires **3 consecutive passes with genuinely novel assessment approaches that find 0 actionable findings**. If any pass produces a fix, the convergence counter resets to 0. Each pass MUST use a fundamentally different lens than the previous pass — repeating the same checks is not a novel pass.

**Execution Assets**: This protocol is supported by executable Playwright scripts, vitest test suites, and manual code review checklists. Each assessment layer produces machine-readable JSON results plus human-readable Markdown reports.

| Asset | Purpose | Output |
|-------|---------|--------|
| `npx vitest run` | Full test suite (1,654+ tests) | Pass/fail counts |
| `test-expert-panel-assessment.mjs` | Runs all 12 automated expert panels | `expert-panel-results.json`, `expert-panel-report.md` |
| `test-virtual-users.mjs` | Runs all 4 automated virtual user personas | Console output with per-persona results |
| `test-v10-visual-audit.mjs` | Runs visual audit across 26 page-viewport combos | `screenshots/` directory + console findings |
| `test-zindex-debug.mjs` | Z-index stacking analysis | Console output with blocked elements |
| Manual Panels 13-22 | Code review + LLM-assisted analysis | Markdown audit documents |

---

## §1 — Expert Panel Assessments (22 Panels)

Each panel represents a world-class specialist evaluating the application through their domain lens. Every panel MUST evaluate every page at both mobile (390x844) and desktop (1440x900) viewports unless noted otherwise. Findings are classified as **CRITICAL** (blocks deployment), **HIGH** (must fix before release), **MEDIUM** (should fix), or **LOW** (nice to have).

**Panels 1-12 have automated Playwright checks.** **Panels 13-22 require manual code review or LLM-assisted analysis** — they cannot be fully automated via browser inspection alone.

### Panel 1: UX Designer (Senior, 15+ years)

**Evaluates**: Visual hierarchy, whitespace rhythm, typography scale, layout balance, information density, cognitive load, visual flow, Gestalt principles, affordance clarity, feedback loops.

**Automated checks**:
- Heading hierarchy: H1 >= 20px, H2 >= 16px, H3 >= 14px
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
- All form inputs have associated labels (`<label for>`, `aria-label`, `aria-labelledby`, or `placeholder`)
- All `role="switch"` elements have `aria-checked` and `aria-label`
- All `role="dialog"` elements contain focusable children
- All interactive elements are reachable via Tab key
- No `tabindex` values > 0

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
- Are heavy libraries tree-shaken?
- Are API calls deduplicated (no redundant fetches)?

### Panel 4: Security Researcher (OWASP Top 10 Specialist)

**Evaluates**: XSS vectors, CSRF protection, authentication flow, session management, secret exposure, input sanitization, CSP headers, dependency vulnerabilities.

**Automated checks**:
- No API keys, secrets, or tokens in page source
- No `eval()` in inline scripts
- No `dangerouslySetInnerHTML` without sanitization
- Authentication cookies have `HttpOnly`, `Secure`, `SameSite` flags
- No sensitive data in localStorage/sessionStorage

**Manual review criteria**:
- Are all user inputs sanitized before rendering?
- Are tRPC procedures properly gated (`protectedProcedure` vs `publicProcedure`)?
- Is the OAuth flow resistant to redirect manipulation?
- Are file uploads validated for type and size on both client and server?
- Are file names sanitized to prevent path traversal?
- Are tunnel/proxy URLs validated to prevent SSRF?

### Panel 5: Mobile UX Specialist (iOS/Android, 10+ years)

**Evaluates**: Touch targets, responsive breakpoints, gesture support, viewport overflow, safe area insets, mobile navigation patterns, thumb-zone optimization, input zoom prevention.

**Automated checks**:
- All interactive elements >= 32x32px (ideally 44x44px) on mobile viewport
- No horizontal scroll (page width <= viewport width + 5px tolerance)
- Elements inside scroll containers excluded when scrolled out of view
- Off-screen elements excluded from all checks
- Parent element size checked as fallback for small interactive children

**Known false-positive patterns** (encoded in script):
- Skip-to-content links (1x1px, intentionally hidden)
- Clear/reset buttons inside input fields when sidebar is collapsed
- Toggle/switch components (checked via parent wrapper)

**Manual review criteria**:
- Is the mobile sidebar/drawer pattern intuitive?
- Are form inputs sized to prevent iOS zoom (font-size >= 16px)?
- Is the bottom navigation area utilized for primary actions?
- Do long-press and swipe gestures have discoverable alternatives?

### Panel 6: Brand/Identity Designer (Manus Alignment Specialist)

**Evaluates**: Manus design language adherence, color palette consistency, typography system, logo usage, naming conventions, tone of voice, visual identity coherence.

**Automated checks**:
- No "Manus Next" branding in visible text
- Font family count <= 5 across all pages
- Color palette adherence to CSS custom properties

**Manual review criteria**:
- Does the warm cream background match Manus's light theme?
- Is the greeting pattern consistent with Manus?
- Do suggestion cards match Manus's visual weight and spacing?
- Is the sidebar structure minimal and aligned with Manus's navigation hierarchy?
- Does the agent message style match Manus (plain prose, no bubbles for agent)?
- Is the workspace panel header "Manus's Computer"?
- Does the overall feel convey "crafted" not "assembled"?

### Panel 7: Frontend Architect (React/TypeScript, 12+ years)

**Evaluates**: Component architecture, state management, type safety, code organization, error boundaries, render optimization, hook patterns, dependency management.

**Automated checks**:
- Zero TypeScript errors
- Zero console errors on any page load
- Zero failed tests

**Code review criteria**:
- Are components following single-responsibility principle?
- Are custom hooks extracting reusable logic?
- Are React Query/tRPC patterns consistent?
- Are error boundaries wrapping route-level components?
- Is prop drilling avoided?
- Are `useEffect` dependencies correct?
- Are unstable references stabilized?

### Panel 8: QA Lead (Test Strategy, Edge Cases)

**Evaluates**: Error states, empty states, loading states, boundary conditions, data validation, 404 handling, offline behavior, concurrent user scenarios.

**Automated checks**:
- 404 page renders correctly for unknown routes
- Empty state messaging exists on data-dependent pages
- Loading indicators present during data fetches

**Manual review criteria**:
- What happens when the API returns an error?
- What happens with extremely long text inputs?
- What happens when the user double-clicks a submit button?
- Are optimistic updates rolled back on mutation failure?
- Do all "coming soon" placeholders show toast notifications?

### Panel 9: Product Manager (User Journey Completeness)

**Evaluates**: Core user flows, feature discoverability, onboarding experience, value proposition clarity, task completion rates, navigation coherence.

**Automated checks**:
- Home page has task input
- Home page has suggestion cards
- Sidebar has clear navigation to all major sections

**Manual review criteria**:
- Can a new user understand what the app does within 10 seconds?
- Can a user complete the core flow without confusion?
- Are all sidebar navigation items functional?
- Is the settings page organized logically?
- Are keyboard shortcuts discoverable?

### Panel 10: DevOps Engineer (Deployment & Infrastructure)

**Evaluates**: Build health, deployment readiness, environment configuration, error monitoring, logging, health checks, CI/CD compatibility.

**Automated checks**:
- Build succeeds without errors
- No hardcoded ports in server code
- Environment variables accessed through proper env module

**Manual review criteria**:
- Are error boundaries catching and logging unhandled exceptions?
- Is the dev server configuration production-compatible?
- Are database migrations idempotent?
- Are S3 uploads using proper key patterns?

### Panel 11: Data Engineer (Schema & Query Design)

**Evaluates**: Database schema normalization, index strategy, query efficiency, data integrity constraints, migration safety, relationship modeling.

**Code review criteria**:
- Are foreign keys properly defined?
- Are indexes on frequently queried columns?
- Are timestamps stored as UTC milliseconds?
- Are Stripe IDs stored as references (not duplicating Stripe data)?
- Are query helpers returning raw Drizzle rows?

### Panel 12: Internationalization Expert (i18n/L10n)

**Evaluates**: Locale readiness, character encoding, RTL support preparation, date/number formatting, string externalization, HTML lang attribute.

**Automated checks**:
- `<html>` element has `lang` attribute
- `<meta charset="UTF-8">` present
- Date/time displays use `toLocaleString()` or equivalent

### Panel 13: API Designer (tRPC Contract Specialist) — Manual Review

**Evaluates**: Procedure naming conventions, input validation (Zod schemas), error handling patterns, pagination, rate limiting, ownership checks.

**Code review criteria** (review `server/routers.ts` and `server/db.ts`):
- All tRPC inputs validated with Zod schemas with appropriate `.max()` constraints
- Error messages are user-friendly (not raw database errors)
- Protected procedures use `protectedProcedure` consistently
- Admin procedures check `ctx.user.role === 'admin'`
- Mutations return meaningful responses
- List endpoints support pagination where data can grow unbounded
- Ownership checks verify `userId === ctx.user.id` before update/delete operations
- No N+1 query patterns in list endpoints

### Panel 14: Animation/Motion Designer (Micro-interactions) — Manual Review

**Evaluates**: Animation purpose, timing curves, duration appropriateness, reduced-motion support, loading transitions, state change animations.

**Review criteria**:
- Do animations serve a purpose?
- Are durations appropriate (150-300ms micro, 300-500ms page)?
- Is `prefers-reduced-motion` respected?
- Are skeleton loaders used instead of spinners for content areas?
- Are exit animations defined?
- Do animations use `ease-out` for enters and `ease-in` for exits?

### Panel 15: Content Strategist (Copy & Microcopy) — Manual Review

**Evaluates**: Button labels, error messages, empty states, tooltips, placeholder text, onboarding copy, consistency of voice and tone.

**Review criteria**:
- Are button labels action-oriented?
- Are error messages helpful (what went wrong AND how to fix)?
- Are empty states encouraging (suggest next action)?
- Is the tone consistent across all pages?
- Does the greeting match Manus's voice?

### Panel 16: Privacy/Compliance Officer (GDPR/CCPA) — Manual Review

**Evaluates**: Data collection transparency, consent mechanisms, data retention policies, user data export, account deletion, cookie usage disclosure.

**Review criteria**:
- Can users delete their account and ALL associated data?
- GDPR deleteAllData covers ALL user-owned tables (currently 35)
- GDPR exportData exports ALL user-owned tables with proper redaction
- Are third-party services disclosed?
- Is session data properly scoped and expiring?
- Are cookies used only for essential functionality?

### Panel 17: Adversarial Security Tester (Penetration Testing) — Manual Review

**Evaluates**: SQL injection, XSS, CSRF, SSRF, path traversal, prototype pollution, race conditions, information leakage, authentication bypass.

**Review criteria**:
- Are all user inputs parameterized (no raw SQL)?
- Are file names sanitized to prevent `../` traversal?
- Are proxy/tunnel URLs validated against SSRF?
- Are webhook signatures verified before processing?
- Are error messages free of stack traces and internal paths?
- Are rate limiters applied to expensive operations (LLM, image gen, file upload)?
- Are concurrent mutations protected against race conditions?

### Panel 18: Engine Capability Assessor (26 Engines) — Manual Review

**Evaluates**: Each of the 26 engines' functional completeness, depth, and alignment with Manus's capabilities. Assesses from both principles-first (understanding architecture) and applications-first (getting things done) user perspectives.

**Engine list**: Reasoning, Task Execution, Agentic Loop, Voice, Memory, Scheduling, Connectors, Skills, Library, Projects, Design, Meetings, Teams, Analytics, Billing/Stripe, GDPR/Privacy, Notifications, Sharing, Desktop Companion, GitHub Integration, WebApp Builder, Video Generation, Client Inference, Slides, Mail, Webhooks/API.

**Per-engine criteria**:
- Does the engine fulfill its core promise?
- Can a principles-first user understand its architecture?
- Can an applications-first user accomplish their goal without friction?
- Does the engine's UI/UX match Manus's design language?
- Are loading, empty, and error states handled?
- Are mutations protected with onError handlers?
- Does the engine degrade gracefully when dependencies are unavailable?

### Panel 19: Cross-Cutting Integration Analyst — Manual Review

**Evaluates**: E2E data flows across multiple engines, state consistency between client and server, error propagation from database through tRPC to UI, navigation state coherence.

**Review criteria**:
- Does task creation flow correctly from Home → TaskView → agent execution → completion?
- Are all mutations across all pages using onError handlers?
- Are useEffect cleanup functions present where needed?
- Are date/time values consistently UTC throughout the stack?
- Do navigation guards prevent accessing protected routes when unauthenticated?

### Panel 20: Dependency & Architecture Health Analyst — Manual Review

**Evaluates**: Circular imports, unused exports, bundle composition, large file decomposition, console.log hygiene, TODO/FIXME/HACK cleanup, env variable safety.

**Review criteria**:
- Are there circular import chains?
- Are there unused server files or dead exports?
- Are large files (>500 lines) justified or should they be split?
- Are console.log statements operational logging (not debug artifacts)?
- Are there TODO/FIXME/HACK comments in production code?
- Are hardcoded secrets absent from source code?
- Are env variables accessed with proper fallbacks?

### Panel 21: Virtual User Journey Analyst — Manual Review

**Evaluates**: Complete user journeys simulated by 8 personas (see §2), testing every engine from the user's perspective, including first-time experience, power user workflows, and edge cases.

**Review criteria**:
- Can each persona complete their characteristic tasks without confusion?
- Are there dead ends in any navigation path?
- Do all interactive elements provide feedback on interaction?
- Are error recovery paths clear and functional?

### Panel 22: Documentation & Onboarding Specialist — Manual Review

**Evaluates**: In-app help, onboarding flow, keyboard shortcut discoverability, tooltip coverage, beginner guide accuracy, platform guide completeness.

**Review criteria**:
- Does the onboarding flow introduce all key features?
- Are tooltips present on non-obvious UI elements?
- Is the beginner guide accurate to the current state?
- Is the platform guide comprehensive and up-to-date?
- Are keyboard shortcuts documented and discoverable?

---

## §2 — Virtual User Personas (8 Personas)

Each persona navigates the full application at their characteristic viewport, performing their typical tasks. Issues are flagged when any interactive element is blocked, unreachable, or non-functional.

### Persona A: Mobile Power User (390x844)
- Opens app on iPhone, creates tasks via voice and text
- Navigates between tasks rapidly using sidebar
- Checks analytics and billing on the go
- Tests: sidebar drawer, touch targets, horizontal overflow, input zoom

### Persona B: Desktop New User (1440x900)
- First visit, no account, exploring the app
- Reads suggestion cards, tries creating a task
- Navigates to Settings, Library, Projects
- Tests: onboarding clarity, empty states, navigation coherence

### Persona C: Tablet User (768x1024)
- Uses iPad in portrait mode
- Manages projects and reviews task history
- Tests: intermediate breakpoint, sidebar behavior, content reflow

### Persona D: Small Desktop (1280x720)
- Laptop user with limited screen real estate
- Multitasks between tasks and settings
- Tests: content truncation, scroll behavior, sidebar collapse

### Persona E: Principles-First Researcher (1920x1080)
- Wants to understand HOW the agent works
- Explores mode system, tool definitions, reasoning traces
- Tests: transparency of agent behavior, mode descriptions, tool documentation

### Persona F: Applications-First Business User (1440x900)
- Wants to GET THINGS DONE quickly
- Creates tasks, reviews results, shares outputs
- Tests: task completion speed, result quality, sharing workflow

### Persona G: Accessibility User (1440x900, screen reader)
- Navigates entirely via keyboard and screen reader
- Creates a task, reviews results, adjusts settings
- Tests: ARIA labels, focus management, error announcements, skip navigation

### Persona H: Admin/Owner User (1440x900)
- Manages platform settings, reviews analytics, manages billing
- Tests: admin-only features, role-based access, Stripe integration, GDPR tools

**Automated Checks (per persona x per page)**:
- Verify all interactive elements are reachable via `elementFromPoint`
- Exclude elements scrolled out of their scroll container's visible area
- Exclude elements positioned off-screen
- Flag any element where `elementFromPoint(centerX, centerY)` returns a different element

---

## §3 — Seven Assessment Lenses

Each convergence attempt MUST use a genuinely different lens. The following lenses are defined in priority order. After all 7 have been used, cycle back with increased depth.

| Lens | Focus | Novel Contribution |
|------|-------|-------------------|
| 1. Automated Testing | vitest, TypeScript, Playwright scripts | Known-checks baseline — catches regressions |
| 2. Expert Panel Review | 22 specialist panels (12 automated + 10 manual) | Domain-specific depth — catches design/architecture issues |
| 3. Virtual User Simulation | 8 personas across all journeys | UX-focused — catches usability and journey issues |
| 4. Adversarial Stress Testing | Malicious inputs, race conditions, broken network | Security-focused — catches resilience issues |
| 5. Cross-Cutting Integration | E2E data flows, state consistency | Multi-layer — catches integration issues |
| 6. Architecture & Dependencies | Circular imports, unused code, secrets | Structural — catches health issues |
| 7. Accessibility & Responsive | ARIA, keyboard nav, mobile, color contrast | Compliance — catches inclusion issues |

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

**Total estimated time per automated pass**: ~6 minutes

---

## §5 — Execution Protocol

### Phase 1: Investigation (~30 min)
Run all 22 expert panels (12 automated + 10 manual review), 8 virtual user personas, visual audit, and code quality gates. Compile all findings into a structured report with severity classifications. Each manual panel should review the actual source code, not just browser output.

### Phase 2: Optimization (variable)
Fix all CRITICAL and HIGH findings first. Then fix MEDIUM findings where effort is proportional to impact. Write vitest tests for every fix. Run `npx vitest run` after each batch of fixes to catch regressions early.

**Execution order**: Run automated panels (1-12) first, then manual panels (13-22). Automated panels may surface issues that manual review would duplicate. Manual panels should focus on issues that automation cannot detect.

**MEDIUM finding policy**: MEDIUM findings do NOT block convergence but SHOULD be tracked. After convergence is declared, list all remaining MEDIUM/LOW findings as "accepted risk" in the final report. If a MEDIUM finding is trivial to fix (< 5 min), fix it during the optimization phase.

### Phase 3: Validation (~6 min)
Re-run all automated assessments. If any new findings appear at HIGH or CRITICAL, return to Phase 2. If only MEDIUM/LOW remain, proceed.

### Phase 4: Convergence Check
If this pass produced 0 actionable findings AND used a genuinely novel lens, increment the convergence counter. If the counter reaches 3, declare convergence. If any fix was applied in this pass, reset the counter to 0.

### Phase 5: Report
Generate a comprehensive report documenting:
- Total passes executed
- Findings per pass (by panel, severity, lens)
- Fixes applied (with before/after and test coverage)
- Convergence trajectory (findings count per pass)
- Remaining MEDIUM/LOW items (accepted risk)
- Platform health metrics (tests, pages, components, accessibility counts)
- Re-entry triggers

---

## §6 — Convergence Criteria

The application is considered **converged** when ALL of the following are true for 3 consecutive passes with genuinely novel lenses:

1. **Zero TypeScript errors** — `npx tsc --noEmit` returns clean
2. **Zero test failures** — all vitest specs pass
3. **Zero visual regressions** — Playwright visual audit reports 0 findings
4. **Zero virtual user issues** — all 8 personas complete all journeys without blocked elements
5. **Zero CRITICAL/HIGH expert panel findings** — all 22 panels report no blocking issues
6. **Zero z-index stacking issues** — all interactive elements reachable at all viewports
7. **Zero adversarial findings** — no exploitable vulnerabilities found
8. **Zero cross-cutting integration issues** — all E2E flows consistent

---

## §7 — Protected Improvements (Never Weaken)

The following improvements have been verified and MUST NOT be regressed by any optimization pass:

| ID | What | Evidence |
|----|------|----------|
| PI-1 | Bundle optimization 985KB -> 291KB | Code splitting + lazy loading |
| PI-2 | Server-side message persistence | Messages survive client disconnects |
| PI-3 | 1,654+ tests across 70 files | Regression safety net |
| PI-4 | GDPR deleteAllData covers all 35 tables | Correct dependency order + user deletion |
| PI-5 | GDPR exportData covers all 35 tables | Proper redaction of secrets |
| PI-6 | File name sanitization on upload | Path traversal protection |
| PI-7 | Tunnel URL validation | SSRF prevention |
| PI-8 | Onboarding tooltips for first-time users | 5-step guided tour |
| PI-9 | Tool turn counter in TaskView | Streaming progress visibility |
| PI-10 | All mutations have onError handlers | 12 mutations fixed across 5 pages |
| PI-11 | Input length constraints on API endpoints | Skill, connector, library procedures |
| PI-12 | Ownership checks on design/device endpoints | Authorization enforcement |

---

## §8 — Known Gaps (From PARITY.md)

These are known capability gaps that require external dependencies or owner action:

| ID | Gap | Current State | Blocker |
|----|-----|---------------|---------|
| G1 | Microsoft 365 | YELLOW (scaffold) | Requires Azure AD credentials |
| G2 | Veo3 Video | YELLOW (scaffold) | Requires API access |
| G3 | Cross-model judge | Self-assessed | Requires external model |
| G6 | Browser automation | NOT PRESENT | Requires headless browser integration |
| G7 | Code execution sandbox | NOT PRESENT | Requires sandboxed runtime |
| G8 | File system access | NOT PRESENT | Requires virtual FS over S3 |
| G9 | Document generation | NOT PRESENT | Requires server-side PDF/DOCX |
| G10 | Task replay UI | NOT PRESENT | Requires step logging |
| G11 | Artifact preview | NOT PRESENT | Requires syntax highlighting |

These gaps do NOT block convergence but are tracked for future development.

---

## §9 — Re-entry Triggers

Even after convergence, re-open the optimization loop if:

- New features are added (new pages, components, API endpoints)
- Dependencies are upgraded (React, Tailwind, tRPC major versions)
- Design system changes (color palette, typography, spacing scale)
- User feedback reports issues not caught by automated checks
- Accessibility audit by a real screen reader user reveals gaps
- Performance regression detected in production metrics
- Security vulnerability disclosed in a dependency
- Manus design language evolves (re-audit brand alignment)
- New engines are added or existing engines are significantly refactored
- GDPR/privacy regulations change (re-audit compliance)
- New virtual user personas are identified (re-run journey testing)

---

## §10 — Meta-Assessment (Recursive Self-Optimization)

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

## §11 — Lessons Learned (Operational Knowledge)

The following patterns were discovered during actual execution of this protocol and are encoded here to prevent future executors from repeating the same investigations:

### False Positive: Scroll Container Elements
Elements inside a container with `overflow-y: auto` or `overflow-y: scroll` may report positions outside the container's visible area. The `elementFromPoint()` test at those coordinates will return whatever element is visually on top. **These are not blocked elements** — they are simply scrolled out of view. All assessment scripts must check whether an element's center falls within its nearest scroll container's visible bounds before flagging it.

### False Positive: Ancestor Overflow Clipping
Elements may report `right` values beyond the viewport width, but if any ancestor has `overflow: hidden/auto/scroll/clip`, the element is visually clipped and not actually overflowing. All overflow detection must walk the ancestor chain.

### False Positive: Off-Screen Sidebar Elements
When the sidebar is collapsed on mobile, elements inside it have `x < 0`. These are intentionally off-screen. Exclude all elements with `x < 0` or `y < 0` from touch target and reachability checks.

### False Positive: Icon Buttons
Small SVG icons inside larger button wrappers are not touch target violations. Always check the parent element's size as a fallback.

### Branding Consistency
The application uses "Manus" (not "Manus Next") everywhere. Branding audits should grep across all source files.

### GDPR Cascade Order
When deleting user data across 35 tables, the deletion order MUST respect foreign key dependencies. Tables referencing other user-owned tables must be deleted first. The current implementation handles this correctly — do not reorder without verifying the dependency graph.

### Mutation Error Handling
Every `useMutation()` call MUST have either an `onError` callback or be wrapped in a try/catch around `mutateAsync`. The cross-cutting audit found 12 mutations missing this pattern. The Library.tsx `extractPdfText` mutation uses try/catch around mutateAsync, which is an acceptable alternative to onError.

### Console.log in Server Code
Server-side console.log statements for webhook events, stream lifecycle, and error context are operational logging, not debugging artifacts. Do not flag these as issues unless they contain PII.

---

## §12 — Execution Checklist

Use this checklist to track progress through the protocol:

- [ ] Run automated code quality gate (vitest + TypeScript)
- [ ] Run automated expert panels 1-12
- [ ] Run virtual user personas (automated)
- [ ] Run visual audit
- [ ] Run z-index debug
- [ ] Execute manual Panel 13: API Contract Review
- [ ] Execute manual Panel 14: Animation/Motion Review
- [ ] Execute manual Panel 15: Content Strategy Review
- [ ] Execute manual Panel 16: Privacy/Compliance Review
- [ ] Execute manual Panel 17: Adversarial Security Review
- [ ] Execute manual Panel 18: Engine Capability Assessment (26 engines)
- [ ] Execute manual Panel 19: Cross-Cutting Integration Review
- [ ] Execute manual Panel 20: Architecture & Dependencies Review
- [ ] Execute manual Panel 21: Virtual User Journey Review (8 personas)
- [ ] Execute manual Panel 22: Documentation & Onboarding Review
- [ ] Fix all CRITICAL/HIGH findings
- [ ] Fix all MEDIUM findings (where effort < 5 min)
- [ ] Write vitest tests for all fixes
- [ ] Re-run automated gates
- [ ] Convergence check (pass counter: _/3)
- [ ] Generate consolidated report
- [ ] Update PARITY.md with new protected improvements
- [ ] Update todo.md with completed items

---

**Begin execution. State which phase you are entering, which lens you are using, and proceed.**
