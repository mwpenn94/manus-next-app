# Panel 15: Content Strategy Audit

**Auditor Lens**: UX Writer + Content Strategist + Onboarding Specialist
**Scope**: All user-facing copy, empty states, error messages, onboarding flow, labels, tooltips
**Date**: 2026-04-23

## Methodology

1. Audit all error messages for actionability (does the user know what to do?)
2. Audit all empty states for helpfulness (does the user know how to populate?)
3. Audit onboarding flow for first-time users
4. Check copy quality across all pages
5. Verify tooltip and label coverage on interactive elements
6. Check for placeholder features without proper communication

## Findings

### F15.1 — PASS: Error messages are generally actionable
**Evidence**: Most error messages include context:
- "GitHub not connected. Please connect GitHub in Connectors first." — tells user exactly what to do
- "No Stripe customer found. Please make a purchase first." — actionable
- "Device is not connected" — clear status
- "Slack webhook URL not configured" — identifies the missing config

**Exception (LOW)**: Some generic "Not found" messages in video.get/delete could be more specific ("Video project not found or you don't have access").

### F15.2 — PASS: Empty states include call-to-action guidance
**Evidence**: Multiple pages use "get started" patterns:
- DeployedWebsitesPage: "Create a project in the App Builder to get started."
- MeetingsPage: "No meetings yet. Record, upload, or paste a transcript to get started."
- MessagingAgentPage: "No connections yet. Add one to get started."
- AppLayout sidebar: "Create a new task to get started"

### F15.3 — MEDIUM: No formal onboarding/welcome flow for first-time users
**Issue**: When a new user logs in for the first time, they land on the Home page with a greeting ("Hello. What can I do for you?") and suggestion cards. This is functional but lacks:
- A guided tour of key features (sidebar navigation, capabilities)
- An explanation of what the platform can do
- A way to set initial preferences (theme, notification settings)
- Progressive disclosure of advanced features

**Impact**: Users may not discover powerful features like Memory, Connectors, Skills, Desktop App, etc.
**Fix**: Consider adding a first-time welcome modal or guided tour. Low priority since the current experience is clean and functional — the DiscoverPage serves as a feature discovery mechanism.

### F15.4 — PASS: Toast messages are consistent and informative
**Evidence**: 60+ toast messages across the app follow consistent patterns:
- `toast.success()` for completed actions
- `toast.error()` for failures with error message
- `toast.info()` for informational states
- Messages are concise and specific

### F15.5 — PASS: Tooltip and aria-label coverage is comprehensive
**Evidence**: 118 tooltip/title attributes and 101 aria-label/aria-describedby attributes across components. Interactive elements have proper accessibility labels.

### F15.6 — PASS: ErrorBoundary wraps the entire app
**Evidence**: `App.tsx` wraps all routes in `<ErrorBoundary>` which catches React render errors and shows a recovery UI. The ErrorBoundary component uses `getDerivedStateFromError` and provides a "Try Again" action.

### F15.7 — LOW: Some error messages expose internal details
**Issue**: A few error messages include raw error text from external services:
- `"Device command failed: ${errText}"` — could expose tunnel internals
- `"Deploy failed: " + (err.message || "Unknown error")` — could expose S3/CloudFront details
**Fix**: Sanitize external error messages before returning to client. Log full details server-side.

### F15.8 — LOW: Video router uses terse "Not found" messages
**Location**: routers.ts L2114, L2121
**Issue**: Both `video.get` and `video.delete` use `message: "Not found"` which is less informative than other routers that use "Video project not found" or similar.
**Fix**: Change to "Video project not found".

## Summary

| Severity | Count | Description |
|----------|-------|-------------|
| HIGH     | 0     | No critical content issues |
| MEDIUM   | 1     | No formal onboarding flow (functional but could be better) |
| LOW      | 3     | Terse error messages, exposed internal details |
| PASS     | 5     | Well-implemented patterns |

## Verdict

Content strategy is **solid overall**. Error messages are mostly actionable, empty states guide users to next actions, toast messages are consistent, and accessibility labels are comprehensive. The main gap is the lack of a formal onboarding flow, which is a feature enhancement rather than a bug. The DiscoverPage partially addresses this by providing template-based feature discovery.
