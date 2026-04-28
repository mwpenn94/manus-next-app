import { cn } from "@/lib/utils";
import {
  Globe,
  Monitor,
  FileText,
  Presentation,
  CreditCard,
  Share2,
  Play,
  Clock,
  Code2,
  Cpu,
  MonitorSmartphone,
  RefreshCw,
  Workflow,
  Mic,
  Image,
  Video,
  Music,
  Search,
  Database,
  Brain,
  type LucideIcon,
} from "lucide-react";

export interface CapabilityDef {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  status: "active" | "beta" | "coming";
}

export const MANUS_CAPABILITIES: CapabilityDef[] = [
  { id: "browser", label: "Browser", icon: Globe, description: "Cloud browser with persistent login states", status: "active" },
  { id: "computer", label: "Computer", icon: Monitor, description: "Sandboxed compute environment with shell access", status: "active" },
  { id: "document", label: "Document", icon: FileText, description: "PDF, DOCX, XLSX generation and processing", status: "active" },
  { id: "deck", label: "Deck", icon: Presentation, description: "Slide deck creation and export", status: "active" },
  { id: "billing", label: "Billing", icon: CreditCard, description: "Stripe-powered subscription and payment management", status: "active" },
  { id: "share", label: "Share", icon: Share2, description: "Task and project sharing with visibility controls", status: "active" },
  { id: "replay", label: "Replay", icon: Play, description: "Task execution replay and audit trail", status: "active" },
  { id: "scheduled", label: "Scheduled", icon: Clock, description: "Recurring task automation and cron scheduling", status: "active" },
  { id: "webapp-builder", label: "WebApp Builder", icon: Code2, description: "Full-stack web application generation", status: "active" },
  { id: "client-inference", label: "Client Inference", icon: Cpu, description: "Multi-model sovereign routing and inference", status: "active" },
  { id: "desktop", label: "Desktop", icon: MonitorSmartphone, description: "Desktop application build queue", status: "beta" },
  { id: "sync", label: "Sync", icon: RefreshCw, description: "Cross-device state synchronization", status: "active" },
  { id: "bridge", label: "Bridge", icon: Workflow, description: "External service bridge and API orchestration", status: "active" },
  { id: "voice", label: "Voice", icon: Mic, description: "Speech-to-text and text-to-speech", status: "active" },
  { id: "image-gen", label: "Image Gen", icon: Image, description: "AI image generation and editing", status: "active" },
  { id: "video-gen", label: "Video Gen", icon: Video, description: "AI video generation pipeline", status: "beta" },
  { id: "music-gen", label: "Music Gen", icon: Music, description: "AI music and audio generation", status: "beta" },
  { id: "deep-research", label: "Deep Research", icon: Search, description: "Multi-source autonomous research agent", status: "active" },
  { id: "data-analysis", label: "Data Analysis", icon: Database, description: "Structured data analysis and visualization", status: "active" },
  { id: "memory", label: "Memory", icon: Brain, description: "Persistent memory with semantic search", status: "active" },
];

interface CapabilityBadgeProps {
  capability: CapabilityDef;
  size?: "sm" | "md";
  showDescription?: boolean;
  className?: string;
}

export function CapabilityBadge({
  capability,
  size = "sm",
  showDescription = false,
  className,
}: CapabilityBadgeProps) {
  const Icon = capability.icon;

  if (size === "sm") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full",
          "bg-muted/50 text-muted-foreground border border-border/50",
          capability.status === "beta" && "border-primary/30 text-primary/70",
          capability.status === "coming" && "opacity-50",
          className
        )}
        style={{ fontFamily: "var(--font-mono)" }}
        title={capability.description}
      >
        <Icon className="w-2.5 h-2.5" />
        {capability.label.toLowerCase()}
        {capability.status === "beta" && (
          <span className="text-[8px] uppercase tracking-wider text-primary/60">
            beta
          </span>
        )}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border border-border bg-card card-hover",
        className
      )}
    >
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-foreground">
            {capability.label}
          </span>
          {capability.status === "beta" && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary uppercase tracking-wider">
              beta
            </span>
          )}
        </div>
        {showDescription && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {capability.description}
          </p>
        )}
      </div>
    </div>
  );
}

export default CapabilityBadge;
