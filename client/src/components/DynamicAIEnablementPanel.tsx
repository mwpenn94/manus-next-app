import { useState, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Cpu,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Shield,
  Zap,
  Brain,
  Eye,
  Mic,
  Image,
  Code,
  Globe,
  FileText,
  Search,
  AlertTriangle,
  CheckCircle2,
  Info,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AICapability {
  id: string;
  name: string;
  description: string;
  category: "reasoning" | "generation" | "analysis" | "interaction" | "automation";
  enabled: boolean;
  tier: "core" | "advanced" | "experimental";
  performance: number;
  usageCount: number;
  icon: typeof Brain;
  dependencies: string[];
}

interface CapabilityGroup {
  category: string;
  label: string;
  icon: typeof Brain;
  capabilities: AICapability[];
}

const MOCK_CAPABILITIES: AICapability[] = [
  { id: "c1", name: "Multi-Step Reasoning", description: "Chain-of-thought decomposition for complex tasks", category: "reasoning", enabled: true, tier: "core", performance: 94, usageCount: 1247, icon: Brain, dependencies: [] },
  { id: "c2", name: "Code Generation", description: "Generate, refactor, and debug code across 50+ languages", category: "generation", enabled: true, tier: "core", performance: 91, usageCount: 892, icon: Code, dependencies: ["c1"] },
  { id: "c3", name: "Image Generation", description: "Create and edit images from text descriptions", category: "generation", enabled: true, tier: "advanced", performance: 87, usageCount: 234, icon: Image, dependencies: [] },
  { id: "c4", name: "Web Research", description: "Deep research across multiple sources with citation", category: "analysis", enabled: true, tier: "core", performance: 89, usageCount: 567, icon: Globe, dependencies: ["c1"] },
  { id: "c5", name: "Document Analysis", description: "Parse, summarize, and extract from PDFs and documents", category: "analysis", enabled: true, tier: "core", performance: 92, usageCount: 445, icon: FileText, dependencies: [] },
  { id: "c6", name: "Voice Interaction", description: "Speech-to-text and text-to-speech with natural prosody", category: "interaction", enabled: false, tier: "advanced", performance: 85, usageCount: 78, icon: Mic, dependencies: [] },
  { id: "c7", name: "Visual Understanding", description: "Analyze screenshots, diagrams, and visual content", category: "analysis", enabled: true, tier: "advanced", performance: 88, usageCount: 321, icon: Eye, dependencies: [] },
  { id: "c8", name: "Autonomous Execution", description: "Execute multi-step workflows without user intervention", category: "automation", enabled: true, tier: "experimental", performance: 82, usageCount: 156, icon: Zap, dependencies: ["c1", "c2"] },
  { id: "c9", name: "Semantic Search", description: "Find relevant context using embedding-based retrieval", category: "analysis", enabled: true, tier: "core", performance: 93, usageCount: 1089, icon: Search, dependencies: [] },
  { id: "c10", name: "Self-Correction", description: "Detect and fix errors in own outputs automatically", category: "reasoning", enabled: true, tier: "advanced", performance: 79, usageCount: 423, icon: Shield, dependencies: ["c1"] },
  { id: "c11", name: "Parallel Processing", description: "Execute multiple independent subtasks simultaneously", category: "automation", enabled: false, tier: "experimental", performance: 76, usageCount: 45, icon: Layers, dependencies: ["c8"] },
  { id: "c12", name: "Creative Writing", description: "Generate creative content with style adaptation", category: "generation", enabled: true, tier: "advanced", performance: 90, usageCount: 267, icon: Sparkles, dependencies: [] },
];

export default function DynamicAIEnablementPanel(): React.JSX.Element {
  const { data: prefs } = trpc.preferences.get.useQuery();
  const savePrefsMut = trpc.preferences.save.useMutation();
  const [capabilities, setCapabilities] = useState<AICapability[]>(MOCK_CAPABILITIES);
  const [selectedCapability, setSelectedCapability] = useState<string | null>(null);
  const [filterTier, setFilterTier] = useState<"all" | "core" | "advanced" | "experimental">("all");

  // Load persisted capability states
  useEffect(() => {
    const saved = (prefs?.generalSettings as any)?.aiCapabilityStates;
    if (saved && typeof saved === "object") {
      setCapabilities((prev) => prev.map((c) => ({
        ...c,
        enabled: saved[c.id] !== undefined ? saved[c.id] : c.enabled,
      })));
    }
  }, [prefs]);

  const persistCapabilities = useCallback((caps: AICapability[]) => {
    const states: Record<string, boolean> = {};
    caps.forEach((c) => { states[c.id] = c.enabled; });
    const current = (prefs?.generalSettings ?? {}) as Record<string, unknown>;
    savePrefsMut.mutate({ generalSettings: { ...current, aiCapabilityStates: states } });
  }, [prefs, savePrefsMut]);

  const handleToggle = useCallback((id: string) => {
    setCapabilities((prev) => {
      const target = prev.find((c) => c.id === id);
      if (!target) return prev;

      // If disabling, check if other enabled capabilities depend on this one
      if (target.enabled) {
        const dependents = prev.filter((c) => c.enabled && c.dependencies.includes(id));
        if (dependents.length > 0) {
          // Disable dependents too
          const depIds = new Set(dependents.map((d) => d.id));
          depIds.add(id);
          return prev.map((c) => (depIds.has(c.id) ? { ...c, enabled: false } : c));
        }
      } else {
        // If enabling, check if all dependencies are enabled
        const missingDeps = target.dependencies.filter(
          (depId) => !prev.find((c) => c.id === depId)?.enabled
        );
        if (missingDeps.length > 0) {
          // Enable dependencies too
          const depIds = new Set(missingDeps);
          depIds.add(id);
          return prev.map((c) => (depIds.has(c.id) ? { ...c, enabled: true } : c));
        }
      }

      return prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c));
    });
    // Persist after state update
    setTimeout(() => {
      setCapabilities((current) => { persistCapabilities(current); return current; });
    }, 0);
  }, [persistCapabilities]);

  const groups: CapabilityGroup[] = [
    { category: "reasoning", label: "Reasoning", icon: Brain, capabilities: capabilities.filter((c) => c.category === "reasoning") },
    { category: "generation", label: "Generation", icon: Sparkles, capabilities: capabilities.filter((c) => c.category === "generation") },
    { category: "analysis", label: "Analysis", icon: Search, capabilities: capabilities.filter((c) => c.category === "analysis") },
    { category: "interaction", label: "Interaction", icon: Mic, capabilities: capabilities.filter((c) => c.category === "interaction") },
    { category: "automation", label: "Automation", icon: Zap, capabilities: capabilities.filter((c) => c.category === "automation") },
  ];

  const filteredGroups = groups.map((g) => ({
    ...g,
    capabilities: filterTier === "all" ? g.capabilities : g.capabilities.filter((c) => c.tier === filterTier),
  })).filter((g) => g.capabilities.length > 0);

  const enabledCount = capabilities.filter((c) => c.enabled).length;
  const selectedCap = capabilities.find((c) => c.id === selectedCapability);

  const getTierColor = (tier: string): string => {
    switch (tier) {
      case "core":
        return "bg-green-500/10 text-green-500";
      case "advanced":
        return "bg-blue-500/10 text-blue-500";
      case "experimental":
        return "bg-purple-500/10 text-purple-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Dynamic AI Enablement</h2>
            <p className="text-xs text-muted-foreground">
              Configure and manage AI capabilities in real-time
            </p>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          {enabledCount}/{capabilities.length} active
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
        <span className="text-xs text-muted-foreground">Tier:</span>
        {(["all", "core", "advanced", "experimental"] as const).map((tier) => (
          <button
            key={tier}
            onClick={() => setFilterTier(tier)}
            className={cn(
              "px-2.5 py-1 text-[10px] rounded-full transition-colors capitalize",
              filterTier === tier
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tier}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="space-y-6">
          {filteredGroups.map((group) => (
            <div key={group.category}>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <group.icon className="w-4 h-4 text-muted-foreground" />
                {group.label}
              </h3>
              <div className="space-y-2">
                {group.capabilities.map((cap) => (
                  <div
                    key={cap.id}
                    className={cn(
                      "p-3 rounded-lg border transition-all cursor-pointer",
                      cap.enabled ? "bg-card border-border" : "bg-muted/20 border-border/50",
                      selectedCapability === cap.id && "ring-1 ring-primary/30"
                    )}
                    onClick={() => setSelectedCapability(selectedCapability === cap.id ? null : cap.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <cap.icon className={cn("w-4 h-4", cap.enabled ? "text-primary" : "text-muted-foreground")} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={cn("text-sm font-medium", !cap.enabled && "text-muted-foreground")}>
                              {cap.name}
                            </span>
                            <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full", getTierColor(cap.tier))}>
                              {cap.tier}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{cap.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleToggle(cap.id);
                        }}
                        className="shrink-0"
                      >
                        {cap.enabled ? (
                          <ToggleRight className="w-7 h-7 text-primary" />
                        ) : (
                          <ToggleLeft className="w-7 h-7 text-muted-foreground" />
                        )}
                      </button>
                    </div>

                    {selectedCapability === cap.id && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div>
                            <p className="text-[10px] text-muted-foreground">Performance</p>
                            <p className="text-sm font-medium">{cap.performance}%</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">Usage Count</p>
                            <p className="text-sm font-medium">{cap.usageCount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">Dependencies</p>
                            <p className="text-sm font-medium">{cap.dependencies.length || "None"}</p>
                          </div>
                        </div>
                        {cap.dependencies.length > 0 && (
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <Info className="w-3 h-3" />
                            <span>
                              Requires: {cap.dependencies.map((d) => capabilities.find((c) => c.id === d)?.name).join(", ")}
                            </span>
                          </div>
                        )}
                        {cap.tier === "experimental" && (
                          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-amber-500">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Experimental — behavior may be unpredictable</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
