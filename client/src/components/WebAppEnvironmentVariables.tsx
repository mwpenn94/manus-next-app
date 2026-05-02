import { useState, useCallback, useMemo } from "react";
import {
  Key,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  CheckCircle2,
  Search,
  Lock,
  Unlock,
  Settings,
  Shield,
  Download,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

interface WebAppEnvironmentVariablesProps {
  projectExternalId?: string;
}

// System-managed keys that should be shown as read-only
const SYSTEM_KEY_PATTERNS = [
  /^DATABASE_/i, /^OAUTH_/i, /^VITE_OAUTH_/i, /^OWNER_/i,
  /^VITE_APP_/i, /^VITE_ANALYTICS_/i, /^VITE_FRONTEND_/i,
  /SECRET$/i, /API_KEY$/i, /API_URL$/i,
];
const isSystemKey = (key: string) => SYSTEM_KEY_PATTERNS.some((p) => p.test(key));

export default function WebAppEnvironmentVariables({ projectExternalId }: WebAppEnvironmentVariablesProps): React.JSX.Element {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSecrets, setShowSecrets] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showSystemVars, setShowSystemVars] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newVar, setNewVar] = useState({ key: "", value: "" });


  const utils = trpc.useUtils();
  const { data: project, isLoading } = trpc.webappProject.get.useQuery(
    { externalId: projectExternalId ?? "" },
    { enabled: !!projectExternalId }
  );

  const envVars: Record<string, string> = (project?.envVars as Record<string, string>) ?? {};
  const entries = Object.entries(envVars);

  const addEnvVar = trpc.webappProject.addEnvVar.useMutation({
    onSuccess: () => {
      utils.webappProject.get.invalidate({ externalId: projectExternalId ?? "" });
      setShowAdd(false);
      setNewVar({ key: "", value: "" });
      toast.success("Environment variable added");
    },
    onError: (err) => { toast.error(err.message); },
  });

  const deleteEnvVar = trpc.webappProject.deleteEnvVar.useMutation({
    onSuccess: () => {
      utils.webappProject.get.invalidate({ externalId: projectExternalId ?? "" });
      toast.success("Environment variable deleted");
    },
    onError: (err) => { toast.error(err.message); },
  });

  const filtered = useMemo(() => {
    let result = entries;
    if (!showSystemVars) {
      result = result.filter(([key]) => !isSystemKey(key));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(([key]) => key.toLowerCase().includes(q));
    }
    return result;
  }, [entries, searchQuery, showSystemVars]);

  const handleToggleSecret = useCallback((key: string) => {
    setShowSecrets((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleCopy = useCallback((key: string, value: string) => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }, []);

  const isSecret = (key: string) => /secret|key|token|password|credential/i.test(key);
  const isSystem = isSystemKey;

  const getMaskedValue = (value: string): string => {
    if (value.length <= 8) return "••••••••";
    return value.slice(0, 4) + "••••" + value.slice(-4);
  };

  const stats = useMemo(() => ({
    total: entries.length,
    secrets: entries.filter(([k]) => isSecret(k)).length,
    system: entries.filter(([k]) => isSystem(k)).length,
    custom: entries.filter(([k]) => !isSystem(k)).length,
  }), [entries]);

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
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5" disabled={!projectExternalId}>
              <Plus className="w-3.5 h-3.5" />
              Add Variable
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Environment Variable</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <Input
                placeholder="VARIABLE_NAME"
                value={newVar.key}
                onChange={(e) => setNewVar({ ...newVar, key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") })}
                className="font-mono"
              />
              <Input
                placeholder="value"
                value={newVar.value}
                onChange={(e) => setNewVar({ ...newVar, value: e.target.value })}
                type="password"
              />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="w-3.5 h-3.5" />
                Values are encrypted at rest and only available at build/runtime.
              </div>
              <Button
                onClick={() => addEnvVar.mutate({ externalId: projectExternalId!, key: newVar.key, value: newVar.value })}
                className="w-full"
                disabled={!newVar.key.trim() || !newVar.value.trim() || addEnvVar.isPending}
              >
                {addEnvVar.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Add Variable
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && !projectExternalId && (
          <div className="text-center py-12 text-muted-foreground">
            <Key className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Select a project to manage environment variables.</p>
          </div>
        )}

        {!isLoading && projectExternalId && filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Key className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">{searchQuery ? "No matching variables." : "No environment variables configured."}</p>
          </div>
        )}

        {filtered.length > 0 && (
          <table className="w-full">
            <thead className="sticky top-0 bg-card/80 backdrop-blur-sm">
              <tr className="border-b border-border">
                <th className="text-left text-[10px] text-muted-foreground font-medium px-5 py-2">Key</th>
                <th className="text-left text-[10px] text-muted-foreground font-medium px-3 py-2">Value</th>
                <th className="text-right text-[10px] text-muted-foreground font-medium px-5 py-2 w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(([key, value]) => (
                <tr key={key} className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {isSecret(key) ? (
                        <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                      ) : (
                        <Unlock className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                      )}
                      <code className="text-xs font-mono font-medium">{key}</code>
                      {isSystem(key) && (
                        <span className="text-[8px] px-1 py-0.5 rounded bg-blue-500/10 text-blue-500">SYSTEM</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <code className="text-xs font-mono text-muted-foreground">
                      {isSecret(key) && !showSecrets.has(key)
                        ? getMaskedValue(value)
                        : value}
                    </code>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {isSecret(key) && (
                        <button
                          onClick={() => handleToggleSecret(key)}
                          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors"
                          title={showSecrets.has(key) ? "Hide" : "Reveal"}
                        >
                          {showSecrets.has(key) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      )}
                      <button
                        onClick={() => handleCopy(key, value)}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors"
                        title="Copy value"
                      >
                        {copiedKey === key ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                      {!isSystem(key) && (
                        <button
                          onClick={() => deleteEnvVar.mutate({ externalId: projectExternalId!, key })}
                          className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                          title="Delete"
                          disabled={deleteEnvVar.isPending}
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
        )}
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
