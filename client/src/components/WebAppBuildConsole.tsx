import { useState, useEffect, useRef, useCallback } from "react";
import {
  Terminal,
  Trash2,
  Copy,
  Search,
  ChevronDown,
  AlertTriangle,
  XCircle,
  Info,
  CheckCircle2,
  Pause,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

type LogLevel = "info" | "warn" | "error" | "success" | "debug";

interface LogEntry {
  id: number;
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
}

interface WebAppBuildConsoleProps {
  projectExternalId?: string;
}

function classifyLine(line: string): { level: LogLevel; source: string } {
  const lower = line.toLowerCase();
  if (lower.includes("error") || lower.includes("fail")) return { level: "error", source: "build" };
  if (lower.includes("warn")) return { level: "warn", source: "build" };
  if (lower.includes("✓") || lower.includes("success") || lower.includes("done")) return { level: "success", source: "build" };
  if (lower.includes("debug") || lower.includes("cache")) return { level: "debug", source: "build" };
  return { level: "info", source: "build" };
}

function getLevelIcon(level: LogLevel): React.JSX.Element {
  switch (level) {
    case "info": return <Info className="w-3 h-3 text-blue-400" />;
    case "warn": return <AlertTriangle className="w-3 h-3 text-amber-400" />;
    case "error": return <XCircle className="w-3 h-3 text-red-400" />;
    case "success": return <CheckCircle2 className="w-3 h-3 text-green-400" />;
    case "debug": return <Info className="w-3 h-3 text-muted-foreground" />;
  }
}

function getLevelColor(level: LogLevel): string {
  switch (level) {
    case "info": return "text-blue-300";
    case "warn": return "text-amber-300";
    case "error": return "text-red-300";
    case "success": return "text-green-300";
    case "debug": return "text-muted-foreground";
  }
}

export default function WebAppBuildConsole({ projectExternalId }: WebAppBuildConsoleProps): React.JSX.Element {
  const [selectedDeploymentId, setSelectedDeploymentId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<LogLevel | "all">("all");
  const [autoScroll, setAutoScroll] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const { data: deployments = [] } = trpc.webappProject.deployments.useQuery(
    { externalId: projectExternalId ?? "" },
    { enabled: !!projectExternalId }
  );

  const deploys = deployments as any[];

  useEffect(() => {
    if (deploys.length > 0 && !selectedDeploymentId) {
      setSelectedDeploymentId(deploys[0].id);
    }
  }, [deploys, selectedDeploymentId]);

  const { data: buildLog } = trpc.webappProject.getDeploymentLog.useQuery(
    { deploymentId: selectedDeploymentId! },
    { enabled: !!selectedDeploymentId, refetchInterval: 5_000 }
  );

  const rawText = typeof buildLog === "string" ? buildLog : buildLog ? JSON.stringify(buildLog, null, 2) : "";
  const logs: LogEntry[] = rawText.split("\n").filter(Boolean).map((line, i) => {
    const { level, source } = classifyLine(line);
    const tsMatch = line.match(/^\[?(\d{2}:\d{2}:\d{2})/);
    return { id: i, timestamp: tsMatch?.[1] ?? "", level, source, message: line };
  });

  useEffect(() => {
    if (autoScroll) logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    if (levelFilter !== "all" && log.level !== levelFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return log.message.toLowerCase().includes(q) || log.source.toLowerCase().includes(q);
    }
    return true;
  });

  const handleCopyAll = useCallback(() => {
    const text = filteredLogs.map((l) => l.message).join("\n");
    navigator.clipboard.writeText(text).catch(() => {});
  }, [filteredLogs]);

  const errorCount = logs.filter((l) => l.level === "error").length;
  const warnCount = logs.filter((l) => l.level === "warn").length;

  return (
    <div className="flex flex-col h-full bg-[#0d1117] text-gray-300 rounded-xl border border-border overflow-hidden font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-700/50 bg-[#161b22]">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-green-400" />
          <span className="text-xs font-medium text-gray-200">Build Console</span>
          {deploys.length > 0 && (
            <select
              value={selectedDeploymentId ?? ""}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedDeploymentId(Number(e.target.value))}
              className="text-[10px] bg-[#0d1117] border border-gray-700 rounded px-2 py-0.5 text-gray-300 focus:outline-none ml-2"
            >
              {deploys.map((d: any) => (
                <option key={d.id} value={d.id}>
                  #{d.id} — {d.commitMessage?.slice(0, 30) || d.status}
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-2 ml-3">
            {errorCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                <XCircle className="w-2.5 h-2.5" /> {errorCount}
              </span>
            )}
            {warnCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                <AlertTriangle className="w-2.5 h-2.5" /> {warnCount}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={cn("p-1.5 rounded transition-colors", showSearch ? "bg-gray-700 text-gray-200" : "text-gray-500 hover:text-gray-300")}
            title="Search"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleCopyAll} className="p-1.5 rounded text-gray-500 hover:text-gray-300 transition-colors" title="Copy all">
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      {showSearch && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-700/50 bg-[#161b22]">
          <Search className="w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            placeholder="Filter logs..."
            className="flex-1 bg-transparent text-xs text-gray-200 placeholder:text-gray-600 focus:outline-none"
            autoFocus
          />
          <div className="flex items-center gap-1 border-l border-gray-700/50 pl-2">
            {(["all", "info", "warn", "error", "success", "debug"] as const).map((level) => (
              <button
                key={level}
                onClick={() => setLevelFilter(level)}
                className={cn(
                  "px-1.5 py-0.5 text-[9px] rounded transition-colors capitalize",
                  levelFilter === level
                    ? level === "error" ? "bg-red-500/20 text-red-400" :
                      level === "warn" ? "bg-amber-500/20 text-amber-400" :
                      level === "success" ? "bg-green-500/20 text-green-400" :
                      "bg-gray-700 text-gray-200"
                    : "text-gray-600 hover:text-gray-400"
                )}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Log Output */}
      <div className="flex-1 overflow-y-auto px-4 py-2 text-[11px] leading-5">
        {!selectedDeploymentId && (
          <p className="text-gray-600 py-8 text-center">No deployment selected. Deploy your project to see build logs.</p>
        )}
        {filteredLogs.map((log) => (
          <div key={log.id} className="flex items-start gap-2 hover:bg-gray-800/30 px-1 -mx-1 rounded">
            <span className="text-gray-600 shrink-0 select-none w-6 text-right">{log.id + 1}</span>
            {getLevelIcon(log.level)}
            <span className={getLevelColor(log.level)}>{log.message}</span>
          </div>
        ))}
        <div ref={logEndRef} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-gray-700/50 bg-[#161b22] text-[10px] text-gray-600">
        <span>{filteredLogs.length} lines</span>
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className={cn("flex items-center gap-1 transition-colors", autoScroll ? "text-green-500" : "text-gray-600 hover:text-gray-400")}
        >
          <ChevronDown className="w-3 h-3" />
          Auto-scroll {autoScroll ? "on" : "off"}
        </button>
      </div>
    </div>
  );
}
