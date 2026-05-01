/**
 * DataPipelinesPage — Data Operations & Pipeline Management
 *
 * Integrates the exhaustive data operations taxonomy from the Manus
 * Data Operations Reference:
 *   - 5 source classes (SaaS API, File Upload, Web Scrape, Database, Manual)
 *   - 4 ingestion modes (batch, fan-out, scheduled, event-driven)
 *   - 3 pipeline topologies (linear, fan-out/fan-in, recursive convergence)
 *   - 5 operation categories (ingest, transform, enrich, model, store)
 *   - 3 storage tiers (sandbox, share page, external persistence)
 *   - 4 runbook templates (one-off, daily ingestion, recursive convergence, bulk-sync)
 *   - Governance plane (inclusion/exclusion, convergence rules, access control)
 */
import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
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
  ChevronRight,
  Activity,
  Copy,
  BookOpen,
  Shield,
  Network,
  HardDrive,
  Share2,
  CloudUpload,
  FileUp,
  MousePointerClick,
  Repeat,
  ArrowDownUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════
   §1  TAXONOMY TYPES
   ═══════════════════════════════════════════════════════ */

interface PipelineStep {
  id: string;
  type: "ingest" | "transform" | "enrich" | "model" | "store";
  label: string;
  config: Record<string, string>;
}

type PipelineTopology = "linear" | "fan-out-fan-in" | "recursive-convergence";

interface Pipeline {
  id: string;
  name: string;
  description: string;
  topology: PipelineTopology;
  sourceClass: string;
  steps: PipelineStep[];
  schedule: "manual" | "hourly" | "daily" | "weekly";
  status: "active" | "paused" | "error" | "draft";
  storageTier: "sandbox" | "share" | "external";
  convergenceRule?: string;
  lastRunAt?: Date;
  nextRunAt?: Date;
  runCount: number;
  createdAt: Date;
}

/* ═══════════════════════════════════════════════════════
   §2  SOURCE CLASSES (from §3 of the reference)
   ═══════════════════════════════════════════════════════ */
const SOURCE_CLASSES = [
  { id: "saas-api", label: "SaaS API", icon: Globe, description: "GoHighLevel, Stripe, GitHub, Notion, Google Workspace" },
  { id: "file-upload", label: "File Upload", icon: FileUp, description: "CSV, XLSX, PDF, JSON, ZIP archives" },
  { id: "web-scrape", label: "Web Scrape", icon: MousePointerClick, description: "Browser-based extraction from public websites" },
  { id: "database", label: "Database", icon: Database, description: "PostgreSQL, MySQL, SQLite via connection string" },
  { id: "manual", label: "Manual Entry", icon: FileText, description: "User-provided text, structured prompts, clipboard" },
];

/* ═══════════════════════════════════════════════════════
   §3  PIPELINE TOPOLOGIES (from §6 of the reference)
   ═══════════════════════════════════════════════════════ */
const TOPOLOGIES: {
  id: PipelineTopology;
  label: string;
  icon: typeof Network;
  description: string;
  useCase: string;
}[] = [
  {
    id: "linear",
    label: "Linear",
    icon: ArrowRight,
    description: "Sequential steps: ingest → transform → enrich → store",
    useCase: "Standard ETL, single-source batch jobs, daily syncs",
  },
  {
    id: "fan-out-fan-in",
    label: "Fan-Out / Fan-In",
    icon: Network,
    description: "Parallel sub-agents fan out across N entities, reconcile at fan-in",
    useCase: "Wide research (100+ entities), bulk enrichment, competitor analysis",
  },
  {
    id: "recursive-convergence",
    label: "Recursive Convergence",
    icon: Repeat,
    description: "Multi-pass optimization until convergence guard fires (2-3 consecutive no-change passes)",
    useCase: "Document optimization, quality scoring, iterative data cleaning",
  },
];

/* ═══════════════════════════════════════════════════════
   §4  STORAGE TIERS (from §7 of the reference)
   ═══════════════════════════════════════════════════════ */
const STORAGE_TIERS = [
  {
    id: "sandbox",
    label: "Tier 1: Sandbox",
    icon: HardDrive,
    description: "Local filesystem in the sandbox VM. Ephemeral — wiped after session ends.",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
  },
  {
    id: "share",
    label: "Tier 2: Share Page",
    icon: Share2,
    description: "Manus share page with public URL. Persists beyond session but not version-controlled.",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "external",
    label: "Tier 3: External Persistence",
    icon: CloudUpload,
    description: "S3, GitHub repo, or external database. Version-controlled, backup-ready, production-grade.",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
];

/* ═══════════════════════════════════════════════════════
   §5  OPERATION CATEGORIES (from §4-5 of the reference)
   ═══════════════════════════════════════════════════════ */
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
      { id: "event-driven", label: "Event-Driven", description: "Triggered by external events or webhooks" },
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
      { id: "deduplicate", label: "Deduplication", description: "Remove duplicate records by key" },
      { id: "normalize", label: "Normalization", description: "Standardize formats, types, and units" },
      { id: "aggregate", label: "Aggregation", description: "Roll-ups, summary metrics, and distributions" },
      { id: "filter", label: "Filtering", description: "Include/exclude based on rules" },
      { id: "delta-detect", label: "Delta Detection", description: "Diff against previous snapshot to find changes" },
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
      { id: "imputation", label: "Imputation", description: "Fill missing values via statistical or LLM methods" },
      { id: "sentiment", label: "Sentiment Analysis", description: "Classify text polarity and emotion" },
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
      { id: "rule-scoring", label: "Rule-Based Scoring", description: "Priority tiering and weighted rubrics" },
      { id: "statistics", label: "Statistical Analysis", description: "Summary stats, distributions, and correlations" },
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
      { id: "s3", label: "S3 Upload", description: "Store to cloud object storage (Tier 3)" },
      { id: "database", label: "Database Write", description: "Insert into relational database" },
      { id: "file-export", label: "File Export", description: "Generate CSV, XLSX, or JSON" },
      { id: "webhook", label: "Webhook Delivery", description: "POST results to an endpoint" },
      { id: "github-commit", label: "GitHub Commit", description: "Commit artifacts to a repository" },
    ],
  },
];

/* ═══════════════════════════════════════════════════════
   §6  RUNBOOK TEMPLATES (from §13 of the reference)
   ═══════════════════════════════════════════════════════ */
const RUNBOOK_TEMPLATES = [
  {
    id: "one-off-fanout",
    label: "One-Off Fan-Out Research",
    topology: "fan-out-fan-in" as PipelineTopology,
    description: "Conduct a Wide-Research run on N entities, reconcile to a single workbook, upload to S3.",
    prompt: `Conduct a Wide-Research run on the following N entities: <list>. For each entity, retrieve <fields>. Reconcile to a single XLSX with one sheet per category and a summary tab with counts and distributions. Save the workbook to the share page and upload a copy to S3 via manus-upload-file, then return the public URL.`,
    steps: ["fan-out", "aggregate", "llm-scoring", "file-export", "s3"],
  },
  {
    id: "daily-ingestion",
    label: "Daily Scheduled Ingestion",
    topology: "linear" as PipelineTopology,
    description: "Scheduled daily fetch with delta detection, GitHub commit, and in-app notification.",
    prompt: `Schedule a daily run at 06:00 my timezone that fetches <source> via <API/scrape>, lands the snapshot to /home/ubuntu/data/<dataset>/YYYY-MM-DD.csv, computes the delta against yesterday, commits the snapshot and a CHANGES.md summary to the <repo> GitHub repo, and posts the summary to me in-app. If the delta is empty for two consecutive days, increment the convergence counter; if it reaches three, send a 'quiet' notification instead of a 'no-change' one.`,
    steps: ["scheduled", "delta-detect", "normalize", "github-commit"],
  },
  {
    id: "recursive-convergence",
    label: "Recursive Document Convergence",
    topology: "recursive-convergence" as PipelineTopology,
    description: "Multi-pass optimization (landscape → depth → adversarial → synthesis) until convergence.",
    prompt: `Take the attached document and run a multi-pass optimization (landscape → depth → adversarial → synthesis). After each pass, write the output to /home/ubuntu/passN_output.md and update /home/ubuntu/ledger.json with the score and delta. Stop when two consecutive passes produce no actionable change, then convert the converged Markdown back to DOCX and deliver.`,
    steps: ["batch", "llm-scoring", "filter", "file-export"],
  },
  {
    id: "bulk-sync-recovery",
    label: "Bulk-Sync Recovery Monitor",
    topology: "linear" as PipelineTopology,
    description: "Monitor a sync script, auto-restart on stall, maintain audit log, notify on completion.",
    prompt: `Monitor <sync script> running against <SaaS>. Every 10 minutes, check progress (processed/total/created/updated/failed). If processed is unchanged for 30 minutes, restart the sync from the last successful cursor. If the auth token has expired, pause and request a fresh token from me. Maintain a sync_log.txt with timestamps and status, and notify me on completion or after 3 consecutive restart attempts.`,
    steps: ["event-driven", "filter", "webhook"],
  },
];

/* ═══════════════════════════════════════════════════════
   §7  DEMO PIPELINES
   ═══════════════════════════════════════════════════════ */
const DEMO_PIPELINES: Pipeline[] = [
  {
    id: "p1",
    name: "Prospect Consolidation",
    description: "Ingest leads from CRM, deduplicate, enrich with LLM scoring, and store to database",
    topology: "linear",
    sourceClass: "saas-api",
    steps: [
      { id: "s1", type: "ingest", label: "Batch Import", config: { source: "hubspot" } },
      { id: "s2", type: "transform", label: "Deduplication", config: { key: "email" } },
      { id: "s3", type: "enrich", label: "LLM Scoring", config: { model: "propensity" } },
      { id: "s4", type: "store", label: "Database Write", config: { table: "leads" } },
    ],
    schedule: "daily",
    status: "active",
    storageTier: "external",
    lastRunAt: new Date(Date.now() - 3600000),
    nextRunAt: new Date(Date.now() + 82800000),
    runCount: 47,
    createdAt: new Date(Date.now() - 86400000 * 30),
  },
  {
    id: "p2",
    name: "Market Research Sync",
    description: "Weekly fan-out across competitor sites, aggregate findings, export report to S3",
    topology: "fan-out-fan-in",
    sourceClass: "web-scrape",
    steps: [
      { id: "s1", type: "ingest", label: "Wide Research", config: { targets: "5" } },
      { id: "s2", type: "transform", label: "Aggregation", config: { metrics: "pricing,features" } },
      { id: "s3", type: "model", label: "Trend Analysis", config: { window: "90d" } },
      { id: "s4", type: "store", label: "S3 Upload", config: { format: "xlsx" } },
    ],
    schedule: "weekly",
    status: "active",
    storageTier: "external",
    lastRunAt: new Date(Date.now() - 86400000 * 3),
    nextRunAt: new Date(Date.now() + 86400000 * 4),
    runCount: 12,
    createdAt: new Date(Date.now() - 86400000 * 90),
  },
  {
    id: "p3",
    name: "Document Optimization Loop",
    description: "Recursive convergence on a working document — landscape, depth, adversarial, synthesis passes",
    topology: "recursive-convergence",
    sourceClass: "file-upload",
    steps: [
      { id: "s1", type: "ingest", label: "File Import", config: { format: "md" } },
      { id: "s2", type: "enrich", label: "LLM Multi-Pass", config: {} },
      { id: "s3", type: "model", label: "Convergence Check", config: { threshold: "2" } },
      { id: "s4", type: "store", label: "File Export", config: { format: "docx" } },
    ],
    schedule: "manual",
    status: "paused",
    storageTier: "share",
    convergenceRule: "Stop when 2 consecutive passes produce no actionable change",
    runCount: 3,
    createdAt: new Date(Date.now() - 86400000 * 5),
  },
];

/* ═══════════════════════════════════════════════════════
   §8  HELPER COMPONENTS
   ═══════════════════════════════════════════════════════ */

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

function TopologyBadge({ topology }: { topology: PipelineTopology }) {
  const config = {
    "linear": { label: "Linear", icon: ArrowRight, className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    "fan-out-fan-in": { label: "Fan-Out", icon: Network, className: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
    "recursive-convergence": { label: "Recursive", icon: Repeat, className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  }[topology];
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={cn("gap-1 text-[11px]", config.className)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}

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

/* ═══════════════════════════════════════════════════════
   §9  PIPELINE CARD
   ═══════════════════════════════════════════════════════ */
function PipelineCard({ pipeline, onSelect }: { pipeline: Pipeline; onSelect: () => void }) {
  const source = SOURCE_CLASSES.find((s) => s.id === pipeline.sourceClass);
  const SourceIcon = source?.icon ?? Globe;
  return (
    <Card
      className="cursor-pointer hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all group"
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm font-semibold group-hover:text-primary transition-colors">
              {pipeline.name}
            </CardTitle>
            <CardDescription className="text-xs mt-1 line-clamp-2">
              {pipeline.description}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <StatusBadge status={pipeline.status} />
            <TopologyBadge topology={pipeline.topology} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Step flow */}
        <div className="flex items-center gap-1 flex-wrap mb-3">
          {pipeline.steps.map((step, i) => (
            <div key={step.id} className="flex items-center gap-1">
              <StepChip step={step} />
              {i < pipeline.steps.length - 1 && (
                <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
              )}
            </div>
          ))}
        </div>
        {/* Metadata */}
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <SourceIcon className="w-3 h-3" />
            {source?.label ?? "Unknown"}
          </span>
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

/* ═══════════════════════════════════════════════════════
   §10  CREATE PIPELINE DIALOG
   ═══════════════════════════════════════════════════════ */
function CreatePipelineDialog({
  open,
  onOpenChange,
  initialRunbook,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRunbook?: typeof RUNBOOK_TEMPLATES[number] | null;
}) {
  const [name, setName] = useState(initialRunbook?.label ?? "");
  const [description, setDescription] = useState(initialRunbook?.description ?? "");
  const [topology, setTopology] = useState<PipelineTopology>(initialRunbook?.topology ?? "linear");
  const [sourceClass, setSourceClass] = useState("saas-api");
  const [schedule, setSchedule] = useState("manual");
  const [storageTier, setStorageTier] = useState("external");
  const [steps, setSteps] = useState<{ type: string; operation: string }[]>(
    initialRunbook?.steps.map((s) => {
      for (const cat of OPERATION_CATEGORIES) {
        const op = cat.operations.find((o) => o.id === s);
        if (op) return { type: cat.id, operation: op.id };
      }
      return { type: "ingest", operation: s };
    }) ?? []
  );

  const addStep = (type: string, operation: string) => {
    setSteps((prev) => [...prev, { type, operation }]);
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const utils = trpc.useUtils();
  const createMutation = trpc.pipeline.create.useMutation({
    onSuccess: () => {
      utils.pipeline.list.invalidate();
      toast.success(`Pipeline "${name}" created`);
      onOpenChange(false);
      setName("");
      setDescription("");
      setTopology("linear");
      setSchedule("manual");
      setSteps([]);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create pipeline");
    },
  });

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Pipeline name is required");
      return;
    }
    if (steps.length === 0) {
      toast.error("Add at least one step to the pipeline");
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      description: description || undefined,
      pipelineType: topology,
      sourceConfig: { sourceClass },
      transformSteps: steps.map((s) => ({
        name: s.operation,
        type: s.type,
      })),
      schedule: schedule === "manual" ? undefined : schedule,
      accessTier: storageTier,
    });
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Pipeline Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Lead Enrichment Pipeline"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Source Class</label>
              <Select value={sourceClass} onValueChange={setSourceClass}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_CLASSES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Topology</label>
              <Select value={topology} onValueChange={(v) => setTopology(v as PipelineTopology)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TOPOLOGIES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Schedule</label>
              <Select value={schedule} onValueChange={setSchedule}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Storage Tier</label>
              <Select value={storageTier} onValueChange={setStorageTier}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox (Tier 1)</SelectItem>
                  <SelectItem value="share">Share Page (Tier 2)</SelectItem>
                  <SelectItem value="external">External (Tier 3)</SelectItem>
                </SelectContent>
              </Select>
            </div>
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

/* ═══════════════════════════════════════════════════════
   §10b  RUN PIPELINE BUTTON
   ═══════════════════════════════════════════════════════ */
function RunPipelineButton({ pipeline, onDone }: { pipeline: Pipeline; onDone: () => void }) {
  const utils = trpc.useUtils();
  const startRun = trpc.pipeline.startRun.useMutation({
    onSuccess: () => {
      utils.pipeline.list.invalidate();
      toast.success(`Pipeline "${pipeline.name}" started`);
      onDone();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to start pipeline");
    },
  });

  return (
    <Button
      onClick={() => {
        // DEMO_PIPELINES have string IDs; DB pipelines have numeric IDs
        const numId = Number(pipeline.id);
        if (isNaN(numId)) {
          toast.success(`Running "${pipeline.name}"...`);
          onDone();
          return;
        }
        startRun.mutate({ pipelineId: numId });
      }}
      disabled={startRun.isPending}
      className="gap-1.5"
    >
      {startRun.isPending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Play className="w-3.5 h-3.5" />
      )}
      Run Now
    </Button>
  );
}

/* ═══════════════════════════════════════════════════════
   §11  MAIN PAGE
   ═══════════════════════════════════════════════════════ */
export default function DataPipelinesPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("pipelines");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [selectedRunbook, setSelectedRunbook] = useState<typeof RUNBOOK_TEMPLATES[number] | null>(null);

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
            <Button size="lg" className="min-h-[44px] px-8" onClick={() => (window.location.href = getLoginUrl())}>Sign In</Button>
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
          <Button onClick={() => { setSelectedRunbook(null); setCreateOpen(true); }} className="gap-1.5">
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
            <TabsTrigger value="runbooks" className="gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Runbooks
            </TabsTrigger>
            <TabsTrigger value="taxonomy" className="gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Taxonomy
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              Monitoring
            </TabsTrigger>
            <TabsTrigger value="governance" className="gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Governance
            </TabsTrigger>
          </TabsList>

          {/* ─── Pipelines Tab ─── */}
          <TabsContent value="pipelines" className="space-y-4">
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

            {filteredPipelines.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <GitBranch className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {searchQuery || statusFilter !== "all"
                      ? "No pipelines match your filters"
                      : "No pipelines yet"}
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    {searchQuery || statusFilter !== "all"
                      ? "Try adjusting your search or filter criteria."
                      : "Create your first data pipeline or start from a runbook template."}
                  </p>
                  {!searchQuery && statusFilter === "all" && (
                    <div className="flex gap-2 justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setSelectedRunbook(null); setCreateOpen(true); }}
                        className="gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Create Pipeline
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab("runbooks")}
                        className="gap-1.5"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        Browse Runbooks
                      </Button>
                    </div>
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

          {/* ─── Runbooks Tab ─── */}
          <TabsContent value="runbooks" className="space-y-6">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Pre-built pipeline templates from the Manus Data Operations playbook.
                Each runbook includes a copy-pasteable prompt, recommended topology, and step sequence.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {RUNBOOK_TEMPLATES.map((rb) => {
                const topo = TOPOLOGIES.find((t) => t.id === rb.topology);
                const TopoIcon = topo?.icon ?? ArrowRight;
                return (
                  <Card key={rb.id} className="hover:border-primary/30 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm">{rb.label}</CardTitle>
                        <TopologyBadge topology={rb.topology} />
                      </div>
                      <CardDescription className="text-xs">{rb.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                      {/* Prompt preview */}
                      <div className="relative">
                        <pre className="text-[11px] text-muted-foreground bg-muted/30 rounded-lg p-3 whitespace-pre-wrap line-clamp-4 leading-relaxed">
                          {rb.prompt}
                        </pre>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-1.5 right-1.5 h-6 w-6 p-0"
                          onClick={() => {
                            navigator.clipboard.writeText(rb.prompt);
                            toast.success("Runbook prompt copied to clipboard");
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      {/* Steps preview */}
                      <div className="flex items-center gap-1 flex-wrap">
                        {rb.steps.map((stepId, i) => {
                          let cat = null;
                          let op = null;
                          for (const c of OPERATION_CATEGORIES) {
                            const found = c.operations.find((o) => o.id === stepId);
                            if (found) { cat = c; op = found; break; }
                          }
                          if (!cat || !op) return null;
                          const Icon = cat.icon;
                          return (
                            <div key={i} className="flex items-center gap-1">
                              <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium", cat.bgColor, cat.color)}>
                                <Icon className="w-2.5 h-2.5" />
                                {op.label}
                              </div>
                              {i < rb.steps.length - 1 && (
                                <ArrowRight className="w-2.5 h-2.5 text-muted-foreground" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-1.5"
                        onClick={() => {
                          setSelectedRunbook(rb);
                          setCreateOpen(true);
                        }}
                      >
                        <Play className="w-3 h-3" />
                        Use This Runbook
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ─── Taxonomy Tab ─── */}
          <TabsContent value="taxonomy" className="space-y-8">
            {/* Topologies */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Network className="w-4 h-4 text-primary" />
                Pipeline Topologies
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {TOPOLOGIES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <Card key={t.id}>
                      <CardContent className="pt-5 pb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          <p className="text-sm font-semibold">{t.label}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{t.description}</p>
                        <p className="text-[10px] text-muted-foreground italic">Use case: {t.useCase}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Source Classes */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <ArrowDownUp className="w-4 h-4 text-primary" />
                Source Classes
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {SOURCE_CLASSES.map((s) => {
                  const Icon = s.icon;
                  return (
                    <Card key={s.id}>
                      <CardContent className="pt-4 pb-3 text-center">
                        <Icon className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                        <p className="text-xs font-medium">{s.label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{s.description}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Storage Tiers */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-primary" />
                Storage Tiers
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {STORAGE_TIERS.map((tier) => {
                  const Icon = tier.icon;
                  return (
                    <Card key={tier.id}>
                      <CardContent className="pt-5 pb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={cn("p-2 rounded-lg", tier.bgColor)}>
                            <Icon className={cn("w-4 h-4", tier.color)} />
                          </div>
                          <p className="text-sm font-semibold">{tier.label}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{tier.description}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Operation Categories */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                Operation Categories
              </h3>
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
            </div>

            {/* Governance */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Governance Plane
              </h3>
              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-xs font-semibold mb-1">Data Inclusion / Exclusion</p>
                      <p className="text-[11px] text-muted-foreground">
                        Specify which fields to include and exclude upfront to avoid cleanup passes.
                        Example: "Include income, education; exclude smart-thermostat references."
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold mb-1">Convergence Rules</p>
                      <p className="text-[11px] text-muted-foreground">
                        Define when a recursive pipeline should stop. Standard rule: 2-3 consecutive
                        passes with no actionable change. Each pass should be fresh and comprehensive.
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold mb-1">Access Control</p>
                      <p className="text-[11px] text-muted-foreground">
                        Hierarchical permissions: only admin users can affect platform-level data
                        connections. Guest users are restricted to their own layer.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ─── Monitoring Tab ─── */}
          <TabsContent value="monitoring" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: "Active Pipelines", value: "2", icon: Play, color: "text-emerald-400" },
                { label: "Total Runs (30d)", value: "62", icon: Activity, color: "text-blue-400" },
                { label: "Success Rate", value: "98.4%", icon: CheckCircle2, color: "text-emerald-400" },
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
                    { pipeline: "Prospect Consolidation", topology: "linear" as PipelineTopology, status: "success", duration: "3m 12s", time: "1h ago", records: 234 },
                    { pipeline: "Market Research Sync", topology: "fan-out-fan-in" as PipelineTopology, status: "success", duration: "8m 45s", time: "3d ago", records: 89 },
                    { pipeline: "Document Optimization Loop", topology: "recursive-convergence" as PipelineTopology, status: "success", duration: "12m 03s", time: "5d ago", records: 4 },
                    { pipeline: "Prospect Consolidation", topology: "linear" as PipelineTopology, status: "success", duration: "2m 58s", time: "1d ago", records: 198 },
                    { pipeline: "Prospect Consolidation", topology: "linear" as PipelineTopology, status: "error", duration: "0m 45s", time: "2d ago", records: 0 },
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
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{run.pipeline}</p>
                          <TopologyBadge topology={run.topology} />
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {run.records} {run.topology === "recursive-convergence" ? "passes" : "records"} processed
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">{run.duration}</p>
                        <p className="text-[10px] text-muted-foreground">{run.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ Governance Tab ═══ */}
          <TabsContent value="governance" className="space-y-6">
            {/* Data Lineage Visualization */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Network className="w-4 h-4 text-primary" />
                  Data Lineage
                </CardTitle>
                <CardDescription className="text-xs">
                  Visual trace of data flow from source through transformations to destination
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {/* Lineage flow diagram */}
                  <div className="flex items-center gap-0 overflow-x-auto pb-4">
                    {[
                      { stage: "Source", items: ["API Endpoints", "File Uploads", "Web Scrapes", "Databases"], icon: Globe, color: "bg-blue-500/10 border-blue-500/30 text-blue-400" },
                      { stage: "Ingest", items: ["Batch Loader", "Fan-out Splitter", "Scheduled Pull", "Event Listener"], icon: Download, color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" },
                      { stage: "Transform", items: ["Clean & Normalize", "Deduplicate", "Enrich (LLM)", "Impute Nulls"], icon: RefreshCw, color: "bg-amber-500/10 border-amber-500/30 text-amber-400" },
                      { stage: "Model", items: ["Score & Classify", "Aggregate", "Forecast", "Cluster"], icon: BarChart3, color: "bg-purple-500/10 border-purple-500/30 text-purple-400" },
                      { stage: "Persist", items: ["S3 Storage", "Database Write", "Share Page", "GitHub Export"], icon: HardDrive, color: "bg-rose-500/10 border-rose-500/30 text-rose-400" },
                    ].map((stage, idx, arr) => (
                      <div key={stage.stage} className="flex items-center">
                        <div className={cn("rounded-xl border p-4 min-w-[160px]", stage.color)}>
                          <div className="flex items-center gap-2 mb-2">
                            <stage.icon className="w-4 h-4" />
                            <span className="text-xs font-semibold uppercase tracking-wider">{stage.stage}</span>
                          </div>
                          <div className="space-y-1">
                            {stage.items.map((item) => (
                              <p key={item} className="text-[10px] text-muted-foreground">{item}</p>
                            ))}
                          </div>
                        </div>
                        {idx < arr.length - 1 && (
                          <ArrowRight className="w-5 h-5 text-muted-foreground mx-2 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quality Scoring Rules */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Quality Scoring Framework
                </CardTitle>
                <CardDescription className="text-xs">
                  Automated data quality checks applied at each pipeline stage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { dimension: "Completeness", weight: 25, description: "Percentage of non-null required fields", threshold: "≥95%" },
                    { dimension: "Accuracy", weight: 25, description: "Schema validation + type conformance", threshold: "≥98%" },
                    { dimension: "Freshness", weight: 20, description: "Time since last successful sync", threshold: "<24h" },
                    { dimension: "Uniqueness", weight: 15, description: "Deduplication ratio after processing", threshold: "≥99%" },
                    { dimension: "Consistency", weight: 10, description: "Cross-source value agreement", threshold: "≥90%" },
                    { dimension: "Timeliness", weight: 5, description: "Pipeline execution within SLA", threshold: "<5min" },
                  ].map((q) => (
                    <div key={q.dimension} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">{q.weight}%</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{q.dimension}</p>
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0">{q.threshold}</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{q.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Access Control & Retention */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-400" />
                    Access Tiers
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { tier: "Public", desc: "Open datasets, web scrapes, public APIs", retention: "7 days", color: "text-emerald-400" },
                    { tier: "Authenticated", desc: "OAuth-connected services, personal data", retention: "14 days", color: "text-blue-400" },
                    { tier: "Admin", desc: "Secrets, credentials, internal databases", retention: "21 days", color: "text-amber-400" },
                  ].map((t) => (
                    <div key={t.tier} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-sm font-medium", t.color)}>{t.tier}</span>
                        <span className="text-[10px] text-muted-foreground">{t.desc}</span>
                      </div>
                      <Badge variant="outline" className="text-[9px]">{t.retention}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    Audit Trail
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { event: "Pipeline created", detail: "Prospect Consolidation", time: "2d ago" },
                    { event: "Schema validated", detail: "12 fields, 0 violations", time: "2d ago" },
                    { event: "Quality score", detail: "96.2% composite score", time: "1d ago" },
                    { event: "Data persisted", detail: "234 records to S3", time: "1d ago" },
                    { event: "Retention applied", detail: "Tier 1 sandbox, 7-day TTL", time: "1d ago" },
                  ].map((e, i) => (
                    <div key={i} className="flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground w-12 shrink-0">{e.time}</span>
                      <span className="font-medium text-foreground">{e.event}</span>
                      <span className="text-muted-foreground truncate">{e.detail}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Pipeline Dialog */}
      <CreatePipelineDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialRunbook={selectedRunbook}
      />

      {/* Pipeline Detail Dialog */}
      {selectedPipeline && (
        <Dialog open={!!selectedPipeline} onOpenChange={() => setSelectedPipeline(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle>{selectedPipeline.name}</DialogTitle>
                <StatusBadge status={selectedPipeline.status} />
                <TopologyBadge topology={selectedPipeline.topology} />
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
              {selectedPipeline.convergenceRule && (
                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <p className="text-xs font-medium text-amber-400 mb-1 flex items-center gap-1">
                    <Repeat className="w-3 h-3" />
                    Convergence Rule
                  </p>
                  <p className="text-[11px] text-muted-foreground">{selectedPipeline.convergenceRule}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Schedule</p>
                  <p className="font-medium capitalize">{selectedPipeline.schedule}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Storage Tier</p>
                  <p className="font-medium capitalize">{selectedPipeline.storageTier}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Runs</p>
                  <p className="font-medium">{selectedPipeline.runCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Source</p>
                  <p className="font-medium">{SOURCE_CLASSES.find((s) => s.id === selectedPipeline.sourceClass)?.label ?? "Unknown"}</p>
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
              <RunPipelineButton pipeline={selectedPipeline} onDone={() => setSelectedPipeline(null)} />
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
