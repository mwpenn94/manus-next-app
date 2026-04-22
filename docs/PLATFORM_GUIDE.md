# Manus Next — Comprehensive Platform Guide

**Version:** 9.0
**Last Updated:** 2026-04-21

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Authentication and Sessions](#authentication-and-sessions)
3. [Agent Pipeline](#agent-pipeline)
4. [Voice Streaming Pipeline](#voice-streaming-pipeline)
5. [Tool Ecosystem](#tool-ecosystem)
6. [Task Lifecycle](#task-lifecycle)
7. [Workspace Artifacts](#workspace-artifacts)
8. [Memory System](#memory-system)
9. [Scheduling System](#scheduling-system)
10. [Connector Ecosystem](#connector-ecosystem)
11. [Billing and Payments](#billing-and-payments)
12. [Security Architecture](#security-architecture)
13. [Mobile Architecture](#mobile-architecture)
14. [Desktop Companion](#desktop-companion)
15. [Deployment and Operations](#deployment-and-operations)

---

## Architecture Overview

Manus Next follows a three-tier architecture with clear separation of concerns:

**Frontend (React 19 + Tailwind CSS 4):** Single-page application with client-side routing via Wouter. The UI uses shadcn/ui components for consistency. State management combines React contexts (TaskContext, BridgeContext, ThemeContext) with tRPC query caching.

**Backend (Express 4 + tRPC 11):** RESTful API layer with tRPC procedures for type-safe client-server communication. Server-Sent Events (SSE) handle real-time streaming. WebSocket endpoints serve the voice pipeline and bridge relay.

**Data Layer (MySQL/TiDB + S3):** Drizzle ORM manages the relational schema (33 tables). S3 stores file uploads and generated artifacts. The database stores metadata and references.

---

## Authentication and Sessions

Manus Next uses **Manus OAuth** for authentication. The flow is:

1. User clicks "Sign In" — frontend redirects to `VITE_OAUTH_PORTAL_URL` with encoded state
2. User authenticates on the Manus OAuth portal
3. OAuth callback at `/api/oauth/callback` exchanges the code for a JWT session cookie
4. All subsequent requests include the session cookie, which is verified in tRPC context

**Session management:** JWT tokens are signed with `JWT_SECRET` and stored as HTTP-only cookies. Sessions expire after the configured TTL. The `protectedProcedure` middleware injects `ctx.user` for authenticated routes.

**Role-based access:** The `user` table includes a `role` field (`admin` | `user`). Admin-only procedures use `adminProcedure` which checks `ctx.user.role`.

---

## Agent Pipeline

The agentic execution pipeline is the core of Manus Next. When a user sends a message:

1. **SSE Connection:** Client opens a streaming connection to `/api/stream`
2. **Context Assembly:** Server loads conversation history, system prompt (per-task > global > default), and memory entries
3. **LLM Invocation:** Messages are sent to the LLM with tool definitions
4. **Tool Loop:** If the LLM returns tool calls, the server executes them and feeds results back (up to `MAX_TOOL_TURNS=100`)
5. **Auto-Continuation:** If the LLM hits its token limit (`finish_reason: "length"`), the server automatically injects a continuation prompt and resumes
6. **Streaming:** Text deltas, tool execution steps, and artifacts are streamed as SSE events in real time
7. **Persistence:** Messages and artifacts are saved to the database

**Anti-premature-completion:** The agent detects when the LLM tries to end early (e.g., "I've completed the analysis" without actually running tools) and nudges it to continue with unused tools.

---

## Voice Streaming Pipeline

The voice streaming system (section L.35) provides real-time conversational AI via WebSocket:

**Client Side:**
1. `useVoiceSession` hook manages the WebSocket connection, mic capture, and audio playback
2. MediaRecorder captures audio chunks every 250ms
3. Client-side VAD (Voice Activity Detection) uses RMS energy analysis with 1200ms silence timeout
4. Audio chunks are sent as binary WebSocket frames

**Server Side:**
1. WebSocket endpoint at `/api/voice/ws` manages sessions
2. Audio chunks are accumulated until silence is detected
3. Whisper API transcribes the accumulated audio (STT)
4. LLM generates a response with conversation history
5. Edge TTS synthesizes the response to audio
6. Audio is chunked and streamed back as base64 frames

**Degradation paths:** Mic denied, WebSocket disconnect (auto-reconnect with backoff), STT failure (error event), LLM failure (fallback message), TTS failure (text-only response).

---

## Tool Ecosystem

The agent has 14 built-in tools:

| Tool | Category | Description |
|---|---|---|
| `web_search` | Research | Multi-source search (DuckDuckGo + Wikipedia) with LLM synthesis |
| `read_webpage` | Research | Fetch and parse webpage content |
| `browse_web` | Research | Enhanced URL analysis with metadata extraction |
| `wide_research` | Research | Parallel multi-query search (up to 5 concurrent) |
| `execute_code` | Execution | Sandboxed JavaScript with 5-second timeout |
| `analyze_data` | Analysis | Structured data analysis with visualization |
| `generate_image` | Creation | AI image generation from text prompts |
| `generate_document` | Creation | Structured document creation (4 formats) |
| `create_slides` | Creation | AI-powered slide deck generation |
| `transcribe_audio` | Media | Audio transcription via Whisper API |
| `send_notification` | Communication | Push notifications to connectors |
| `send_email` | Communication | Email delivery (requires approval) |
| `manage_files` | Storage | File upload/download/management |
| `design_compose` | Creation | Visual composition with AI |

**Sensitive operations:** `execute_code` and `send_email` require user approval via a confirmation gate before execution.

---

## Task Lifecycle

Tasks progress through these states:

```
created → running → completed
                  → error
                  → archived (soft delete)
```

**Creation:** Tasks are created with a client-side nanoid for stable IDs. The server assigns a `serverId` on first sync.

**Execution:** The agent processes the task through the agentic pipeline. Each tool execution creates a step event.

**Completion:** The agent's final response marks the task as completed. The memory extractor runs asynchronously to extract facts.

**Regeneration:** Users can regenerate any assistant response. The server replays from the previous user message.

---

## Workspace Artifacts

Artifacts are outputs created by the agent during task execution:

| Type | Source | Display |
|---|---|---|
| `screenshot` | browse_web tool | Browser tab |
| `code` | execute_code tool | Code tab |
| `terminal` | execute_code tool | Terminal tab |
| `generated_image` | generate_image tool | Preview tab |
| `document` | generate_document tool | Preview tab |
| `slides` | create_slides tool | Preview tab |

Artifacts are stored in the `workspace_artifacts` table with a reference to the task and a timestamp.

---

## Memory System

The cross-session memory system allows the agent to remember facts across conversations:

1. **Auto-extraction:** After a task completes, the `memoryExtractor` runs an LLM pass to extract key facts
2. **Storage:** Facts are stored in the `memory_entries` table with category, content, and source task
3. **Injection:** On each new task, relevant memory entries are injected into the system prompt
4. **Management:** Users can view, edit, and delete memory entries in Settings

---

## Scheduling System

Tasks can be scheduled to run at specific times or intervals:

**Cron-based:** Standard 6-field cron expressions (seconds, minutes, hours, day, month, weekday)
**Interval-based:** Fixed time intervals (minimum 300 seconds for recurring)

The server-side scheduler polls every 60 seconds, checks for due tasks, and triggers execution via the agent pipeline.

---

## Connector Ecosystem

Eight connectors extend the agent's capabilities:

| Connector | Status | Description |
|---|---|---|
| Slack | Available | Send messages and notifications to Slack channels |
| GitHub | Available | Access repositories, issues, and pull requests |
| Google | Available | Calendar, Drive, and Gmail integration |
| Notion | Available | Read and write Notion pages and databases |
| Zapier | Available | Connect to 5000+ apps via Zapier webhooks |
| MCP | Available | Model Context Protocol server connections |
| Webhooks | Available | Custom HTTP webhook endpoints |
| Email | Available | SMTP email delivery |

Connectors are configured in Settings > Connectors with OAuth flows for supported services.

---

## Billing and Payments

Stripe integration provides subscription billing:

**Checkout flow:** Server creates a Stripe Checkout Session → client opens in new tab → user completes payment → webhook processes the event → billing page updates.

**Products:** Defined in `server/products.ts` with centralized pricing. Currently offers Manus Next Pro at $39/month.

**Webhooks:** The `/api/stripe/webhook` endpoint processes `checkout.session.completed`, `invoice.paid`, and `customer.subscription.updated` events.

**Test mode:** Use card `4242 4242 4242 4242` with any future expiry and any CVC.

---

## Security Architecture

Multiple layers of security protect the platform:

- **Helmet:** 10 security headers including CSP, HSTS, X-Frame-Options
- **Rate limiting:** 200/min general, 30/min uploads, 20/min streams
- **Auth guards:** Protected procedures require valid JWT session
- **Zod validation:** All tRPC inputs are validated with Zod schemas
- **CSRF protection:** SameSite cookie attribute
- **Code sandboxing:** `execute_code` runs in an isolated VM with 5-second timeout
- **File validation:** Upload size limits and MIME type checking

---

## Mobile Architecture

The mobile experience uses responsive design with dedicated components:

- **AppLayout:** Detects viewport width and switches between sidebar (desktop) and drawer (mobile) navigation
- **MobileBottomNav:** Fixed bottom navigation bar with safe-area padding for notch devices
- **Touch gestures:** Swipe-to-open sidebar, pull-to-refresh
- **Workspace:** Stacked tabbed layout below chat on mobile

---

## Desktop Companion

The Electron companion app provides native desktop integration:

- **WebSocket relay:** Bridges the web app to local system capabilities
- **Playwright bridge:** Enables browser automation on the user's machine
- **File system access:** Read/write local files through the bridge
- **System tray:** Background operation with quick-access menu

---

## Deployment and Operations

**Development:**
```bash
pnpm install && pnpm db:push && pnpm dev
```

**Testing:**
```bash
pnpm test          # 1231 tests across 53 files
```

**Production:** The app is deployed via the Manus platform with built-in hosting, custom domain support, and SSL.

**Monitoring:** Server logs are available in `.manus-logs/` (devserver, browserConsole, networkRequests, sessionReplay).
