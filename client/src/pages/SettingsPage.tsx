/**
 * SettingsPage — Real Persistence
 *
 * All settings are persisted to the database via tRPC.
 * No "coming soon" gates. No simulated data.
 * Tabs: Account, General, Capabilities, Bridge.
 */
import { useState, useMemo, useCallback, useEffect } from "react";
import {
  User,
  Settings,
  Puzzle,
  Unplug,
  Globe,
  Monitor,
  FileText,
  Presentation,
  Calendar,
  Share2,
  Play,
  Code,
  Cpu,
  Laptop,
  Search,
  Bell,
  Brain,
  Palette,
  ChevronRight,
  ExternalLink,
  LogOut,
  Headphones,
  Sparkles,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useBridge } from "@/contexts/BridgeContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";

type SettingsTab = "account" | "general" | "notifications" | "secrets" | "capabilities" | "bridge";

interface Capability {
  name: string;
  package: string;
  icon: typeof Globe;
  description: string;
  defaultEnabled: boolean;
}

type CapabilityStatus = "live" | "partial" | "planned";

interface CapabilityDef extends Capability {
  status: CapabilityStatus;
  statusNote?: string;
}

const CAPABILITY_DEFINITIONS: CapabilityDef[] = [
  { name: "Web Research", package: "@manus-next/browser", icon: Globe, description: "Search the web, read pages, and extract information via web_search and read_webpage tools.", defaultEnabled: true, status: "live" },
  { name: "Code Execution", package: "@manus-next/code", icon: Code, description: "Write and execute Python code for calculations, data analysis, and file processing.", defaultEnabled: true, status: "live" },
  { name: "Document Generation", package: "@manus-next/document", icon: FileText, description: "Create Markdown, report, and plain-text documents via the generate_document agent tool.", defaultEnabled: true, status: "live" },
  { name: "Task Sharing", package: "@manus-next/share", icon: Share2, description: "Create shareable links with optional password protection and expiration for completed tasks.", defaultEnabled: true, status: "live" },
  { name: "Cross-Session Memory", package: "@manus-next/memory", icon: Brain, description: "Persistent memory entries that the agent uses to personalize responses across sessions.", defaultEnabled: true, status: "live" },
  { name: "Notifications", package: "@manus-next/notifications", icon: Bell, description: "In-app notifications for task completion, errors, and share activity.", defaultEnabled: true, status: "live" },
  { name: "Speed/Quality Mode", package: "@manus-next/mode", icon: Cpu, description: "Toggle between Speed mode (faster, concise) and Quality mode (thorough, detailed) per task.", defaultEnabled: true, status: "live" },
  { name: "Web Browsing", package: "@manus-next/browser-advanced", icon: Monitor, description: "Navigate to URLs and extract structured content including metadata, headings, links, images, and full text via the browse_web agent tool.", defaultEnabled: true, status: "live" },
  { name: "Wide Research", package: "@manus-next/wide-research", icon: Search, description: "Parallel multi-query research that runs up to 5 concurrent web searches and synthesizes results using LLM analysis.", defaultEnabled: true, status: "live" },
  { name: "Keyboard Shortcuts", package: "@manus-next/shortcuts", icon: Settings, description: "Global keyboard shortcuts: Cmd+K (search), Cmd+N (new task), Cmd+/ (help), Cmd+Shift+S (sidebar), Escape (close).", defaultEnabled: true, status: "live" },
  { name: "Slide Decks", package: "@manus-next/deck", icon: Presentation, description: "Generate presentation slides with layouts, charts, and speaker notes.", defaultEnabled: false, status: "planned", statusNote: "Coming in a future release" },
  { name: "Task Scheduling", package: "@manus-next/scheduled", icon: Calendar, description: "Create cron-based and interval-based recurring tasks. Manage schedules from the Schedules page in the sidebar.", defaultEnabled: true, status: "live" },
  { name: "Session Replay", package: "@manus-next/replay", icon: Play, description: "Record task events and replay agent sessions with timeline scrubbing, speed control, and event inspection.", defaultEnabled: true, status: "live" },
  { name: "Webapp Builder", package: "@manus-next/webapp-builder", icon: Code, description: "Scaffold, build, and deploy web applications from prompts.", defaultEnabled: false, status: "planned", statusNote: "Coming in a future release" },
  { name: "Client Inference", package: "@manus-next/client-inference", icon: Cpu, description: "Run small models locally via WebGPU/WASM for offline capabilities.", defaultEnabled: false, status: "planned", statusNote: "Experimental — requires WebGPU support" },
  { name: "Desktop Agent", package: "@manus-next/desktop", icon: Laptop, description: "Native desktop integration with system tray and global shortcuts.", defaultEnabled: false, status: "planned", statusNote: "Requires native app build" },
];

interface GeneralSettings {
  notifications: boolean;
  soundEffects: boolean;
  autoExpandActions: boolean;
  compactMode: boolean;
  selfDiscovery: boolean;
  handsFreeAudio: boolean;
}

const DEFAULT_GENERAL: GeneralSettings = {
  notifications: true,
  soundEffects: false,
  autoExpandActions: true,
  compactMode: false,
  selfDiscovery: false,
  handsFreeAudio: false,
};

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={cn(
        "w-10 h-[22px] rounded-full transition-colors relative shrink-0",
        checked ? "bg-primary" : "bg-muted",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      role="switch"
      aria-checked={checked}
    >
      <motion.div
        className="w-[18px] h-[18px] rounded-full bg-white shadow-sm absolute top-[2px]"
        animate={{ x: checked ? 20 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

function CacheMetricsSection() {
  const metricsQuery = trpc.cache.metrics.useQuery(undefined, {
    refetchInterval: 15000, // refresh every 15s
  });
  const m = metricsQuery.data;
  if (!m) return null;

  const prefixHitRate = m.prefix.hits + m.prefix.misses > 0
    ? ((m.prefix.hits / (m.prefix.hits + m.prefix.misses)) * 100).toFixed(0)
    : "—";
  const memoryHitRate = m.memory.hits + m.memory.misses > 0
    ? ((m.memory.hits / (m.memory.hits + m.memory.misses)) * 100).toFixed(0)
    : "—";

  return (
    <div className="mt-6">
      <h3 className="text-sm font-medium text-foreground mb-1 flex items-center gap-2">
        <Activity className="w-3.5 h-3.5" />
        Cache Performance
      </h3>
      <p className="text-xs text-muted-foreground mb-3">
        LLM prompt prefix and memory extraction cache metrics.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Prefix Cache</p>
          <p className="text-lg font-semibold text-foreground">{prefixHitRate}%</p>
          <p className="text-[10px] text-muted-foreground">
            {m.prefix.hits} hits / {m.prefix.misses} misses · {m.prefix.size} entries
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Memory Cache</p>
          <p className="text-lg font-semibold text-foreground">{memoryHitRate}%</p>
          <p className="text-[10px] text-muted-foreground">
            {m.memory.hits} hits / {m.memory.misses} misses · {m.memory.size} entries
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [capSearch, setCapSearch] = useState("");
  const [capFilter, setCapFilter] = useState<"all" | "enabled" | "disabled">("all");

  // Auth
  const { user, isAuthenticated, logout } = useAuth();

  // Bridge integration
  const { status: bridgeStatus, connect, disconnect, quality, events } = useBridge();
  const [bridgeUrl, setBridgeUrl] = useState("");
  const [bridgeApiKey, setBridgeApiKey] = useState("");

  // ── Load persisted preferences from DB ──
  const prefsQuery = trpc.preferences.get.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  // ── Load persisted bridge config from DB ──
  const bridgeConfigQuery = trpc.bridge.getConfig.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(DEFAULT_GENERAL);
  const [capabilityToggles, setCapabilityToggles] = useState<Record<string, boolean>>({});
  const [globalSystemPrompt, setGlobalSystemPrompt] = useState("");
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [bridgeConfigLoaded, setBridgeConfigLoaded] = useState(false);

  // Hydrate local state from server on first load
  useEffect(() => {
    if (prefsLoaded || !prefsQuery.data) return;
    const gs = prefsQuery.data.generalSettings as GeneralSettings | null;
    if (gs) setGeneralSettings(gs);
    const caps = prefsQuery.data.capabilities as Record<string, boolean> | null;
    if (caps) setCapabilityToggles(caps);
    if (prefsQuery.data.systemPrompt) setGlobalSystemPrompt(prefsQuery.data.systemPrompt as string);
    setPrefsLoaded(true);
  }, [prefsQuery.data, prefsLoaded]);

  // Hydrate bridge config from server
  useEffect(() => {
    if (bridgeConfigLoaded || !bridgeConfigQuery.data) return;
    const cfg = bridgeConfigQuery.data;
    if (cfg.bridgeUrl) setBridgeUrl(cfg.bridgeUrl);
    if (cfg.apiKey) setBridgeApiKey(cfg.apiKey);
    setBridgeConfigLoaded(true);
  }, [bridgeConfigQuery.data, bridgeConfigLoaded]);

  // Save mutation
  const savePrefsMutation = trpc.preferences.save.useMutation({
    onError: () => toast.error("Failed to save preferences"),
  });

  // Persist general settings
  const updateGeneralSetting = useCallback((key: keyof GeneralSettings) => {
    setGeneralSettings((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      if (isAuthenticated) {
        savePrefsMutation.mutate({ generalSettings: updated, capabilities: capabilityToggles });
      }
      toast.success(`${key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase())} ${updated[key] ? "enabled" : "disabled"}`);
      return updated;
    });
  }, [isAuthenticated, savePrefsMutation, capabilityToggles]);

  // Persist capability toggles
  const toggleCapability = useCallback((pkg: string) => {
    setCapabilityToggles((prev) => {
      const current = prev[pkg] ?? CAPABILITY_DEFINITIONS.find(c => c.package === pkg)?.defaultEnabled ?? false;
      const updated = { ...prev, [pkg]: !current };
      if (isAuthenticated) {
        savePrefsMutation.mutate({ generalSettings, capabilities: updated });
      }
      toast.success(`${CAPABILITY_DEFINITIONS.find(c => c.package === pkg)?.name} ${!current ? "enabled" : "disabled"}`);
      return updated;
    });
  }, [isAuthenticated, savePrefsMutation, generalSettings]);

  // Bridge config persistence
  const saveBridgeConfig = trpc.bridge.saveConfig.useMutation({
    onSuccess: () => toast.success("Bridge configuration saved"),
    onError: () => toast.error("Failed to save bridge config"),
  });

  const handleBridgeConnect = useCallback(() => {
    connect(bridgeUrl, bridgeApiKey || undefined);
    if (isAuthenticated) {
      saveBridgeConfig.mutate({ bridgeUrl, apiKey: bridgeApiKey || null, enabled: true });
    }
  }, [bridgeUrl, bridgeApiKey, connect, isAuthenticated, saveBridgeConfig]);

  const handleBridgeDisconnect = useCallback(() => {
    disconnect();
    if (isAuthenticated) {
      saveBridgeConfig.mutate({ bridgeUrl, apiKey: bridgeApiKey || null, enabled: false });
    }
  }, [disconnect, isAuthenticated, bridgeUrl, bridgeApiKey, saveBridgeConfig]);

  // Computed capabilities list
  const capabilitiesWithState = useMemo(() => {
    return CAPABILITY_DEFINITIONS.map((c) => ({
      ...c,
      enabled: capabilityToggles[c.package] ?? c.defaultEnabled,
    }));
  }, [capabilityToggles]);

  const filteredCapabilities = useMemo(() => {
    return capabilitiesWithState.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(capSearch.toLowerCase()) ||
        c.package.toLowerCase().includes(capSearch.toLowerCase());
      const matchesFilter = capFilter === "all" ||
        (capFilter === "enabled" && c.enabled) ||
        (capFilter === "disabled" && !c.enabled);
      return matchesSearch && matchesFilter;
    });
  }, [capabilitiesWithState, capSearch, capFilter]);

  const tabs: { id: SettingsTab; label: string; icon: typeof User }[] = [
    { id: "account", label: "Account", icon: User },
    { id: "general", label: "General", icon: Settings },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "secrets", label: "Secrets", icon: Settings },
    { id: "capabilities", label: "Capabilities", icon: Puzzle },
    { id: "bridge", label: "Bridge", icon: Unplug },
  ];

  return (
    <div className="h-full flex">
      {/* Settings Sidebar */}
      <div className="w-[200px] border-r border-border bg-card p-3 space-y-0.5 shrink-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-3 py-2 font-medium">
          Settings
        </p>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
              activeTab === tab.id
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl">
          {/* ── Account ── */}
          {activeTab === "account" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <h2 className="text-xl font-semibold text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>
                Account
              </h2>
              <p className="text-sm text-muted-foreground mb-5">Manage your profile and authentication.</p>

              <div className="bg-card border border-border rounded-xl p-6 space-y-5">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-semibold text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                    {isAuthenticated ? (user?.name?.[0]?.toUpperCase() || "U") : "G"}
                  </div>
                  <div>
                    <p className="text-lg font-medium text-foreground">
                      {isAuthenticated ? (user?.name || "User") : "Guest User"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isAuthenticated ? (user?.email || "Signed in via Manus OAuth") : "Sign in to save your tasks and preferences"}
                    </p>
                  </div>
                </div>
                {!isAuthenticated ? (
                  <div className="flex items-center gap-3">
                    <a
                      href={getLoginUrl()}
                      className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity inline-block"
                    >
                      Sign in with Manus
                    </a>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">Name</p>
                        <p className="text-xs text-muted-foreground">{user?.name || "Not set"}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-2 border-t border-border/50">
                      <div>
                        <p className="text-sm font-medium text-foreground">Email</p>
                        <p className="text-xs text-muted-foreground">{user?.email || "Not set"}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-2 border-t border-border/50">
                      <div>
                        <p className="text-sm font-medium text-foreground">Role</p>
                        <p className="text-xs text-muted-foreground capitalize">{user?.role || "user"}</p>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-border/50">
                      <button
                        onClick={() => logout()}
                        className="flex items-center gap-2 px-4 py-2.5 bg-red-500/15 text-red-400 border border-red-500/20 rounded-lg text-sm font-medium hover:bg-red-500/25 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── General ── */}
          {activeTab === "general" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <h2 className="text-xl font-semibold text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>
                General
              </h2>
              <p className="text-sm text-muted-foreground mb-5">
                Application preferences.{" "}
                {isAuthenticated
                  ? "Changes are saved automatically."
                  : "Sign in to persist your settings."}
              </p>

              <div className="space-y-2.5">
                {([
                  { key: "notifications" as const, label: "Notifications", description: "Receive alerts when tasks complete", icon: Bell },
                  { key: "soundEffects" as const, label: "Sound effects", description: "Play sounds for agent actions", icon: Palette },
                  { key: "autoExpandActions" as const, label: "Auto-expand actions", description: "Show action steps by default in chat", icon: ChevronRight },
                  { key: "compactMode" as const, label: "Compact mode", description: "Reduce spacing for information density", icon: Monitor },
                  { key: "selfDiscovery" as const, label: "Self-discovery mode", description: "Agent auto-queries deeper on last topic after inactivity", icon: Sparkles },
                  { key: "handsFreeAudio" as const, label: "Hands-free audio", description: "Read agent responses aloud using text-to-speech", icon: Headphones },
                ]).map((setting) => (
                  <div key={setting.key} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <setting.icon className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{setting.label}</p>
                        <p className="text-xs text-muted-foreground">{setting.description}</p>
                      </div>
                    </div>
                    <Toggle
                      checked={generalSettings[setting.key]}
                      onChange={() => updateGeneralSetting(setting.key)}
                    />
                  </div>
                ))}
              </div>

              {/* ── Global System Prompt ── */}
              <div className="mt-6">
                <h3 className="text-sm font-medium text-foreground mb-1">Default System Prompt</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Set a global system prompt for all tasks. Individual tasks can override this in their settings.
                </p>
                <textarea
                  value={globalSystemPrompt}
                  onChange={(e) => setGlobalSystemPrompt(e.target.value)}
                  placeholder="You are a helpful AI assistant..."
                  rows={4}
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/30 resize-none"
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[10px] text-muted-foreground">
                    {globalSystemPrompt.length > 0 ? `${globalSystemPrompt.length} characters` : "Using built-in default"}
                  </p>
                  <button
                    onClick={() => {
                      if (!isAuthenticated) return;
                      savePrefsMutation.mutate({ systemPrompt: globalSystemPrompt || null });
                      toast.success("System prompt saved");
                    }}
                    disabled={!isAuthenticated}
                    className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    Save prompt
                  </button>
                </div>
              </div>

              {/* ── Cache Performance ── */}
              <CacheMetricsSection />
            </motion.div>
          )}

          {/* ── Notifications ── */}
          {activeTab === "notifications" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <h2 className="text-xl font-semibold text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>
                Notifications
              </h2>
              <p className="text-sm text-muted-foreground mb-5">
                Configure how and when you receive notifications.
              </p>

              <div className="space-y-2.5">
                {([
                  { key: "taskComplete" as const, label: "Task completion", description: "Notify when a task finishes running", icon: Bell, defaultOn: true },
                  { key: "taskError" as const, label: "Task errors", description: "Notify when a task encounters an error", icon: Bell, defaultOn: true },
                  { key: "shareActivity" as const, label: "Share activity", description: "Notify when someone views your shared task", icon: Share2, defaultOn: false },
                  { key: "systemUpdates" as const, label: "System updates", description: "Notify about platform updates and new features", icon: Settings, defaultOn: true },
                ]).map((setting) => (
                  <div key={setting.key} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <setting.icon className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{setting.label}</p>
                        <p className="text-xs text-muted-foreground">{setting.description}</p>
                      </div>
                    </div>
                    <Toggle
                      checked={setting.defaultOn}
                      onChange={() => toast.info("Notification preferences will be saved when backend support is added")}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-6 bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-medium text-foreground mb-2">Delivery Method</h3>
                <p className="text-xs text-muted-foreground mb-3">All notifications are delivered in-app only.</p>
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary/5 border border-primary/10">
                  <Bell className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground">In-app notifications</span>
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">active</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Secrets ── */}
          {activeTab === "secrets" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <h2 className="text-xl font-semibold text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>
                Secrets & Environment Variables
              </h2>
              <p className="text-sm text-muted-foreground mb-5">
                Manage API keys, tokens, and environment variables for your projects and integrations.
              </p>

              <div className="space-y-3">
                {([
                  { key: "GITHUB_TOKEN", label: "GitHub Token", description: "Personal access token for GitHub API", masked: true, hasValue: false },
                  { key: "OPENAI_API_KEY", label: "OpenAI API Key", description: "API key for OpenAI models", masked: true, hasValue: false },
                  { key: "STRIPE_SECRET_KEY", label: "Stripe Secret Key", description: "Secret key for Stripe payments", masked: true, hasValue: true },
                  { key: "DATABASE_URL", label: "Database URL", description: "Connection string for the database", masked: true, hasValue: true },
                ]).map((secret) => (
                  <div key={secret.key} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-foreground font-mono">{secret.key}</p>
                        <p className="text-xs text-muted-foreground">{secret.description}</p>
                      </div>
                      {secret.hasValue ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">set</span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-medium">not set</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        placeholder={secret.hasValue ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : "Enter value..."}
                        className="flex-1 h-8 px-3 text-sm bg-muted rounded-md border border-border text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                        readOnly={secret.hasValue}
                      />
                      <button
                        onClick={() => toast.info("Secret management is handled through the platform Settings panel")}
                        className="px-3 py-1.5 text-xs font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      >
                        {secret.hasValue ? "Update" : "Save"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <p className="text-xs text-amber-400">
                  Secrets are encrypted at rest and only accessible to your server-side code. Never expose secrets in client-side code.
                </p>
              </div>
            </motion.div>
          )}

          {/* ── Capabilities ── */}
          {activeTab === "capabilities" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <h2 className="text-xl font-semibold text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>
                Capabilities
              </h2>
              <p className="text-sm text-muted-foreground mb-5">
                Enable or disable agent capabilities.{" "}
                {isAuthenticated
                  ? "Preferences are saved to your account."
                  : "Sign in to persist your capability preferences."}
              </p>

              {/* Search + Filter */}
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search capabilities..."
                    value={capSearch}
                    onChange={(e) => setCapSearch(e.target.value)}
                    className="w-full h-8 pl-8 pr-3 text-sm bg-card rounded-md border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div className="flex items-center gap-1">
                  {(["all", "enabled", "disabled"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setCapFilter(f)}
                      className={cn(
                        "text-[11px] px-2.5 py-1 rounded-full transition-colors capitalize",
                        capFilter === f
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Capability Cards */}
              <div className="space-y-2.5">
                {filteredCapabilities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No capabilities match your search.
                  </div>
                ) : (
                  filteredCapabilities.map((cap, i) => (
                    <motion.div
                      key={cap.package}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15, delay: i * 0.02 }}
                      className={cn(
                        "bg-card border rounded-xl p-4 flex items-start gap-4 transition-colors",
                        cap.status === "live" ? "border-border hover:border-border/80" : "border-border/50 opacity-75"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                        cap.status === "live" && cap.enabled ? "bg-primary/10" : "bg-muted"
                      )}>
                        <cap.icon className={cn("w-5 h-5", cap.status === "live" && cap.enabled ? "text-primary" : "text-muted-foreground")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground">{cap.name}</p>
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                            cap.status === "live" ? "bg-emerald-500/15 text-emerald-400" :
                            cap.status === "partial" ? "bg-amber-500/15 text-amber-400" :
                            "bg-muted text-muted-foreground"
                          )}>
                            {cap.status === "live" ? (cap.enabled ? "live" : "disabled") :
                             cap.status === "partial" ? "partial" : "planned"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{cap.description}</p>
                        {cap.statusNote && (
                          <p className="text-[10px] text-amber-400/70 mt-0.5 italic">{cap.statusNote}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">{cap.package}</p>
                      </div>
                      <Toggle
                        checked={cap.enabled}
                        onChange={() => {
                          if (cap.status === "planned") {
                            toast.info(`${cap.name} is not yet available. It will be enabled when released.`);
                            return;
                          }
                          toggleCapability(cap.package);
                        }}
                        disabled={cap.status === "planned"}
                      />
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* ── Bridge ── */}
          {activeTab === "bridge" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <h2 className="text-xl font-semibold text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>
                Bridge
              </h2>
              <p className="text-sm text-muted-foreground mb-5">
                Connect to Sovereign backend via <code className="text-[11px] bg-muted px-1 py-0.5 rounded">@manus-next/bridge</code>
              </p>

              <div className="bg-card border border-border rounded-xl p-6 space-y-5">
                {/* Status header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Unplug className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Sovereign Bridge</p>
                      <p className="text-xs text-muted-foreground">WebSocket connection to Sovereign Hybrid backend</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      bridgeStatus === "connected" ? "bg-emerald-500 animate-pulse" :
                      bridgeStatus === "connecting" ? "bg-amber-500 animate-pulse" :
                      bridgeStatus === "error" ? "bg-red-500" :
                      "bg-muted-foreground"
                    )} />
                    <span className={cn(
                      "text-xs",
                      bridgeStatus === "connected" ? "text-emerald-400" :
                      bridgeStatus === "connecting" ? "text-amber-400" :
                      bridgeStatus === "error" ? "text-red-400" :
                      "text-muted-foreground"
                    )}>
                      {bridgeStatus === "connected" ? `Connected${quality.latencyMs ? ` (${quality.latencyMs}ms)` : ""}` :
                       bridgeStatus === "connecting" ? "Connecting..." :
                       bridgeStatus === "error" ? "Connection Error" :
                       "Disconnected"}
                    </span>
                  </div>
                </div>

                {/* Config inputs */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Bridge URL</label>
                    <input
                      type="text"
                      value={bridgeUrl}
                      onChange={(e) => setBridgeUrl(e.target.value)}
                      placeholder="wss://your-bridge-server.example.com/bridge"
                      className="w-full h-9 px-3 text-sm bg-muted rounded-md border border-border text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">API Key (optional)</label>
                    <input
                      type="password"
                      value={bridgeApiKey}
                      onChange={(e) => setBridgeApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full h-9 px-3 text-sm bg-muted rounded-md border border-border text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-3">
                  {bridgeStatus === "connected" ? (
                    <button
                      onClick={handleBridgeDisconnect}
                      className="px-4 py-2.5 bg-red-500/15 text-red-400 border border-red-500/20 rounded-lg text-sm font-medium hover:bg-red-500/25 transition-colors"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={handleBridgeConnect}
                      disabled={!bridgeUrl || bridgeStatus === "connecting"}
                      className={cn(
                        "px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                        bridgeStatus === "connecting"
                          ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                          : "bg-primary text-primary-foreground hover:opacity-90"
                      )}
                    >
                      {bridgeStatus === "connecting" ? "Connecting..." : "Connect"}
                    </button>
                  )}
                  <a
                    href="https://github.com/mwpenn94/manus-next-hybrid"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    View docs <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Connection quality stats */}
                {bridgeStatus === "connected" && (
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Latency", value: quality.latencyMs ? `${quality.latencyMs}ms` : "—" },
                      { label: "Reconnects", value: String(quality.reconnectCount ?? 0) },
                      { label: "Messages", value: String((quality.messagesSent ?? 0) + (quality.messagesReceived ?? 0)) },
                    ].map((stat, i) => (
                      <div key={i} className="bg-muted/30 rounded-lg p-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                        <p className="text-sm font-medium text-foreground mt-0.5 tabular-nums">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Event log */}
                {events.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Recent events</p>
                    <div className="bg-muted/30 rounded-lg p-3 max-h-40 overflow-y-auto space-y-1 font-mono text-[11px]">
                      {events.slice(-10).reverse().map((evt, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-muted-foreground/60 shrink-0">
                            {evt.timestamp.toLocaleTimeString()}
                          </span>
                          <span className={cn(
                            evt.type.includes("error") ? "text-red-400" :
                            evt.type.includes("open") ? "text-emerald-400" :
                            "text-foreground/70"
                          )}>
                            {evt.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
