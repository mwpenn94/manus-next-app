/**
 * InteractiveOutputCard — Manus-style interactive output element
 *
 * Renders inline in chat when the agent produces an interactive artifact
 * (website, dashboard, document, spreadsheet, etc.) with action buttons
 * to preview, open, download, or interact with the output.
 */
import { motion } from "framer-motion";
import {
  ExternalLink,
  Eye,
  Download,
  Code,
  Globe,
  FileText,
  Table2,
  Presentation,
  Image as ImageIcon,
  BarChart3,
  Settings,
  Copy,
  Share2,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type OutputType =
  | "website"
  | "dashboard"
  | "document"
  | "spreadsheet"
  | "presentation"
  | "image"
  | "chart"
  | "code";

interface InteractiveOutputCardProps {
  /** Type of the output */
  type: OutputType;
  /** Title of the output */
  title: string;
  /** Brief description */
  description?: string;
  /** Preview image URL */
  previewUrl?: string;
  /** URL to open the output */
  openUrl?: string;
  /** Download URL */
  downloadUrl?: string;
  /** Callback for preview action */
  onPreview?: () => void;
  /** Callback for open action */
  onOpen?: () => void;
  /** Callback for download action */
  onDownload?: () => void;
  /** Callback for settings/configure action */
  onSettings?: () => void;
  /** Callback for share action */
  onShare?: () => void;
  /** Callback for copy action */
  onCopy?: () => void;
  /** Whether this is a live/running output */
  isLive?: boolean;
  /** Status label */
  statusLabel?: string;
}

const TYPE_CONFIG: Record<
  OutputType,
  { icon: React.ElementType; color: string; bgColor: string; label: string }
> = {
  website: { icon: Globe, color: "text-blue-400", bgColor: "bg-blue-500/10", label: "Website" },
  dashboard: { icon: BarChart3, color: "text-purple-400", bgColor: "bg-purple-500/10", label: "Dashboard" },
  document: { icon: FileText, color: "text-amber-400", bgColor: "bg-amber-500/10", label: "Document" },
  spreadsheet: { icon: Table2, color: "text-green-400", bgColor: "bg-green-500/10", label: "Spreadsheet" },
  presentation: { icon: Presentation, color: "text-orange-400", bgColor: "bg-orange-500/10", label: "Presentation" },
  image: { icon: ImageIcon, color: "text-pink-400", bgColor: "bg-pink-500/10", label: "Image" },
  chart: { icon: BarChart3, color: "text-cyan-400", bgColor: "bg-cyan-500/10", label: "Chart" },
  code: { icon: Code, color: "text-emerald-400", bgColor: "bg-emerald-500/10", label: "Code" },
};

export default function InteractiveOutputCard({
  type,
  title,
  description,
  previewUrl,
  openUrl,
  downloadUrl,
  onPreview,
  onOpen,
  onDownload,
  onSettings,
  onShare,
  onCopy,
  isLive = false,
  statusLabel,
}: InteractiveOutputCardProps) {
  const config = TYPE_CONFIG[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="rounded-xl border border-border/50 bg-card/60 overflow-hidden group"
    >
      {/* Preview image */}
      {previewUrl && (
        <div
          className="relative h-36 bg-muted/30 overflow-hidden cursor-pointer"
          onClick={onPreview || onOpen}
        >
          <img
            src={previewUrl}
            alt={title}
            className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
          {/* Expand button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreview?.();
            }}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/40 text-white/80 hover:bg-black/60 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", config.bgColor)}>
            <Icon className={cn("w-4.5 h-4.5", config.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-foreground truncate">{title}</h4>
              {isLive && (
                <span className="flex items-center gap-1 text-[10px] text-green-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Live
                </span>
              )}
              {statusLabel && !isLive && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground font-medium">
                  {statusLabel}
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-3">
          {(onOpen || openUrl) && (
            <button
              onClick={() => {
                if (onOpen) onOpen();
                else if (openUrl) window.open(openUrl, "_blank");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
            >
              <ExternalLink className="w-3 h-3" />
              Open
            </button>
          )}
          {onPreview && (
            <button
              onClick={onPreview}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/60 text-foreground text-xs font-medium hover:bg-muted transition-colors"
            >
              <Eye className="w-3 h-3" />
              Preview
            </button>
          )}
          {(onDownload || downloadUrl) && (
            <button
              onClick={() => {
                if (onDownload) onDownload();
                else if (downloadUrl) window.open(downloadUrl, "_blank");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/60 text-foreground text-xs font-medium hover:bg-muted transition-colors"
            >
              <Download className="w-3 h-3" />
              Download
            </button>
          )}

          {/* Secondary actions */}
          <div className="flex items-center gap-1 ml-auto">
            {onCopy && (
              <button
                onClick={onCopy}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                title="Copy"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            )}
            {onShare && (
              <button
                onClick={onShare}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                title="Share"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            )}
            {onSettings && (
              <button
                onClick={onSettings}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                title="Settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export { TYPE_CONFIG };
