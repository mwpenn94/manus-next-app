/**
 * OrchestrationPanel — Live progress panel for multi-agent orchestration.
 * Shows active agents, task completion, quality scores, and inter-agent communication.
 * Renders inline within the task stream when multi_agent_orchestrate is running.
 */
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Brain, Users, CheckCircle2, Clock, AlertTriangle,
  Zap, ArrowRight, BarChart3, Loader2
} from "lucide-react";

export interface AgentStatus {
  id: string;
  type: "supervisor" | "researcher" | "coder" | "writer" | "analyst" | "designer" | "reviewer";
  status: "idle" | "working" | "complete" | "failed" | "retrying";
  taskLabel?: string;
  qualityScore?: number;
  retryCount?: number;
  output?: string;
}

export interface OrchestrationState {
  planId: string;
  goal: string;
  status: "planning" | "executing" | "synthesizing" | "complete" | "failed";
  agents: AgentStatus[];
  completedTasks: number;
  totalTasks: number;
  startedAt: number;
  elapsedMs?: number;
  finalOutput?: string;
}

interface OrchestrationPanelProps {
  state: OrchestrationState;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const AGENT_ICONS: Record<string, typeof Brain> = {
  supervisor: Brain,
  researcher: BarChart3,
  coder: Zap,
  writer: ArrowRight,
  analyst: BarChart3,
  designer: Zap,
  reviewer: CheckCircle2,
};

const AGENT_COLORS: Record<string, string> = {
  supervisor: "text-violet-400",
  researcher: "text-blue-400",
  coder: "text-emerald-400",
  writer: "text-amber-400",
  analyst: "text-cyan-400",
  designer: "text-pink-400",
  reviewer: "text-orange-400",
};

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  idle: { label: "Idle", variant: "outline" },
  working: { label: "Working", variant: "default" },
  complete: { label: "Done", variant: "secondary" },
  failed: { label: "Failed", variant: "destructive" },
  retrying: { label: "Retrying", variant: "outline" },
};

export function OrchestrationPanel({ state, collapsed = false, onToggleCollapse }: OrchestrationPanelProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (state.status === "complete" || state.status === "failed") {
      setElapsed(state.elapsedMs || 0);
      return;
    }
    const interval = setInterval(() => {
      setElapsed(Date.now() - state.startedAt);
    }, 1000);
    return () => clearInterval(interval);
  }, [state.status, state.startedAt, state.elapsedMs]);

  const progress = state.totalTasks > 0
    ? Math.round((state.completedTasks / state.totalTasks) * 100)
    : 0;

  const activeAgents = state.agents.filter(a => a.status === "working");
  const avgQuality = useMemo(() => {
    const scored = state.agents.filter(a => a.qualityScore != null);
    if (scored.length === 0) return null;
    return Math.round(scored.reduce((sum, a) => sum + (a.qualityScore || 0), 0) / scored.length);
  }, [state.agents]);

  const formatElapsed = (ms: number) => {
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    return `${m}m ${s % 60}s`;
  };

  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors text-left"
      >
        <Users className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">
          Multi-Agent Orchestration
        </span>
        <Badge variant="secondary" className="ml-auto text-xs">
          {state.completedTasks}/{state.totalTasks}
        </Badge>
        {state.status === "executing" && (
          <Loader2 className="w-3 h-3 animate-spin text-primary" />
        )}
      </button>
    );
  }

  return (
    <Card className="border-primary/20 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Multi-Agent Orchestration
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant={state.status === "complete" ? "secondary" : state.status === "failed" ? "destructive" : "default"}
              className="text-xs"
            >
              {state.status === "planning" && "Planning..."}
              {state.status === "executing" && `${activeAgents.length} active`}
              {state.status === "synthesizing" && "Synthesizing..."}
              {state.status === "complete" && "Complete"}
              {state.status === "failed" && "Failed"}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatElapsed(elapsed)}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{state.goal}</p>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Tasks: {state.completedTasks}/{state.totalTasks}
            </span>
            {avgQuality !== null && (
              <span className="text-muted-foreground flex items-center gap-1">
                <BarChart3 className="w-3 h-3" />
                Quality: {avgQuality}%
              </span>
            )}
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Agent grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {state.agents.map((agent) => {
            const Icon = AGENT_ICONS[agent.type] || Brain;
            const color = AGENT_COLORS[agent.type] || "text-foreground";
            const badge = STATUS_BADGES[agent.status] || STATUS_BADGES.idle;

            return (
              <div
                key={agent.id}
                className={cn(
                  "flex items-center gap-2 px-2.5 py-1.5 rounded-md border transition-colors",
                  agent.status === "working" && "border-primary/30 bg-primary/5",
                  agent.status === "complete" && "border-green-500/20 bg-green-500/5",
                  agent.status === "failed" && "border-red-500/20 bg-red-500/5",
                  agent.status === "retrying" && "border-amber-500/20 bg-amber-500/5",
                  agent.status === "idle" && "border-border"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5 shrink-0", color)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium capitalize truncate">
                      {agent.type}
                    </span>
                    <Badge variant={badge.variant} className="text-[10px] px-1 py-0 h-4">
                      {badge.label}
                    </Badge>
                  </div>
                  {agent.taskLabel && (
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                      {agent.taskLabel}
                    </p>
                  )}
                </div>
                {agent.qualityScore != null && (
                  <span className={cn(
                    "text-[10px] font-mono",
                    agent.qualityScore >= 80 ? "text-green-400" :
                    agent.qualityScore >= 60 ? "text-amber-400" : "text-red-400"
                  )}>
                    {agent.qualityScore}%
                  </span>
                )}
                {agent.status === "working" && (
                  <Loader2 className="w-3 h-3 animate-spin text-primary shrink-0" />
                )}
                {agent.retryCount && agent.retryCount > 0 && (
                  <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Collapse button */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Collapse
          </button>
        )}
      </CardContent>
    </Card>
  );
}
