/**
 * ManusNextChat — Reusable Component Type Definitions
 *
 * Per v8.3 Parity Spec §B.5: ManusNextChat is the embeddable,
 * theme-aware, self-contained chat component that can be extracted
 * into a standalone npm package (@mwpenn94/manus-next-core).
 *
 * These types define the public API surface for the component.
 */

// ── Theme System ──

export interface ManusNextThemeColors {
  /** Primary brand color (oklch format) */
  primary: string;
  /** Primary foreground (text on primary) */
  primaryForeground: string;
  /** Background color */
  background: string;
  /** Foreground (text) color */
  foreground: string;
  /** Muted background */
  muted: string;
  /** Muted foreground */
  mutedForeground: string;
  /** Card background */
  card: string;
  /** Card foreground */
  cardForeground: string;
  /** Border color */
  border: string;
  /** Accent color */
  accent: string;
  /** Accent foreground */
  accentForeground: string;
  /** Destructive color */
  destructive: string;
}

export interface ManusNextTheme {
  /** Theme identifier */
  id: string;
  /** Display name */
  name: string;
  /** Dark or light mode */
  mode: "dark" | "light";
  /** Color palette */
  colors: ManusNextThemeColors;
  /** Font family for headings */
  fontHeading?: string;
  /** Font family for body text */
  fontBody?: string;
  /** Font family for monospace/code */
  fontMono?: string;
  /** Border radius base (rem) */
  radius?: number;
}

// ── Built-in Theme Presets ──

export type ThemePresetId = "manus-dark" | "manus-light" | "stewardly-dark";

// ── Agent Mode ──

export type AgentMode = "speed" | "quality" | "max" | "limitless";

// ── Message Types ──

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  /** Tool actions performed during this message */
  actions?: ChatAction[];
  /** File attachments */
  attachments?: ChatAttachment[];
}

export interface ChatAction {
  type:
    | "browsing"
    | "scrolling"
    | "clicking"
    | "executing"
    | "creating"
    | "searching"
    | "generating"
    | "thinking"
    | "writing"
    | "researching";
  status: "active" | "done" | "error";
  /** URL for browsing actions */
  url?: string;
  /** Element name for clicking actions */
  element?: string;
  /** Command for executing actions */
  command?: string;
  /** File path for creating actions */
  file?: string;
  /** Search query for searching actions */
  query?: string;
  /** Description for generating actions */
  description?: string;
  /** Preview content */
  preview?: string;
}

export interface ChatAttachment {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
}

// ── Workspace Artifacts ──

export interface WorkspaceArtifact {
  id: string;
  type: "browser_url" | "code" | "terminal" | "generated_image" | "document";
  content: string;
  url?: string;
  timestamp: Date;
}

// ── Event Handlers ──

export interface ManusNextChatEvents {
  /** Fired when user sends a message */
  onSend?: (message: string, attachments?: File[]) => void;
  /** Fired when agent starts processing */
  onAgentStart?: () => void;
  /** Fired when agent completes processing */
  onAgentComplete?: (response: ChatMessage) => void;
  /** Fired when an error occurs */
  onError?: (error: Error) => void;
  /** Fired when mode changes */
  onModeChange?: (mode: AgentMode) => void;
  /** Fired when a workspace artifact is created */
  onArtifact?: (artifact: WorkspaceArtifact) => void;
  /** Fired when user requests task stop */
  onStop?: () => void;
}

// ── Configuration ──

export interface ManusNextChatConfig {
  /** API endpoint for the agent stream */
  apiUrl: string;
  /** Authentication token (if using external auth) */
  authToken?: string;
  /** Default agent mode */
  defaultMode?: AgentMode;
  /** Maximum file upload size in bytes */
  maxUploadSize?: number;
  /** Supported file types for upload */
  supportedFileTypes?: string[];
  /** Enable voice input */
  enableVoice?: boolean;
  /** Enable TTS on assistant messages */
  enableTTS?: boolean;
  /** Enable workspace panel */
  enableWorkspace?: boolean;
  /** System prompt override */
  systemPrompt?: string;
  /** Enable keyboard shortcuts */
  enableShortcuts?: boolean;
}

// ── Main Component Props ──

export interface ManusNextChatProps {
  /** Configuration */
  config: ManusNextChatConfig;
  /** Theme (preset ID or custom theme object) */
  theme?: ThemePresetId | ManusNextTheme;
  /** Initial messages to display */
  initialMessages?: ChatMessage[];
  /** Event handlers */
  events?: ManusNextChatEvents;
  /** CSS class name for the root element */
  className?: string;
  /** Inline styles for the root element */
  style?: React.CSSProperties;
  /** Whether to show the header */
  showHeader?: boolean;
  /** Custom header content */
  headerContent?: React.ReactNode;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Whether the component is in a loading state */
  loading?: boolean;
  /** Whether the component is disabled */
  disabled?: boolean;
}

// ── Imperative Handle ──

export interface ManusNextChatHandle {
  /** Send a message programmatically */
  sendMessage: (content: string) => void;
  /** Clear all messages */
  clearMessages: () => void;
  /** Get current messages */
  getMessages: () => ChatMessage[];
  /** Set agent mode */
  setMode: (mode: AgentMode) => void;
  /** Stop current generation */
  stopGeneration: () => void;
  /** Focus the input */
  focusInput: () => void;
  /** Scroll to bottom */
  scrollToBottom: () => void;
}
