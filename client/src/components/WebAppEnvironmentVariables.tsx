import { useState, useCallback, useMemo } from "react";
import {
  Key,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Search,
  Lock,
  Unlock,
  Settings,
  Shield,
  Upload,
  Download,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

type EnvScope = "development" | "staging" | "production" | "all";
type EnvType = "string" | "secret" | "url" | "number" | "boolean";

interface EnvVariable {
  id: string;
  key: string;
  value: string;
  type: EnvType;
  scope: EnvScope;
  description: string;
  isSystem: boolean;
  lastModified: string;
  encrypted: boolean;
}

const MOCK_VARS: EnvVariable[] = [
  { id: "e1", key: "DATABASE_URL", value: "mysql://user:pass@host:3306/db", type: "url", scope: "all", description: "Primary database connection string", isSystem: true, lastModified: "System", encrypted: true },
  { id: "e2", key: "SESSION_SECRET", value: "sk-session-key-abc123", type: "secret", scope: "all", description: "Session cookie signing secret", isSystem: true, lastModified: "System", encrypted: true },
  { id: "e3", key: "VITE_APP_TITLE", value: "Sovereign AI", type: "string", scope: "all", description: "Application display title", isSystem: false, lastModified: "2 hours ago", encrypted: false },
  { id: "e4", key: "PAYMENT_API_KEY", value: "sk_test_abc123def456", type: "secret", scope: "production", description: "Payment processing API key", isSystem: false, lastModified: "1 day ago", encrypted: true },
  { id: "e5", key: "VITE_STRIPE_PUBLISHABLE_KEY", value: "pk_test_xyz789", type: "string", scope: "all", description: "Stripe publishable key for frontend", isSystem: false, lastModified: "1 day ago", encrypted: false },
  { id: "e6", key: "OPENAI_API_KEY", value: "sk-proj-abc123", type: "secret", scope: "production", description: "OpenAI API key for LLM features", isSystem: false, lastModified: "3 days ago", encrypted: true },
  { id: "e7", key: "VITE_ANALYTICS_ENDPOINT", value: "https://analytics.example.com", type: "url", scope: "production", description: "Analytics tracking endpoint", isSystem: true, lastModified: "System", encrypted: false },
  { id: "e8", key: "MAX_UPLOAD_SIZE_MB", value: "16", type: "number", scope: "all", description: "Maximum file upload size in megabytes", isSystem: false, lastModified: "1 week ago", encrypted: false },
  { id: "e9", key: "ENABLE_BETA_FEATURES", value: "true", type: "boolean", scope: "development", description: "Toggle beta features in development", isSystem: false, lastModified: "5 hours ago", encrypted: false },
];

export default function WebAppEnvironmentVariables(): React.JSX.Element {
  const [variables, setVariables] = useState<EnvVariable[]>(MOCK_VARS);
  const [searchQuery, setSearchQuery] = useState("");
  const [scopeFilter, setScopeFilter] = useState<EnvScope | "all">("all");
  const [showSecrets, setShowSecrets] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSystemVars, setShowSystemVars] = useState(true);

  const filtered = useMemo(() => {
    let result = variables;
    if (!showSystemVars) {
      result = result.filter((v) => !v.isSystem);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((v) => v.key.toLowerCase().includes(q) || v.description.toLowerCase().includes(q));
    }
    if (scopeFilter !== "all") {
      result = result.filter((v) => v.scope === scopeFilter || v.scope === "all");
    }
    return result;
  }, [variables, searchQuery, scopeFilter, showSystemVars]);

  const handleToggleSecret = useCallback((id: string) => {
    setShowSecrets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleCopy = useCallback((id: string, value: string) => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setVariables((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const getMaskedValue = (value: string): string => {
    if (value.length <= 8) return "••••••••";
    return value.slice(0, 4) + "••••" + value.slice(-4);
  };

  const stats = useMemo(() => ({
    total: variables.length,
    secrets: variables.filter((v) => v.encrypted).length,
    system: variables.filter((v) => v.isSystem).length,
    custom: variables.filter((v) => !v.isSystem).length,
  }), [variables]);

  return (
    <div className="flex flex-col bg-background text-foreground rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Key className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Environment Variables</h2>
            <p className="text-xs text-muted-foreground">
              {stats.total} variables ({stats.secrets} encrypted, {stats.system} system)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg bg-muted hover:bg-accent transition-colors">
            <Upload className="w-3.5 h-3.5" />
            Import .env
          </button>
          <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
            <Plus className="w-3.5 h-3.5" />
            Add Variable
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="px-5 py-3 border-b border-border flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            placeholder="Search variables..."
            className="w-full pl-8 pr-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-1">
          {(["all", "development", "staging", "production"] as const).map((scope) => (
            <button
              key={scope}
              onClick={() => setScopeFilter(scope)}
              className={cn(
                "px-2 py-1 text-[10px] rounded-md transition-colors capitalize",
                scopeFilter === scope ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {scope}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowSystemVars(!showSystemVars)}
          className={cn(
            "flex items-center gap-1 px-2 py-1 text-[10px] rounded-md transition-colors",
            showSystemVars ? "bg-blue-500/10 text-blue-500" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Settings className="w-3 h-3" />
          System
        </button>
      </div>

      {/* Variable List */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-card/80 backdrop-blur-sm">
            <tr className="border-b border-border">
              <th className="text-left text-[10px] text-muted-foreground font-medium px-5 py-2">Key</th>
              <th className="text-left text-[10px] text-muted-foreground font-medium px-3 py-2">Value</th>
              <th className="text-left text-[10px] text-muted-foreground font-medium px-3 py-2 w-24">Scope</th>
              <th className="text-left text-[10px] text-muted-foreground font-medium px-3 py-2 w-24">Modified</th>
              <th className="text-right text-[10px] text-muted-foreground font-medium px-5 py-2 w-28">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((variable) => (
              <tr key={variable.id} className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    {variable.encrypted ? (
                      <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                    ) : (
                      <Unlock className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                    )}
                    <code className="text-xs font-mono font-medium">{variable.key}</code>
                    {variable.isSystem && (
                      <span className="text-[8px] px-1 py-0.5 rounded bg-blue-500/10 text-blue-500">SYSTEM</span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 ml-5">{variable.description}</p>
                </td>
                <td className="px-3 py-3">
                  <code className="text-xs font-mono text-muted-foreground">
                    {variable.type === "secret" && !showSecrets.has(variable.id)
                      ? getMaskedValue(variable.value)
                      : variable.value}
                  </code>
                </td>
                <td className="px-3 py-3">
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full capitalize",
                    variable.scope === "production" ? "bg-red-500/10 text-red-500" :
                    variable.scope === "staging" ? "bg-amber-500/10 text-amber-500" :
                    variable.scope === "development" ? "bg-green-500/10 text-green-500" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {variable.scope}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span className="text-[10px] text-muted-foreground">{variable.lastModified}</span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {variable.type === "secret" && (
                      <button
                        onClick={() => handleToggleSecret(variable.id)}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors"
                        title={showSecrets.has(variable.id) ? "Hide" : "Reveal"}
                      >
                        {showSecrets.has(variable.id) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                    )}
                    <button
                      onClick={() => handleCopy(variable.id, variable.value)}
                      className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors"
                      title="Copy value"
                    >
                      {copiedId === variable.id ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                    {!variable.isSystem && (
                      <button
                        onClick={() => handleDelete(variable.id)}
                        className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border bg-card/30 flex items-center justify-between text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <Shield className="w-3 h-3" />
          <span>Encrypted values are stored securely and never exposed in logs</span>
        </div>
        <button className="flex items-center gap-1 hover:text-foreground transition-colors">
          <Download className="w-3 h-3" />
          Export .env.example
        </button>
      </div>
    </div>
  );
}
