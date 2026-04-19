# REUSABILITY_SCAFFOLD — ManusNextChat

> Per §L.12: ManusNextChat must be extractable as a standalone, publishable component.

---

## Component Architecture

```
ManusNextChat
├── Props: ManusNextChatProps (shared/ManusNextChat.types.ts)
├── Handle: ManusNextChatHandle (imperative ref API)
├── Themes: THEME_PRESETS (shared/ManusNextChat.themes.ts)
├── Streaming: SSE via fetch ReadableStream
└── Events: onSend, onAgentStart, onAgentComplete, onError, onStop, onModeChange
```

## Public API

### Props (`ManusNextChatProps`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `config` | `ManusNextChatConfig` | required | API URL, default mode, max turns |
| `theme` | `string \| ThemePreset` | `"manus-dark"` | Theme preset ID or custom theme object |
| `initialMessages` | `ChatMessage[]` | `[]` | Pre-populated messages |
| `events` | `ManusNextChatEvents` | `undefined` | Event callbacks |
| `className` | `string` | `undefined` | Additional CSS classes |
| `style` | `CSSProperties` | `undefined` | Inline styles |
| `showHeader` | `boolean` | `true` | Show/hide header bar |
| `headerContent` | `ReactNode` | `undefined` | Custom header content |
| `placeholder` | `string` | `"Give Manus Next a task..."` | Input placeholder text |
| `loading` | `boolean` | `false` | Show loading state |
| `disabled` | `boolean` | `false` | Disable input |

### Imperative Handle (`ManusNextChatHandle`)

| Method | Description |
|--------|-------------|
| `sendMessage(content: string)` | Programmatically send a message |
| `clearMessages()` | Clear all messages |
| `getMessages()` | Get current message array |
| `setMode(mode: AgentMode)` | Switch agent mode |
| `stopGeneration()` | Stop current streaming |
| `focusInput()` | Focus the input textarea |
| `scrollToBottom()` | Scroll to latest message |

### Theme Presets

| Preset ID | Description |
|-----------|-------------|
| `manus-dark` | Default dark theme matching Manus aesthetic |
| `manus-light` | Light theme variant |
| `minimal-dark` | Minimal dark with reduced chrome |
| `minimal-light` | Minimal light variant |
| `ocean` | Blue ocean theme |
| `forest` | Green forest theme |

## Streaming Protocol

ManusNextChat connects to the agent backend via SSE (Server-Sent Events):

1. POST to `config.apiUrl` (defaults to `/api/stream`)
2. Body: `{ message, mode, history }`
3. Response: SSE stream with events:
   - `data: {"token": "..."}` — text token
   - `data: {"image": "https://..."}` — generated image URL
   - `data: {"document": {"url": "...", "title": "..."}}` — generated document
   - `data: [DONE]` — stream complete

## Extraction Path

To publish as `@mwpenn94/manus-next-core`:

1. Copy `client/src/components/ManusNextChat.tsx` → `packages/core/src/ManusNextChat.tsx`
2. Copy `shared/ManusNextChat.types.ts` → `packages/core/src/types.ts`
3. Copy `shared/ManusNextChat.themes.ts` → `packages/core/src/themes.ts`
4. Add peer dependencies: `react`, `lucide-react`
5. Bundle with tsup/rollup
6. Publish to npm

## Smoke Test Verification

See `REUSABILITY_VERIFY.md` for the smoke test checklist.
