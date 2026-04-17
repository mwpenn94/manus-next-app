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

## Deep Wiring Pass: Real-World Functionality

### Workspace Panel — Real Artifacts
- [x] Add workspace_artifacts table to schema (taskId, type, content/url, timestamp)
- [x] Store workspace artifacts from bridge task:step metadata in DB via TaskContext
- [x] Wire workspace Browser tab to display real screenshots/URLs from artifacts
- [x] Wire workspace Code tab to display real code artifacts
- [x] Wire workspace Terminal tab to display real terminal output
- [x] Remove static WORKSPACE_IMG and hardcoded code/terminal content

### System Prompt Customization
- [x] Add systemPrompt column to user_preferences for global default
- [x] Add systemPrompt column to tasks table for per-task override
- [x] Wire system prompt into /api/stream LLM call (per-task > global > default)
- [x] Add system prompt editor in SettingsPage General tab
- [x] Add per-task system prompt editor in TaskView header More menu

### Task Management — Search, Filter, Delete
- [x] Add task deletion (soft delete with archived flag) to DB and tRPC
- [x] Add delete button to sidebar task items with confirmation
- [x] Add status filter tabs to sidebar (All/Running/Done/Error)
- [x] Extend sidebar search to include message content via tRPC server-side search
- [x] Add status indicator icons to sidebar task list items

### Voice Input — Real Transcription
- [x] Add voice.transcribe tRPC procedure using existing voiceTranscription helper
- [x] Wire voice button in TaskView to record audio via MediaRecorder API
- [x] Upload recorded audio to S3, call voice.transcribe, insert text into input
- [x] Wire voice button in Home page to create task and navigate to TaskView

### Dead-End UI Buttons — Real Functionality
- [x] Wire Share button (copy task URL to clipboard)
- [x] Wire Bookmark button (toggle favorite flag on task via tRPC)
- [x] Wire More button (dropdown: delete, system prompt editor)
- [x] Wire ExternalLink button in workspace browser tab (open URL in new tab)
- [x] Wire Refresh button in workspace browser tab (re-fetch latest artifact)

### Adversarial Pass Fixes
- [x] Add user-visible voiceError state (microphone denied, recording too large, transcription failed)
- [x] Wire Home page Paperclip and Mic buttons (were dead-end, now create tasks)
- [x] Add 12 workspace artifact tests (CRUD, auth, filtering, latest)
- [x] Fix preferences test for new systemPrompt field
- [x] Add global system prompt editor to SettingsPage General tab (was missing despite backend support)

## Virtual User Validation Pass

### Critical Issues Found
- [x] Task ID race condition: fixed with client-side nanoid — stable ID from creation through navigation
- [x] handleSend now uses stable nanoid-based task.id that matches server externalId
- [x] Workspace panel queries correctly gated with `enabled: !!task?.serverId` — queries activate after server sync
- [x] Server messages now use `messagesLoaded` flag instead of `messages.length === 0` — loads correctly on refresh

### Moderate Issues Found
- [x] Added "Export Transcript" button in More menu — generates downloadable Markdown file
- [x] System prompt draft uses `promptInitRef` — only initializes once per task, not on every refetch

### Edge Cases
- [x] Voice recording uses browser-default MIME type (falls back to audio/mp4 on Safari)

### Error Handling Hardening
- [x] Added onError toast handlers to user-initiated mutations (archive, favorite, systemPrompt)
- [x] Added onError toast to AppLayout archive mutation

### Remaining Gaps
- [x] Ensure new-task workspace artifact queries refetch automatically once serverId becomes available (added prevServerIdRef + useEffect refetch trigger)
- [x] Verify and implement explicit Safari-safe voice recording MIME fallback (already implemented: isTypeSupported check with webm→mp4 fallback, dynamic extension, correct Content-Type)

## Critical Production Bugs (User-Reported)
- [x] LLM streaming stuck on typing indicator — root cause: req.on('close') fired prematurely, setting aborted=true before invokeLLM returned, causing all res.write() calls to be silently skipped. Fixed with safeWrite() pattern that checks res.destroyed instead of premature close events.
- [x] Investigate /api/stream endpoint for production failures — confirmed invokeLLM works correctly (returns in ~2s), issue was in SSE delivery layer only
- [x] Test full end-to-end flow: verified via curl — single sentence and multi-sentence responses both stream correctly with proper SSE event formatting
- [x] Added /api/upload body parsing fix — excluded from express.json() middleware to allow raw binary body reading
- [x] Added stream.test.ts with 8 tests covering SSE event formatting, content chunking, error handling, system prompt injection
- [x] All 89 tests passing across 8 test files

## Post-Fix Validation Gaps
- [x] Verify /api/upload still works after express.json() middleware exclusion — confirmed via curl: binary upload returns S3 URL successfully
- [x] Verify full UI end-to-end chat flow in browser (create task → send message → receive streamed response) — user-confirmed working
- [x] Fix: first message in a new task gets no LLM response — root cause: Home.createTask adds initial user message but never triggers /api/stream. Fixed with auto-stream useEffect in TaskView that detects new tasks with exactly 1 user message and automatically triggers SSE streaming. User-confirmed working.

## Manus Parity: Chatbot → Autonomous Agent

### Tier 1: Agentic LLM with Tool Use
- [x] Implement server-side tool definitions (web_search, generate_image, analyze_data, execute_code) in agentTools.ts
- [x] Update /api/stream to use agentic loop via agentStream.ts — multi-turn tool execution with MAX_TOOL_TURNS=8
- [x] Stream tool execution steps as SSE events (tool_start, tool_result, image) alongside text deltas
- [x] Support multi-turn tool use: LLM calls tool → server executes → feeds result back → LLM continues
- [x] Add tool execution status display in TaskView (real-time ActionStep rendering during streaming)

### Tier 2: Image Generation
- [x] Wire generateImage helper into generate_image tool the LLM can call
- [x] Display generated images inline in chat messages via Streamdown markdown rendering
- [x] Store generated image URLs as workspace artifacts (added generated_image to schema + router)
- [x] Add image generation loading state with progress indicator (tool_start → spinner → tool_result)

### Tier 3: Web Search & Research
- [x] Implement web_search tool using LLM-powered research synthesis (no general web search API available)
- [x] Display research results in chat with structured formatting
- [x] Wire search results into workspace artifacts (browser_url type)
- [x] Support multi-step research: LLM calls web_search → gets synthesis → integrates into response

### Tier 4: Code Execution Display
- [x] Display code blocks the agent generates with syntax highlighting (via Streamdown)
- [x] Show code execution results in tool_result events with terminal-formatted output
- [x] Wire code artifacts into workspace (terminal artifact type)

### Tier 5: Agent Progress & Step Visualization
- [x] Show tool execution badges inline in chat (Searching..., Generating image..., Running code...) via ActionStep
- [x] mapToolToAction helper maps tool display types to AgentAction types for consistent rendering
- [x] Agent actions rendered in real-time during streaming with active/done status transitions
- [ ] Update task status automatically based on agent progress (idle → running → done) — deferred
- [ ] Add step-by-step progress indicator in TaskView header (Step 1 of N) — deferred

### Tests
- [x] agentTools.test.ts: 14 tests covering all 4 tools, error handling, unknown tools, malformed JSON, timeouts
- [x] All 89 tests passing across 8 test files

### Gap Fixes (System Review)
- [x] Wire onArtifact callback in /api/stream to persist artifacts to DB (generated_image, terminal, browser_url)
- [x] Add Images tab to WorkspacePanel with grid display of generated images
- [x] Surface tool_result.preview in ActionStep with show/hide toggle
- [x] Add preview field to AgentAction type for all action variants
- [x] Schema migration applied for generated_image artifact type
