# Manus Next — Architecture Documentation

**Version:** 2.0 (Parity v8.0)
**Last Updated:** April 18, 2026

---

## Overview

Manus Next is an open-source autonomous AI agent platform that provides a web-based interface for conversational and agentic AI interactions. It is built on a React 19 + Express + tRPC stack with server-sent events (SSE) for real-time streaming.

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

---

## Directory Structure

```
manus-next-app/
├── client/                     # Frontend application
│   ├── src/
│   │   ├── _core/hooks/        # Auth hooks (useAuth)
│   │   ├── components/         # Reusable UI components
│   │   │   ├── ui/             # shadcn/ui primitives
│   │   │   ├── AppLayout.tsx   # Main layout with sidebar
│   │   │   ├── ModeToggle.tsx  # Speed/Quality mode selector
│   │   │   ├── NotificationCenter.tsx  # Notification bell + dropdown
│   │   │   └── ShareDialog.tsx # Task sharing dialog
│   │   ├── contexts/           # React contexts (Task, Bridge, Theme)
│   │   ├── pages/              # Route-level components
│   │   │   ├── Home.tsx        # Landing page with task input
│   │   │   ├── TaskView.tsx    # Task execution and chat interface
│   │   │   ├── MemoryPage.tsx  # Cross-session memory management
│   │   │   ├── SettingsPage.tsx # User preferences and capabilities
│   │   │   └── SharedTaskView.tsx # Public shared task viewer
│   │   ├── App.tsx             # Route definitions
│   │   └── main.tsx            # tRPC + React Query providers
│   └── index.html              # Entry HTML with SEO meta tags
├── server/                     # Backend application
│   ├── _core/                  # Framework plumbing (do not edit)
│   │   ├── index.ts            # Express server + /api/stream endpoint
│   │   ├── llm.ts              # LLM invocation helper
│   │   ├── imageGeneration.ts  # Image generation helper
│   │   ├── voiceTranscription.ts # Whisper STT helper
│   │   └── ...                 # OAuth, context, cookies, etc.
│   ├── agentStream.ts          # SSE agent loop with tool calling
│   ├── agentTools.ts           # Tool definitions and executors
│   ├── db.ts                   # Database query helpers
│   ├── routers.ts              # tRPC procedure definitions
│   ├── storage.ts              # S3 file storage helpers
│   └── *.test.ts               # Vitest test files
├── drizzle/                    # Database schema and migrations
│   └── schema.ts               # Table definitions
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
```

### Tool Execution Flow

```
LLM requests tool_call → agentStream.ts dispatches
  → agentTools.ts executeTool(name, args)
    → web_search: DDG API → Wikipedia → page fetch → LLM synthesis
    → read_webpage: HTTP fetch → HTML parse → text extraction
    → execute_code: Sandboxed JS eval with timeout
    → analyze_data: LLM-powered structured analysis
    → generate_image: Built-in image generation API
    → generate_document: LLM-powered document creation
  → Result stored as workspace artifact
  → Result appended to conversation context
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

### Parity v8.0 Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `memory_entries` | Cross-session memory | userId, key, value, source, taskExternalId |
| `task_shares` | Shared task links | taskExternalId, shareToken, passwordHash, expiresAt |
| `notifications` | User notifications | userId, type, title, content, readAt |

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

### Direct Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| /api/stream | POST | optional | SSE agent streaming endpoint |
| /api/oauth/callback | GET | public | OAuth callback handler |

---

## Agent Tools

| Tool | Description | Output Type |
|------|-------------|-------------|
| `web_search` | Multi-source web search (DDG + Wikipedia + page fetch + LLM synthesis) | browser_url |
| `read_webpage` | Fetch and parse webpage content | browser_url |
| `execute_code` | Sandboxed JavaScript execution with 5s timeout | code |
| `analyze_data` | LLM-powered structured data analysis | N/A |
| `generate_image` | AI image generation via built-in API | generated_image |
| `generate_document` | LLM-powered document creation (markdown, report, analysis, plan) | document |

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

**Total: 128 tests across 9 files**

### Running Tests

```bash
pnpm test          # Run all tests
npx vitest run     # Same as above
npx vitest --watch # Watch mode
```

### E2E Validation

```bash
node validate-parity.mjs  # 18 checks against live server
```

---

## Security Considerations

1. **Authentication**: All protected procedures require valid JWT session cookie
2. **Share passwords**: Hashed with SHA-256 before storage
3. **Code execution**: Sandboxed with `vm.createContext` and 5-second timeout
4. **SQL injection**: All queries use Drizzle ORM parameterized queries
5. **XSS**: React's default escaping; no `dangerouslySetInnerHTML` in app code
6. **CORS**: Handled by Express middleware
7. **Rate limiting**: Not implemented (recommended for production)

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

The agent supports two modes that adjust LLM behavior:

| Mode | Temperature | Max Tokens | Behavior |
|------|------------|------------|----------|
| Speed | 0.3 | 1024 | Fast, concise responses |
| Quality | 0.7 | 4096 | Thorough, detailed responses |
