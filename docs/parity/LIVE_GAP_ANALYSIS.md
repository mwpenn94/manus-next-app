# Exhaustive Live Gap Analysis: Manus Next App vs Manus Platform

**Date:** April 19, 2026  
**Method:** Code review + live screenshot audit + API testing + Manus feature research  
**Counter:** 0 (reset — this is the initial assessment)

---

## Dimension 1: UI/UX — Sidebar & Navigation

### GAP-001: Sign-in button hidden below fold (CRITICAL)
The sidebar footer contains 18 navigation links + auth section. At standard viewport heights (900px), the sign-in button is pushed below the visible area. The user confirmed they had to "zoom out significantly" to find it.

**Root cause:** The sidebar footer (`div.border-t.border-sidebar-border.p-2`) is `shrink-0` but contains too many items. The task list area (`flex-1 overflow-y-auto`) takes most space, but the footer itself has no scroll — it just overflows off-screen.

**Fix:** Make the sidebar footer scrollable, or group nav items into collapsible sections, or use a two-column grid for nav items to reduce vertical space.

### GAP-002: Mobile bottom nav only has 4 items (MODERATE)
MobileBottomNav.tsx only shows Home, Tasks, Billing, Settings. Desktop sidebar has 18 nav destinations. Mobile users cannot access Memory, Projects, Schedules, Replay, Skills, Slides, Design, Meetings, Connectors, App Builder, Team, Computer, Figma Import, Desktop App, or Messaging without opening the hamburger drawer.

**Manus comparison:** Manus mobile app provides full navigation access.

### GAP-003: No hamburger menu visible on mobile (MODERATE)
The mobile drawer exists in code but the hamburger trigger may not be prominent enough. The MobileBottomNav takes up bottom space but doesn't provide access to all features.

---

## Dimension 2: Accessibility

### GAP-004: maximum-scale=1 disables pinch zoom (CRITICAL)
`client/index.html` line 8: `maximum-scale=1` prevents mobile users from zooming. This is a WCAG 2.1 Level AA violation (Success Criterion 1.4.4 Resize Text).

**Fix:** Remove `maximum-scale=1` from the viewport meta tag.

### GAP-005: Color contrast failures (CRITICAL)
Console errors from axe-core show:
- Foreground #0c0a09 on background #090706 = contrast ratio 1.01:1 (requires 4.5:1)
- Foreground #6f6c68 on background #0c0a08 = contrast ratio 3.78:1 (requires 4.5:1)

These are the suggestion card text colors on the dark theme.

**Fix:** Increase muted-foreground lightness in the OKLCH color definition.

### GAP-006: Buttons without accessible labels
Some icon-only buttons (paperclip, mic, submit arrow) lack aria-label attributes. Screen readers cannot identify their purpose.

---

## Dimension 3: Architecture & Code Quality

### GAP-007: Router file too large (MODERATE)
`server/routers.ts` is 1832 lines — the template recommends splitting at ~150 lines. This makes maintenance difficult and increases merge conflict risk.

**Manus comparison:** Manus likely uses microservice architecture with separate route handlers.

### GAP-008: No rate limiting (MODERATE)
Zero rate limiting found in the server code. Any authenticated user could hammer the API.

### GAP-009: No CSRF protection (LOW)
No CSRF tokens or SameSite cookie enforcement found beyond what the framework provides by default.

### GAP-010: 0 TypeScript errors (GREEN)
TypeScript compilation passes cleanly.

### GAP-011: 222 tests all passing (GREEN)
Full test suite passes: 13 test files, 222 tests.

### GAP-012: 287 Zod validations in routers (GREEN)
Strong input validation throughout.

---

## Dimension 4: Feature Parity

### GAP-013: Task execution is simulated, not real (CRITICAL)
The app creates tasks and shows a chat interface, but actual autonomous execution (web browsing, code running, file creation) is simulated via LLM responses rather than real sandbox execution like Manus.

**Manus comparison:** Manus runs tasks in isolated sandboxes with real browser, code execution, and file system access.

**Assessment:** This is an inherent architectural limitation — the app is a UI clone, not a full agent runtime. Acknowledged as a known constraint.

### GAP-014: Connectors — OAuth flow works but limited providers
Connectors page exists with OAuth integration for Google, GitHub, Notion. The connector update was not live until directed.

**Manus comparison:** Manus supports Gmail, Google Drive, GitHub, Notion, and more with deep workflow automation.

### GAP-015: Slides — UI exists but generation is placeholder
Slides page exists with deck management UI but actual AI slide generation may be limited.

### GAP-016: Design — UI exists but generation is placeholder
Design page exists but actual AI design generation capability is limited.

### GAP-017: Computer Use — UI exists but no real desktop integration
Computer page exists with session management UI but cannot actually control a user's desktop.

**Manus comparison:** Manus "My Computer" provides real desktop integration with local file access.

### GAP-018: Figma Import — UI exists but no real Figma API integration
Page exists but actual Figma API connection is not implemented.

### GAP-019: Desktop App — UI exists but no real desktop app
Page exists with download links but no actual Electron/Tauri app.

### GAP-020: Messaging — UI exists but no real messaging integration
Page exists but no actual Telegram/WhatsApp/Slack integration.

---

## Dimension 5: Performance

### GAP-021: No lazy loading of page components (MODERATE)
App.tsx imports all 24 page components eagerly. Only 2 lazy/Suspense references found. This increases initial bundle size.

**Fix:** Use React.lazy() for all page components.

### GAP-022: No image lazy loading (LOW)
No `loading="lazy"` attributes found on images.

---

## Dimension 6: Security

### GAP-023: 122 protected procedures, 5 public (GREEN)
Strong auth boundary — most endpoints require authentication.

### GAP-024: No raw SQL injection risk (GREEN)
Only Drizzle ORM queries found, no raw SQL concatenation.

### GAP-025: Single dangerouslySetInnerHTML in chart component (GREEN)
Only in shadcn chart component, not user-facing content.

---

## Dimension 7: Developer Experience

### GAP-026: Comprehensive test suite (GREEN)
13 test files covering auth, bridge, connectors, features, parity, preferences, streaming, workspace, agent tools, and more.

### GAP-027: No CI/CD pipeline (MODERATE)
No GitHub Actions or CI configuration found. Tests must be run manually.

---

## Dimension 8: Deployment & Operations

### GAP-028: Stripe integration configured but unclaimed (MODERATE)
Stripe sandbox provisioned but user hasn't claimed it yet. Payment flows won't work until claimed.

### GAP-029: Custom domain available (GREEN)
manusnext-mlromfub.manus.space is configured and accessible.

---

## Priority Matrix

| Priority | Gap IDs | Description |
|----------|---------|-------------|
| P0 (Critical) | GAP-001, GAP-004, GAP-005 | Sign-in hidden, zoom disabled, contrast failures |
| P1 (High) | GAP-002, GAP-006, GAP-021 | Mobile nav incomplete, a11y labels, lazy loading |
| P2 (Medium) | GAP-003, GAP-007, GAP-008, GAP-027 | Hamburger, router size, rate limiting, CI |
| P3 (Low/Known) | GAP-009, GAP-013-020, GAP-022 | CSRF, feature placeholders, image lazy |

---

## Action Plan

### Batch 1 (Critical — fix now):
1. Fix sidebar overflow so sign-in button is always visible
2. Remove maximum-scale=1 from viewport meta
3. Fix color contrast ratios for muted-foreground
4. Add aria-labels to icon-only buttons

### Batch 2 (High — fix next):
5. Expand mobile bottom nav or add "More" menu
6. Add React.lazy() for all page components
7. Add image lazy loading attributes

### Batch 3 (Medium — fix if time):
8. Split routers.ts into feature modules
9. Add basic rate limiting
10. Set up CI pipeline
