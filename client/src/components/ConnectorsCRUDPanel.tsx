import { useState, useCallback, useMemo } from "react";
import {
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Settings,
  RefreshCw,
  ExternalLink,
  Key,
  Globe,
  Database,
  Cloud,
  MessageSquare,
  Mail,
  CreditCard,
  Shield,
  Loader2,
  ChevronRight,
  Eye,
  EyeOff,
  Copy,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ConnectorStatus = "connected" | "disconnected" | "error" | "pending";
type ConnectorCategory = "api" | "database" | "cloud" | "messaging" | "payment" | "auth";

interface Connector {
  id: string;
  name: string;
  description: string;
  category: ConnectorCategory;
  status: ConnectorStatus;
  icon: string;
  lastSync?: string;
  config: ConnectorConfig[];
}

interface ConnectorConfig {
  key: string;
  label: string;
  value: string;
  type: "text" | "secret" | "url" | "select";
  required: boolean;
  options?: string[];
}

const MOCK_CONNECTORS: Connector[] = [
  {
    id: "c1",
    name: "OpenAI",
    description: "GPT-4, DALL-E, Whisper API access",
    category: "api",
    status: "connected",
    icon: "🤖",
    lastSync: "2 min ago",
    config: [
      { key: "api_key", label: "API Key", value: "sk-...abc123", type: "secret", required: true },
      { key: "model", label: "Default Model", value: "gpt-4o", type: "select", required: true, options: ["gpt-4o", "gpt-4o-mini", "o1-preview"] },
      { key: "org_id", label: "Organization ID", value: "org-abc123", type: "text", required: false },
    ],
  },
  {
    id: "c2",
    name: "PostgreSQL",
    description: "Primary application database",
    category: "database",
    status: "connected",
    icon: "🐘",
    lastSync: "Just now",
    config: [
      { key: "host", label: "Host", value: "db.example.com", type: "text", required: true },
      { key: "port", label: "Port", value: "5432", type: "text", required: true },
      { key: "database", label: "Database", value: "myapp_prod", type: "text", required: true },
      { key: "password", label: "Password", value: "••••••••", type: "secret", required: true },
    ],
  },
  {
    id: "c3",
    name: "AWS S3",
    description: "File storage and CDN",
    category: "cloud",
    status: "connected",
    icon: "☁️",
    lastSync: "5 min ago",
    config: [
      { key: "access_key", label: "Access Key ID", value: "AKIA...XYZ", type: "secret", required: true },
      { key: "secret_key", label: "Secret Access Key", value: "••••••••", type: "secret", required: true },
      { key: "bucket", label: "Bucket Name", value: "myapp-assets", type: "text", required: true },
      { key: "region", label: "Region", value: "us-east-1", type: "select", required: true, options: ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"] },
    ],
  },
  {
    id: "c4",
    name: "Slack",
    description: "Team notifications and alerts",
    category: "messaging",
    status: "error",
    icon: "💬",
    lastSync: "Failed 10 min ago",
    config: [
      { key: "webhook_url", label: "Webhook URL", value: "https://hooks.slack.com/...", type: "url", required: true },
      { key: "channel", label: "Default Channel", value: "#alerts", type: "text", required: true },
    ],
  },
  {
    id: "c5",
    name: "Stripe",
    description: "Payment processing",
    category: "payment",
    status: "connected",
    icon: "💳",
    lastSync: "1 min ago",
    config: [
      { key: "secret_key", label: "Secret Key", value: "sk_test_...abc", type: "secret", required: true },
      { key: "publishable_key", label: "Publishable Key", value: "pk_test_...xyz", type: "text", required: true },
      { key: "webhook_secret", label: "Webhook Secret", value: "whsec_...def", type: "secret", required: true },
    ],
  },
  {
    id: "c6",
    name: "SendGrid",
    description: "Transactional email service",
    category: "messaging",
    status: "disconnected",
    icon: "📧",
    config: [
      { key: "api_key", label: "API Key", value: "", type: "secret", required: true },
      { key: "from_email", label: "From Email", value: "", type: "text", required: true },
    ],
  },
];

function getCategoryIcon(category: ConnectorCategory): React.JSX.Element {
  switch (category) {
    case "api": return <Zap className="w-4 h-4 text-yellow-400" />;
    case "database": return <Database className="w-4 h-4 text-blue-400" />;
    case "cloud": return <Cloud className="w-4 h-4 text-cyan-400" />;
    case "messaging": return <MessageSquare className="w-4 h-4 text-green-400" />;
    case "payment": return <CreditCard className="w-4 h-4 text-purple-400" />;
    case "auth": return <Shield className="w-4 h-4 text-orange-400" />;
  }
}

function getStatusBadge(status: ConnectorStatus): React.JSX.Element {
  switch (status) {
    case "connected":
      return <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-500"><CheckCircle2 className="w-2.5 h-2.5" />Connected</span>;
    case "disconnected":
      return <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"><XCircle className="w-2.5 h-2.5" />Disconnected</span>;
    case "error":
      return <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500"><AlertTriangle className="w-2.5 h-2.5" />Error</span>;
    case "pending":
      return <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500"><Loader2 className="w-2.5 h-2.5 animate-spin" />Connecting</span>;
  }
}

export default function ConnectorsCRUDPanel(): React.JSX.Element {
  const [connectors, setConnectors] = useState<Connector[]>(MOCK_CONNECTORS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConnector, setSelectedConnector] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<ConnectorCategory | "all">("all");

  const filteredConnectors = useMemo(() => {
    let result = connectors;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
    }
    if (categoryFilter !== "all") {
      result = result.filter((c) => c.category === categoryFilter);
    }
    return result;
  }, [connectors, searchQuery, categoryFilter]);

  const selected = connectors.find((c) => c.id === selectedConnector);

  const handleToggleSecret = useCallback((key: string) => {
    setShowSecrets((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleDelete = useCallback((id: string) => {
    setConnectors((prev) => prev.filter((c) => c.id !== id));
    if (selectedConnector === id) setSelectedConnector(null);
  }, [selectedConnector]);

  const handleTestConnection = useCallback((id: string) => {
    setConnectors((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "pending" as ConnectorStatus } : c))
    );
    setTimeout(() => {
      setConnectors((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "connected" as ConnectorStatus, lastSync: "Just now" } : c))
      );
    }, 2000);
  }, []);

  const stats = useMemo(() => ({
    total: connectors.length,
    connected: connectors.filter((c) => c.status === "connected").length,
    errors: connectors.filter((c) => c.status === "error").length,
  }), [connectors]);

  return (
    <div className="flex flex-col h-full bg-background text-foreground rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Connectors</h2>
            <p className="text-xs text-muted-foreground">
              {stats.connected}/{stats.total} connected
              {stats.errors > 0 && <span className="text-red-500 ml-1">({stats.errors} errors)</span>}
            </p>
          </div>
        </div>
        <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
          <Plus className="w-3.5 h-3.5" />
          Add Connector
        </button>
      </div>

      {/* Search & Filter */}
      <div className="px-5 py-3 border-b border-border flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            placeholder="Search connectors..."
            className="w-full pl-8 pr-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-1">
          {(["all", "api", "database", "cloud", "messaging", "payment"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                "px-2 py-1 text-[10px] rounded-md transition-colors capitalize",
                categoryFilter === cat ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Connector List */}
        <div className={cn(
          "overflow-y-auto border-r border-border",
          selected ? "w-72" : "flex-1"
        )}>
          {filteredConnectors.map((connector) => (
            <button
              key={connector.id}
              className={cn(
                "w-full text-left px-4 py-3 border-b border-border/50 transition-colors",
                selectedConnector === connector.id ? "bg-primary/5" : "hover:bg-accent/30"
              )}
              onClick={() => setSelectedConnector(connector.id)}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{connector.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{connector.name}</span>
                    {getStatusBadge(connector.status)}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{connector.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
            </button>
          ))}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-5">
              {/* Connector Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selected.icon}</span>
                  <div>
                    <h3 className="text-lg font-semibold">{selected.name}</h3>
                    <p className="text-xs text-muted-foreground">{selected.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTestConnection(selected.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg bg-muted hover:bg-accent transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Test
                  </button>
                  <button
                    onClick={() => handleDelete(selected.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-4 p-3 rounded-lg bg-card border border-border mb-5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Status:</span>
                  {getStatusBadge(selected.status)}
                </div>
                {selected.lastSync && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Last sync: {selected.lastSync}</span>
                  </div>
                )}
              </div>

              {/* Configuration */}
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Key className="w-4 h-4 text-muted-foreground" />
                Configuration
              </h4>
              <div className="space-y-3">
                {selected.config.map((cfg) => (
                  <div key={cfg.key} className="space-y-1">
                    <label className="text-xs text-muted-foreground flex items-center gap-1">
                      {cfg.label}
                      {cfg.required && <span className="text-red-500">*</span>}
                    </label>
                    <div className="flex items-center gap-2">
                      {cfg.type === "select" ? (
                        <select className="flex-1 px-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30">
                          {cfg.options?.map((opt) => (
                            <option key={opt} value={opt} selected={opt === cfg.value}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={cfg.type === "secret" && !showSecrets.has(cfg.key) ? "password" : "text"}
                          defaultValue={cfg.value}
                          className="flex-1 px-3 py-2 text-xs bg-background border border-border rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-primary/30"
                          placeholder={`Enter ${cfg.label.toLowerCase()}`}
                        />
                      )}
                      {cfg.type === "secret" && (
                        <button
                          onClick={() => handleToggleSecret(cfg.key)}
                          className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
                        >
                          {showSecrets.has(cfg.key) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      <button className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Save */}
              <div className="flex justify-end mt-5 pt-4 border-t border-border">
                <button className="px-4 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
