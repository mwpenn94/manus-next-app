# Manus Next

An open-source autonomous AI agent platform. Research, code, analyze, and create — all from a single conversational interface.

---

## Features

| Feature | Description |
|---------|-------------|
| **Conversational AI** | Multi-turn chat with persistent message history |
| **Agentic Execution** | Multi-turn tool-calling loop (up to 8 turns per task) |
| **Web Research** | DuckDuckGo + Wikipedia + page fetch + LLM synthesis |
| **Enhanced Browsing** | Deep URL analysis with metadata, links, images, structured data |
| **Code Execution** | Sandboxed JavaScript with 5-second timeout |
| **Image Generation** | AI-powered image creation from text prompts |
| **Document Generation** | Structured documents (markdown, reports, analysis, plans) |
| **Voice Input** | Speech-to-text via Whisper API |
| **Cross-Session Memory** | Persistent knowledge entries injected into context |
| **Memory Auto-Extraction** | LLM-powered fact extraction from completed conversations |
| **Conversation Regenerate** | Re-generate any assistant response with one click |
| **Task Sharing** | Signed URLs with optional password and expiry |
| **Task Scheduling** | Cron-based and interval-based recurring tasks |
| **Session Replay** | Recorded interaction playback for task review |
| **Notifications** | In-app notification center with unread tracking |
| **Speed/Quality Mode** | Toggle between fast concise vs. thorough detailed responses |
| **Bridge Integration** | WebSocket connection to Sovereign Hybrid backend |

---

## Tech Stack

- **Frontend:** React 19, Tailwind CSS 4, Wouter, shadcn/ui
- **Backend:** Express 4, tRPC 11, Server-Sent Events (SSE)
- **Database:** MySQL/TiDB via Drizzle ORM
- **Auth:** Manus OAuth
- **LLM:** Built-in Forge API
- **Storage:** S3

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
  pages/          → Route-level components (Home, TaskView, Memory, Schedule, Replay, Settings, SharedTaskView)
  components/     → Reusable UI (NotificationCenter, ShareDialog, ModeToggle, AppLayout)
  contexts/       → React contexts (Task, Bridge, Theme)
  _core/hooks/    → Auth hooks

server/
  agentStream.ts  → SSE agentic loop with tool calling
  agentTools.ts   → Tool definitions and executors (7 tools)
  memoryExtractor.ts → LLM-powered memory auto-extraction
  routers.ts      → tRPC procedures (auth, task, memory, share, notification, preferences, schedule, replay)
  db.ts           → Database query helpers
  storage.ts      → S3 file storage
  _core/          → Framework plumbing (OAuth, LLM, context)

drizzle/
  schema.ts       → Database table definitions (12 tables)
```

---

## Agent Tools (7)

| Tool | Description |
|------|-------------|
| `web_search` | Multi-source search with LLM synthesis |
| `read_webpage` | Fetch and parse webpage content |
| `browse_web` | Enhanced URL analysis (metadata, links, images, structured data) |
| `execute_code` | Sandboxed JavaScript execution |
| `analyze_data` | Structured data analysis |
| `generate_image` | AI image generation |
| `generate_document` | Document creation (4 formats) |

---

## Testing

```bash
pnpm test                    # Run all 155 tests
node validate-parity.mjs     # Run 18 e2e validations
node validate-personas.mjs   # Run 35 virtual user persona checks
npx tsc --noEmit             # TypeScript type check
```

**Test coverage:** 155 tests across 10 test files covering routers, agent tools, streaming, features, bridge, preferences, parity features, and Phase 3 features (browse_web, memory extractor, regenerate, scheduling, replay).

---

## Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — System design, data flow, API routes, capability status
- **[PARITY_GAP_ANALYSIS.md](./PARITY_GAP_ANALYSIS.md)** — Manus Parity Spec v8.0 audit and status
- **[todo.md](./todo.md)** — Feature tracking and implementation history

---

## Capability Status

### Live (28 capabilities)
Chat Mode, Agent Mode, Speed/Quality Mode, Cross-Session Memory, Memory Auto-Extraction, Task Sharing, Task Scheduling, Session Replay, Conversation Regenerate, Notifications, Data Analysis, Image Generation, Web Search, Enhanced Browsing, Auth, SEO, Code Execution, Voice STT, Document Generation, Task Management, Workspace Artifacts, Bridge Integration, Preferences, Identity Rule, Research Nudge, GitHub Integration, Mobile Responsive, System Prompt Customization

### Planned (4 capabilities)
Slide Decks, Client Inference, Desktop Agent, Sync/Collaboration

See the in-app Settings page for detailed status of each capability.

---

## License

Open source. See LICENSE for details.
