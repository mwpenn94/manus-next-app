# Manus Next

An open-source autonomous AI agent platform. Research, code, analyze, and create — all from a single conversational interface.

---

## Features

| Feature | Description |
|---------|-------------|
| **Conversational AI** | Multi-turn chat with persistent message history |
| **Agentic Execution** | Multi-turn tool-calling loop (up to 8 turns per task) |
| **Web Research** | DuckDuckGo + Wikipedia + page fetch + LLM synthesis |
| **Wide Research** | Parallel multi-query search (up to 5 concurrent) with LLM synthesis |
| **Enhanced Browsing** | Deep URL analysis with metadata, links, images, structured data |
| **Code Execution** | Sandboxed JavaScript with 5-second timeout |
| **Image Generation** | AI-powered image creation from text prompts |
| **Document Generation** | Structured documents (markdown, reports, analysis, plans) |
| **Voice Input** | Speech-to-text via Whisper API |
| **Cross-Session Memory** | Persistent knowledge entries injected into context |
| **Memory Auto-Extraction** | LLM-powered fact extraction from completed conversations |
| **Conversation Regenerate** | Re-generate any assistant response with one click |
| **Task Sharing** | Signed URLs with optional password and expiry |
| **Task Scheduling** | Cron-based and interval-based recurring tasks with server-side polling |
| **Session Replay** | Recorded interaction playback for task review |
| **Notifications** | In-app notification center with unread tracking |
| **Speed/Quality Mode** | Toggle between fast concise vs. thorough detailed responses |
| **Cost Visibility** | Per-task estimated cost indicator in task header |
| **Keyboard Shortcuts** | Global shortcuts (Cmd+K, Cmd+N, Cmd+/, Cmd+Shift+S, Escape) |
| **PWA Installable** | Web App Manifest for mobile/desktop installation |
| **Voice Streaming** | Real-time mic → STT → LLM → TTS conversational pipeline via WebSocket |
| **Bridge Integration** | WebSocket connection to Manus Next Hybrid backend |
| **Stripe Payments** | Subscription billing with checkout, webhooks, and product management |
| **Connector Ecosystem** | 8 connectors (Slack, GitHub, Google, Notion, Zapier, MCP, Webhooks, Email) |
| **Skills Library** | Installable skill packs for specialized capabilities |
| **App Builder** | Full webapp builder with preview, code editor, and publish |
| **Design Studio** | AI image generation + text layers + canvas composition + export |
| **Meeting Notes** | Record, transcribe, and summarize meetings |
| **Slides Generator** | AI-powered slide deck creation |
| **Figma Import** | Convert Figma designs to React components |
| **Desktop App Builder** | Package web app as native desktop application |
| **Virtual Desktop** | Terminal, text editor, browser, and file manager in-browser |
| **Team Collaboration** | Create/join teams with invite codes |
| **Mobile Projects** | Mobile-optimized project management |
| **Electron Companion** | Native desktop bridge with WebSocket relay |

---

## Tech Stack

- **Frontend:** React 19, Tailwind CSS 4, Wouter, shadcn/ui
- **Backend:** Express 4, tRPC 11, Server-Sent Events (SSE)
- **Database:** MySQL/TiDB via Drizzle ORM
- **Auth:** Manus OAuth
- **Payments:** Stripe (checkout, webhooks, subscriptions)
- **LLM:** Built-in Forge API
- **Storage:** S3
- **Scheduling:** cron-parser + server-side polling loop
- **Security:** Helmet, express-rate-limit, auth guards on all sensitive endpoints
- **Desktop:** Electron companion app with Playwright bridge

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Push database schema
pnpm db:push

# Start development server
pnpm dev
```

The app will be available at `http://localhost:3000`.

---

## Project Structure

```
client/src/
  pages/          -> Route-level components (25+ pages)
  components/     -> Reusable UI (AppLayout, ManusNextChat, NotificationCenter, ShareDialog, etc.)
  contexts/       -> React contexts (Task, Bridge, Theme)
  hooks/          -> Custom hooks (useKeyboardShortcuts)
  _core/hooks/    -> Auth hooks

server/
  agentStream.ts  -> SSE agentic loop with tool calling + anti-premature-completion
  voiceStream.ts  -> §L.35 real-time voice streaming WebSocket pipeline
  agentTools.ts   -> Tool definitions and executors (14 tools)
  scheduler.ts    -> Server-side task scheduler (60s polling loop)
  memoryExtractor.ts -> LLM-powered memory auto-extraction
  routers.ts      -> tRPC procedures (27 routers)
  db.ts           -> Database query helpers
  storage.ts      -> S3 file storage
  stripe.ts       -> Stripe payment integration
  products.ts     -> Product/pricing definitions
  _core/          -> Framework plumbing (OAuth, LLM, context, security middleware)

electron-companion/
  src/            -> Electron main process, preload, renderer
  scripts/        -> Build and packaging scripts

drizzle/
  schema.ts       -> Database table definitions
```

---

## Agent Tools (14)

| Tool | Description |
|------|-------------|
| `web_search` | Multi-source search with LLM synthesis |
| `read_webpage` | Fetch and parse webpage content |
| `browse_web` | Enhanced URL analysis (metadata, links, images, structured data) |
| `wide_research` | Parallel multi-query research (up to 5 concurrent) with LLM synthesis |
| `execute_code` | Sandboxed JavaScript execution |
| `analyze_data` | Structured data analysis |
| `generate_image` | AI image generation |
| `generate_document` | Document creation (4 formats) |
| `create_slides` | AI-powered slide deck generation |
| `transcribe_audio` | Audio transcription via Whisper |
| `send_notification` | Push notifications to connectors |
| `manage_files` | File upload/download/management |
| `create_webapp` | Web application scaffolding with React/Vite/Tailwind |
| `deploy_webapp` | Deploy webapp to CDN with versioning and quality validation |
| `create_file` | Create files within webapp projects |
| `edit_file` | Edit existing files within webapp projects |
| `design_compose` | Visual composition with AI |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+K` / `Ctrl+K` | Focus search / input |
| `Cmd+N` / `Ctrl+N` | New task (navigate home) |
| `Cmd+/` / `Ctrl+/` | Toggle keyboard shortcuts help |
| `Cmd+Shift+S` / `Ctrl+Shift+S` | Toggle sidebar |
| `Escape` | Close dialog / cancel |

---

## Security

- **Helmet** security headers (10 headers including CSP, HSTS, X-Frame-Options)
- **Rate limiting** on all API endpoints (200/min general, 30/min uploads, 20/min streams)
- **Auth guards** on file upload and SSE stream endpoints
- **Zod validation** on all tRPC procedure inputs (281 validations)
- **CSRF protection** via SameSite cookies
- **JWT session management** with configurable expiry

---

## Testing

```bash
pnpm test                    # Run all 4700+ tests
npx tsc --noEmit             # TypeScript type check
```

**Test coverage:** 4700+ tests across 170 test files covering routers, agent tools, streaming, features, bridge, preferences, parity, Stripe integration, connector OAuth, agent behavior, voice streaming, scheduling, design studio, app builder, PDF generation, webapp deployment pipeline, dynamic complexity thresholds, and more.

---

## Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — System design, data flow, API routes, capability status
- **[PARITY_GAP_ANALYSIS.md](./PARITY_GAP_ANALYSIS.md)** — Manus Parity Spec v8.0 audit and status
- **[todo.md](./todo.md)** — Feature tracking and implementation history
- **[assessment-findings.md](./assessment-findings.md)** — Security and performance assessment results
- **[vu-walkthrough-complete.md](./vu-walkthrough-complete.md)** — Virtual user walkthrough results

---

## Capability Status

### Live (50+ capabilities)
Chat Mode, Agent Mode, Speed/Quality Mode, Cost Visibility, Cross-Session Memory, Memory Auto-Extraction, Task Sharing, Task Scheduling, Session Replay, Conversation Regenerate, Notifications, Data Analysis, Image Generation, Web Search, Wide Research, Enhanced Browsing, Auth, SEO, Code Execution, Voice STT, Document Generation, Task Management, Workspace Artifacts, Bridge Integration, Preferences, Identity Rule, Research Nudge, GitHub Integration, Mobile Responsive, System Prompt Customization, Keyboard Shortcuts, PWA Installability, Stripe Payments, Connector Ecosystem, Skills Library, App Builder, Design Studio, Meeting Notes, Slides Generator, Figma Import, Desktop App Builder, Virtual Desktop, Team Collaboration, Mobile Projects, Electron Companion, Security Hardening, Rate Limiting

### Recent Improvements (Pass 55-56)
- **PDF Generation:** Fixed extra blank page issue — footer rendering no longer triggers auto-pagination
- **Webapp Creation Pipeline:** Fixed agent hang — deploy nudge ensures apps are deployed within reasonable turn limits
- **Dynamic Complexity Thresholds:** Webapp deploy nudge adapts to request complexity (simple/medium/complex)
- **Post-Deploy Quality Validation:** LLM self-check verifies deployed webapp functionality before presenting to user

### Planned
Client Inference, Sync/Collaboration

See the in-app Settings page for detailed status of each capability.

---

## License

Open source. See LICENSE for details.
