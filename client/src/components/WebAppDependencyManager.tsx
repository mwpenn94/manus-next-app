import { useState, useMemo, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Package,
  Plus,
  Trash2,
  ArrowUpCircle,
  Search,
  Shield,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Download,
  Info,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Dependency {
  name: string;
  currentVersion: string;
  latestVersion: string;
  type: "production" | "dev";
  size: string;
  license: string;
  hasUpdate: boolean;
  vulnerabilities: number;
  description: string;
}

const MOCK_DEPS: Dependency[] = [
  { name: "react", currentVersion: "19.0.0", latestVersion: "19.0.0", type: "production", size: "6.4 kB", license: "MIT", hasUpdate: false, vulnerabilities: 0, description: "A JavaScript library for building user interfaces" },
  { name: "react-dom", currentVersion: "19.0.0", latestVersion: "19.0.0", type: "production", size: "130 kB", license: "MIT", hasUpdate: false, vulnerabilities: 0, description: "React package for working with the DOM" },
  { name: "wouter", currentVersion: "3.3.5", latestVersion: "3.4.0", type: "production", size: "3.8 kB", license: "ISC", hasUpdate: true, vulnerabilities: 0, description: "A minimalist-friendly routing for React" },
  { name: "@tanstack/react-query", currentVersion: "5.90.2", latestVersion: "5.91.0", type: "production", size: "42 kB", license: "MIT", hasUpdate: true, vulnerabilities: 0, description: "Hooks for fetching, caching and updating async data" },
  { name: "@trpc/client", currentVersion: "11.6.0", latestVersion: "11.6.0", type: "production", size: "18 kB", license: "MIT", hasUpdate: false, vulnerabilities: 0, description: "tRPC client library" },
  { name: "tailwindcss", currentVersion: "4.0.0", latestVersion: "4.0.0", type: "production", size: "320 kB", license: "MIT", hasUpdate: false, vulnerabilities: 0, description: "A utility-first CSS framework" },
  { name: "lucide-react", currentVersion: "0.460.0", latestVersion: "0.465.0", type: "production", size: "15 kB", license: "ISC", hasUpdate: true, vulnerabilities: 0, description: "Beautiful & consistent icon toolkit for React" },
  { name: "framer-motion", currentVersion: "11.15.0", latestVersion: "11.15.0", type: "production", size: "140 kB", license: "MIT", hasUpdate: false, vulnerabilities: 0, description: "Production-ready motion library for React" },
  { name: "sonner", currentVersion: "1.7.1", latestVersion: "1.7.1", type: "production", size: "12 kB", license: "MIT", hasUpdate: false, vulnerabilities: 0, description: "An opinionated toast component for React" },
  { name: "drizzle-orm", currentVersion: "0.44.5", latestVersion: "0.44.5", type: "production", size: "85 kB", license: "Apache-2.0", hasUpdate: false, vulnerabilities: 0, description: "TypeScript ORM for SQL databases" },
  { name: "vite", currentVersion: "6.0.0", latestVersion: "6.0.0", type: "dev", size: "2.3 MB", license: "MIT", hasUpdate: false, vulnerabilities: 0, description: "Next generation frontend tooling" },
  { name: "vitest", currentVersion: "2.1.9", latestVersion: "2.1.9", type: "dev", size: "4.1 MB", license: "MIT", hasUpdate: false, vulnerabilities: 0, description: "Blazing fast unit test framework" },
  { name: "typescript", currentVersion: "5.9.3", latestVersion: "5.9.3", type: "dev", size: "22 MB", license: "Apache-2.0", hasUpdate: false, vulnerabilities: 0, description: "TypeScript is a language for application scale JavaScript" },
  { name: "drizzle-kit", currentVersion: "0.31.4", latestVersion: "0.31.4", type: "dev", size: "8.5 MB", license: "MIT", hasUpdate: false, vulnerabilities: 0, description: "DrizzleORM CLI companion for migrations" },
];

type FilterType = "all" | "production" | "dev" | "outdated" | "vulnerable";

export default function WebAppDependencyManager(): React.JSX.Element {
  const { data: prefs } = trpc.preferences.get.useQuery();
  const savePrefsMut = trpc.preferences.save.useMutation();
  // Fetch real dependencies from tRPC
  const { data: realDeps, isLoading: depsLoading } = trpc.webappProject.dependencies.useQuery({ externalId: undefined });
  const [deps, setDeps] = useState<Dependency[]>(MOCK_DEPS);

  // Sync real deps when loaded
  useEffect(() => {
    if (realDeps && realDeps.length > 0) {
      setDeps(realDeps.map((d: { name: string; version: string; type: string }) => ({
        name: d.name,
        currentVersion: d.version.replace(/^[\^~]/, ""),
        latestVersion: d.version.replace(/^[\^~]/, ""),
        type: d.type === "development" ? "dev" : "production",
        size: "-",
        license: "MIT",
        hasUpdate: false,
        vulnerabilities: 0,
        description: "",
      })));
    }
  }, [realDeps]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newPackageName, setNewPackageName] = useState("");
  const [updating, setUpdating] = useState<Set<string>>(new Set());

  // Load persisted filter preference
  useEffect(() => {
    const saved = (prefs?.generalSettings as any)?.depManagerFilter;
    if (saved) setFilter(saved);
  }, [prefs]);

  const filteredDeps = useMemo(() => {
    let result = deps;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((d) => d.name.toLowerCase().includes(q));
    }
    switch (filter) {
      case "production":
        return result.filter((d) => d.type === "production");
      case "dev":
        return result.filter((d) => d.type === "dev");
      case "outdated":
        return result.filter((d) => d.hasUpdate);
      case "vulnerable":
        return result.filter((d) => d.vulnerabilities > 0);
      default:
        return result;
    }
  }, [deps, searchQuery, filter]);

  const stats = useMemo(() => ({
    total: deps.length,
    production: deps.filter((d) => d.type === "production").length,
    dev: deps.filter((d) => d.type === "dev").length,
    outdated: deps.filter((d) => d.hasUpdate).length,
    vulnerable: deps.filter((d) => d.vulnerabilities > 0).length,
  }), [deps]);

  const handleUpdate = useCallback((name: string) => {
    setUpdating((prev) => new Set(prev).add(name));
    setTimeout(() => {
      setDeps((prev) =>
        prev.map((d) =>
          d.name === name ? { ...d, currentVersion: d.latestVersion, hasUpdate: false } : d
        )
      );
      setUpdating((prev) => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
    }, 1500);
  }, []);

  const handleRemove = useCallback((name: string) => {
    setDeps((prev) => prev.filter((d) => d.name !== name));
  }, []);

  const handleAdd = useCallback(() => {
    if (!newPackageName.trim()) return;
    const newDep: Dependency = {
      name: newPackageName.trim(),
      currentVersion: "1.0.0",
      latestVersion: "1.0.0",
      type: "production",
      size: "~",
      license: "MIT",
      hasUpdate: false,
      vulnerabilities: 0,
      description: "Newly added package",
    };
    setDeps((prev) => [...prev, newDep]);
    setNewPackageName("");
    setShowAddDialog(false);
  }, [newPackageName]);

  return (
    <div className="flex flex-col h-full bg-background text-foreground rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Dependencies</h2>
            <p className="text-xs text-muted-foreground">
              {stats.total} packages ({stats.production} prod, {stats.dev} dev)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {stats.outdated > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full">
              <ArrowUpCircle className="w-3 h-3" />
              {stats.outdated} updates
            </span>
          )}
          <button
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Package
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="px-5 py-3 border-b border-border flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            placeholder="Search packages..."
            className="w-full pl-8 pr-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-1">
          {(["all", "production", "dev", "outdated", "vulnerable"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-2.5 py-1.5 text-[10px] rounded-lg transition-colors capitalize",
                filter === f ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f}
              {f === "outdated" && stats.outdated > 0 && (
                <span className="ml-1 text-amber-500">({stats.outdated})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Add Dialog */}
      {showAddDialog && (
        <div className="px-5 py-3 border-b border-border bg-primary/5">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newPackageName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPackageName(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && handleAdd()}
              placeholder="Package name (e.g., lodash)"
              className="flex-1 px-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30"
              autoFocus
            />
            <button
              onClick={handleAdd}
              className="px-3 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setShowAddDialog(false); setNewPackageName(""); }}
              className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Package List */}
      <div className="flex-1 overflow-y-auto">
        {filteredDeps.map((dep) => (
          <div
            key={dep.name}
            className="flex items-center gap-3 px-5 py-3 border-b border-border/50 hover:bg-accent/30 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium font-mono">{dep.name}</span>
                <span className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded-full",
                  dep.type === "production" ? "bg-green-500/10 text-green-500" : "bg-blue-500/10 text-blue-500"
                )}>
                  {dep.type === "production" ? "prod" : "dev"}
                </span>
                {dep.vulnerabilities > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 flex items-center gap-0.5">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    {dep.vulnerabilities}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{dep.description}</p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-mono">{dep.currentVersion}</span>
                  {dep.hasUpdate && (
                    <>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-mono text-green-500">{dep.latestVersion}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                  <span>{dep.size}</span>
                  <span>•</span>
                  <span>{dep.license}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {dep.hasUpdate && (
                  <button
                    onClick={() => handleUpdate(dep.name)}
                    disabled={updating.has(dep.name)}
                    className="p-1.5 rounded-lg text-green-500 hover:bg-green-500/10 transition-colors disabled:opacity-50"
                    title="Update"
                  >
                    {updating.has(dep.name) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowUpCircle className="w-4 h-4" />
                    )}
                  </button>
                )}
                <button
                  onClick={() => handleRemove(dep.name)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {filteredDeps.length === 0 && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <div className="text-center">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No packages found</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border bg-card/30 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-green-500" />
          <span>{stats.vulnerable === 0 ? "No known vulnerabilities" : `${stats.vulnerable} vulnerabilities found`}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Lock file: pnpm-lock.yaml</span>
        </div>
      </div>
    </div>
  );
}
