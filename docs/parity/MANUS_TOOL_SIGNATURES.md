# Manus Tool Signatures (§L.37)

**Created:** 2026-04-22T10:40:00Z
**Purpose:** Per-capability tool signature matrix — every Manus tool + library + manus-next-app equivalent API + workspace package home.

## Tool Signature Matrix

| Manus Tool | Type | Parameters | manus-next-app Equivalent | Package Location | Status |
|-----------|------|-----------|--------------------------|-----------------|--------|
| `search` (info) | Function | queries[], type, time? | `web_search` agent tool → Forge API | server/_core/sdk.ts | GREEN |
| `search` (image) | Function | queries[], type="image" | `generate_image` agent tool → Forge imageGeneration | server/_core/imageGeneration.ts | GREEN |
| `search` (api) | Function | queries[], type="api" | `web_search` with api type | server/_core/sdk.ts | GREEN |
| `search` (news) | Function | queries[], type="news" | `web_search` with news type | server/_core/sdk.ts | GREEN |
| `search` (research) | Function | queries[], type="research" | `web_search` with research type | server/_core/sdk.ts | GREEN |
| `browser` | Function | url, intent, focus? | `browse_web` / `read_webpage` agent tools | server/agentStream.ts (tool dispatch) | GREEN |
| `shell` | Function | command, session, timeout? | `execute_code` agent tool (Python/Node subprocess) | server/agentStream.ts (tool dispatch) | GREEN |
| `file` (read/write/edit) | Function | path, action, text? | Agent file operations via tool dispatch | server/agentStream.ts | GREEN |
| `map` (parallel) | Function | prompt_template, inputs[], output_schema | `wide_research` parallel dispatch | server/agentStream.ts | GREEN |
| `schedule` | Function | type, cron/interval, prompt | Scheduled Tasks (scheduledTasks table + scheduler.ts polling) | server/scheduler.ts + drizzle/schema.ts | GREEN |
| `generate` (image) | Mode | prompt, originalImages? | `generate_image` tool → Forge API | server/_core/imageGeneration.ts | GREEN |
| `generate` (speech) | Mode | text, voice? | Browser SpeechSynthesis API + useTTS hook | client/src/hooks/useTTS.ts | GREEN |
| `generate` (music) | Mode | prompt, duration? | Agent tool dispatch (YELLOW — sandbox limitation) | server/agentStream.ts | YELLOW |
| `generate` (video) | Mode | prompt, images? | Agent tool dispatch (YELLOW — sandbox limitation) | server/agentStream.ts | YELLOW |
| `slides` | Mode | content_file, slide_count, mode | `slides.generate` tRPC + generate_slides tool | server/routers.ts (slides router) | GREEN |
| `manus-render-diagram` | CLI | input_file, output_file | `execute_code` tool (D2/Mermaid rendering) | server/agentStream.ts | GREEN |
| `manus-md-to-pdf` | CLI | input_file, output_file | `generate_document` tool (markdown → PDF) | server/agentStream.ts | GREEN |
| `manus-speech-to-text` | CLI | input_file | `voice.transcribe` tRPC → Forge Whisper API | server/_core/voiceTranscription.ts | GREEN |
| `manus-upload-file` | CLI | input_file | `storagePut` → S3 | server/storage.ts | GREEN |
| `webdev_*` | Suite | Various | Full webdev stack (this project IS the webdev output) | Entire project | GREEN |
| `expose` | Function | port | Platform-managed (manus.space domain) | Deployment infrastructure | GREEN |
| `plan` | Function | action, phases, goal | Agent task planning (internal) | server/agentStream.ts | GREEN |
| `message` | Function | type, text, attachments? | Agent chat responses (SSE stream) | server/agentStream.ts | GREEN |

## Library Equivalents

| Manus Library | Version | manus-next-app Package | Version | Notes |
|--------------|---------|----------------------|---------|-------|
| React | 19.x | react | 19.2.1 | Exact parity |
| Tailwind CSS | 4.x | tailwindcss | 4.1.5 | Exact parity |
| Vite | 7.x | vite | 7.1.7 | Exact parity |
| Express | 4.x | express | 4.21.2 | Exact parity |
| Drizzle ORM | 0.44.x | drizzle-orm | 0.44.5 | Exact parity |
| tRPC | 11.x | @trpc/client + @trpc/server | 11.6.0 | Exact parity |
| Playwright | 1.52.x | @playwright/test | 1.52.0 | Exact parity |
| Stripe | 22.x | stripe | 22.0.2 | Exact parity |
| shadcn/ui | Latest | @radix-ui/* | Various | Component-level parity |

## Workspace Package Map

| Package | Path | Purpose |
|---------|------|---------|
| Root | / | Main application (client + server + shared) |
| eval | packages/eval/ | Benchmark judge, capability YAMLs, scoring |
| e2e | e2e/ | Playwright E2E test suite |
