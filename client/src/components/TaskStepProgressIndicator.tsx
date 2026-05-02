import { useState, useMemo } from "react";
import {
  CheckCircle2,
  Circle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Clock,
  Zap,
  AlertTriangle,
  ArrowRight,
  SkipForward,
  Pause,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";

type StepStatus = "pending" | "running" | "completed" | "failed" | "skipped";

interface SubStep {
  id: string;
  label: string;
  status: StepStatus;
  duration?: string;
  detail?: string;
}

interface TaskStep {
  id: string;
  label: string;
  description: string;
  status: StepStatus;
  duration?: string;
  subSteps?: SubStep[];
  toolsUsed?: string[];
}


function getStepIcon(status: StepStatus, size: "sm" | "md" = "md"): React.JSX.Element {
  const cls = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";
  switch (status) {
    case "completed":
      return <CheckCircle2 className={cn(cls, "text-green-500")} />;
    case "running":
      return <Loader2 className={cn(cls, "text-primary animate-spin")} />;
    case "failed":
      return <AlertTriangle className={cn(cls, "text-red-500")} />;
    case "skipped":
      return <SkipForward className={cn(cls, "text-muted-foreground")} />;
    default:
      return <Circle className={cn(cls, "text-muted-foreground/40")} />;
  }
}

interface TaskStepProgressIndicatorProps {
  steps?: TaskStep[];
  compact?: boolean;
}

export default function TaskStepProgressIndicator({
  steps = [],
  compact = false,
}: TaskStepProgressIndicatorProps): React.JSX.Element {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set(["s3"]));

  const handleToggle = (id: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const completedCount = steps.filter((s) => s.status === "completed").length;
  const totalCount = steps.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const currentStep = steps.find((s) => s.status === "running");

  return (
    <div className="flex flex-col bg-background text-foreground rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted" />
              <circle
                cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="2"
                className="text-primary"
                strokeDasharray={`${progress * 0.942} 100`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
              {progress}%
            </span>
          </div>
          <div>
            <h2 className="text-sm font-semibold">
              {currentStep ? currentStep.label : completedCount === totalCount ? "Task Complete" : "Task Progress"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {completedCount}/{totalCount} steps completed
            </p>
          </div>
        </div>
        {currentStep && (
          <div className="flex items-center gap-1.5 text-xs text-primary">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>In progress</span>
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="px-4 py-3">
        {steps.map((step, idx) => {
          const isExpanded = expandedSteps.has(step.id);
          const hasSubSteps = step.subSteps && step.subSteps.length > 0;
          const isLast = idx === steps.length - 1;

          return (
            <div key={step.id} className="relative">
              {/* Connector line */}
              {!isLast && (
                <div className={cn(
                  "absolute left-[17px] top-[32px] w-px",
                  isExpanded && hasSubSteps ? "h-[calc(100%-32px)]" : "h-[calc(100%-16px)]",
                  step.status === "completed" ? "bg-green-500/30" : "bg-border"
                )} />
              )}

              {/* Step Header */}
              <button
                className="w-full flex items-start gap-3 py-2 text-left group"
                onClick={() => hasSubSteps && handleToggle(step.id)}
              >
                <div className="mt-0.5 shrink-0">
                  {getStepIcon(step.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-sm font-medium",
                      step.status === "pending" && "text-muted-foreground"
                    )}>
                      {step.label}
                    </span>
                    {step.duration && step.status === "completed" && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {step.duration}
                      </span>
                    )}
                    {hasSubSteps && (
                      <span className="text-muted-foreground">
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </span>
                    )}
                  </div>
                  {!compact && (
                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                  )}
                  {step.toolsUsed && step.toolsUsed.length > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      {step.toolsUsed.map((tool) => (
                        <span key={tool} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {tool}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </button>

              {/* Sub-steps */}
              {isExpanded && hasSubSteps && (
                <div className="ml-8 mb-2 space-y-0.5">
                  {step.subSteps!.map((sub) => (
                    <div key={sub.id} className="flex items-center gap-2 py-1 pl-2">
                      {getStepIcon(sub.status, "sm")}
                      <span className={cn(
                        "text-xs",
                        sub.status === "pending" && "text-muted-foreground"
                      )}>
                        {sub.label}
                      </span>
                      {sub.duration && sub.status === "completed" && (
                        <span className="text-[9px] text-muted-foreground">{sub.duration}</span>
                      )}
                      {sub.detail && sub.status === "running" && (
                        <span className="text-[9px] text-primary italic">{sub.detail}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
