import { useState, useEffect, useRef, useCallback } from "react";
import {
  Terminal,
  Trash2,
  Download,
  Copy,
  Search,
  Filter,
  ChevronDown,
  AlertTriangle,
  XCircle,
  Info,
  CheckCircle2,
  Pause,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";

type LogLevel = "info" | "warn" | "error" | "success" | "debug";

interface LogEntry {
  id: number;
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
}

const MOCK_LOGS: LogEntry[] = [
  { id: 1, timestamp: "20:31:02", level: "info", source: "vite", message: "Dev server running at http://localhost:3000/" },
  { id: 2, timestamp: "20:31:02", level: "info", source: "vite", message: "Network: http://192.168.1.100:3000/" },
  { id: 3, timestamp: "20:31:03", level: "success", source: "vite", message: "ready in 342ms" },
  { id: 4, timestamp: "20:31:05", level: "info", source: "hmr", message: "[vite] connected." },
  { id: 5, timestamp: "20:31:12", level: "info", source: "hmr", message: "src/App.tsx updated" },
  { id: 6, timestamp: "20:31:12", level: "debug", source: "hmr", message: "1 module(s) updated, 0 full reload(s)" },
  { id: 7, timestamp: "20:31:18", level: "warn", source: "react", message: "Warning: Each child in a list should have a unique \"key\" prop." },
  { id: 8, timestamp: "20:31:22", level: "info", source: "api", message: "GET /api/trpc/auth.me 200 12ms" },
  { id: 9, timestamp: "20:31:23", level: "info", source: "api", message: "GET /api/trpc/tasks.list 200 45ms" },
  { id: 10, timestamp: "20:31:25", level: "error", source: "api", message: "POST /api/trpc/tasks.create 500 Internal Server Error" },
  { id: 11, timestamp: "20:31:25", level: "error", source: "server", message: "Error: UNIQUE constraint failed: tasks.externalId" },
  { id: 12, timestamp: "20:31:30", level: "info", source: "hmr", message: "src/pages/Home.tsx updated" },
  { id: 13, timestamp: "20:31:30", level: "success", source: "hmr", message: "page reload performed" },
  { id: 14, timestamp: "20:31:35", level: "info", source: "api", message: "GET /api/trpc/tasks.list 200 38ms" },
  { id: 15, timestamp: "20:31:40", level: "info", source: "build", message: "Building for production..." },
  { id: 16, timestamp: "20:31:42", level: "info", source: "build", message: "transforming (423) src/..." },
  { id: 17, timestamp: "20:31:48", level: "success", source: "build", message: "✓ 423 modules transformed" },
  { id: 18, timestamp: "20:31:48", level: "info", source: "build", message: "dist/assets/index-a1b2c3.js   245.12 kB │ gzip: 78.34 kB" },
  { id: 19, timestamp: "20:31:48", level: "info", source: "build", message: "dist/assets/index-d4e5f6.css  18.45 kB │ gzip: 4.21 kB" },
  { id: 20, timestamp: "20:31:49", level: "success", source: "build", message: "✓ built in 9.2s" },
];

function getLevelIcon(level: LogLevel): React.JSX.Element {
  switch (level) {
    case "info":
      return <Info className="w-3 h-3 text-blue-400" />;
    case "warn":
      return <AlertTriangle className="w-3 h-3 text-amber-400" />;
    case "error":
      return <XCircle className="w-3 h-3 text-red-400" />;
    case "success":
      return <CheckCircle2 className="w-3 h-3 text-green-400" />;
    case "debug":
      return <Info className="w-3 h-3 text-muted-foreground" />;
  }
}

function getLevelColor(level: LogLevel): string {
  switch (level) {
    case "info":
      return "text-blue-300";
    case "warn":
      return "text-amber-300";
    case "error":
      return "text-red-300";
    case "success":
      return "text-green-300";
    case "debug":
      return "text-muted-foreground";
  }
}

export default function WebAppBuildConsole(): React.JSX.Element {
  const [logs, setLogs] = useState<LogEntry[]>(MOCK_LOGS);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<LogLevel | "all">("all");
  const [autoScroll, setAutoScroll] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const nextIdRef = useRef(MOCK_LOGS.length + 1);

  // Simulate incoming logs
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      const sources = ["api", "hmr", "vite", "server", "build"];
      const levels: LogLevel[] = ["info", "info", "info", "warn", "debug"];
      const messages = [
        "GET /api/trpc/tasks.list 200 42ms",
        "src/components/Card.tsx updated",
        "1 module(s) updated",
        "Unused CSS selector detected",
        "Cache hit for module graph",
      ];
      const idx = Math.floor(Math.random() * messages.length);
      const now = new Date();
      const ts = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
      setLogs((prev) => [
        ...prev.slice(-200),
        {
          id: nextIdRef.current++,
          timestamp: ts,
          level: levels[idx],
          source: sources[idx],
          message: messages[idx],
        },
      ]);
    }, 3000);
    return () => clearInterval(interval);
  }, [isPaused]);

  useEffect(() => {
    if (autoScroll) {
      logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    if (levelFilter !== "all" && log.level !== levelFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return log.message.toLowerCase().includes(q) || log.source.toLowerCase().includes(q);
    }
    return true;
  });

  const handleClear = useCallback(() => setLogs([]), []);

  const handleCopyAll = useCallback(() => {
    const text = filteredLogs.map((l) => `[${l.timestamp}] [${l.level}] [${l.source}] ${l.message}`).join("\n");
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
          <div className="flex items-center gap-2 ml-3">
            {errorCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                <XCircle className="w-2.5 h-2.5" />
                {errorCount}
              </span>
            )}
            {warnCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                <AlertTriangle className="w-2.5 h-2.5" />
                {warnCount}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={cn(
              "p-1.5 rounded transition-colors",
              showSearch ? "bg-gray-700 text-gray-200" : "text-gray-500 hover:text-gray-300"
            )}
            title="Search"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-1.5 rounded text-gray-500 hover:text-gray-300 transition-colors"
            title={isPaused ? "Resume" : "Pause"}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleCopyAll}
            className="p-1.5 rounded text-gray-500 hover:text-gray-300 transition-colors"
            title="Copy all"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleClear}
            className="p-1.5 rounded text-gray-500 hover:text-gray-300 transition-colors"
            title="Clear"
          >
            <Trash2 className="w-3.5 h-3.5" />
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
        {filteredLogs.map((log) => (
          <div key={log.id} className="flex items-start gap-2 hover:bg-gray-800/30 px-1 -mx-1 rounded">
            <span className="text-gray-600 shrink-0 select-none">{log.timestamp}</span>
            {getLevelIcon(log.level)}
            <span className="text-gray-500 shrink-0 w-12 truncate">[{log.source}]</span>
            <span className={getLevelColor(log.level)}>{log.message}</span>
          </div>
        ))}
        <div ref={logEndRef} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-gray-700/50 bg-[#161b22] text-[10px] text-gray-600">
        <span>{filteredLogs.length} lines{isPaused ? " (paused)" : ""}</span>
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className={cn(
            "flex items-center gap-1 transition-colors",
            autoScroll ? "text-green-500" : "text-gray-600 hover:text-gray-400"
          )}
        >
          <ChevronDown className="w-3 h-3" />
          Auto-scroll {autoScroll ? "on" : "off"}
        </button>
      </div>
    </div>
  );
}
