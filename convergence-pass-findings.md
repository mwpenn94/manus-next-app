# Recursive Optimization — Batch 1 LANDSCAPE Findings

## Pass 1: Critical Parity Gaps (Severity: CRITICAL → HIGH → MEDIUM → LOW)

### CRITICAL-001: PDF Export Renders Black Page
**Status:** FIX APPLIED (this session)
**Root cause:** `mask-image` CSS gradient on `[data-print-container]` masks all content in print mode. Plus dark theme CSS variables bleed through.
**Fix:** Added `mask-image: none !important` and comprehensive print overrides for html/body/#root chain, semantic color classes, and motion elements.

### CRITICAL-002: Mobile Bottom Nav Has Too Many Items
**Status:** NEEDS FIX
**Manus has:** Home, Tasks, Billing, More (4 items)
**We have:** Home, Tasks, Billing + 12 more items in overflow
**More sheet items in Manus:** Projects, Library, Skills, Schedule, Connectors, Settings, Help (~7 items)
**We have in More:** Projects, Library, Skills, Schedule, Connectors, Memory, GitHub, Discover, Webhooks, Data Controls, Settings, Help (12 items)
**Fix needed:** Remove Webhooks, Data Controls from More (admin-only). Remove Discover (merge into Home suggestions). Keep Memory and GitHub but consider consolidating.

### CRITICAL-003: Sidebar "Explore" Section Has Non-Manus Items
**Status:** NEEDS FIX
**Current items (line 724-733):** Projects, Library, Skills, Schedule, Connectors, Memory, GitHub, Billing, Discover, Help
**Manus equivalent:** Projects, Library, Skills, Schedule, Connectors, Settings, Help
**Fix needed:** Remove Discover (merge into Home). Move Billing to settings/profile area. Keep Memory and GitHub as they're valid features.

### HIGH-001: Agent Self-Awareness — Claims It Cannot Deploy/Render
**Status:** NEEDS INVESTIGATION
**Issue:** When asked "Can you render the app here?", agent says NO — but it literally runs inside the webapp builder. The agent's system prompt needs to include awareness that it IS the platform.
**Fix needed:** Update agent system prompt to include self-awareness context about its own platform capabilities.

### HIGH-002: GitHub Tool Response Quality — Generic Instead of Specific
**Status:** PARTIALLY ADDRESSED
**Issue:** "Show me what's in my connected repo" returns CI/CD guide instead of actual file listing.
**Current state:** System prompt has routing rules (line 250) but LLM doesn't always follow them.
**Fix needed:** Strengthen the tool selection prompt, possibly add a forced tool call for "show repo" queries.

### MEDIUM-001: Mobile Sidebar Cramped
**Status:** NEEDS FIX
**Issue:** Sidebar takes full width on mobile, no dismiss gesture, tight padding on chat messages.
**Fix needed:** Improve mobile sidebar dismiss behavior, increase chat message padding on mobile.

### MEDIUM-002: Status Indicators Use Plain 'X' Instead of Icons
**Status:** NEEDS FIX
**Issue:** Negative status indicators show text 'X' instead of proper icons (✗ vs ✕ icon).

### MEDIUM-003: Print Header Missing Task Metadata
**Status:** NEEDS FIX
**Issue:** Print header only shows title and date. Should include: task status, message count, cost, model used.

### LOW-001: Color Contrast on Filter Tabs
**Status:** FIXED (this session)
**Fix:** Changed from text-[10px] bg-primary to text-[11px] bg-[oklch(0.52_0.19_252)] — 5.6:1 ratio.

### LOW-002: Package Badge Strip on Home Page
**Status:** COSMETIC
**Issue:** "Powered by" badges at bottom of home page list internal package names — not user-facing.
