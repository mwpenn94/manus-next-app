import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint, boolean } from "drizzle-orm/mysql-core";
import { nanoid } from "nanoid";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  /** Stripe customer ID — set on first checkout */
  stripeCustomerId: varchar("stripeCustomerId", { length: 128 }),
  /** Stripe subscription ID — set on subscription creation */
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ── Tasks ──
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  externalId: varchar("externalId", { length: 64 }).notNull().unique(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  status: mysqlEnum("status", ["idle", "running", "completed", "error"]).default("idle").notNull(),
  workspaceUrl: text("workspaceUrl"),
  currentStep: varchar("currentStep", { length: 500 }),
  totalSteps: int("totalSteps"),
  completedSteps: int("completedSteps"),
  /** Per-task system prompt override (null = use global default) */
  systemPrompt: text("systemPrompt"),
  /** Optional project association (null = standalone task) */
  projectId: int("projectId"),
  /** Soft-delete flag: archived tasks are hidden from sidebar but preserved */
  archived: int("archived").default(0).notNull(),
  /** Favorite/bookmark flag for quick access */
  favorite: int("favorite").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

// ── Task Ratings ──
export const taskRatings = mysqlTable("task_ratings", {
  id: int("id").autoincrement().primaryKey(),
  taskExternalId: varchar("taskExternalId", { length: 64 }).notNull().unique(),
  userId: int("userId").notNull(),
  rating: int("rating").notNull(), // 1-5 stars
  feedback: text("feedback"), // Optional text feedback
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TaskRating = typeof taskRatings.$inferSelect;
export type InsertTaskRating = typeof taskRatings.$inferInsert;

// ── Task Messages ──
export const taskMessages = mysqlTable("task_messages", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  externalId: varchar("externalId", { length: 64 }).notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  actions: json("actions"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TaskMessage = typeof taskMessages.$inferSelect;
export type InsertTaskMessage = typeof taskMessages.$inferInsert;

// ── Bridge Config ──
export const bridgeConfigs = mysqlTable("bridge_configs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  bridgeUrl: text("bridgeUrl"),
  apiKey: text("apiKey"),
  enabled: int("enabled").default(0).notNull(),
  lastConnected: timestamp("lastConnected"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BridgeConfig = typeof bridgeConfigs.$inferSelect;
export type InsertBridgeConfig = typeof bridgeConfigs.$inferInsert;

// ── Task Files (S3 attachments) ──
export const taskFiles = mysqlTable("task_files", {
  id: int("id").autoincrement().primaryKey(),
  taskExternalId: varchar("taskExternalId", { length: 64 }).notNull(),
  userId: int("userId").notNull(),
  fileName: varchar("fileName", { length: 512 }).notNull(),
  fileKey: varchar("fileKey", { length: 1024 }).notNull(),
  url: text("url").notNull(),
  mimeType: varchar("mimeType", { length: 128 }),
  size: int("size"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TaskFile = typeof taskFiles.$inferSelect;
export type InsertTaskFile = typeof taskFiles.$inferInsert;

// ── User Preferences (settings + capability toggles + system prompt) ──
export const userPreferences = mysqlTable("user_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  /** JSON object: { notifications: bool, soundEffects: bool, autoExpandActions: bool, compactMode: bool } */
  generalSettings: json("generalSettings"),
  /** JSON object: { "package-name": bool, ... } mapping capability package names to enabled/disabled */
  capabilities: json("capabilities"),
  /** Global default system prompt for all tasks (overridden by per-task systemPrompt) */
  systemPrompt: text("systemPrompt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserPreference = typeof userPreferences.$inferSelect;
export type InsertUserPreference = typeof userPreferences.$inferInsert;

// ── Workspace Artifacts (browser screenshots, code, terminal output from bridge events) ──
export const workspaceArtifacts = mysqlTable("workspace_artifacts", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  /** Artifact type: browser_screenshot, browser_url, code, terminal */
  artifactType: mysqlEnum("artifactType", ["browser_screenshot", "browser_url", "code", "terminal", "generated_image", "document"]).notNull(),
  /** For code: filename. For terminal: command. For browser: page title. */
  label: varchar("label", { length: 500 }),
  /** Text content (code source, terminal output). Null for screenshots. */
  content: text("content"),
  /** URL for screenshots or browser URLs */
  url: text("url"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkspaceArtifact = typeof workspaceArtifacts.$inferSelect;
export type InsertWorkspaceArtifact = typeof workspaceArtifacts.$inferInsert;

// ── Memory Entries (cross-session knowledge) ──
export const memoryEntries = mysqlTable("memory_entries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** Short key/label for the memory (e.g., "User prefers dark mode") */
  key: varchar("key", { length: 500 }).notNull(),
  /** Detailed value/content of the memory */
  value: text("value").notNull(),
  /** Source of the memory: auto-extracted from task, or user-created */
  source: mysqlEnum("source", ["auto", "user"]).default("auto").notNull(),
  /** Task that produced this memory (null for user-created) */
  taskExternalId: varchar("taskExternalId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MemoryEntry = typeof memoryEntries.$inferSelect;
export type InsertMemoryEntry = typeof memoryEntries.$inferInsert;

// ── Task Shares (signed URL sharing) ──
export const taskShares = mysqlTable("task_shares", {
  id: int("id").autoincrement().primaryKey(),
  taskExternalId: varchar("taskExternalId", { length: 64 }).notNull(),
  userId: int("userId").notNull(),
  /** Unique share token for the public URL */
  shareToken: varchar("shareToken", { length: 64 }).notNull().unique(),
  /** Optional bcrypt password hash for protected shares */
  passwordHash: text("passwordHash"),
  /** Optional expiration timestamp */
  expiresAt: timestamp("expiresAt"),
  /** View count */
  viewCount: int("viewCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TaskShare = typeof taskShares.$inferSelect;
export type InsertTaskShare = typeof taskShares.$inferInsert;

// ── Notifications ──
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** Notification type: task_completed, task_error, share_viewed, system */
  type: mysqlEnum("type", ["task_completed", "task_error", "share_viewed", "system"]).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content"),
  /** Related task external ID (optional) */
  taskExternalId: varchar("taskExternalId", { length: 64 }),
  /** Read status */
  read: int("read").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ── Scheduled Tasks ──
export const scheduledTasks = mysqlTable("scheduled_tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** Human-readable name for the schedule */
  name: varchar("name", { length: 500 }).notNull(),
  /** The prompt/instruction to execute */
  prompt: text("prompt").notNull(),
  /** Schedule type: cron or interval */
  scheduleType: mysqlEnum("scheduleType", ["cron", "interval"]).notNull(),
  /** Cron expression (6-field: sec min hr dom mon dow) — null for interval type */
  cronExpression: varchar("cronExpression", { length: 128 }),
  /** Interval in seconds — null for cron type */
  intervalSeconds: int("intervalSeconds"),
  /** Whether to repeat after execution */
  repeat: int("repeat").default(1).notNull(),
  /** Whether the schedule is active */
  enabled: int("enabled").default(1).notNull(),
  /** Last execution timestamp */
  lastRunAt: timestamp("lastRunAt"),
  /** Next scheduled execution timestamp */
  nextRunAt: timestamp("nextRunAt"),
  /** Total number of executions */
  runCount: int("runCount").default(0).notNull(),
  /** Last execution status */
  lastStatus: mysqlEnum("lastStatus", ["success", "error", "running"]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScheduledTask = typeof scheduledTasks.$inferSelect;
export type InsertScheduledTask = typeof scheduledTasks.$inferInsert;

// ── Projects (workspace concept — Capability #11) ──
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  externalId: varchar("externalId", { length: 64 }).notNull().unique().$defaultFn(() => nanoid()),
  userId: int("userId").notNull(),
  /** Project name */
  name: varchar("name", { length: 500 }).notNull(),
  /** Project description / master instructions */
  description: text("description"),
  /** Project-level system prompt (applied to all tasks in this project) */
  systemPrompt: text("systemPrompt"),
  /** Project icon emoji or URL */
  icon: varchar("icon", { length: 128 }),
  /** Archived flag */
  archived: int("archived").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

// ── Project Knowledge (files/instructions attached to a project) ──
export const projectKnowledge = mysqlTable("project_knowledge", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  /** Knowledge type: instruction, file, note */
  type: mysqlEnum("type", ["instruction", "file", "note"]).default("note").notNull(),
  /** Title/label */
  title: varchar("title", { length: 500 }).notNull(),
  /** Content (text for instructions/notes, URL for files) */
  content: text("content").notNull(),
  /** File URL if type is file */
  fileUrl: text("fileUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProjectKnowledge = typeof projectKnowledge.$inferSelect;
export type InsertProjectKnowledge = typeof projectKnowledge.$inferInsert;

// ── Task Events (for session replay) ──
export const taskEvents = mysqlTable("task_events", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  /** Event type matching SSE event types */
  eventType: varchar("eventType", { length: 64 }).notNull(),
  /** JSON payload of the event */
  payload: text("payload").notNull(),
  /** Milliseconds since task start */
  offsetMs: int("offsetMs").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TaskEvent = typeof taskEvents.$inferSelect;
export type InsertTaskEvent = typeof taskEvents.$inferInsert;


// ── Skills (user-installed agent skills) ──
export const skills = mysqlTable("skills", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  skillId: varchar("skillId", { length: 128 }).notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 64 }),
  version: varchar("version", { length: 32 }).default("1.0.0"),
  config: json("config").$type<Record<string, unknown>>(),
  enabled: boolean("enabled").default(true),
  installedAt: timestamp("installedAt").defaultNow().notNull(),
});
export type Skill = typeof skills.$inferSelect;
export type InsertSkill = typeof skills.$inferInsert;

// ── Slide Decks (AI-generated presentations) ──
export const slideDecks = mysqlTable("slide_decks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  prompt: text("prompt"),
  template: varchar("template", { length: 64 }).default("blank"),
  /** JSON array of slide objects: { title, content, notes } */
  slides: json("slides").$type<Array<{ title: string; content: string; notes?: string }>>(),
  /** S3 URL if exported */
  exportUrl: text("exportUrl"),
  status: mysqlEnum("status", ["generating", "ready", "error"]).default("generating"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type SlideDeck = typeof slideDecks.$inferSelect;
export type InsertSlideDeck = typeof slideDecks.$inferInsert;

// ── Connectors (third-party integrations) ──
export const connectors = mysqlTable("connectors", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  connectorId: varchar("connectorId", { length: 128 }).notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  /** Encrypted config (API keys, tokens, webhook URLs) */
  config: json("config").$type<Record<string, string>>(),
  /** Authentication method: oauth or api_key */
  authMethod: mysqlEnum("authMethod", ["oauth", "api_key", "webhook"]).default("api_key"),
  /** OAuth access token (encrypted) */
  accessToken: text("accessToken"),
  /** OAuth refresh token (encrypted) */
  refreshToken: text("refreshToken"),
  /** OAuth token expiry timestamp */
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  /** OAuth scopes granted */
  oauthScopes: text("oauthScopes"),
  status: mysqlEnum("status", ["connected", "disconnected", "error"]).default("disconnected"),
  lastSyncAt: timestamp("lastSyncAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Connector = typeof connectors.$inferSelect;
export type InsertConnector = typeof connectors.$inferInsert;

// ── Meeting Sessions (transcription + summary) ──
export const meetingSessions = mysqlTable("meeting_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  taskId: int("taskId"),
  title: varchar("title", { length: 512 }),
  /** S3 URL of the audio recording */
  audioUrl: text("audioUrl"),
  /** Full transcription text */
  transcript: text("transcript"),
  /** LLM-generated summary */
  summary: text("summary"),
  /** LLM-generated action items as JSON array */
  actionItems: json("actionItems").$type<string[]>(),
  duration: int("duration"),
  status: mysqlEnum("status", ["recording", "transcribing", "summarizing", "ready", "error"]).default("recording"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type MeetingSession = typeof meetingSessions.$inferSelect;
export type InsertMeetingSession = typeof meetingSessions.$inferInsert;


// ── Teams (Capability #56/#57/#58 — real collaboration) ──
export const teams = mysqlTable("teams", {
  id: int("id").autoincrement().primaryKey(),
  externalId: varchar("externalId", { length: 64 }).notNull().unique().$defaultFn(() => nanoid()),
  name: varchar("name", { length: 256 }).notNull(),
  ownerId: int("ownerId").notNull(),
  /** Invite code for joining the team */
  inviteCode: varchar("inviteCode", { length: 32 }).notNull().unique().$defaultFn(() => nanoid(12)),
  /** Plan tier: free, pro, enterprise */
  plan: mysqlEnum("plan", ["free", "pro", "enterprise"]).default("free").notNull(),
  /** Shared credit pool balance */
  creditBalance: int("creditBalance").default(1000).notNull(),
  /** Max seats allowed */
  maxSeats: int("maxSeats").default(5).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;

// ── Team Members (junction table) ──
export const teamMembers = mysqlTable("team_members", {
  id: int("id").autoincrement().primaryKey(),
  teamId: int("teamId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "admin", "member"]).default("member").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = typeof teamMembers.$inferInsert;

// ── Team Sessions (shared collaborative sessions) ──
export const teamSessions = mysqlTable("team_sessions", {
  id: int("id").autoincrement().primaryKey(),
  teamId: int("teamId").notNull(),
  taskExternalId: varchar("taskExternalId", { length: 64 }).notNull(),
  createdBy: int("createdBy").notNull(),
  /** Active participants count */
  activeParticipants: int("activeParticipants").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type TeamSession = typeof teamSessions.$inferSelect;
export type InsertTeamSession = typeof teamSessions.$inferInsert;

// ── WebApp Builds (Capability #27/#28/#29 — real persistence + publishing) ──
export const webappBuilds = mysqlTable("webapp_builds", {
  id: int("id").autoincrement().primaryKey(),
  externalId: varchar("externalId", { length: 64 }).notNull().unique().$defaultFn(() => nanoid()),
  userId: int("userId").notNull(),
  /** User's original prompt */
  prompt: text("prompt").notNull(),
  /** Generated HTML/code content */
  generatedHtml: text("generatedHtml"),
  /** Generated source code (full) */
  sourceCode: text("sourceCode"),
  /** S3 URL of published build */
  publishedUrl: text("publishedUrl"),
  /** S3 key for the published build */
  publishedKey: text("publishedKey"),
  /** Publish status */
  status: mysqlEnum("status", ["draft", "generating", "ready", "published", "error"]).default("draft").notNull(),
  /** App name/title */
  title: varchar("title", { length: 256 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type WebappBuild = typeof webappBuilds.$inferSelect;
export type InsertWebappBuild = typeof webappBuilds.$inferInsert;

// ── Designs (Capability #15 — real canvas persistence) ──
export const designs = mysqlTable("designs", {
  id: int("id").autoincrement().primaryKey(),
  externalId: varchar("externalId", { length: 64 }).notNull().unique().$defaultFn(() => nanoid()),
  userId: int("userId").notNull(),
  /** Design name */
  name: varchar("name", { length: 256 }).notNull(),
  /** Canvas state as JSON (layers, positions, etc.) */
  canvasState: json("canvasState").$type<{
    layers: Array<{
      id: string;
      type: "image" | "text";
      content: string;
      x: number;
      y: number;
      width: number;
      height: number;
      fontSize?: number;
      color?: string;
    }>;
    width: number;
    height: number;
    background: string;
  }>(),
  /** Thumbnail URL (S3) */
  thumbnailUrl: text("thumbnailUrl"),
  /** Exported PNG URL (S3) */
  exportUrl: text("exportUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Design = typeof designs.$inferSelect;
export type InsertDesign = typeof designs.$inferInsert;

// ── Connected Devices (Capability #47 — My Computer / BYOD) ──
export const connectedDevices = mysqlTable("connected_devices", {
  id: int("id").autoincrement().primaryKey(),
  externalId: varchar("externalId", { length: 64 }).notNull().unique().$defaultFn(() => nanoid()),
  userId: int("userId").notNull(),
  /** Human-readable device name */
  name: varchar("name", { length: 256 }).notNull(),
  /** Device type: desktop, android, ios, browser_only */
  deviceType: mysqlEnum("deviceType", ["desktop", "android", "ios", "browser_only"]).notNull(),
  /** Connection method determines the automation approach */
  connectionMethod: mysqlEnum("connectionMethod", [
    "electron_app",      // Approach A: Electron companion app (full desktop control)
    "cloudflare_vnc",    // Approach B: Cloudflare Tunnel + VNC (free desktop)
    "cdp_browser",       // Approach C: CDP browser-only (zero install)
    "adb_wireless",      // Approach D: ADB + accessibility tree (Android)
    "wda_rest",          // Approach D+: WebDriverAgent REST (iOS)
    "shortcuts_webhook",  // iOS Shortcuts + Pushcut (limited iOS)
  ]).notNull(),
  /** Tunnel/relay URL for reaching the device */
  tunnelUrl: text("tunnelUrl"),
  /** Pairing code for initial device handshake (6-char alphanumeric) */
  pairingCode: varchar("pairingCode", { length: 16 }),
  /** Whether the pairing has been completed */
  paired: int("paired").default(0).notNull(),
  /** Connection status */
  status: mysqlEnum("status", ["online", "offline", "pairing", "error"]).default("offline").notNull(),
  /** Last known OS info (e.g. "Windows 11", "Android 14", "macOS 15") */
  osInfo: varchar("osInfo", { length: 128 }),
  /** Device capabilities as JSON (has_gpu, screen_resolution, etc.) */
  capabilities: json("capabilities").$type<{
    hasGpu?: boolean;
    screenWidth?: number;
    screenHeight?: number;
    browserVersion?: string;
    adbVersion?: string;
    wdaInstalled?: boolean;
  }>(),
  /** Last successful connection timestamp */
  lastConnected: timestamp("lastConnected"),
  /** Error message if status is 'error' */
  lastError: text("lastError"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ConnectedDevice = typeof connectedDevices.$inferSelect;
export type InsertConnectedDevice = typeof connectedDevices.$inferInsert;

// ── Device Sessions (Capability #47 — active control sessions) ──
export const deviceSessions = mysqlTable("device_sessions", {
  id: int("id").autoincrement().primaryKey(),
  externalId: varchar("externalId", { length: 64 }).notNull().unique().$defaultFn(() => nanoid()),
  userId: int("userId").notNull(),
  deviceId: int("deviceId").notNull(),
  /** Session state */
  status: mysqlEnum("status", ["active", "paused", "ended", "error"]).default("active").notNull(),
  /** Number of commands executed in this session */
  commandCount: int("commandCount").default(0).notNull(),
  /** Number of screenshots captured */
  screenshotCount: int("screenshotCount").default(0).notNull(),
  /** Last screenshot URL (S3) */
  lastScreenshotUrl: text("lastScreenshotUrl"),
  /** Session metadata (current app, browser tab, etc.) */
  metadata: json("metadata").$type<{
    currentApp?: string;
    currentUrl?: string;
    accessibilityTreeSize?: number;
    lastAction?: string;
  }>(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  endedAt: timestamp("endedAt"),
});
export type DeviceSession = typeof deviceSessions.$inferSelect;
export type InsertDeviceSession = typeof deviceSessions.$inferInsert;

// ── Mobile Projects (Capability #43 — Mobile Development) ──
export const mobileProjects = mysqlTable("mobile_projects", {
  id: int("id").autoincrement().primaryKey(),
  externalId: varchar("externalId", { length: 64 }).notNull().unique().$defaultFn(() => nanoid()),
  userId: int("userId").notNull(),
  /** Project name */
  name: varchar("name", { length: 256 }).notNull(),
  /** Target framework */
  framework: mysqlEnum("framework", ["pwa", "capacitor", "expo"]).notNull(),
  /** Target platforms */
  platforms: json("platforms").$type<Array<"ios" | "android" | "web">>().notNull(),
  /** App bundle identifier (e.g. com.example.myapp) */
  bundleId: varchar("bundleId", { length: 256 }),
  /** App display name */
  displayName: varchar("displayName", { length: 256 }),
  /** App version */
  version: varchar("version", { length: 32 }).default("1.0.0"),
  /** PWA manifest config as JSON */
  pwaManifest: json("pwaManifest").$type<{
    name?: string;
    short_name?: string;
    description?: string;
    start_url?: string;
    display?: "standalone" | "fullscreen" | "minimal-ui" | "browser";
    orientation?: "portrait" | "landscape" | "any";
    theme_color?: string;
    background_color?: string;
    icons?: Array<{ src: string; sizes: string; type: string }>;
  }>(),
  /** Capacitor config as JSON */
  capacitorConfig: json("capacitorConfig").$type<{
    appId?: string;
    appName?: string;
    webDir?: string;
    plugins?: Record<string, unknown>;
  }>(),
  /** Expo config as JSON */
  expoConfig: json("expoConfig").$type<{
    slug?: string;
    sdkVersion?: string;
    ios?: { bundleIdentifier?: string; buildNumber?: string };
    android?: { package?: string; versionCode?: number };
  }>(),
  /** Icon URL (S3) */
  iconUrl: text("iconUrl"),
  /** Splash screen URL (S3) */
  splashUrl: text("splashUrl"),
  /** Project status */
  status: mysqlEnum("status", ["draft", "configured", "building", "ready"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MobileProject = typeof mobileProjects.$inferSelect;
export type InsertMobileProject = typeof mobileProjects.$inferInsert;

// ── App Builds (Capability #42 — Mobile Publishing) ──
export const appBuilds = mysqlTable("app_builds", {
  id: int("id").autoincrement().primaryKey(),
  externalId: varchar("externalId", { length: 64 }).notNull().unique().$defaultFn(() => nanoid()),
  userId: int("userId").notNull(),
  mobileProjectId: int("mobileProjectId").notNull(),
  /** Target platform for this build */
  platform: mysqlEnum("platform", ["ios", "android", "web_pwa"]).notNull(),
  /** Build method */
  buildMethod: mysqlEnum("buildMethod", [
    "pwa_manifest",       // Free: PWA install prompt
    "capacitor_local",    // Free: local Capacitor CLI build
    "github_actions",     // Free: GitHub Actions CI/CD
    "expo_eas",           // Paid: Expo EAS Build
    "manual_xcode",       // Paid: manual Xcode build
    "manual_android_studio", // Free: manual Android Studio build
  ]).notNull(),
  /** Build status */
  status: mysqlEnum("status", ["queued", "building", "success", "failed", "cancelled"]).default("queued").notNull(),
  /** Build artifact URL (S3 — APK, IPA, or PWA bundle) */
  artifactUrl: text("artifactUrl"),
  /** Build log output */
  buildLog: text("buildLog"),
  /** GitHub Actions workflow URL (if applicable) */
  workflowUrl: text("workflowUrl"),
  /** App store metadata as JSON */
  storeMetadata: json("storeMetadata").$type<{
    title?: string;
    shortDescription?: string;
    fullDescription?: string;
    category?: string;
    keywords?: string[];
    screenshotUrls?: string[];
    privacyPolicyUrl?: string;
    supportUrl?: string;
  }>(),
  /** Version being built */
  version: varchar("version", { length: 32 }),
  /** Build number (auto-incrementing per platform) */
  buildNumber: int("buildNumber").default(1),
  /** Error message if build failed */
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});
export type AppBuild = typeof appBuilds.$inferSelect;
export type InsertAppBuild = typeof appBuilds.$inferInsert;


// ── Video Generation Projects (#62 — Veo3 parity) ──
export const videoProjects = mysqlTable("video_projects", {
  id: int("id").autoincrement().primaryKey(),
  externalId: varchar("externalId", { length: 64 }).notNull().unique(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  /** Text prompt for video generation */
  prompt: text("prompt").notNull(),
  /** Provider used: ffmpeg-slideshow | replicate-svd | veo3 */
  provider: varchar("provider", { length: 64 }).default("ffmpeg-slideshow").notNull(),
  /** Source images for slideshow / img2vid (S3 URLs as JSON array) */
  sourceImages: json("sourceImages").$type<string[]>(),
  /** Generated video S3 URL */
  videoUrl: text("videoUrl"),
  /** Thumbnail S3 URL */
  thumbnailUrl: text("thumbnailUrl"),
  /** Duration in seconds */
  duration: int("duration"),
  /** Resolution e.g. "1920x1080" */
  resolution: varchar("resolution", { length: 32 }).default("1280x720"),
  status: mysqlEnum("status", ["pending", "generating", "ready", "error"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  /** Generation metadata (model params, seed, etc.) */
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});
export type VideoProject = typeof videoProjects.$inferSelect;
export type InsertVideoProject = typeof videoProjects.$inferInsert;
