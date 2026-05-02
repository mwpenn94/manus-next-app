import { useState, useCallback, useMemo } from "react";
import {
  Brain,
  Sliders,
  Target,
  TrendingUp,
  RefreshCw,
  Eye,
  Zap,
  BarChart3,
  Settings,
  Sparkles,
  User,
  Clock,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Plus,
  Loader2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type TabId = "preferences" | "rules" | "learning" | "insights";

export default function PersonalizationEngine(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabId>("preferences");
  const [isLearning, setIsLearning] = useState(true);
  const [showAddPref, setShowAddPref] = useState(false);
  const [showAddRule, setShowAddRule] = useState(false);
  const [newPref, setNewPref] = useState({ category: "", label: "", value: 50 });
  const [newRule, setNewRule] = useState({ name: "", condition: "", action: "", impact: "medium" });

  const utils = trpc.useUtils();
  const { data: preferences = [], isLoading: prefsLoading } = trpc.personalization.getPreferences.useQuery();
  const { data: rules = [], isLoading: rulesLoading } = trpc.personalization.getRules.useQuery();
  const { data: events = [], isLoading: eventsLoading } = trpc.personalization.getLearningLog.useQuery();

  const upsertPref = trpc.personalization.upsertPreference.useMutation({
    onSuccess: () => utils.personalization.getPreferences.invalidate(),
  });
  const deletePref = trpc.personalization.deletePreference.useMutation({
    onSuccess: () => utils.personalization.getPreferences.invalidate(),
  });
  const resetPrefs = trpc.personalization.resetPreferences.useMutation({
    onSuccess: () => utils.personalization.getPreferences.invalidate(),
  });
  const createRule = trpc.personalization.createRule.useMutation({
    onSuccess: () => {
      utils.personalization.getRules.invalidate();
      setShowAddRule(false);
      setNewRule({ name: "", condition: "", action: "", impact: "medium" });
    },
  });
  const toggleRule = trpc.personalization.toggleRule.useMutation({
    onSuccess: () => utils.personalization.getRules.invalidate(),
  });
  const deleteRule = trpc.personalization.deleteRule.useMutation({
    onSuccess: () => utils.personalization.getRules.invalidate(),
  });
  const addLearningEntry = trpc.personalization.addLearningEntry.useMutation({
    onSuccess: () => utils.personalization.getLearningLog.invalidate(),
  });

  const categories = useMemo(() => {
    const cats = new Map<string, typeof preferences>();
    for (const pref of preferences) {
      const existing = cats.get(pref.category) || [];
      existing.push(pref);
      cats.set(pref.category, existing);
    }
    return Array.from(cats.entries());
  }, [preferences]);

  const overallConfidence = useMemo(() => {
    if (preferences.length === 0) return 0;
    return preferences.reduce((sum, p) => sum + p.confidence, 0) / preferences.length / 100;
  }, [preferences]);

  const handlePreferenceChange = useCallback((pref: typeof preferences[0], newValue: number) => {
    upsertPref.mutate({
      category: pref.category,
      label: pref.label,
      value: newValue,
      confidence: 100,
      source: "explicit",
      active: 1,
    });
  }, [upsertPref]);

  const handleToggleRule = useCallback((id: number, currentActive: number) => {
    toggleRule.mutate({ id, active: currentActive === 0 });
  }, [toggleRule]);

  const handleResetPreferences = useCallback(() => {
    resetPrefs.mutate();
    addLearningEntry.mutate({
      eventType: "feedback_received",
      description: "User reset all personalization preferences to defaults",
      confidence: 100,
    });
  }, [resetPrefs, addLearningEntry]);

  const handleAddPreference = useCallback(() => {
    if (!newPref.category.trim() || !newPref.label.trim()) return;
    upsertPref.mutate({
      category: newPref.category,
      label: newPref.label,
      value: newPref.value,
      confidence: 100,
      source: "explicit",
      active: 1,
    });
    addLearningEntry.mutate({
      eventType: "preference_learned",
      description: `User explicitly set preference: ${newPref.label} in ${newPref.category}`,
      confidence: 100,
    });
    setShowAddPref(false);
    setNewPref({ category: "", label: "", value: 50 });
  }, [newPref, upsertPref, addLearningEntry]);

  const handleAddRule = useCallback(() => {
    if (!newRule.name.trim() || !newRule.condition.trim() || !newRule.action.trim()) return;
    createRule.mutate(newRule);
    addLearningEntry.mutate({
      eventType: "adaptation_applied",
      description: `New personalization rule created: ${newRule.name}`,
      confidence: 80,
    });
  }, [newRule, createRule, addLearningEntry]);

  const tabs: Array<{ id: TabId; label: string; icon: typeof Brain }> = [
    { id: "preferences", label: "Preferences", icon: Sliders },
    { id: "rules", label: "Rules", icon: Target },
    { id: "learning", label: "Learning Log", icon: TrendingUp },
    { id: "insights", label: "Insights", icon: Eye },
  ];

  const isLoading = prefsLoading || rulesLoading || eventsLoading;

  return (
    <div className="flex flex-col h-full bg-background text-foreground rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Personalization Engine</h2>
            <p className="text-xs text-muted-foreground">
              Adaptive AI behavior based on your preferences
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 text-xs">
            <div className={cn("w-2 h-2 rounded-full", isLearning ? "bg-green-500 animate-pulse" : "bg-muted-foreground")} />
            <span className="text-muted-foreground">{isLearning ? "Learning Active" : "Paused"}</span>
          </div>
          <button
            onClick={() => setIsLearning(!isLearning)}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
            title={isLearning ? "Pause learning" : "Resume learning"}
          >
            {isLearning ? <Zap className="w-4 h-4 text-primary" /> : <RefreshCw className="w-4 h-4 text-muted-foreground" />}
          </button>
        </div>
      </div>

      {/* Confidence Bar */}
      <div className="px-5 py-3 border-b border-border bg-card/30">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">Overall Model Confidence</span>
          <span className="text-xs font-medium">{(overallConfidence * 100).toFixed(1)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-500"
            style={{ width: `${overallConfidence * 100}%` }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border px-5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2.5 text-sm border-b-2 transition-colors",
              activeTab === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && activeTab === "preferences" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                These preferences shape how the AI responds to you. {preferences.length} preferences tracked.
              </p>
              <div className="flex items-center gap-2">
                <Dialog open={showAddPref} onOpenChange={setShowAddPref}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Plus className="w-3.5 h-3.5" />
                      Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Preference</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 pt-2">
                      <Input
                        placeholder="Category (e.g., Response Style)"
                        value={newPref.category}
                        onChange={(e) => setNewPref({ ...newPref, category: e.target.value })}
                      />
                      <Input
                        placeholder="Label (e.g., Verbosity)"
                        value={newPref.label}
                        onChange={(e) => setNewPref({ ...newPref, label: e.target.value })}
                      />
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-12">Value:</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={newPref.value}
                          onChange={(e) => setNewPref({ ...newPref, value: Number(e.target.value) })}
                          className="flex-1 h-1.5 rounded-full appearance-none bg-muted cursor-pointer accent-primary"
                        />
                        <span className="text-sm font-mono w-10 text-right">{newPref.value}%</span>
                      </div>
                      <Button onClick={handleAddPreference} className="w-full" disabled={!newPref.category.trim() || !newPref.label.trim()}>
                        Save Preference
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <button
                  onClick={handleResetPreferences}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-muted hover:bg-accent transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset All
                </button>
              </div>
            </div>
            {preferences.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Sliders className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No preferences yet. Add your first preference to start personalizing.</p>
              </div>
            )}
            {categories.map(([category, prefs]) => (
              <div key={category}>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                  {category}
                </h3>
                <div className="space-y-3">
                  {prefs.map((pref) => (
                    <div key={pref.id} className="p-3 rounded-lg bg-card border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{pref.label}</span>
                          <span
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded-full",
                              pref.source === "explicit" && "bg-primary/10 text-primary",
                              pref.source === "inferred" && "bg-amber-500/10 text-amber-500",
                              pref.source === "default" && "bg-blue-500/10 text-blue-500"
                            )}
                          >
                            {pref.source}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {new Date(pref.updatedAt).toLocaleDateString()}
                          </div>
                          <button
                            onClick={() => deletePref.mutate({ id: pref.id })}
                            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={pref.value}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handlePreferenceChange(pref, Number(e.target.value))
                          }
                          className="flex-1 h-1.5 rounded-full appearance-none bg-muted cursor-pointer accent-primary"
                        />
                        <span className="text-xs font-mono w-10 text-right">
                          {pref.value}%
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <BarChart3 className="w-3 h-3" />
                        Confidence: {pref.confidence}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && activeTab === "rules" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Personalization rules that adapt AI behavior. {rules.length} rules configured.
              </p>
              <Dialog open={showAddRule} onOpenChange={setShowAddRule}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    Add Rule
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Personalization Rule</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 pt-2">
                    <Input
                      placeholder="Rule name (e.g., Code-First Responses)"
                      value={newRule.name}
                      onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                    />
                    <Input
                      placeholder="Condition (e.g., When discussing technical topics)"
                      value={newRule.condition}
                      onChange={(e) => setNewRule({ ...newRule, condition: e.target.value })}
                    />
                    <Input
                      placeholder="Action (e.g., Prioritize code examples)"
                      value={newRule.action}
                      onChange={(e) => setNewRule({ ...newRule, action: e.target.value })}
                    />
                    <select
                      value={newRule.impact}
                      onChange={(e) => setNewRule({ ...newRule, impact: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
                    >
                      <option value="low">Low Impact</option>
                      <option value="medium">Medium Impact</option>
                      <option value="high">High Impact</option>
                    </select>
                    <Button onClick={handleAddRule} className="w-full" disabled={!newRule.name.trim() || !newRule.condition.trim() || !newRule.action.trim()}>
                      Create Rule
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {rules.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Target className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No rules yet. Create your first rule to customize AI behavior.</p>
              </div>
            )}
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={cn(
                  "p-4 rounded-lg border transition-colors",
                  rule.active ? "bg-card border-border" : "bg-muted/30 border-border/50"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={cn("text-sm font-medium", !rule.active && "text-muted-foreground")}>
                        {rule.name}
                      </h4>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                        {rule.impact}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{rule.condition} → {rule.action}</p>
                    <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Triggered {rule.triggeredCount} times
                      </span>
                      <button
                        onClick={() => deleteRule.mutate({ id: rule.id })}
                        className="flex items-center gap-1 text-destructive/60 hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleRule(rule.id, rule.active)}
                    className={cn(
                      "relative w-10 h-5 rounded-full transition-colors",
                      rule.active ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <div
                      className={cn(
                        "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                        rule.active ? "translate-x-5" : "translate-x-0.5"
                      )}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && activeTab === "learning" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              Real-time log of how the personalization model adapts. {events.length} events recorded.
            </p>
            {events.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No learning events yet. Interact with the system to start generating insights.</p>
              </div>
            )}
            {events.map((event) => (
              <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border">
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    event.eventType === "preference_learned" && "bg-blue-500/10",
                    event.eventType === "pattern_detected" && "bg-purple-500/10",
                    event.eventType === "adaptation_applied" && "bg-amber-500/10",
                    event.eventType === "feedback_received" && "bg-green-500/10"
                  )}
                >
                  {event.eventType === "preference_learned" && <Sliders className="w-4 h-4 text-blue-500" />}
                  {event.eventType === "pattern_detected" && <RefreshCw className="w-4 h-4 text-purple-500" />}
                  {event.eventType === "adaptation_applied" && <Zap className="w-4 h-4 text-amber-500" />}
                  {event.eventType === "feedback_received" && <ThumbsUp className="w-4 h-4 text-green-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{event.description}</p>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                    <span>{new Date(event.createdAt).toLocaleString()}</span>
                    <span>Confidence: {event.confidence}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && activeTab === "insights" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              AI-generated insights about your interaction patterns.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium">Preferences Set</span>
                </div>
                <p className="text-lg font-semibold">{preferences.length}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Across {categories.length} categories</p>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-xs font-medium">Active Rules</span>
                </div>
                <p className="text-lg font-semibold">{rules.filter(r => r.active).length}</p>
                <p className="text-[10px] text-muted-foreground mt-1">of {rules.length} total rules</p>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <ThumbsUp className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-medium">Explicit Preferences</span>
                </div>
                <p className="text-lg font-semibold">{preferences.filter(p => p.source === "explicit").length}</p>
                <p className="text-[10px] text-muted-foreground mt-1">User-defined preferences</p>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <ThumbsDown className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-medium">Learning Events</span>
                </div>
                <p className="text-lg font-semibold">{events.length}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Total adaptation events</p>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Top Recommendation
              </h4>
              <p className="text-sm text-muted-foreground">
                {preferences.length < 3
                  ? "Add more preferences to help the AI understand your working style better. Start with Response Style and Workflow categories."
                  : rules.filter(r => r.active).length < 2
                    ? "Create personalization rules to automate AI behavior adaptations based on your preferences."
                    : `Your personalization model has ${(overallConfidence * 100).toFixed(0)}% confidence. Continue interacting to improve accuracy.`}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
