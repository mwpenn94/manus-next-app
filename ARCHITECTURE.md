# Manus Next — Architecture Documentation

**Version:** 5.0 (Phase 5 Complete — v8.3 Parity Gate A)
**Last Updated:** April 18, 2026

---

## Overview

Manus Next is an open-source autonomous AI agent platform that provides a web-based interface for conversational and agentic AI interactions. It is built on a React 19 + Express + tRPC stack with server-sent events (SSE) for real-time streaming, cross-session memory, task scheduling with server-side polling, parallel wide research, session replay, document generation, project workspaces, voice TTS, 3-tier agent modes, and PWA installability. The ManusNextChat reusable component interface is defined for future npm extraction.

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 19 + Tailwind CSS 4 | UI framework and styling |
| Routing | Wouter | Client-side routing |
| State | tRPC + React Query | Server state management |
| Backend | Express 4 + tRPC 11 | API server with typed procedures |
| Database | MySQL/TiDB via Drizzle ORM | Persistent storage |
| Auth | Manus OAuth | User authentication |
| LLM | Built-in Forge API | AI model inference |
| Storage | S3 | File and media storage |
| Streaming | Server-Sent Events (SSE) | Real-time agent responses |
| Scheduling | cron-parser + polling loop | Server-side task automation |
| PWA | Web App Manifest | Installable web application |

---

## Directory Structure

```
manus-next-app/
├── client/                     # Frontend application
│   ├── public/                 # Static assets (manifest.json, favicon, robots.txt)
│   ├── src/
│   │   ├── _core/hooks/        # Auth hooks (useAuth)
│   │   ├── components/         # Reusable UI components
│   │   │   ├── ui/             # shadcn/ui primitives
│   │   │   ├── AppLayout.tsx   # Main layout with sidebar + keyboard shortcuts
│   │   │   ├── KeyboardShortcutsDialog.tsx  # Cmd+/ help overlay
│   │   │   ├── ModeToggle.tsx  # Speed/Quality mode selector
│   │   │   ├── MobileBottomNav.tsx  # Mobile navigation bar
│   │   │   ├── NotificationCenter.tsx  # Notification bell + dropdown
│   │   │   └── ShareDialog.tsx # Task sharing dialog
│   │   ├── contexts/           # React contexts (Task, Bridge, Theme)
│   │   ├── hooks/              # Custom hooks
│   │   │   └── useKeyboardShortcuts.ts  # Global keyboard shortcut handler
│   │   ├── pages/              # Route-level components
│   │   │   ├── Home.tsx        # Landing page with task input
│   │   │   ├── TaskView.tsx    # Task execution, chat, cost visibility
│   │   │   ├── MemoryPage.tsx  # Cross-session memory management
│   │   │   ├── SchedulePage.tsx # Task scheduling (cron/interval)
│   │   │   ├── ReplayPage.tsx  # Session replay viewer
│   │   │   ├── BillingPage.tsx # Usage and billing
│   │   │   ├── SettingsPage.tsx # User preferences and capabilities
│   │   │   └── SharedTaskView.tsx # Public shared task viewer
│   │   ├── App.tsx             # Route definitions
│   │   └── main.tsx            # tRPC + React Query providers
│   └── index.html              # Entry HTML with SEO meta, PWA manifest, JSON-LD
├── server/                     # Backend application
│   ├── _core/                  # Framework plumbing (do not edit)
│   │   ├── index.ts            # Express server + /api/stream + scheduler startup
│   │   ├── llm.ts              # LLM invocation helper
│   │   ├── imageGeneration.ts  # Image generation helper
│   │   ├── voiceTranscription.ts # Whisper STT helper
│   │   ├── vite.ts             # Vite dev server + dynamic meta injection
│   │   └── ...                 # OAuth, context, cookies, etc.
│   ├── agentStream.ts          # SSE agent loop with tool calling
│   ├── agentTools.ts           # Tool definitions and executors (8 tools)
│   ├── scheduler.ts            # Server-side task scheduler (polling loop)
│   ├── memoryExtractor.ts      # LLM-powered memory auto-extraction
│   ├── db.ts                   # Database query helpers
│   ├── routers.ts              # tRPC procedure definitions
│   ├── storage.ts              # S3 file storage helpers
│   └── *.test.ts               # Vitest test files (11 files)
├── drizzle/                    # Database schema and migrations
│   └── schema.ts               # Table definitions (12 tables)
├── shared/                     # Shared types and constants
└── docs/                       # Documentation
```

---

## Data Flow

### Agent Conversation Flow

```
User Input → POST /api/stream
  → Resolve auth (JWT cookie)
  → Load memory entries (if authenticated)
  → Build system prompt (base + memory + mode adjustments)
  → LLM inference loop (max 8 turns):
      → LLM generates response or tool call
      → If tool call: execute tool → append result → continue loop
      → If text response: stream via SSE → break
  → Persist messages to DB
  → Create notification on completion/error
  → Fire-and-forget: extractMemories() for auto-learning
```

### Tool Execution Flow

```
LLM requests tool_call → agentStream.ts dispatches
  → agentTools.ts executeTool(name, args)
    → web_search: DDG API → Wikipedia → page fetch → LLM synthesis
    → read_webpage: HTTP fetch → HTML parse → text extraction
    → browse_web: Enhanced URL fetch → metadata + links + images + structured data
    → execute_code: Sandboxed JS eval with timeout
    → analyze_data: LLM-powered structured analysis
    → generate_image: Built-in image generation API
    → generate_document: LLM-powered document creation
    → wide_research: Parallel multi-query search → LLM synthesis
  → Result stored as workspace artifact
  → Result appended to conversation context
```

### Scheduler Flow

```
Server startup → startScheduler()
  → setInterval(pollDueTasks, 60_000)
  → Every 60s: query scheduled_tasks WHERE enabled AND nextRunAt <= NOW
  → For each due task:
      → Create task record in tasks table
      → Add prompt as first user message
      → Execute agent stream (fire-and-forget)
      → Update lastRunAt, nextRunAt, runCount, lastStatus
      → Create notification for user
  → Cron tasks: parse expression → calculate next occurrence
  → Interval tasks: add intervalSeconds to current time
  → Non-repeating tasks: set nextRunAt to null after execution
```

### Memory Auto-Extraction Flow

```
Task completes → /api/stream handler fires extractMemories()
  → Load last 20 messages from conversation
  → Send to LLM with structured JSON schema extraction prompt
  → LLM returns array of {key, value} facts
  → Each fact stored in memory_entries with source="auto"
  → Available for injection into future task system prompts
```

### Wide Research Flow

```
Agent calls wide_research(queries, synthesis_prompt)
  → Cap queries at 5 for resource management
  → Execute all queries in parallel via Promise.allSettled
  → Each query runs through executeWebSearch pipeline
  → Collect results (successful + failed)
  → Send combined results to LLM with synthesis prompt
  → Return unified research synthesis + raw data
```

---

## Database Schema

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | User accounts | id, openId, email, name, role |
| `tasks` | Agent tasks | id, externalId, userId, title, status |
| `task_messages` | Conversation history | taskId, role, content, toolName |
| `task_files` | Uploaded files | taskId, fileName, fileUrl, mimeType |
| `workspace_artifacts` | Tool outputs | taskId, artifactType, content, url |

### Feature Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `memory_entries` | Cross-session memory | userId, key, value, source, taskExternalId |
| `task_shares` | Shared task links | taskExternalId, shareToken, passwordHash, expiresAt |
| `notifications` | User notifications | userId, type, title, content, readAt |
| `scheduled_tasks` | Recurring/one-time tasks | userId, name, prompt, cronExpression, interval, enabled |
| `task_events` | Session replay events | taskExternalId, eventType, eventData, timestamp |

### Settings Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `user_preferences` | User settings | userId, generalSettings, capabilities, systemPrompt |
| `bridge_configs` | Bridge connection | userId, bridgeUrl, apiKey, enabled |

---

## API Routes

### tRPC Procedures (via /api/trpc)

| Router | Procedure | Auth | Description |
|--------|-----------|------|-------------|
| auth.me | query | public | Get current user |
| auth.logout | mutation | public | Clear session |
| task.create | mutation | protected | Create new task |
| task.list | query | protected | List user tasks |
| task.search | query | protected | Search tasks by query |
| task.updateStatus | mutation | protected | Update task status + auto-notify |
| memory.list | query | protected | List memory entries |
| memory.add | mutation | protected | Add memory entry |
| memory.delete | mutation | protected | Delete memory entry |
| memory.search | query | protected | Search memory entries |
| share.create | mutation | protected | Create share link |
| share.list | query | protected | List shares for task |
| share.view | query | public | View shared task (with password check) |
| share.delete | mutation | protected | Delete share link |
| notification.list | query | protected | List notifications |
| notification.unreadCount | query | protected | Get unread count |
| notification.markRead | mutation | protected | Mark notification read |
| notification.markAllRead | mutation | protected | Mark all read |
| preferences.get | query | protected | Get user preferences |
| preferences.save | mutation | protected | Save user preferences |
| schedule.list | query | protected | List scheduled tasks |
| schedule.create | mutation | protected | Create scheduled task |
| schedule.toggle | mutation | protected | Enable/disable scheduled task |
| schedule.delete | mutation | protected | Delete scheduled task |
| replay.events | query | protected | Get task events for replay |
| replay.record | mutation | protected | Record a task event |
| usage.stats | query | protected | Get usage statistics |
| bridge.getConfig | query | protected | Get bridge configuration |
| bridge.saveConfig | mutation | protected | Save bridge configuration |

### Direct Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| /api/stream | POST | optional | SSE agent streaming endpoint (accepts mode param) |
| /api/oauth/callback | GET | public | OAuth callback handler |

---

## Agent Tools (8 total)

| Tool | Description | Output Type |
|------|-------------|-------------|
| `web_search` | Multi-source web search (DDG + Wikipedia + page fetch + LLM synthesis) | browser_url |
| `read_webpage` | Fetch and parse webpage content | browser_url |
| `browse_web` | Enhanced URL fetch with metadata, links, images, structured data extraction | browser_url |
| `execute_code` | Sandboxed JavaScript execution with 5s timeout | code |
| `analyze_data` | LLM-powered structured data analysis | N/A |
| `generate_image` | AI image generation via built-in API | generated_image |
| `generate_document` | LLM-powered document creation (markdown, report, analysis, plan) | document |
| `wide_research` | Parallel multi-query research with LLM synthesis (up to 5 concurrent queries) | document |

---

## Testing

### Test Files

| File | Tests | Coverage |
|------|-------|----------|
| auth.logout.test.ts | 1 | Auth logout flow |
| routers.test.ts | 18 | Core tRPC procedures |
| agentTools.test.ts | 23 | Tool definitions and execution |
| agentStream.test.ts | 8 | System prompt and streaming |
| features.test.ts | 11 | Feature integration |
| bridge.test.ts | 11 | Bridge context and config |
| preferences.test.ts | 6 | User preferences CRUD |
| parity.test.ts | 30 | Memory, share, notification, document gen |
| stream.test.ts | 8 | Stream endpoint validation |
| phase3.test.ts | 27 | Browse_web, memory extractor, regenerate, scheduling, replay |
| phase4.test.ts | 11 | Scheduler, wide_research, keyboard shortcuts, PWA, cost visibility |

**Total: 166 tests across 11 files**

### Validation Suites

```bash
pnpm test                    # Run all 166 unit tests
node validate-parity.mjs     # 18 e2e checks against live server
node validate-personas.mjs   # 35 virtual user persona checks (5 personas)
```

---

## Security Considerations

1. **Authentication**: All protected procedures require valid JWT session cookie
2. **Share passwords**: Hashed with SHA-256 before storage
3. **Code execution**: Sandboxed with `vm.createContext` and 5-second timeout
4. **SQL injection**: All queries use Drizzle ORM parameterized queries
5. **XSS**: React's default escaping; no `dangerouslySetInnerHTML` in app code
6. **Input validation**: All tRPC inputs use Zod schemas with `.max()` constraints
7. **CORS**: Handled by Express middleware
8. **Rate limiting**: Not implemented (recommended for production)
9. **Scheduler isolation**: Server-side only; no user-accessible scheduler endpoint

---

## Keyboard Shortcuts

| Shortcut | Action | Scope |
|----------|--------|-------|
| `Cmd+K` / `Ctrl+K` | Focus search / input | Global |
| `Cmd+N` / `Ctrl+N` | New task (navigate home) | Global |
| `Cmd+/` / `Ctrl+/` | Toggle keyboard shortcuts help | Global |
| `Cmd+Shift+S` / `Ctrl+Shift+S` | Toggle sidebar | Global |
| `Escape` | Close dialog / cancel | Global |
| `Enter` | Send message | Chat input |
| `Shift+Enter` | New line in message | Chat input |

---

## Configuration

### Environment Variables

All environment variables are managed through the Manus platform. See `server/_core/env.ts` for the complete list. Key variables:

- `DATABASE_URL` — MySQL/TiDB connection string
- `JWT_SECRET` — Session cookie signing
- `BUILT_IN_FORGE_API_URL` / `BUILT_IN_FORGE_API_KEY` — LLM API access
- `VITE_APP_TITLE` — Application title
- `VITE_APP_LOGO` — Application logo URL

### Speed/Quality Mode

The agent supports three modes that adjust LLM behavior:

| Mode | Temperature | Max Tokens | Estimated Cost | Behavior |
|------|------------|------------|----------------|----------|
| Speed | 0.3 | 1024 | ~$0.02/task | Fast, concise responses |
| Balanced | 0.5 | 2048 | ~$0.08/task | Default balanced mode |
| Quality | 0.7 | 4096 | ~$0.15/task | Thorough, detailed responses |

---

## Capability Status

| Capability | Status | Implementation |
|-----------|--------|---------------|
| Conversational AI | Live | agentStream.ts + /api/stream |
| Web Search (DDG + Wikipedia) | Live | agentTools.ts web_search |
| Webpage Reading | Live | agentTools.ts read_webpage |
| Enhanced Browsing | Live | agentTools.ts browse_web |
| Wide Research (parallel) | Live | agentTools.ts wide_research |
| Code Execution (JS sandbox) | Live | agentTools.ts execute_code |
| Data Analysis | Live | agentTools.ts analyze_data |
| Image Generation | Live | agentTools.ts generate_image |
| Document Generation | Live | agentTools.ts generate_document |
| Cross-Session Memory | Live | memoryExtractor.ts + memory router |
| Memory Auto-Extraction | Live | memoryExtractor.ts (post-task) |
| Task Sharing | Live | share router + ShareDialog |
| Notifications | Live | notification router + NotificationCenter |
| Speed/Quality Mode | Live | ModeToggle + agentStream mode params |
| Cost Visibility | Live | TaskView header indicator |
| Conversation Regenerate | Live | TaskView handleRegenerate |
| Task Scheduling (UI) | Live | schedule router + SchedulePage |
| Task Scheduling (Server) | Live | scheduler.ts polling loop |
| Session Replay | Live | replay router + ReplayPage |
| System Prompt Customization | Live | SettingsPage + preferences router |
| Keyboard Shortcuts | Live | useKeyboardShortcuts + KeyboardShortcutsDialog |
| PWA Installability | Live | manifest.json + meta tags |
| Bridge/Desktop Agent | Partial | Config UI exists, bridge protocol planned |
| Voice STT | Live | Whisper API integration |
| Voice TTS | Planned | — |
| Slide Decks | Planned | — |
| Client Inference | Planned | — |
| Desktop Agent | Planned | — |
| Sync/Collaboration | Planned | — |
