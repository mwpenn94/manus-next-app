/**
 * DataPipelinesPage — Data Operations & Pipeline Management
 *
 * Integrates the data operations taxonomy (ingestion, transformation,
 * enrichment, modeling) with the existing connector infrastructure.
 * Users can define data flows from connected sources, schedule
 * recurring ingestion, and monitor pipeline health.
 */
import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Database,
  ArrowRight,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  Filter,
  Zap,
  Layers,
  GitBranch,
  BarChart3,
  FileText,
  Globe,
  Upload,
  Download,
  Settings,
  ChevronRight,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Taxonomy Types ─── */
interface PipelineStep {
  id: string;
  type: "ingest" | "transform" | "enrich" | "model" | "store";
  label: string;
  config: Record<string, string>;
}

interface Pipeline {
  id: string;
  name: string;
  description: string;
  sourceConnector: string;
  steps: PipelineStep[];
  schedule: "manual" | "hourly" | "daily" | "weekly";
  status: "active" | "paused" | "error" | "draft";
  lastRunAt?: Date;
  nextRunAt?: Date;
  runCount: number;
  createdAt: Date;
}

/* ─── Taxonomy Categories ─── */
const OPERATION_CATEGORIES = [
  {
    id: "ingest",
    label: "Ingestion",
    icon: Download,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    description: "Bring data in from sources",
    operations: [
      { id: "batch", label: "One-Off Batch", description: "Standard execution for discrete tasks" },
      { id: "fan-out", label: "Wide Research Fan-Out", description: "Parallel sub-agents for large-scale gathering" },
      { id: "scheduled", label: "Scheduled/Cron", description: "Recurring tasks on a cadence" },
      { id: "event-driven", label: "Event-Driven", description: "Triggered by external events" },
    ],
  },
  {
    id: "transform",
    label: "Transformation",
    icon: RefreshCw,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    description: "Clean, normalize, and reshape",
    operations: [
      { id: "deduplicate", label: "Deduplication", description: "Remove duplicate records" },
      { id: "normalize", label: "Normalization", description: "Standardize formats and types" },
      { id: "aggregate", label: "Aggregation", description: "Roll-ups and summary metrics" },
      { id: "filter", label: "Filtering", description: "Remove irrelevant records" },
    ],
  },
  {
    id: "enrich",
    label: "Enrichment",
    icon: Zap,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    description: "Add context and intelligence",
    operations: [
      { id: "llm-scoring", label: "LLM Scoring", description: "AI-based propensity and quality scores" },
      { id: "geocoding", label: "Geocoding", description: "Convert addresses to coordinates" },
      { id: "lookup", label: "Third-Party Lookup", description: "Enrich from external APIs" },
      { id: "imputation", label: "Imputation", description: "Fill missing values intelligently" },
    ],
  },
  {
    id: "model",
    label: "Modeling",
    icon: BarChart3,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    description: "Analyze and predict",
    operations: [
      { id: "rule-scoring", label: "Rule-Based Scoring", description: "Priority tiering and likelihood" },
      { id: "statistics", label: "Statistical Analysis", description: "Summary stats and distributions" },
      { id: "forecasting", label: "Forecasting", description: "Predictive and trend models" },
      { id: "classification", label: "Classification", description: "Categorize records by attributes" },
    ],
  },
  {
    id: "store",
    label: "Storage",
    icon: Database,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    description: "Persist and deliver results",
    operations: [
      { id: "s3", label: "S3 Upload", description: "Store to cloud object storage" },
      { id: "database", label: "Database Write", description: "Insert into relational database" },
      { id: "file-export", label: "File Export", description: "Generate CSV, XLSX, or JSON" },
      { id: "webhook", label: "Webhook Delivery", description: "POST results to an endpoint" },
    ],
  },
];

/* ─── Demo Pipelines ─── */
const DEMO_PIPELINES: Pipeline[] = [
  {
    id: "p1",
    name: "Prospect Consolidation",
    description: "Ingest leads from CRM, deduplicate, enrich with LLM scoring, and store to database",
    sourceConnector: "hubspot",
    steps: [
      { id: "s1", type: "ingest", label: "Batch Import", config: { source: "hubspot" } },
      { id: "s2", type: "transform", label: "Deduplication", config: { key: "email" } },
      { id: "s3", type: "enrich", label: "LLM Scoring", config: { model: "propensity" } },
      { id: "s4", type: "store", label: "Database Write", config: { table: "leads" } },
    ],
    schedule: "daily",
    status: "active",
    lastRunAt: new Date(Date.now() - 3600000),
    nextRunAt: new Date(Date.now() + 82800000),
    runCount: 47,
    createdAt: new Date(Date.now() - 86400000 * 30),
  },
  {
    id: "p2",
    name: "Market Research Sync",
    description: "Weekly research fan-out across competitor sites, aggregate findings, export report",
    sourceConnector: "browser",
    steps: [
      { id: "s1", type: "ingest", label: "Wide Research", config: { targets: "5" } },
      { id: "s2", type: "transform", label: "Aggregation", config: { metrics: "pricing,features" } },
      { id: "s3", type: "model", label: "Trend Analysis", config: { window: "90d" } },
      { id: "s4", type: "store", label: "File Export", config: { format: "xlsx" } },
    ],
    schedule: "weekly",
    status: "active",
    lastRunAt: new Date(Date.now() - 86400000 * 3),
    nextRunAt: new Date(Date.now() + 86400000 * 4),
    runCount: 12,
    createdAt: new Date(Date.now() - 86400000 * 90),
  },
  {
    id: "p3",
    name: "Email Digest Pipeline",
    description: "Event-driven ingestion from Gmail, classify by topic, summarize, and notify",
    sourceConnector: "gmail",
    steps: [
      { id: "s1", type: "ingest", label: "Event Trigger", config: { event: "new_email" } },
      { id: "s2", type: "model", label: "Classification", config: { categories: "urgent,info,action" } },
      { id: "s3", type: "enrich", label: "AI Summary", config: {} },
      { id: "s4", type: "store", label: "Webhook", config: { url: "slack" } },
    ],
    schedule: "manual",
    status: "paused",
    runCount: 0,
    createdAt: new Date(Date.now() - 86400000 * 5),
  },
];

/* ─── Pipeline Status Badge ─── */
function StatusBadge({ status }: { status: Pipeline["status"] }) {
  const config = {
    active: { label: "Active", icon: CheckCircle2, className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
    paused: { label: "Paused", icon: Pause, className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
    error: { label: "Error", icon: AlertCircle, className: "bg-red-500/15 text-red-400 border-red-500/20" },
    draft: { label: "Draft", icon: FileText, className: "bg-muted text-muted-foreground border-border" },
  }[status];
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={cn("gap-1 text-[11px]", config.className)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}

/* ─── Pipeline Step Chip ─── */
function StepChip({ step }: { step: PipelineStep }) {
  const cat = OPERATION_CATEGORIES.find((c) => c.id === step.type);
  if (!cat) return null;
  const Icon = cat.icon;
  return (
    <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-border/50", cat.bgColor, cat.color)}>
      <Icon className="w-3 h-3" />
      {step.label}
    </div>
  );
}

/* ─── Pipeline Card ─── */
function PipelineCard({ pipeline, onSelect }: { pipeline: Pipeline; onSelect: () => void }) {
  return (
    <Card
      className="cursor-pointer hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all group"
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm font-semibold group-hover:text-primary transition-colors">
              {pipeline.name}
            </CardTitle>
            <CardDescription className="text-xs mt-1 line-clamp-2">
              {pipeline.description}
            </CardDescription>
          </div>
          <StatusBadge status={pipeline.status} />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Step flow visualization */}
        <div className="flex items-center gap-1 flex-wrap mb-3">
          {pipeline.steps.map((step, i) => (
            <div key={step.id} className="flex items-center gap-1">
              <StepChip step={step} />
              {i < pipeline.steps.length - 1 && (
                <ArrowRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
              )}
            </div>
          ))}
        </div>
        {/* Metadata row */}
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {pipeline.schedule === "manual" ? "Manual" : `Every ${pipeline.schedule}`}
          </span>
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3" />
            {pipeline.runCount} runs
          </span>
          {pipeline.lastRunAt && (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {formatTimeAgo(pipeline.lastRunAt)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Time Formatting ─── */
function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/* ─── Create Pipeline Dialog ─── */
function CreatePipelineDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [schedule, setSchedule] = useState("manual");
  const [steps, setSteps] = useState<{ type: string; operation: string }[]>([]);

  const addStep = (type: string, operation: string) => {
    setSteps((prev) => [...prev, { type, operation }]);
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Pipeline name is required");
      return;
    }
    if (steps.length === 0) {
      toast.error("Add at least one step to the pipeline");
      return;
    }
    toast.success(`Pipeline "${name}" created`);
    onOpenChange(false);
    setName("");
    setDescription("");
    setSchedule("manual");
    setSteps([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Data Pipeline</DialogTitle>
          <DialogDescription>
            Define a data flow from ingestion through transformation, enrichment, and storage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Pipeline Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Lead Enrichment Pipeline"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this pipeline do?"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Schedule</label>
            <Select value={schedule} onValueChange={setSchedule}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual (on-demand)</SelectItem>
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Pipeline Steps Builder */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Pipeline Steps</label>
            {steps.length > 0 && (
              <div className="space-y-2 mb-3">
                {steps.map((step, i) => {
                  const cat = OPERATION_CATEGORIES.find((c) => c.id === step.type);
                  const op = cat?.operations.find((o) => o.id === step.operation);
                  if (!cat || !op) return null;
                  const Icon = cat.icon;
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card"
                    >
                      <span className="text-xs text-muted-foreground w-5 text-center font-mono">
                        {i + 1}
                      </span>
                      <div className={cn("p-1.5 rounded", cat.bgColor)}>
                        <Icon className={cn("w-3.5 h-3.5", cat.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{op.label}</p>
                        <p className="text-[11px] text-muted-foreground">{cat.label}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStep(i)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Operation Picker */}
            <div className="grid grid-cols-1 gap-2">
              {OPERATION_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <div key={cat.id} className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Icon className={cn("w-3 h-3", cat.color)} />
                      {cat.label}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.operations.map((op) => (
                        <Button
                          key={op.id}
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => addStep(cat.id, op.id)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          {op.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>Create Pipeline</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main Page ─── */
export default function DataPipelinesPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("pipelines");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);

  const filteredPipelines = useMemo(() => {
    return DEMO_PIPELINES.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [searchQuery, statusFilter]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="max-w-sm">
          <CardContent className="pt-6 text-center">
            <Database className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Sign in to manage your data pipelines.
            </p>
            <Button onClick={() => (window.location.href = getLoginUrl())}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Data Pipelines
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Define, schedule, and monitor your data operations — from ingestion to storage.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="w-4 h-4" />
            New Pipeline
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="pipelines" className="gap-1.5">
              <GitBranch className="w-3.5 h-3.5" />
              Pipelines
            </TabsTrigger>
            <TabsTrigger value="taxonomy" className="gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Operations Taxonomy
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              Monitoring
            </TabsTrigger>
          </TabsList>

          {/* ─── Pipelines Tab ─── */}
          <TabsContent value="pipelines" className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search pipelines..."
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <Filter className="w-3.5 h-3.5 mr-1.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Pipeline Grid */}
            {filteredPipelines.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <GitBranch className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {searchQuery || statusFilter !== "all"
                      ? "No pipelines match your filters"
                      : "No pipelines yet"}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mb-4">
                    {searchQuery || statusFilter !== "all"
                      ? "Try adjusting your search or filter criteria."
                      : "Create your first data pipeline to automate data operations."}
                  </p>
                  {!searchQuery && statusFilter === "all" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCreateOpen(true)}
                      className="gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Create Pipeline
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredPipelines.map((pipeline) => (
                  <PipelineCard
                    key={pipeline.id}
                    pipeline={pipeline}
                    onSelect={() => setSelectedPipeline(pipeline)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ─── Taxonomy Tab ─── */}
          <TabsContent value="taxonomy" className="space-y-6">
            <p className="text-sm text-muted-foreground">
              The data operations taxonomy defines the building blocks for your pipelines.
              Each category represents a stage in the data lifecycle.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {OPERATION_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <Card key={cat.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className={cn("p-2 rounded-lg", cat.bgColor)}>
                          <Icon className={cn("w-4 h-4", cat.color)} />
                        </div>
                        <div>
                          <CardTitle className="text-sm">{cat.label}</CardTitle>
                          <CardDescription className="text-xs">{cat.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {cat.operations.map((op) => (
                          <div
                            key={op.id}
                            className="flex items-start gap-2 p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <ChevronRight className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs font-medium">{op.label}</p>
                              <p className="text-[10px] text-muted-foreground">{op.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ─── Monitoring Tab ─── */}
          <TabsContent value="monitoring" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: "Active Pipelines", value: "2", icon: Play, color: "text-emerald-400" },
                { label: "Total Runs (30d)", value: "59", icon: Activity, color: "text-blue-400" },
                { label: "Success Rate", value: "98.3%", icon: CheckCircle2, color: "text-emerald-400" },
                { label: "Avg Duration", value: "4.2m", icon: Clock, color: "text-amber-400" },
              ].map((metric) => {
                const Icon = metric.icon;
                return (
                  <Card key={metric.label}>
                    <CardContent className="pt-5 pb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                            {metric.label}
                          </p>
                          <p className="text-2xl font-bold mt-1">{metric.value}</p>
                        </div>
                        <Icon className={cn("w-5 h-5", metric.color)} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Recent Runs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Recent Pipeline Runs</CardTitle>
                <CardDescription className="text-xs">
                  Last 10 pipeline executions across all pipelines
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { pipeline: "Prospect Consolidation", status: "success", duration: "3m 12s", time: "1h ago", records: 234 },
                    { pipeline: "Market Research Sync", status: "success", duration: "8m 45s", time: "3d ago", records: 89 },
                    { pipeline: "Prospect Consolidation", status: "success", duration: "2m 58s", time: "1d ago", records: 198 },
                    { pipeline: "Prospect Consolidation", status: "error", duration: "0m 45s", time: "2d ago", records: 0 },
                    { pipeline: "Market Research Sync", status: "success", duration: "7m 22s", time: "10d ago", records: 76 },
                  ].map((run, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      {run.status === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{run.pipeline}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {run.records} records processed
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">{run.duration}</p>
                        <p className="text-[10px] text-muted-foreground/70">{run.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Pipeline Dialog */}
      <CreatePipelineDialog open={createOpen} onOpenChange={setCreateOpen} />

      {/* Pipeline Detail Dialog */}
      {selectedPipeline && (
        <Dialog open={!!selectedPipeline} onOpenChange={() => setSelectedPipeline(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <DialogTitle>{selectedPipeline.name}</DialogTitle>
                <StatusBadge status={selectedPipeline.status} />
              </div>
              <DialogDescription>{selectedPipeline.description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Pipeline Steps</p>
                <div className="space-y-2">
                  {selectedPipeline.steps.map((step, i) => (
                    <div key={step.id} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4 text-center font-mono">
                        {i + 1}
                      </span>
                      <StepChip step={step} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Schedule</p>
                  <p className="font-medium capitalize">{selectedPipeline.schedule}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Runs</p>
                  <p className="font-medium">{selectedPipeline.runCount}</p>
                </div>
                {selectedPipeline.lastRunAt && (
                  <div>
                    <p className="text-xs text-muted-foreground">Last Run</p>
                    <p className="font-medium">{formatTimeAgo(selectedPipeline.lastRunAt)}</p>
                  </div>
                )}
                {selectedPipeline.nextRunAt && (
                  <div>
                    <p className="text-xs text-muted-foreground">Next Run</p>
                    <p className="font-medium">
                      {new Date(selectedPipeline.nextRunAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedPipeline(null)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  toast.success(`Running "${selectedPipeline.name}"...`);
                  setSelectedPipeline(null);
                }}
                className="gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                Run Now
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
