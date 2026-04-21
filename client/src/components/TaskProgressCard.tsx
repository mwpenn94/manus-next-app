/**
 * TaskProgressCard — Manus-style "Task Progress X/Y" card
 *
 * Displays in the chat during streaming to show phase-level progress.
 * Each phase shows: green check (completed), blue dot + timer (active), clock (pending).
 * Collapsible with chevron toggle. Matches Manus screenshots precisely.
 */
import { useState, useEffect, useRef } from "react";
import { CheckCircle2, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import type { AgentAction } from "@/contexts/TaskContext";

// ── Types ──

interface Phase {
  id: number;
  label: string;
  status: "completed" | "active" | "pending";
}

interface TaskProgressCardProps {
  actions: AgentAction[];
  stepProgress: { completed: number; total: number; turn: number } | null;
  streaming: boolean;
}

// ── Elapsed Timer (per-phase) ──

function ElapsedTimer() {
  const startRef = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    startRef.current = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return (
    <span className="text-xs text-primary font-mono tabular-nums shrink-0">
      {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
}

// ── Phase Status Icon ──

function PhaseStatusIcon({ status }: { status: Phase["status"] }) {
  if (status === "completed") {
    return <CheckCircle2 className="w-4 h-4 text-foreground/70 shrink-0" />;
  }
  if (status === "active") {
    return (
      <div className="relative w-4 h-4 shrink-0 flex items-center justify-center">
        <div className="w-2.5 h-2.5 rounded-full bg-primary" />
        <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" style={{ animationDuration: "2s" }} />
      </div>
    );
  }
  return <Clock className="w-4 h-4 text-muted-foreground shrink-0" />;
}

// ── Derive phases from actions ──

function derivePhases(
  actions: AgentAction[],
  stepProgress: { completed: number; total: number; turn: number } | null
): Phase[] {
  if (actions.length === 0 && !stepProgress) return [];

  const phases: Phase[] = [];
  let phaseId = 1;

  const doneActions = actions.filter((a) => a.status === "done");
  const activeActions = actions.filter((a) => a.status === "active");

  for (const action of doneActions) {
    phases.push({ id: phaseId++, label: getPhaseLabel(action), status: "completed" });
  }

  for (const action of activeActions) {
    phases.push({ id: phaseId++, label: getPhaseLabel(action), status: "active" });
  }

  if (stepProgress && stepProgress.total > 0) {
    const remaining = Math.max(0, stepProgress.total - phases.length);
    for (let i = 0; i < remaining; i++) {
      phases.push({ id: phaseId++, label: "Processing...", status: "pending" });
    }
  }

  return phases;
}

function getPhaseLabel(action: AgentAction): string {
  switch (action.type) {
    case "browsing":
      return `Browse ${action.url || "web page"}`;
    case "searching":
      return `Search: ${action.query || "web"}`;
    case "executing":
      return `Execute: ${action.command || "code"}`;
    case "creating":
      return `Create: ${action.file || "file"}`;
    case "generating":
      return `Generate: ${action.description || "content"}`;
    case "thinking":
      return "Analyzing and reasoning";
    case "writing":
      return `Writing: ${action.label || "content"}`;
    case "researching":
      return `Researching: ${action.label || "topic"}`;
    case "scrolling":
      return "Scrolling page";
    case "clicking":
      return `Clicking: ${action.element || "element"}`;
    default:
      return "Processing";
  }
}

// ── Main Component ──

export default function TaskProgressCard({ actions, stepProgress, streaming }: TaskProgressCardProps) {
  const [expanded, setExpanded] = useState(true);

  const phases = derivePhases(actions, stepProgress);
  if (phases.length === 0) return null;

  const completedCount = phases.filter((p) => p.status === "completed").length;
  const totalCount = phases.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 rounded-xl bg-card border border-border overflow-hidden shadow-sm"
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        {/* Thumbnail placeholder */}
        <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
          <div className="w-6 h-6 rounded bg-muted flex items-center justify-center">
            <span className="text-[8px] text-muted-foreground font-mono">AI</span>
          </div>
        </div>
        <div className="flex-1 text-left">
          <span className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
            Task Progress{" "}
            <span className="text-muted-foreground font-normal">
              {completedCount}/{totalCount}
            </span>
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Phase list */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-0.5">
              {phases.map((phase) => (
                <div
                  key={phase.id}
                  className={cn(
                    "flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors",
                    phase.status === "active" && "bg-primary/5"
                  )}
                >
                  <PhaseStatusIcon status={phase.status} />
                  <span
                    className={cn(
                      "text-sm flex-1 truncate",
                      phase.status === "completed" && "text-foreground",
                      phase.status === "active" && "text-foreground font-medium",
                      phase.status === "pending" && "text-muted-foreground"
                    )}
                  >
                    {phase.label}
                  </span>
                  {phase.status === "active" && streaming && <ElapsedTimer />}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress bar at bottom */}
      <div className="h-0.5 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </motion.div>
  );
}
