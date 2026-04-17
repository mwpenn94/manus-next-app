# Simulation → Real Wiring Audit

## Scope
The work being optimized is the Sovereign AI (Manus Next) web application — ensuring every user-facing feature is wired to real backend logic, not simulated/demo/placeholder patterns.

## Signal Assessment

- **Fundamental Redesign**: Absent. Core architecture (tRPC + bridge + SSE + S3) is sound.
- **Landscape**: PRESENT. Multiple obvious gaps: demo tasks, simulated agent sequences, fake billing, fake sync, fake settings, LLM fallback simulation, capabilities not persisted.
- **Depth**: Present but secondary. Some edge cases in bridge persistence, DB-absent degradation.
- **Adversarial**: Absent (not yet solid enough to adversarially test).
- **Future-State**: Absent (premature).

**Executing: Landscape Pass**

## Identified Simulation Patterns (Must Fix)

### 1. DEMO_TASKS in TaskContext (CRITICAL)
- **File**: `client/src/contexts/TaskContext.tsx` lines 58-133
- **Issue**: 3 hardcoded demo tasks with fake data shown to all users (including authenticated)
- **Fix**: Remove DEMO_TASKS. Show empty state for unauthenticated users with a CTA to sign in. For authenticated users, show only server-persisted tasks.

### 2. AGENT_SEQUENCES simulation (CRITICAL)
- **File**: `client/src/contexts/TaskContext.tsx` lines 137-160, used at lines 289-314
- **Issue**: Every new task triggers fake timed agent responses via setTimeout, even for authenticated users
- **Fix**: Remove AGENT_SEQUENCES entirely. After creating a task, the user sends messages and gets real LLM responses via SSE streaming in TaskView. No fake auto-responses.

### 3. LLM fallback simulation in /api/stream (MODERATE)
- **File**: `server/_core/index.ts` lines 86-98
- **Issue**: If invokeLLM import fails, streams a fake response word-by-word
- **Fix**: Return a proper error instead of simulating a response. The LLM is always available in production.

### 4. BillingPage entirely hardcoded (MODERATE)
- **File**: `client/src/pages/BillingPage.tsx`
- **Issue**: DEMO_TRANSACTIONS, DAILY_USAGE, TIERS, currentCredits — all hardcoded constants. No backend.
- **Fix**: Since there's no billing backend and Stripe isn't integrated, convert this to a transparent "Usage" page that shows real task count from the DB, and mark plan/billing features as "Available when billing is configured" rather than showing fake data.

### 5. Settings "Feature coming soon" toasts (MODERATE)
- **File**: `client/src/pages/SettingsPage.tsx` lines 299, 338
- **Issue**: Account sub-items (Security, Notifications) and General toggles all show "Feature coming soon"
- **Fix**: Persist general settings (notifications, sound, auto-expand, compact mode) to the database via a new user_settings table. Remove "coming soon" for items that can be made real. For items that genuinely require future work (Security/2FA), label them clearly as "Requires additional configuration" rather than "coming soon".

### 6. Capabilities not persisted (MODERATE)
- **File**: `client/src/pages/SettingsPage.tsx` lines 51-62, 86, 138-145
- **Issue**: INITIAL_CAPABILITIES is local state only. Toggling capabilities has no backend effect.
- **Fix**: Add a user_preferences table to persist capability toggles. The capabilities themselves are UI preferences that control what the user sees, not actual package installations.

### 7. Sync tab entirely fake (LOW)
- **File**: `client/src/pages/SettingsPage.tsx` lines 346-399
- **Issue**: Shows hardcoded "Connected", "just now", "1 active", "0 changes" — pure theater
- **Fix**: Remove the Sync tab entirely since there's no sync backend. It can be re-added when CRDT sync is actually implemented.

### 8. ComponentShowcase demo responses (LOW)
- **File**: `client/src/pages/ComponentShowcase.tsx` lines 190-222
- **Issue**: AIChatBox section uses simulated responses
- **Fix**: This is a developer showcase page, not user-facing. Wire it to real LLM or remove from production routing.

### 9. Hardcoded totalSteps in createTask (LOW)
- **File**: `client/src/contexts/TaskContext.tsx` line 250
- **Issue**: `totalSteps: 8` hardcoded for every new task
- **Fix**: Remove hardcoded totalSteps. Let the bridge or LLM set this dynamically.

## Implementation Priority
1. Remove DEMO_TASKS + AGENT_SEQUENCES (highest impact)
2. Fix LLM fallback to error instead of simulation
3. Wire BillingPage to real task data
4. Persist general settings + capabilities
5. Remove Sync tab
6. Clean up ComponentShowcase
