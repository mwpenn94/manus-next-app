# V10 — Ultimate Recursive Optimization Protocol

> Evolved from v9 Parity Prompt. Designed to be the most comprehensive, expert-grade assessment, optimization, and validation protocol ever executed against this codebase.

## §0 — Philosophy

This protocol treats every dimension of the application as though assessed by the **best domain expert** in that field, optimized by the **best engineer** for that subsystem, and validated by the **best QA team** augmented by **virtual users** representing every audience segment. It exhaustively leverages all capabilities available: Playwright browser automation, parallel processing, deep research, code analysis, visual inspection, and structured testing.

---

## §1 — Expert Panels (Virtual)

Each assessment dimension is evaluated as though by the relevant expert:

| Panel | Expertise | Assesses |
|---|---|---|
| **Security Architect** | OWASP Top 10, encryption, auth flows, data protection | All auth, encryption, input validation, CSRF, XSS, SQL injection |
| **Performance Engineer** | Core Web Vitals, bundle optimization, lazy loading, caching | Bundle size, code splitting, render performance, API latency |
| **Accessibility Specialist** | WCAG 2.1 AA, ARIA, screen readers, keyboard navigation | All interactive elements, color contrast, focus management, semantic HTML |
| **Mobile UX Designer** | iOS/Android HIG, responsive design, touch targets, safe areas | All pages at 375/390/428px, touch target sizes, scroll behavior |
| **Desktop UX Designer** | Information architecture, visual hierarchy, whitespace | All pages at 1280/1440/1920px, layout balance, navigation clarity |
| **API Architect** | REST/tRPC best practices, error handling, rate limiting | All endpoints, error codes, input validation, response shapes |
| **Database Engineer** | Schema normalization, indexing, query optimization | All 33 tables, foreign keys, indexes, query patterns |
| **DevOps Engineer** | CI/CD, deployment, monitoring, error tracking | Build pipeline, test coverage, deployment config, health checks |
| **Product Manager** | Feature completeness, user journeys, edge cases | All 36 pages, feature flows, empty states, error states |
| **QA Lead** | Test strategy, coverage gaps, regression prevention | All 1578 tests, missing test scenarios, flaky test detection |

---

## §2 — Execution Protocol: I→O→V Cycles

Each cycle consists of three phases:

### I — Investigate (Expert Assessment)
1. **Code audit**: Read every modified file, check for anti-patterns, dead code, inconsistencies
2. **Visual audit**: Playwright screenshots at mobile (390px) + desktop (1280px) for every page
3. **Functional audit**: Verify all interactive elements work (forms, buttons, navigation, modals)
4. **Schema audit**: Verify all DB tables have proper indexes, constraints, and relationships
5. **Test audit**: Identify coverage gaps, missing edge cases, flaky patterns

### O — Optimize (Engineering Excellence)
1. Fix every issue found in Investigation
2. Apply best practices from each expert panel
3. Optimize performance bottlenecks
4. Strengthen error handling and edge cases
5. Improve code organization and maintainability

### V — Validate (QA + Virtual Users)
1. Run full test suite (must be 0 failures)
2. Run TypeScript compiler (must be 0 errors)
3. Take Playwright screenshots of all pages (mobile + desktop)
4. Virtual user walkthrough of key journeys
5. Regression check against Protected Improvements

---

## §3 — Virtual User Personas for Validation

| Persona | Device | Journey | Success Criteria |
|---|---|---|---|
| **New User (Sarah)** | iPhone 14 Pro | Land on Home → browse suggestions → submit task → view result | No confusion, clear CTAs, smooth flow |
| **Power User (Alex)** | MacBook Pro 16" | Home → create task → use voice → check memory → view analytics | All features accessible, keyboard shortcuts work |
| **Mobile-First (Raj)** | Android (390px) | Home → billing → settings → schedule task | No layout breaks, touch targets ≥44px, bottom nav works |
| **Accessibility (Kim)** | Desktop + screen reader | Navigate all pages via keyboard only | All elements reachable, proper aria-labels, focus visible |
| **Admin (Jordan)** | Desktop | Settings → manage projects → view analytics → billing | Admin features accessible, role-based access works |

---

## §4 — Convergence Criteria

The protocol converges when ALL of the following are true:
1. **Zero TS errors** — `npx tsc --noEmit` returns 0
2. **Zero test failures** — `npx vitest run` returns 0 failures
3. **Zero visual regressions** — Playwright screenshots show no layout breaks
4. **Zero unchecked items** — `grep -c "\[ \]" todo.md` returns 0
5. **All expert panels satisfied** — No HIGH-severity findings remain
6. **All virtual users complete journeys** — No abandonment points

---

## §5 — Scoring Matrix

Each of the 62 capabilities is scored on 7 dimensions (1-5 scale):

| Dimension | 1 (Critical) | 3 (Acceptable) | 5 (Excellent) |
|---|---|---|---|
| **Functionality** | Broken/missing | Works with edge cases | Handles all scenarios gracefully |
| **Security** | Vulnerabilities present | Basic protection | Defense-in-depth, encrypted, audited |
| **Performance** | >3s load, janky | <1s load, smooth | <200ms, optimized, cached |
| **Accessibility** | Not keyboard-navigable | Basic ARIA | Full WCAG 2.1 AA, tested with screen reader |
| **Mobile UX** | Layout broken | Usable but cramped | Native-feeling, touch-optimized |
| **Desktop UX** | Wasted space | Functional layout | Polished, balanced, delightful |
| **Test Coverage** | No tests | Happy path tested | Edge cases, errors, and integration tested |

**Gate A threshold**: Average ≥ 4.0 across all dimensions, no individual score < 3.

---

## §6 — Execution Log Format

Each pass is logged as:
```
Pass N · ISO timestamp · angle=<focus> · findings=[list] · fixes=[list] · score_delta=+X · convergence=YES/NO
```

---

## §7 — Current Repo State (Pre-v10)

| Metric | Value |
|---|---|
| Schema tables | 33 |
| Router groups | 34 |
| Pages | 36 |
| Tests | 1,578 (63 files) |
| TS errors | 0 |
| Todo checked | 1,874 |
| Todo unchecked | 0 |
| Protected Improvements | 11 |
| Known Gaps | G1-G11 (see PARITY.md) |
