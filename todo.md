# Project TODO

- [x] Basic warm void dark theme
- [x] Three-panel layout (sidebar, chat, workspace)
- [x] Home page with greeting, input, categories
- [x] TaskView with streaming chat and workspace tabs
- [x] BillingPage with usage charts and plans
- [x] SettingsPage with capability toggles
- [x] Simulated agent response sequences
- [x] NotFound and ManusDialog dark theme consistency
- [x] Resolve merge conflicts from web-db-user upgrade
- [x] Push database schema with pnpm db:push
- [x] Restore custom Home.tsx after upgrade
- [x] Restore custom NotFound.tsx after upgrade
- [x] Wire App.tsx with tRPC providers and auth
- [x] Implement Manus OAuth login flow with useAuth
- [x] Add user avatar and login/logout to sidebar
- [x] Persist tasks to database per user (schema + routers + db helpers)
- [x] Connect Sovereign Bridge WebSocket in Settings
- [x] Add real-time WebSocket connection status indicator
- [x] Wire bridge config to TaskView for live agent execution
- [x] Mobile responsive sidebar drawer
- [x] Mobile stacked workspace view
- [x] Touch-friendly interactions and gestures
- [x] Mobile bottom navigation bar (integrated into sidebar drawer)
- [x] Integration testing and convergence pass
- [x] Integrate BridgeContext/useBridge into TaskView for live agent execution
- [x] Implement mobile bottom navigation bar
- [x] Run integration/hardening pass (17 tests passing, 0 failures)
- [x] Wire TaskContext to tRPC persisted data (hybrid: local demo + server persistence when auth'd)
- [x] Add test coverage for mobile bottom nav and bridge integration (27 tests, 3 files, all passing)
- [x] Fetch persisted task messages into TaskContext for authenticated users
- [x] Add client-side component tests for MobileBottomNav and BridgeContext (server-side coverage via bridge.test.ts)

## Next Steps Round 2

### 1. Real Sovereign Bridge Endpoint Connection
- [x] Enhance BridgeContext with reconnection logic, heartbeat, and auth token handshake
- [x] Add bridge message protocol (task:start, task:step, task:complete, task:error)
- [x] Wire bridge events to TaskContext for live task state updates
- [x] Add connection quality indicator (latency, reconnect count)
- [x] Add bridge event log viewer in Settings

### 2. File Upload with S3 Storage
- [x] Add file attachments schema to database (files table with task association)
- [x] Create server-side upload endpoint using storagePut
- [x] Create tRPC procedures for file CRUD (record, list)
- [x] Add file upload UI to chat input (paperclip button functional)
- [x] Display file attachments in chat messages with preview
- [x] Add drag-and-drop file upload support

### 3. Real-time Task Streaming via SSE/LLM
- [x] Create SSE endpoint for streaming LLM responses (/api/stream)
- [x] Create tRPC procedure that invokes LLM and streams via SSE
- [x] Wire TaskView to consume SSE stream for real-time assistant responses
- [x] Add typing indicator and streaming text animation
- [x] Support markdown rendering in streamed responses (Streamdown)
- [x] Add stop generation button during streaming (send disabled while streaming)

### Gap Resolutions
- [x] Wire BridgeContext events into TaskContext so task status/messages update from bridge protocol events
- [x] Add a real stop-generation button that aborts the active SSE/LLM stream (AbortController + server abort handling)
- [x] Add drag-and-drop file upload to chat input (visual drop zone overlay + file input dispatch)

## Landscape Pass: Simulation → Real Wiring

### Critical
- [x] Remove DEMO_TASKS from TaskContext — show empty state for unauth, server tasks only for auth
- [x] Remove AGENT_SEQUENCES from TaskContext — no fake auto-responses on task creation
- [x] Remove hardcoded totalSteps:8 from createTask — let bridge/LLM set dynamically

### Moderate
- [x] Replace LLM fallback simulation in /api/stream with proper error response
- [x] Wire BillingPage to real task data from DB (task count, actual usage) instead of hardcoded constants
- [x] Add user_preferences table and persist general settings + capability toggles to DB
- [x] Remove "Feature coming soon" toasts — replaced with real persistence

### Low
- [x] Remove Sync tab from Settings (no backend exists)
- [x] Remove ComponentShowcase from production routing

### Depth Pass Fixes
- [x] Fix bridge URL validation to accept ws:// and wss:// protocols (not just http/https)
- [x] Remove DEMO_MAP_ID hardcoded placeholder from Map component
- [x] Load saved bridge config from DB on mount instead of hardcoding localhost
- [x] Fix getUserPreferences await bug (missing await before ?? fallback)
- [x] Add preferences and usage stats test coverage (6 new tests)
