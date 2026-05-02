import { useState, useMemo } from "react";
import {
  Database,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ArrowRight,
  Clock,
  Zap,
  BarChart3,
  Filter,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DataSource {
  id: string;
  name: string;
  type: "database" | "api" | "file" | "stream";
  status: "healthy" | "degraded" | "error" | "syncing";
  lastSync: string;
  recordsProcessed: number;
  latencyMs: number;
  errorRate: number;
  throughput: string;
}

interface PipelineStage {
  id: string;
  name: string;
  status: "active" | "idle" | "error";
  processedCount: number;
  avgLatencyMs: number;
}

interface IntegrationEvent {
  id: string;
  timestamp: string;
  source: string;
  type: "sync_complete" | "error" | "warning" | "schema_change";
  message: string;
}

const MOCK_SOURCES: DataSource[] = [
  { id: "ds1", name: "Primary Database", type: "database", status: "healthy", lastSync: "30s ago", recordsProcessed: 1247832, latencyMs: 12, errorRate: 0.001, throughput: "2.4K/s" },
  { id: "ds2", name: "Analytics API", type: "api", status: "healthy", lastSync: "1 min ago", recordsProcessed: 89421, latencyMs: 45, errorRate: 0.003, throughput: "890/s" },
  { id: "ds3", name: "Event Stream", type: "stream", status: "syncing", lastSync: "live", recordsProcessed: 5672103, latencyMs: 3, errorRate: 0.0001, throughput: "15.2K/s" },
  { id: "ds4", name: "File Import (CSV)", type: "file", status: "degraded", lastSync: "5 min ago", recordsProcessed: 34521, latencyMs: 230, errorRate: 0.02, throughput: "120/s" },
  { id: "ds5", name: "External Partner API", type: "api", status: "error", lastSync: "15 min ago", recordsProcessed: 0, latencyMs: 0, errorRate: 1.0, throughput: "0/s" },
  { id: "ds6", name: "User Activity Stream", type: "stream", status: "healthy", lastSync: "live", recordsProcessed: 892341, latencyMs: 8, errorRate: 0.002, throughput: "4.1K/s" },
];

const MOCK_PIPELINE: PipelineStage[] = [
  { id: "ps1", name: "Ingestion", status: "active", processedCount: 7936218, avgLatencyMs: 5 },
  { id: "ps2", name: "Validation", status: "active", processedCount: 7934102, avgLatencyMs: 12 },
  { id: "ps3", name: "Transform", status: "active", processedCount: 7930891, avgLatencyMs: 28 },
  { id: "ps4", name: "Enrichment", status: "active", processedCount: 7928450, avgLatencyMs: 45 },
  { id: "ps5", name: "Load", status: "active", processedCount: 7925200, avgLatencyMs: 18 },
];

const MOCK_EVENTS: IntegrationEvent[] = [
  { id: "ie1", timestamp: "2 min ago", source: "Event Stream", type: "sync_complete", message: "Batch sync completed: 15,234 records processed" },
  { id: "ie2", timestamp: "5 min ago", source: "File Import", type: "warning", message: "High latency detected: 230ms avg (threshold: 100ms)" },
  { id: "ie3", timestamp: "15 min ago", source: "External Partner API", type: "error", message: "Connection timeout after 30s — retrying in 60s" },
  { id: "ie4", timestamp: "1 hour ago", source: "Primary Database", type: "schema_change", message: "New column 'metadata_v2' detected in users table" },
  { id: "ie5", timestamp: "2 hours ago", source: "Analytics API", type: "sync_complete", message: "Full resync completed: 89,421 records verified" },
];

type FilterStatus = "all" | "healthy" | "degraded" | "error";

export default function DataIntegrationMonitor(): React.JSX.Element {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  const filteredSources = useMemo(() => {
    if (filterStatus === "all") return MOCK_SOURCES;
    return MOCK_SOURCES.filter((s) => s.status === filterStatus);
  }, [filterStatus]);

  const healthSummary = useMemo(() => {
    const healthy = MOCK_SOURCES.filter((s) => s.status === "healthy").length;
    const degraded = MOCK_SOURCES.filter((s) => s.status === "degraded").length;
    const errors = MOCK_SOURCES.filter((s) => s.status === "error").length;
    const syncing = MOCK_SOURCES.filter((s) => s.status === "syncing").length;
    return { healthy, degraded, errors, syncing, total: MOCK_SOURCES.length };
  }, []);

  const totalThroughput = useMemo(() => {
    return MOCK_SOURCES.reduce((sum, s) => {
      const match = s.throughput.match(/([\d.]+)K?/);
      if (!match) return sum;
      const val = parseFloat(match[1]);
      return sum + (s.throughput.includes("K") ? val * 1000 : val);
    }, 0);
  }, []);

  const getStatusIcon = (status: string): React.JSX.Element => {
    switch (status) {
      case "healthy":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "degraded":
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "syncing":
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "healthy":
        return "bg-green-500/10 border-green-500/20";
      case "degraded":
        return "bg-amber-500/10 border-amber-500/20";
      case "error":
        return "bg-red-500/10 border-red-500/20";
      case "syncing":
        return "bg-blue-500/10 border-blue-500/20";
      default:
        return "bg-muted border-border";
    }
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Database className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Data Integration Monitor</h2>
            <p className="text-xs text-muted-foreground">
              Real-time pipeline health and data flow tracking
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {(totalThroughput / 1000).toFixed(1)}K records/s total
          </span>
          <Zap className="w-4 h-4 text-primary" />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3 px-5 py-4 border-b border-border">
        <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <span className="text-[10px] text-muted-foreground">Healthy</span>
          </div>
          <p className="text-lg font-semibold text-green-500">{healthSummary.healthy}</p>
        </div>
        <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[10px] text-muted-foreground">Syncing</span>
          </div>
          <p className="text-lg font-semibold text-blue-500">{healthSummary.syncing}</p>
        </div>
        <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[10px] text-muted-foreground">Degraded</span>
          </div>
          <p className="text-lg font-semibold text-amber-500">{healthSummary.degraded}</p>
        </div>
        <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <XCircle className="w-3.5 h-3.5 text-red-500" />
            <span className="text-[10px] text-muted-foreground">Errors</span>
          </div>
          <p className="text-lg font-semibold text-red-500">{healthSummary.errors}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Pipeline Visualization */}
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-muted-foreground" />
            Pipeline Stages
          </h3>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {MOCK_PIPELINE.map((stage, idx) => (
              <div key={stage.id} className="flex items-center">
                <div className={cn(
                  "px-3 py-2 rounded-lg border text-center min-w-[100px]",
                  stage.status === "active" ? "bg-primary/5 border-primary/20" : "bg-muted border-border"
                )}>
                  <p className="text-xs font-medium">{stage.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {stage.avgLatencyMs}ms avg
                  </p>
                </div>
                {idx < MOCK_PIPELINE.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-muted-foreground mx-1 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Data Sources */}
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Database className="w-4 h-4 text-muted-foreground" />
              Data Sources
            </h3>
            <div className="flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              {(["all", "healthy", "degraded", "error"] as FilterStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={cn(
                    "px-2 py-1 text-[10px] rounded-md transition-colors capitalize",
                    filterStatus === status
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {filteredSources.map((source) => (
              <button
                key={source.id}
                onClick={() => setSelectedSource(selectedSource === source.id ? null : source.id)}
                className={cn(
                  "w-full text-left p-3 rounded-lg border transition-all",
                  getStatusColor(source.status),
                  selectedSource === source.id && "ring-1 ring-primary/30"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(source.status)}
                    <span className="text-sm font-medium">{source.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {source.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {source.lastSync}
                    </span>
                    <span>{source.throughput}</span>
                  </div>
                </div>
                {selectedSource === source.id && (
                  <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Records Processed</p>
                      <p className="text-sm font-medium">{source.recordsProcessed.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Latency</p>
                      <p className="text-sm font-medium">{source.latencyMs}ms</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Error Rate</p>
                      <p className="text-sm font-medium">{(source.errorRate * 100).toFixed(2)}%</p>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Recent Events */}
        <div className="px-5 py-4">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            Recent Events
          </h3>
          <div className="space-y-2">
            {MOCK_EVENTS.map((event) => (
              <div key={event.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-card border border-border">
                <div className={cn(
                  "w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5",
                  event.type === "sync_complete" && "bg-green-500/10",
                  event.type === "error" && "bg-red-500/10",
                  event.type === "warning" && "bg-amber-500/10",
                  event.type === "schema_change" && "bg-purple-500/10"
                )}>
                  {event.type === "sync_complete" && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                  {event.type === "error" && <XCircle className="w-3.5 h-3.5 text-red-500" />}
                  {event.type === "warning" && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                  {event.type === "schema_change" && <Database className="w-3.5 h-3.5 text-purple-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs">{event.message}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                    <span>{event.source}</span>
                    <span>•</span>
                    <span>{event.timestamp}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
