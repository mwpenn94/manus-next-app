import { useState, useEffect, useRef } from "react";
import {
  Rocket,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Server,
  Globe,
  Shield,
  Zap,
  AlertTriangle,
  ExternalLink,
  RotateCcw,
  Terminal,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

type DeployStage = "queued" | "installing" | "building" | "optimizing" | "deploying" | "propagating" | "live" | "failed";

interface DeployStep {
  id: string;
  label: string;
  stage: DeployStage;
  icon: typeof Rocket;
  duration?: string;
  logs?: string[];
}

interface DeploymentStatusProps {
  deploymentId?: string;
  projectName?: string;
}

const DEPLOY_STEPS: DeployStep[] = [
  { id: "queue", label: "Queued", stage: "queued", icon: Clock, duration: "2s", logs: ["Deployment queued", "Waiting for available build slot..."] },
  { id: "install", label: "Installing Dependencies", stage: "installing", icon: Package, duration: "18s", logs: ["pnpm install --frozen-lockfile", "Packages: +847", "Progress: resolved 847, reused 845, downloaded 2, added 847, done"] },
  { id: "build", label: "Building Application", stage: "building", icon: Terminal, duration: "12s", logs: ["vite build", "transforming (423) src/...", "✓ 423 modules transformed", "dist/assets/index-a1b2c3.js   245.12 kB │ gzip: 78.34 kB", "dist/assets/index-d4e5f6.css  18.45 kB │ gzip: 4.21 kB", "✓ built in 11.2s"] },
  { id: "optimize", label: "Optimizing Assets", stage: "optimizing", icon: Zap, duration: "4s", logs: ["Compressing images...", "Minifying CSS...", "Tree-shaking unused code...", "Bundle size: 78.3 kB (gzipped)"] },
  { id: "deploy", label: "Deploying to Edge", stage: "deploying", icon: Server, duration: "6s", logs: ["Uploading to CDN...", "Configuring edge functions...", "Setting up SSL certificate...", "Configuring custom domain..."] },
  { id: "propagate", label: "DNS Propagation", stage: "propagating", icon: Globe, duration: "3s", logs: ["Propagating to 280+ edge locations...", "Health checks passing...", "All regions healthy"] },
  { id: "live", label: "Live", stage: "live", icon: CheckCircle2, duration: "-", logs: ["Deployment successful!", "URL: https://my-app.manus.space"] },
];

export default function WebAppDeploymentStatus({ projectName = "my-app" }: DeploymentStatusProps): React.JSX.Element {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isDeploying, setIsDeploying] = useState(true);
  const [showLogs, setShowLogs] = useState(true);
  const [allLogs, setAllLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isDeploying) return;
    intervalRef.current = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev >= DEPLOY_STEPS.length - 1) {
          setIsDeploying(false);
          if (intervalRef.current) clearInterval(intervalRef.current);
          return prev;
        }
        const nextStep = DEPLOY_STEPS[prev + 1];
        if (nextStep?.logs) {
          setAllLogs((logs) => [...logs, `\n--- ${nextStep.label} ---`, ...nextStep.logs!]);
        }
        return prev + 1;
      });
    }, 2500);
    // Add initial logs
    if (DEPLOY_STEPS[0]?.logs) {
      setAllLogs(["=== Deployment Started ===", ...DEPLOY_STEPS[0].logs]);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isDeploying]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allLogs]);

  const handleRestart = () => {
    setCurrentStepIndex(0);
    setIsDeploying(true);
    setAllLogs([]);
  };

  const overallProgress = Math.round(((currentStepIndex + 1) / DEPLOY_STEPS.length) * 100);
  const currentStep = DEPLOY_STEPS[currentStepIndex];
  const isComplete = currentStep?.stage === "live";
  const isFailed = currentStep?.stage === "failed";

  return (
    <div className="flex flex-col h-full bg-background text-foreground rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between px-5 py-4 border-b transition-colors",
        isComplete ? "bg-green-500/5 border-green-500/20" :
        isFailed ? "bg-red-500/5 border-red-500/20" :
        "bg-card/50 border-border"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center",
            isComplete ? "bg-green-500/10" :
            isFailed ? "bg-red-500/10" :
            "bg-primary/10"
          )}>
            {isComplete ? <CheckCircle2 className="w-5 h-5 text-green-500" /> :
             isFailed ? <XCircle className="w-5 h-5 text-red-500" /> :
             <Rocket className={cn("w-5 h-5 text-primary", isDeploying && "animate-pulse")} />}
          </div>
          <div>
            <h2 className="text-base font-semibold">
              {isComplete ? "Deployment Successful" :
               isFailed ? "Deployment Failed" :
               "Deploying..."}
            </h2>
            <p className="text-xs text-muted-foreground">{projectName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isComplete && (
            <a
              href="#"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
              onClick={(e: React.MouseEvent) => e.preventDefault()}
            >
              Visit Site <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {(isComplete || isFailed) && (
            <button
              onClick={handleRestart}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
              title="Redeploy"
            >
              <RotateCcw className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-5 py-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">{currentStep?.label}</span>
          <span className="text-xs font-medium">{overallProgress}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isComplete ? "bg-green-500" :
              isFailed ? "bg-red-500" :
              "bg-primary"
            )}
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-4">
          <div className="space-y-1">
            {DEPLOY_STEPS.map((step, idx) => {
              const isActive = idx === currentStepIndex;
              const isDone = idx < currentStepIndex || (isComplete && idx === currentStepIndex);
              const isPending = idx > currentStepIndex;

              return (
                <div key={step.id} className="flex items-start gap-3 py-2">
                  {/* Status indicator */}
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                      isDone ? "bg-green-500/10" :
                      isActive && !isFailed ? "bg-primary/10" :
                      isActive && isFailed ? "bg-red-500/10" :
                      "bg-muted"
                    )}>
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : isActive && !isFailed ? (
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      ) : isActive && isFailed ? (
                        <XCircle className="w-4 h-4 text-red-500" />
                      ) : (
                        <step.icon className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    {idx < DEPLOY_STEPS.length - 1 && (
                      <div className={cn(
                        "w-px h-6",
                        isDone ? "bg-green-500/30" : "bg-border"
                      )} />
                    )}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "text-sm font-medium",
                        isPending && "text-muted-foreground"
                      )}>
                        {step.label}
                      </span>
                      {isDone && step.duration && step.duration !== "-" && (
                        <span className="text-[10px] text-muted-foreground">{step.duration}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Build Logs */}
        {showLogs && (
          <div className="px-5 pb-4">
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2 hover:text-foreground transition-colors"
            >
              <Terminal className="w-3.5 h-3.5" />
              Build Logs
            </button>
            <div className="bg-[#0d1117] rounded-lg border border-border p-3 max-h-48 overflow-y-auto font-mono text-[11px] text-green-400/80">
              {allLogs.map((log, i) => (
                <div key={i} className={cn(
                  "py-0.5",
                  log.startsWith("===") && "text-blue-400 font-bold mt-1",
                  log.startsWith("---") && "text-yellow-400 mt-1",
                  log.startsWith("✓") && "text-green-400"
                )}>
                  {log}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border bg-card/30 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="w-3.5 h-3.5" />
          <span>SSL enabled</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Globe className="w-3.5 h-3.5" />
          <span>280+ edge locations</span>
        </div>
      </div>
    </div>
  );
}
