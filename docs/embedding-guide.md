# Embedding Guide — ManusNextChat

> How to embed the ManusNextChat component in external applications.

---

## Quick Start

```tsx
import { ManusNextChat } from "@mwpenn94/manus-next-core";

function App() {
  return (
    <ManusNextChat
      config={{ apiUrl: "https://your-api.com/api/stream" }}
      theme="manus-dark"
    />
  );
}
```

## Installation

```bash
npm install @mwpenn94/manus-next-core
# or
pnpm add @mwpenn94/manus-next-core
```

**Note:** The package is not yet published to npm. For now, copy the component files directly from the monolith (see "Manual Installation" below).

### Manual Installation (Pre-Publication)

Copy these files into your project:

```
client/src/components/ManusNextChat.tsx  → your-app/src/components/ManusNextChat.tsx
shared/ManusNextChat.types.ts           → your-app/src/types/ManusNextChat.types.ts
shared/ManusNextChat.themes.ts          → your-app/src/types/ManusNextChat.themes.ts
```

Adjust imports accordingly. Peer dependencies: `react >= 18`, `lucide-react >= 0.300`.

---

## Configuration

### Required Props

| Prop | Type | Description |
|------|------|-------------|
| `config` | `ManusNextChatConfig` | API configuration (see below) |

### ManusNextChatConfig

```typescript
interface ManusNextChatConfig {
  apiUrl: string;         // SSE streaming endpoint URL
  defaultMode?: AgentMode; // "speed" | "quality" | "max" (default: "quality")
  maxTurns?: number;      // Max tool turns per request (default: 8)
}
```

### Optional Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `theme` | `string \| ThemePreset` | `"manus-dark"` | Theme preset or custom theme |
| `initialMessages` | `ChatMessage[]` | `[]` | Pre-populated messages |
| `events` | `ManusNextChatEvents` | `undefined` | Event callbacks |
| `className` | `string` | `undefined` | Additional CSS classes |
| `style` | `CSSProperties` | `undefined` | Inline styles |
| `showHeader` | `boolean` | `true` | Show/hide header bar |
| `headerContent` | `ReactNode` | `undefined` | Custom header content |
| `placeholder` | `string` | `"Give Manus Next..."` | Input placeholder |
| `loading` | `boolean` | `false` | Show loading state |
| `disabled` | `boolean` | `false` | Disable input |

---

## Theming

### Built-in Presets

```tsx
<ManusNextChat theme="manus-dark" />   // Default dark theme
<ManusNextChat theme="manus-light" />  // Light variant
<ManusNextChat theme="minimal-dark" /> // Minimal dark
<ManusNextChat theme="ocean" />        // Blue ocean
<ManusNextChat theme="forest" />       // Green forest
```

### Custom Theme

```tsx
<ManusNextChat
  theme={{
    colors: {
      primary: "#6366f1",
      background: "#0f0f23",
      foreground: "#e2e8f0",
      muted: "#334155",
      border: "#1e293b",
      card: "#1a1a2e",
    },
    fontBody: "'Inter', sans-serif",
    fontHeading: "'Instrument Serif', serif",
    fontMono: "'JetBrains Mono', monospace",
    borderRadius: "0.625rem",
  }}
/>
```

---

## Event Handling

```tsx
<ManusNextChat
  events={{
    onSend: (text) => console.log("User sent:", text),
    onAgentStart: () => console.log("Agent started"),
    onAgentComplete: (msg) => console.log("Agent done:", msg.content),
    onError: (err) => console.error("Error:", err),
    onStop: () => console.log("Generation stopped"),
    onModeChange: (mode) => console.log("Mode changed:", mode),
  }}
/>
```

---

## Imperative Control

```tsx
import { useRef } from "react";
import { ManusNextChat, ManusNextChatHandle } from "@mwpenn94/manus-next-core";

function App() {
  const chatRef = useRef<ManusNextChatHandle>(null);

  return (
    <>
      <ManusNextChat ref={chatRef} config={{ apiUrl: "/api/stream" }} />
      <button onClick={() => chatRef.current?.sendMessage("Hello!")}>
        Send Hello
      </button>
      <button onClick={() => chatRef.current?.clearMessages()}>
        Clear
      </button>
      <button onClick={() => chatRef.current?.stopGeneration()}>
        Stop
      </button>
    </>
  );
}
```

---

## Backend Protocol

ManusNextChat expects an SSE (Server-Sent Events) endpoint that accepts POST requests.

### Request Format

```
POST /api/stream
Content-Type: application/json

{
  "message": "User's message text",
  "mode": "quality",
  "history": [
    { "role": "user", "content": "Previous message" },
    { "role": "assistant", "content": "Previous response" }
  ]
}
```

### Response Format (SSE)

```
data: {"token": "Hello"}
data: {"token": " world"}
data: {"image": "https://cdn.example.com/generated-image.png"}
data: {"document": {"url": "https://cdn.example.com/report.md", "title": "Report"}}
data: [DONE]
```

### Event Types

| Event | Field | Description |
|-------|-------|-------------|
| Text token | `token` | Incremental text content |
| Image | `image` | URL of generated image |
| Document | `document.url` + `document.title` | Downloadable document |
| Done | `[DONE]` | Stream complete |

---

## Sizing

ManusNextChat fills its parent container. Control size via the parent element:

```tsx
// Full page
<div className="h-screen">
  <ManusNextChat config={config} />
</div>

// Fixed height panel
<div className="h-[600px] w-[400px]">
  <ManusNextChat config={config} />
</div>

// Sidebar embed
<aside className="w-80 h-full">
  <ManusNextChat config={config} showHeader={false} />
</aside>
```

---

## Accessibility

The component includes:
- Keyboard navigation (Tab, Enter, Shift+Enter)
- ARIA labels on interactive elements
- Focus management on new messages
- Screen reader-friendly message structure
- Respects `prefers-reduced-motion`
