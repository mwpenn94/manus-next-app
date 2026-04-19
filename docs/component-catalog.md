# Component Catalog — manus-next-app

> Inventory of all custom components with usage, props, and dependencies.

---

## Layout Components

### DashboardLayout
**Path:** `client/src/components/DashboardLayout.tsx`

Full dashboard layout with collapsible sidebar navigation, user profile, and auth handling. Used as the primary layout wrapper for all authenticated pages.

| Prop | Type | Description |
|------|------|-------------|
| `children` | `ReactNode` | Page content |

**Usage:**
```tsx
<DashboardLayout>
  <MyPage />
</DashboardLayout>
```

### DashboardLayoutSkeleton
**Path:** `client/src/components/DashboardLayoutSkeleton.tsx`

Loading skeleton displayed during auth checks before the full layout renders.

---

## Chat Components

### ManusNextChat
**Path:** `client/src/components/ManusNextChat.tsx`

Reusable, embeddable chat component with SSE streaming, theme presets, and imperative control. See `docs/embedding-guide.md` for full documentation.

### AIChatBox
**Path:** `client/src/components/AIChatBox.tsx`

Template-provided chat interface with message history and streaming support. Used as reference; ManusNextChat is the primary chat component.

---

## Navigation Components

### ModeToggle
**Path:** `client/src/components/ModeToggle.tsx`

Speed/Quality/Max mode selector with icons and tooltips.

| Prop | Type | Description |
|------|------|-------------|
| `mode` | `AgentMode` | Current mode |
| `onModeChange` | `(mode: AgentMode) => void` | Mode change callback |

### NotificationCenter
**Path:** `client/src/components/NotificationCenter.tsx`

Bell icon with unread count badge and dropdown notification list.

---

## Dialog Components

### ShareDialog
**Path:** `client/src/components/ShareDialog.tsx`

Task sharing dialog with password protection, expiry options, and link generation.

| Prop | Type | Description |
|------|------|-------------|
| `taskId` | `string` | Task to share |
| `open` | `boolean` | Dialog visibility |
| `onOpenChange` | `(open: boolean) => void` | Visibility callback |

### ManusDialog
**Path:** `client/src/components/ManusDialog.tsx`

Template-provided branded dialog component.

---

## Workspace Components

### WorkspacePanel
**Path:** `client/src/components/WorkspacePanel.tsx`

Right-side workspace panel with tabs for Browser, Code, Terminal, and Images. Displays agent tool outputs in real-time.

### MemoryGraph
**Path:** `client/src/components/MemoryGraph.tsx`

Visual knowledge graph display for cross-session memory entries.

---

## Input Components

### VoiceInput
**Path:** `client/src/components/VoiceInput.tsx`

Microphone button with MediaRecorder integration for voice-to-text input.

| Prop | Type | Description |
|------|------|-------------|
| `onTranscript` | `(text: string) => void` | Transcription callback |
| `disabled` | `boolean` | Disable recording |

### FileUpload
**Path:** `client/src/components/FileUpload.tsx`

File upload component with drag-and-drop, S3 upload, and progress indicator.

---

## Display Components

### CostIndicator
**Path:** `client/src/components/CostIndicator.tsx`

Token cost and mode indicator badge shown during task execution.

### TTSButton
**Path:** `client/src/components/TTSButton.tsx`

Text-to-speech button using Browser SpeechSynthesis API.

| Prop | Type | Description |
|------|------|-------------|
| `text` | `string` | Text to speak |

---

## Page Components

| Page | Path | Route | Auth Required |
|------|------|-------|--------------|
| Home | `pages/Home.tsx` | `/` | No |
| TaskView | `pages/TaskView.tsx` | `/task/:id` | Yes |
| ProjectsPage | `pages/ProjectsPage.tsx` | `/projects` | Yes |
| SchedulePage | `pages/SchedulePage.tsx` | `/schedule` | Yes |
| MemoryPage | `pages/MemoryPage.tsx` | `/memory` | Yes |
| BillingPage | `pages/BillingPage.tsx` | `/billing` | Yes |
| SettingsPage | `pages/SettingsPage.tsx` | `/settings` | Yes |
| ReplayPage | `pages/ReplayPage.tsx` | `/replay/:id` | No (shared) |
| SharedTaskView | `pages/SharedTaskView.tsx` | `/shared/:token` | No |
| DesignView | `pages/DesignView.tsx` | `/design` | Yes |
| NotFound | `pages/NotFound.tsx` | `*` | No |

---

## shadcn/ui Components

The following shadcn/ui components are installed and available in `client/src/components/ui/`:

| Component | Import | Usage |
|-----------|--------|-------|
| Button | `@/components/ui/button` | Primary action buttons |
| Card | `@/components/ui/card` | Content containers |
| Dialog | `@/components/ui/dialog` | Modal dialogs |
| Input | `@/components/ui/input` | Text inputs |
| Label | `@/components/ui/label` | Form labels |
| Select | `@/components/ui/select` | Dropdown selects |
| Textarea | `@/components/ui/textarea` | Multi-line inputs |
| Tabs | `@/components/ui/tabs` | Tab navigation |
| Badge | `@/components/ui/badge` | Status badges |
| Tooltip | `@/components/ui/tooltip` | Hover tooltips |
| Separator | `@/components/ui/separator` | Visual dividers |
| ScrollArea | `@/components/ui/scroll-area` | Scrollable containers |
| Skeleton | `@/components/ui/skeleton` | Loading placeholders |
| Toast | `@/components/ui/toast` | Toast notifications |
| Switch | `@/components/ui/switch` | Toggle switches |
| Slider | `@/components/ui/slider` | Range sliders |
| Progress | `@/components/ui/progress` | Progress bars |
| Avatar | `@/components/ui/avatar` | User avatars |
| DropdownMenu | `@/components/ui/dropdown-menu` | Context menus |
| Popover | `@/components/ui/popover` | Popovers |
