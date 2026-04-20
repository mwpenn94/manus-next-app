/**
 * Library — Cross-task artifact & file browser (P15/P16)
 * 
 * Aggregates workspace artifacts (screenshots, code, documents, images)
 * and uploaded files across all tasks into a unified, searchable view.
 * P16: Added inline preview for images, code, and documents.
 */
import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Grid3X3,
  List,
  FileText,
  Image as ImageIcon,
  Code,
  Terminal,
  Globe,
  Download,
  ExternalLink,
  Filter,
  Loader2,
  FolderOpen,
  File,
  Paperclip,
  ChevronDown,
  X,
  Maximize2,
  Copy,
  Check,
} from "lucide-react";

const ARTIFACT_FILTERS = [
  { value: "", label: "All Types", icon: FolderOpen },
  { value: "browser_screenshot", label: "Screenshots", icon: ImageIcon },
  { value: "generated_image", label: "Images", icon: ImageIcon },
  { value: "code", label: "Code", icon: Code },
  { value: "terminal", label: "Terminal", icon: Terminal },
  { value: "document", label: "Documents", icon: FileText },
  { value: "document_pdf", label: "PDFs", icon: FileText },
  { value: "document_docx", label: "Word Docs", icon: FileText },
  { value: "browser_url", label: "URLs", icon: Globe },
] as const;

type ViewMode = "grid" | "list";
type Tab = "artifacts" | "files";

function getArtifactIcon(type: string) {
  switch (type) {
    case "browser_screenshot":
    case "generated_image":
      return ImageIcon;
    case "code":
      return Code;
    case "terminal":
      return Terminal;
    case "document":
    case "document_pdf":
    case "document_docx":
      return FileText;
    case "browser_url":
      return Globe;
    default:
      return File;
  }
}

function getFileIcon(mimeType?: string | null) {
  if (!mimeType) return File;
  if (mimeType.startsWith("image/")) return ImageIcon;
  if (mimeType.startsWith("text/") || mimeType.includes("json") || mimeType.includes("javascript") || mimeType.includes("typescript")) return Code;
  if (mimeType.includes("pdf")) return FileText;
  return File;
}

function formatBytes(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function isImageType(artifactType: string) {
  return artifactType === "browser_screenshot" || artifactType === "generated_image";
}

function isCodeType(artifactType: string) {
  return artifactType === "code" || artifactType === "terminal";
}

// ── Preview Modal ──
function PreviewModal({ item, onClose }: { item: any; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const text = item.content || item.url || "";
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [item]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const isImage = item.artifactType ? isImageType(item.artifactType) : item.mimeType?.startsWith("image/");
  const isCode = item.artifactType ? isCodeType(item.artifactType) : (item.mimeType?.startsWith("text/") || item.mimeType?.includes("json"));
  const hasContent = !!(item.content);
  const hasUrl = !!(item.url);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="bg-card border border-border rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium text-foreground truncate">
              {item.label || item.fileName || item.artifactType?.replace(/_/g, " ") || "Preview"}
            </span>
            {item.taskTitle && (
              <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                — {item.taskTitle}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {(hasContent || hasUrl) && (
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title={copied ? "Copied!" : "Copy content"}
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
            {hasUrl && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            {hasUrl && (
              <a
                href={item.url}
                download={item.fileName || item.label || "download"}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {isImage && hasUrl ? (
            <div className="flex items-center justify-center p-4 min-h-[300px]">
              <img
                src={item.url}
                alt={item.label || item.fileName || "Preview"}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          ) : isCode || (hasContent && !isImage) ? (
            <div className="relative">
              <pre className="p-4 text-sm text-foreground/90 font-mono leading-relaxed overflow-auto max-h-[70vh] whitespace-pre-wrap break-words bg-muted/20">
                {item.content || "No content available"}
              </pre>
            </div>
          ) : hasUrl && item.mimeType?.includes("pdf") ? (
            <iframe
              src={item.url}
              className="w-full h-[70vh] border-0"
              title="PDF Preview"
            />
          ) : hasUrl ? (
            <div className="flex flex-col items-center justify-center p-8 gap-4 min-h-[200px]">
              <div className="w-16 h-16 rounded-xl bg-muted/50 flex items-center justify-center">
                <File className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Preview not available for this file type</p>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <ExternalLink className="w-4 h-4" />
                Open in new tab
              </a>
            </div>
          ) : (
            <div className="flex items-center justify-center p-8 min-h-[200px]">
              <p className="text-sm text-muted-foreground">No preview available</p>
            </div>
          )}
        </div>

        {/* Footer metadata */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border text-[11px] text-muted-foreground shrink-0">
          <span>{item.artifactType?.replace(/_/g, " ") || item.mimeType || "Unknown type"}</span>
          <div className="flex items-center gap-3">
            {item.size && <span>{formatBytes(item.size)}</span>}
            <span>{formatDate(item.createdAt)}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Library() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("artifacts");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<any>(null);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const artifactsQuery = trpc.library.artifacts.useQuery(
    { type: typeFilter || undefined, search: debouncedSearch || undefined, limit: 50 },
    { enabled: tab === "artifacts" }
  );

  const filesQuery = trpc.library.files.useQuery(
    { search: debouncedSearch || undefined, limit: 50 },
    { enabled: tab === "files" }
  );

  const isLoading = tab === "artifacts" ? artifactsQuery.isLoading : filesQuery.isLoading;
  const artifacts = artifactsQuery.data?.items ?? [];
  const files = filesQuery.data?.items ?? [];
  const totalCount = tab === "artifacts" ? (artifactsQuery.data?.total ?? 0) : (filesQuery.data?.total ?? 0);

  const selectedFilter = ARTIFACT_FILTERS.find(f => f.value === typeFilter) ?? ARTIFACT_FILTERS[0];

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="shrink-0 border-b border-border px-6 py-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              Library
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Browse artifacts and files across all your tasks
            </p>
          </div>
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                viewMode === "grid" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              title="Grid view"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs + Search + Filter */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
            <button
              onClick={() => { setTab("artifacts"); setTypeFilter(""); }}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md transition-colors",
                tab === "artifacts" ? "bg-background shadow-sm text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Artifacts
            </button>
            <button
              onClick={() => setTab("files")}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md transition-colors",
                tab === "files" ? "bg-background shadow-sm text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Files
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === "artifacts" ? "Search artifacts..." : "Search files..."}
              className="w-full pl-9 pr-3 py-2 text-sm bg-muted/30 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
            />
          </div>

          {/* Type filter (artifacts only) */}
          {tab === "artifacts" && (
            <div className="relative">
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors",
                  typeFilter ? "border-primary/30 bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <Filter className="w-3.5 h-3.5" />
                {selectedFilter.label}
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", filterOpen && "rotate-180")} />
              </button>
              <AnimatePresence>
                {filterOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-1 left-0 z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[180px]"
                  >
                    {ARTIFACT_FILTERS.map(f => (
                      <button
                        key={f.value}
                        onClick={() => { setTypeFilter(f.value); setFilterOpen(false); }}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left",
                          typeFilter === f.value ? "bg-primary/10 text-primary" : "text-popover-foreground hover:bg-accent"
                        )}
                      >
                        <f.icon className="w-3.5 h-3.5" />
                        {f.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Count badge */}
          <span className="text-xs text-muted-foreground tabular-nums">
            {totalCount} {totalCount === 1 ? "item" : "items"}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : tab === "artifacts" && artifacts.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No artifacts yet"
            description="Artifacts from your tasks will appear here — screenshots, code, documents, and more."
          />
        ) : tab === "files" && files.length === 0 ? (
          <EmptyState
            icon={Paperclip}
            title="No files yet"
            description="Files you upload to tasks will appear here for easy access."
          />
        ) : tab === "artifacts" ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {artifacts.map((artifact, i) => (
                <ArtifactCard key={artifact.id} artifact={artifact} index={i} onNavigate={navigate} onPreview={setPreviewItem} />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {artifacts.map((artifact, i) => (
                <ArtifactRow key={artifact.id} artifact={artifact} index={i} onNavigate={navigate} onPreview={setPreviewItem} />
              ))}
            </div>
          )
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {files.map((file, i) => (
              <FileCard key={file.id} file={file} index={i} onPreview={setPreviewItem} />
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {files.map((file, i) => (
              <FileRow key={file.id} file={file} index={i} onPreview={setPreviewItem} />
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewItem && (
          <PreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sub-components ──

function EmptyState({ icon: Icon, title, description }: { icon: typeof FolderOpen; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-center">
      <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground max-w-sm">{description}</p>
    </div>
  );
}

function ArtifactCard({ artifact, index, onNavigate, onPreview }: { artifact: any; index: number; onNavigate: (path: string) => void; onPreview: (item: any) => void }) {
  const Icon = getArtifactIcon(artifact.artifactType);
  const isImage = isImageType(artifact.artifactType);
  const isCode = isCodeType(artifact.artifactType);
  const hasContent = !!(artifact.content);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      className="group relative bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all cursor-pointer"
      onClick={() => onPreview(artifact)}
    >
      {/* Preview area */}
      {isImage && artifact.url ? (
        <div className="aspect-video bg-muted/30 overflow-hidden">
          <img src={artifact.url} alt={artifact.label || "Artifact"} className="w-full h-full object-cover" loading="lazy" />
        </div>
      ) : isCode && hasContent ? (
        <div className="aspect-video bg-muted/20 overflow-hidden p-3">
          <pre className="text-[10px] text-muted-foreground font-mono leading-tight overflow-hidden line-clamp-[8]">
            {artifact.content.slice(0, 500)}
          </pre>
        </div>
      ) : (
        <div className="aspect-video bg-muted/20 flex items-center justify-center">
          <Icon className="w-8 h-8 text-muted-foreground/40" />
        </div>
      )}

      {/* Hover actions */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); onPreview(artifact); }}
          className="p-1.5 rounded-md bg-background/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-foreground shadow-sm"
          title="Preview"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        {artifact.taskExternalId && (
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate(`/task/${artifact.taskExternalId}`); }}
            className="p-1.5 rounded-md bg-background/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-foreground shadow-sm"
            title="Go to task"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
          {artifact.label || artifact.artifactType.replace(/_/g, " ")}
        </p>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-muted-foreground truncate max-w-[60%]">
            {artifact.taskTitle}
          </span>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {formatDate(artifact.createdAt)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function ArtifactRow({ artifact, index, onNavigate, onPreview }: { artifact: any; index: number; onNavigate: (path: string) => void; onPreview: (item: any) => void }) {
  const Icon = getArtifactIcon(artifact.artifactType);
  const isImage = isImageType(artifact.artifactType);

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15, delay: index * 0.01 }}
      className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={() => onPreview(artifact)}
    >
      {/* Thumbnail */}
      {isImage && artifact.url ? (
        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-muted/30">
          <img src={artifact.url} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      ) : (
        <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate group-hover:text-primary transition-colors">
          {artifact.label || artifact.artifactType.replace(/_/g, " ")}
        </p>
        <p className="text-[11px] text-muted-foreground truncate">{artifact.taskTitle}</p>
      </div>
      <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
        {formatDate(artifact.createdAt)}
      </span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onPreview(artifact); }}
          className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
          title="Preview"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        {artifact.url && (
          <a
            href={artifact.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
            title="Open"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </motion.div>
  );
}

function FileCard({ file, index, onPreview }: { file: any; index: number; onPreview: (item: any) => void }) {
  const Icon = getFileIcon(file.mimeType);
  const isImage = file.mimeType?.startsWith("image/");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      className="group relative bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all cursor-pointer"
      onClick={() => onPreview(file)}
    >
      {isImage ? (
        <div className="aspect-video bg-muted/30 overflow-hidden">
          <img src={file.url} alt={file.fileName} className="w-full h-full object-cover" loading="lazy" />
        </div>
      ) : (
        <div className="aspect-video bg-muted/20 flex items-center justify-center">
          <Icon className="w-8 h-8 text-muted-foreground/40" />
        </div>
      )}
      <div className="p-3">
        <p className="text-sm font-medium text-foreground truncate">{file.fileName}</p>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-muted-foreground">{formatBytes(file.size)}</span>
          <span className="text-[10px] text-muted-foreground tabular-nums">{formatDate(file.createdAt)}</span>
        </div>
      </div>
      {/* Hover actions */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); onPreview(file); }}
          className="p-1.5 rounded-md bg-background/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-foreground shadow-sm"
          title="Preview"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <a
          href={file.url}
          download={file.fileName}
          className="p-1.5 rounded-md bg-background/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-foreground shadow-sm"
          title="Download"
          onClick={(e) => e.stopPropagation()}
        >
          <Download className="w-3.5 h-3.5" />
        </a>
      </div>
    </motion.div>
  );
}

function FileRow({ file, index, onPreview }: { file: any; index: number; onPreview: (item: any) => void }) {
  const Icon = getFileIcon(file.mimeType);
  const isImage = file.mimeType?.startsWith("image/");

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15, delay: index * 0.01 }}
      className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={() => onPreview(file)}
    >
      {/* Thumbnail */}
      {isImage ? (
        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-muted/30">
          <img src={file.url} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      ) : (
        <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{file.fileName}</p>
        <p className="text-[11px] text-muted-foreground">{file.mimeType || "Unknown type"}</p>
      </div>
      <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">{formatBytes(file.size)}</span>
      <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">{formatDate(file.createdAt)}</span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onPreview(file); }}
          className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
          title="Preview"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <a
          href={file.url}
          download={file.fileName}
          className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
          title="Download"
        >
          <Download className="w-3.5 h-3.5" />
        </a>
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
          title="Open in new tab"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </motion.div>
  );
}
