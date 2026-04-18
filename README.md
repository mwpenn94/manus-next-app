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
| **Task Scheduling (UI + Server)** | Cron-based and interval-based recurring tasks with server-side polling |
| **Session Replay** | Recorded interaction playback for task review |
| **Notifications** | In-app notification center with unread tracking |
| **Speed/Quality Mode** | Toggle between fast concise vs. thorough detailed responses |
| **Cost Visibility** | Per-task estimated cost indicator in task header |
| **Keyboard Shortcuts** | Global shortcuts (Cmd+K, Cmd+N, Cmd+/, Cmd+Shift+S, Escape) |
| **PWA Installable** | Web App Manifest for mobile/desktop installation |
| **Bridge Integration** | WebSocket connection to Sovereign Hybrid backend |

---

## Tech Stack

- **Frontend:** React 19, Tailwind CSS 4, Wouter, shadcn/ui
- **Backend:** Express 4, tRPC 11, Server-Sent Events (SSE)
- **Database:** MySQL/TiDB via Drizzle ORM
- **Auth:** Manus OAuth
- **LLM:** Built-in Forge API
- **Storage:** S3
- **Scheduling:** cron-parser + server-side polling loop

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
  pages/          → Route-level components (Home, TaskView, Memory, Schedule, Replay, Settings, Billing, SharedTaskView)
  components/     → Reusable UI (NotificationCenter, ShareDialog, ModeToggle, AppLayout, KeyboardShortcutsDialog)
  contexts/       → React contexts (Task, Bridge, Theme)
  hooks/          → Custom hooks (useKeyboardShortcuts)
  _core/hooks/    → Auth hooks

server/
  agentStream.ts  → SSE agentic loop with tool calling
  agentTools.ts   → Tool definitions and executors (8 tools)
  scheduler.ts    → Server-side task scheduler (60s polling loop)
  memoryExtractor.ts → LLM-powered memory auto-extraction
  routers.ts      → tRPC procedures (auth, task, memory, share, notification, preferences, schedule, replay, usage, bridge)
  db.ts           → Database query helpers
  storage.ts      → S3 file storage
  _core/          → Framework plumbing (OAuth, LLM, context, scheduler startup)

drizzle/
  schema.ts       → Database table definitions (12 tables)
```

---

## Agent Tools (8)

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

## Testing

```bash
pnpm test                    # Run all 166 tests
node validate-parity.mjs     # Run 18 e2e validations
node validate-personas.mjs   # Run 35 virtual user persona checks
npx tsc --noEmit             # TypeScript type check
```

**Test coverage:** 166 tests across 11 test files covering routers, agent tools, streaming, features, bridge, preferences, parity features, Phase 3 features (browse_web, memory extractor, regenerate, scheduling, replay), and Phase 4 features (scheduler, wide_research, keyboard shortcuts, PWA, cost visibility).

---

## Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — System design, data flow, API routes, capability status
- **[PARITY_GAP_ANALYSIS.md](./PARITY_GAP_ANALYSIS.md)** — Manus Parity Spec v8.0 audit and status
- **[todo.md](./todo.md)** — Feature tracking and implementation history

---

## Capability Status

### Live (32 capabilities)
Chat Mode, Agent Mode, Speed/Quality Mode, Cost Visibility, Cross-Session Memory, Memory Auto-Extraction, Task Sharing, Task Scheduling (UI + Server), Session Replay, Conversation Regenerate, Notifications, Data Analysis, Image Generation, Web Search, Wide Research, Enhanced Browsing, Auth, SEO, Code Execution, Voice STT, Document Generation, Task Management, Workspace Artifacts, Bridge Integration, Preferences, Identity Rule, Research Nudge, GitHub Integration, Mobile Responsive, System Prompt Customization, Keyboard Shortcuts, PWA Installability

### Planned (4 capabilities)
Slide Decks, Client Inference, Desktop Agent, Sync/Collaboration

See the in-app Settings page for detailed status of each capability.

---

## License

Open source. See LICENSE for details.
