/**
 * SettingsPage — "Warm Void" Manus-Authentic Settings
 * 
 * Convergence Pass 3: Refined capability cards with search/filter,
 * polished toggle animations, richer sync and bridge panels.
 */
import { useState, useMemo, useCallback } from "react";
import {
  User,
  Settings,
  Puzzle,
  RefreshCw,
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
  Shield,
  Bell,
  Palette,
  Languages,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useBridge } from "@/contexts/BridgeContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";

type SettingsTab = "account" | "general" | "capabilities" | "sync" | "bridge";

interface Capability {
  name: string;
  package: string;
  icon: typeof Globe;
  description: string;
  enabled: boolean;
  status: "active" | "inactive" | "beta";
}

const INITIAL_CAPABILITIES: Capability[] = [
  { name: "Browser Automation", package: "@manus-next/browser", icon: Globe, description: "Playwright + CDP failover for web browsing, form filling, and data extraction.", enabled: true, status: "active" },
  { name: "Computer Use", package: "@manus-next/computer", icon: Monitor, description: "Screen capture, mouse/keyboard control, and visual element detection.", enabled: true, status: "active" },
  { name: "Document Generation", package: "@manus-next/document", icon: FileText, description: "Create PDFs, Word docs, and Markdown with templates and styling.", enabled: true, status: "active" },
  { name: "Slide Decks", package: "@manus-next/deck", icon: Presentation, description: "Generate presentation slides with layouts, charts, and speaker notes.", enabled: true, status: "active" },
  { name: "Task Scheduling", package: "@manus-next/scheduled", icon: Calendar, description: "Cron-based and interval scheduling with retry and dead-letter queues.", enabled: true, status: "active" },
  { name: "Sharing", package: "@manus-next/share", icon: Share2, description: "Generate shareable links, embed codes, and export bundles.", enabled: true, status: "active" },
  { name: "Session Replay", package: "@manus-next/replay", icon: Play, description: "Record and replay agent sessions with timeline scrubbing.", enabled: false, status: "beta" },
  { name: "Webapp Builder", package: "@manus-next/webapp-builder", icon: Code, description: "Scaffold, build, and deploy web applications from prompts.", enabled: true, status: "active" },
  { name: "Client Inference", package: "@manus-next/client-inference", icon: Cpu, description: "Run small models locally via WebGPU/WASM for offline capabilities.", enabled: false, status: "beta" },
  { name: "Desktop Agent", package: "@manus-next/desktop", icon: Laptop, description: "Native desktop integration with system tray and global shortcuts.", enabled: false, status: "inactive" },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={cn(
        "w-10 h-[22px] rounded-full transition-colors relative shrink-0",
        checked ? "bg-primary" : "bg-muted"
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

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("capabilities");
  const [capabilities, setCapabilities] = useState(INITIAL_CAPABILITIES);
  const [capSearch, setCapSearch] = useState("");
  const [capFilter, setCapFilter] = useState<"all" | "active" | "beta" | "inactive">("all");

  // Bridge integration
  const { status: bridgeStatus, connect, disconnect, latencyMs, events } = useBridge();
  const [bridgeUrl, setBridgeUrl] = useState("ws://localhost:3001/bridge");
  const [bridgeApiKey, setBridgeApiKey] = useState("");
  const [bridgeEnabled, setBridgeEnabled] = useState(false);

  // Auth
  const { user, isAuthenticated } = useAuth();

  // Save bridge config to DB
  const saveBridgeConfig = trpc.bridge.saveConfig.useMutation({
    onSuccess: () => toast.success("Bridge configuration saved"),
    onError: () => toast.error("Failed to save bridge config"),
  });

  const handleBridgeConnect = useCallback(() => {
    connect(bridgeUrl, bridgeApiKey || undefined);
    setBridgeEnabled(true);
    if (isAuthenticated) {
      saveBridgeConfig.mutate({ bridgeUrl, apiKey: bridgeApiKey || null, enabled: true });
    }
  }, [bridgeUrl, bridgeApiKey, connect, isAuthenticated, saveBridgeConfig]);

  const handleBridgeDisconnect = useCallback(() => {
    disconnect();
    setBridgeEnabled(false);
    if (isAuthenticated) {
      saveBridgeConfig.mutate({ bridgeUrl, apiKey: bridgeApiKey || null, enabled: false });
    }
  }, [disconnect, isAuthenticated, bridgeUrl, bridgeApiKey, saveBridgeConfig]);

  const tabs: { id: SettingsTab; label: string; icon: typeof User }[] = [
    { id: "account", label: "Account", icon: User },
    { id: "general", label: "General", icon: Settings },
    { id: "capabilities", label: "Capabilities", icon: Puzzle },
    { id: "sync", label: "Sync", icon: RefreshCw },
    { id: "bridge", label: "Bridge", icon: Unplug },
  ];

  const filteredCapabilities = useMemo(() => {
    return capabilities.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(capSearch.toLowerCase()) ||
        c.package.toLowerCase().includes(capSearch.toLowerCase());
      const matchesFilter = capFilter === "all" || c.status === capFilter;
      return matchesSearch && matchesFilter;
    });
  }, [capabilities, capSearch, capFilter]);

  const toggleCapability = (index: number) => {
    const realIndex = capabilities.findIndex(c => c.package === filteredCapabilities[index].package);
    setCapabilities((prev) =>
      prev.map((c, i) => i === realIndex ? { ...c, enabled: !c.enabled } : c)
    );
    const cap = filteredCapabilities[index];
    toast(cap.enabled ? `${cap.name} disabled` : `${cap.name} enabled`);
  };

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
          {/* ── Capabilities ── */}
          {activeTab === "capabilities" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <h2 className="text-xl font-semibold text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>
                Capabilities
              </h2>
              <p className="text-sm text-muted-foreground mb-5">
                Enable or disable agent capabilities powered by @manus-next packages.
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
                  {(["all", "active", "beta", "inactive"] as const).map((f) => (
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
                      className="bg-card border border-border rounded-xl p-4 flex items-start gap-4 hover:border-border/80 transition-colors"
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                        cap.enabled ? "bg-primary/10" : "bg-muted"
                      )}>
                        <cap.icon className={cn("w-5 h-5", cap.enabled ? "text-primary" : "text-muted-foreground")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-foreground">{cap.name}</h3>
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                            cap.status === "active" ? "bg-emerald-500/15 text-emerald-400" :
                            cap.status === "beta" ? "bg-amber-500/15 text-amber-400" :
                            "bg-muted text-muted-foreground"
                          )}>
                            {cap.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{cap.description}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">{cap.package}</p>
                      </div>
                      <Toggle checked={cap.enabled} onChange={() => toggleCapability(i)} />
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}

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
                {!isAuthenticated && (
                  <div className="flex items-center gap-3">
                    <a
                      href={getLoginUrl()}
                      className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity inline-block"
                    >
                      Sign in with Manus
                    </a>
                  </div>
                )}
              </div>

              <div className="mt-5 space-y-2">
                {[
                  { label: "Security", desc: "Password, 2FA, and session management", icon: Shield },
                  { label: "Notifications", desc: "Email and push notification preferences", icon: Bell },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => toast("Feature coming soon")}
                    className="w-full bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:bg-accent/30 transition-colors text-left"
                  >
                    <item.icon className="w-5 h-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── General ── */}
          {activeTab === "general" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <h2 className="text-xl font-semibold text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>
                General
              </h2>
              <p className="text-sm text-muted-foreground mb-5">Application preferences and defaults.</p>

              <div className="space-y-2.5">
                {[
                  { label: "Notifications", description: "Receive alerts when tasks complete", enabled: true, icon: Bell },
                  { label: "Sound effects", description: "Play sounds for agent actions", enabled: false, icon: Palette },
                  { label: "Auto-expand actions", description: "Show action steps by default in chat", enabled: true, icon: ChevronRight },
                  { label: "Compact mode", description: "Reduce spacing for information density", enabled: false, icon: Monitor },
                  { label: "Language", description: "Interface language (English)", enabled: true, icon: Languages },
                ].map((setting, i) => (
                  <div key={i} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <setting.icon className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{setting.label}</p>
                        <p className="text-xs text-muted-foreground">{setting.description}</p>
                      </div>
                    </div>
                    <Toggle checked={setting.enabled} onChange={() => toast("Feature coming soon")} />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Sync ── */}
          {activeTab === "sync" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <h2 className="text-xl font-semibold text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>
                Sync
              </h2>
              <p className="text-sm text-muted-foreground mb-5">
                Cross-device synchronization powered by <code className="text-[11px] bg-muted px-1 py-0.5 rounded">@manus-next/sync</code>
              </p>

              <div className="bg-card border border-border rounded-xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Real-time Sync</p>
                      <p className="text-xs text-muted-foreground">CRDT-based conflict resolution</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs text-emerald-400">Connected</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Last sync", value: "just now" },
                    { label: "Devices", value: "1 active" },
                    { label: "Pending", value: "0 changes" },
                  ].map((stat, i) => (
                    <div key={i} className="bg-muted/30 rounded-lg p-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                      <p className="text-sm font-medium text-foreground mt-0.5">{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Sync strategy</p>
                  <div className="flex items-center gap-2">
                    {["Real-time", "On demand", "Periodic"].map((s, i) => (
                      <button
                        key={s}
                        className={cn(
                          "text-xs px-3 py-1.5 rounded-lg transition-colors",
                          i === 0 ? "bg-primary/15 text-primary border border-primary/20" : "bg-muted text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
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
                      {bridgeStatus === "connected" ? `Connected${latencyMs ? ` (${latencyMs}ms)` : ""}` :
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
                      placeholder="ws://localhost:3001/bridge"
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
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Reconnect strategy</label>
                    <select className="w-full h-9 px-3 text-sm bg-muted rounded-md border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                      <option>Exponential backoff (recommended)</option>
                      <option>Linear retry</option>
                      <option>Manual only</option>
                    </select>
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

              {/* Account section with auth */}
              <div className="bg-card border border-border rounded-xl p-5 mt-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold",
                    isAuthenticated ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                  )} style={{ fontFamily: "var(--font-heading)" }}>
                    {user?.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {isAuthenticated ? user?.name || "Authenticated" : "Not signed in"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isAuthenticated ? "Bridge config will be saved to your account" : "Sign in to persist bridge settings"}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
