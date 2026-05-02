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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UserPreference {
  id: string;
  category: string;
  label: string;
  value: number;
  confidence: number;
  lastUpdated: string;
  source: "explicit" | "inferred" | "behavioral";
}

interface PersonalizationRule {
  id: string;
  name: string;
  description: string;
  active: boolean;
  impact: number;
  triggeredCount: number;
}

interface LearningEvent {
  id: string;
  timestamp: string;
  type: "preference_update" | "model_retrain" | "rule_triggered" | "feedback";
  description: string;
  confidence: number;
}

const MOCK_PREFERENCES: UserPreference[] = [
  { id: "p1", category: "Response Style", label: "Verbosity", value: 0.7, confidence: 0.92, lastUpdated: "2 hours ago", source: "behavioral" },
  { id: "p2", category: "Response Style", label: "Technical Depth", value: 0.85, confidence: 0.88, lastUpdated: "1 day ago", source: "inferred" },
  { id: "p3", category: "Response Style", label: "Code Examples", value: 0.95, confidence: 0.96, lastUpdated: "3 hours ago", source: "explicit" },
  { id: "p4", category: "Workflow", label: "Auto-execute Tools", value: 0.6, confidence: 0.75, lastUpdated: "5 hours ago", source: "behavioral" },
  { id: "p5", category: "Workflow", label: "Parallel Processing", value: 0.8, confidence: 0.82, lastUpdated: "1 day ago", source: "inferred" },
  { id: "p6", category: "Content", label: "Visual Aids", value: 0.45, confidence: 0.7, lastUpdated: "2 days ago", source: "behavioral" },
  { id: "p7", category: "Content", label: "Citations", value: 0.9, confidence: 0.94, lastUpdated: "6 hours ago", source: "explicit" },
  { id: "p8", category: "Interaction", label: "Proactive Suggestions", value: 0.55, confidence: 0.68, lastUpdated: "4 hours ago", source: "inferred" },
];

const MOCK_RULES: PersonalizationRule[] = [
  { id: "r1", name: "Code-First Responses", description: "Prioritize code examples when discussing technical topics", active: true, impact: 0.87, triggeredCount: 142 },
  { id: "r2", name: "Concise Summaries", description: "Provide TL;DR before detailed explanations", active: true, impact: 0.72, triggeredCount: 89 },
  { id: "r3", name: "Auto-Research Mode", description: "Automatically search for recent data when asked about trends", active: true, impact: 0.65, triggeredCount: 34 },
  { id: "r4", name: "Dark Theme Preference", description: "Generate dark-themed code snippets and diagrams", active: false, impact: 0.45, triggeredCount: 12 },
  { id: "r5", name: "Step-by-Step Breakdown", description: "Break complex tasks into numbered steps", active: true, impact: 0.91, triggeredCount: 203 },
];

const MOCK_EVENTS: LearningEvent[] = [
  { id: "e1", timestamp: "2 min ago", type: "preference_update", description: "Updated 'Technical Depth' preference based on recent interactions", confidence: 0.88 },
  { id: "e2", timestamp: "15 min ago", type: "rule_triggered", description: "Code-First Responses rule activated for TypeScript query", confidence: 0.95 },
  { id: "e3", timestamp: "1 hour ago", type: "feedback", description: "Positive feedback on structured response format", confidence: 0.92 },
  { id: "e4", timestamp: "3 hours ago", type: "model_retrain", description: "Preference model retrained with 47 new interaction signals", confidence: 0.84 },
  { id: "e5", timestamp: "5 hours ago", type: "preference_update", description: "Inferred preference for parallel tool execution from workflow patterns", confidence: 0.75 },
];

type TabId = "preferences" | "rules" | "learning" | "insights";

export default function PersonalizationEngine(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabId>("preferences");
  const [preferences, setPreferences] = useState<UserPreference[]>(MOCK_PREFERENCES);
  const [rules, setRules] = useState<PersonalizationRule[]>(MOCK_RULES);
  const [events] = useState<LearningEvent[]>(MOCK_EVENTS);
  const [isLearning, setIsLearning] = useState(true);

  const categories = useMemo(() => {
    const cats = new Map<string, UserPreference[]>();
    for (const pref of preferences) {
      const existing = cats.get(pref.category) || [];
      existing.push(pref);
      cats.set(pref.category, existing);
    }
    return Array.from(cats.entries());
  }, [preferences]);

  const overallConfidence = useMemo(() => {
    if (preferences.length === 0) return 0;
    return preferences.reduce((sum, p) => sum + p.confidence, 0) / preferences.length;
  }, [preferences]);

  const handlePreferenceChange = useCallback((id: string, newValue: number) => {
    setPreferences((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, value: newValue, source: "explicit" as const, confidence: 1.0, lastUpdated: "just now" } : p
      )
    );
  }, []);

  const handleToggleRule = useCallback((id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );
  }, []);

  const handleResetPreferences = useCallback(() => {
    setPreferences(MOCK_PREFERENCES);
  }, []);

  const tabs: Array<{ id: TabId; label: string; icon: typeof Brain }> = [
    { id: "preferences", label: "Preferences", icon: Sliders },
    { id: "rules", label: "Rules", icon: Target },
    { id: "learning", label: "Learning Log", icon: TrendingUp },
    { id: "insights", label: "Insights", icon: Eye },
  ];

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
        {activeTab === "preferences" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                These preferences shape how the AI responds to you.
              </p>
              <button
                onClick={handleResetPreferences}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-muted hover:bg-accent transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Reset All
              </button>
            </div>
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
                              pref.source === "behavioral" && "bg-blue-500/10 text-blue-500"
                            )}
                          >
                            {pref.source}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {pref.lastUpdated}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={Math.round(pref.value * 100)}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handlePreferenceChange(pref.id, Number(e.target.value) / 100)
                          }
                          className="flex-1 h-1.5 rounded-full appearance-none bg-muted cursor-pointer accent-primary"
                        />
                        <span className="text-xs font-mono w-10 text-right">
                          {Math.round(pref.value * 100)}%
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <BarChart3 className="w-3 h-3" />
                        Confidence: {(pref.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "rules" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              Personalization rules that adapt AI behavior based on learned patterns.
            </p>
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
                        Impact: {(rule.impact * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{rule.description}</p>
                    <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Triggered {rule.triggeredCount} times
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleRule(rule.id)}
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

        {activeTab === "learning" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              Real-time log of how the personalization model adapts.
            </p>
            {events.map((event) => (
              <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border">
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    event.type === "preference_update" && "bg-blue-500/10",
                    event.type === "model_retrain" && "bg-purple-500/10",
                    event.type === "rule_triggered" && "bg-amber-500/10",
                    event.type === "feedback" && "bg-green-500/10"
                  )}
                >
                  {event.type === "preference_update" && <Sliders className="w-4 h-4 text-blue-500" />}
                  {event.type === "model_retrain" && <RefreshCw className="w-4 h-4 text-purple-500" />}
                  {event.type === "rule_triggered" && <Zap className="w-4 h-4 text-amber-500" />}
                  {event.type === "feedback" && <ThumbsUp className="w-4 h-4 text-green-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{event.description}</p>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                    <span>{event.timestamp}</span>
                    <span>Confidence: {(event.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "insights" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              AI-generated insights about your interaction patterns.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium">Interaction Style</span>
                </div>
                <p className="text-lg font-semibold">Technical</p>
                <p className="text-[10px] text-muted-foreground mt-1">Based on 847 interactions</p>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-xs font-medium">Satisfaction Trend</span>
                </div>
                <p className="text-lg font-semibold">+12%</p>
                <p className="text-[10px] text-muted-foreground mt-1">Over last 30 days</p>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <ThumbsUp className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-medium">Positive Feedback</span>
                </div>
                <p className="text-lg font-semibold">89%</p>
                <p className="text-[10px] text-muted-foreground mt-1">Response approval rate</p>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <ThumbsDown className="w-4 h-4 text-red-500" />
                  <span className="text-xs font-medium">Areas to Improve</span>
                </div>
                <p className="text-lg font-semibold">3</p>
                <p className="text-[10px] text-muted-foreground mt-1">Active improvement targets</p>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Top Recommendation
              </h4>
              <p className="text-sm text-muted-foreground">
                Based on your recent interactions, enabling &quot;Auto-Research Mode&quot; could improve
                response quality by an estimated 15% for your data analysis queries.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
