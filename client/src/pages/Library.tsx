/**
 * Library — Cross-task artifact & file browser (P15/P16/P18)
 * 
 * Aggregates workspace artifacts (screenshots, code, documents, images)
 * and uploaded files across all tasks into a unified, searchable view.
 * P16: Added inline preview for images, code, and documents.
 * P18: Added multi-select with bulk export (Download as ZIP).
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
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
  CheckSquare,
  Square,
  Package,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

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

/** Get a filename extension guess from artifact type or mime */
function guessExtension(item: any): string {
  if (item.fileName) {
    const ext = item.fileName.split(".").pop();
    if (ext && ext.length <= 5) return `.${ext}`;
  }
  if (item.mimeType) {
    if (item.mimeType.includes("png")) return ".png";
    if (item.mimeType.includes("jpeg") || item.mimeType.includes("jpg")) return ".jpg";
    if (item.mimeType.includes("gif")) return ".gif";
    if (item.mimeType.includes("webp")) return ".webp";
    if (item.mimeType.includes("pdf")) return ".pdf";
    if (item.mimeType.includes("json")) return ".json";
    if (item.mimeType.includes("javascript")) return ".js";
    if (item.mimeType.includes("typescript")) return ".ts";
    if (item.mimeType.includes("html")) return ".html";
    if (item.mimeType.includes("css")) return ".css";
    if (item.mimeType.includes("text/plain")) return ".txt";
  }
  if (item.artifactType) {
    if (item.artifactType === "browser_screenshot" || item.artifactType === "generated_image") return ".png";
    if (item.artifactType === "code") return ".txt";
    if (item.artifactType === "terminal") return ".log";
    if (item.artifactType === "document") return ".txt";
    if (item.artifactType === "document_pdf") return ".pdf";
    if (item.artifactType === "document_docx") return ".docx";
  }
  return "";
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
              <pre className="p-4 text-sm text-foreground font-mono leading-relaxed overflow-auto max-h-[70vh] whitespace-pre-wrap break-words bg-muted/20">
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

  // ── Multi-select state ──
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

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

  const currentItems = tab === "artifacts" ? artifacts : files;
  const allIds = new Set(currentItems.map((item: any) => item.id as number));
  const allSelected = allIds.size > 0 && Array.from(allIds).every(id => selectedIds.has(id));
  const someSelected = Array.from(allIds).some(id => selectedIds.has(id));

  const selectedFilter = ARTIFACT_FILTERS.find(f => f.value === typeFilter) ?? ARTIFACT_FILTERS[0];

  // Clear selection when switching tabs or filters
  useEffect(() => {
    setSelectedIds(new Set());
  }, [tab, typeFilter, debouncedSearch]);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  }, [allSelected, allIds]);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  // ── Bulk ZIP export ──
  const handleBulkExport = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setIsExporting(true);
    toast.info(`Preparing ${selectedIds.size} file(s) for download...`);

    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const selectedItems = currentItems.filter((item: any) => selectedIds.has(item.id));

      let downloaded = 0;
      const usedNames = new Set<string>();

      for (const item of selectedItems) {
        try {
          const baseName = (item as any).fileName || (item as any).label || (item as any).artifactType?.replace(/_/g, "-") || `item-${item.id}`;
          const ext = guessExtension(item);
          let name = baseName.includes(".") ? baseName : `${baseName}${ext}`;

          // Deduplicate names
          let counter = 1;
          let uniqueName = name;
          while (usedNames.has(uniqueName)) {
            const dotIdx = name.lastIndexOf(".");
            if (dotIdx > 0) {
              uniqueName = `${name.slice(0, dotIdx)}-${counter}${name.slice(dotIdx)}`;
            } else {
              uniqueName = `${name}-${counter}`;
            }
            counter++;
          }
          usedNames.add(uniqueName);

          if (item.url) {
            // Fetch the file content
            const resp = await fetch(item.url);
            if (resp.ok) {
              const blob = await resp.blob();
              zip.file(uniqueName, blob);
              downloaded++;
            }
          } else if ((item as any).content) {
            // Text content (code, terminal output)
            zip.file(uniqueName, (item as any).content);
            downloaded++;
          }
        } catch (err) {
          console.warn(`[Library] Failed to add item ${item.id} to ZIP:`, err);
        }
      }

      if (downloaded === 0) {
        toast.error("No files could be downloaded");
        return;
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `library-export-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Downloaded ${downloaded} file(s) as ZIP`);
      exitSelectMode();
    } catch (err) {
      console.error("[Library] Bulk export failed:", err);
      toast.error("Export failed — please try again");
    } finally {
      setIsExporting(false);
    }
  }, [selectedIds, currentItems, exitSelectMode]);

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
          <div className="flex items-center gap-2">
            {/* Select mode toggle */}
            {!selectMode ? (
              <button
                onClick={() => setSelectMode(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
                title="Select items for bulk export"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                Select
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={exitSelectMode}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
                <button
                  onClick={toggleSelectAll}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg transition-colors",
                    allSelected
                      ? "border-primary/30 bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {allSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                  {allSelected ? "Deselect All" : "Select All"}
                </button>
                <button
                  onClick={handleBulkExport}
                  disabled={selectedIds.size === 0 || isExporting}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all font-medium",
                    selectedIds.size > 0
                      ? "bg-primary text-primary-foreground hover:opacity-90 shadow-sm shadow-primary/20"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                >
                  {isExporting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Package className="w-3.5 h-3.5" />
                  )}
                  {isExporting ? "Exporting..." : `Download ZIP${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`}
                </button>
              </div>
            )}

            {/* View mode toggle */}
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
                <ArtifactCard
                  key={artifact.id}
                  artifact={artifact}
                  index={i}
                  onNavigate={navigate}
                  onPreview={setPreviewItem}
                  selectMode={selectMode}
                  selected={selectedIds.has(artifact.id)}
                  onToggleSelect={toggleSelect}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {artifacts.map((artifact, i) => (
                <ArtifactRow
                  key={artifact.id}
                  artifact={artifact}
                  index={i}
                  onNavigate={navigate}
                  onPreview={setPreviewItem}
                  selectMode={selectMode}
                  selected={selectedIds.has(artifact.id)}
                  onToggleSelect={toggleSelect}
                />
              ))}
            </div>
          )
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {files.map((file, i) => (
              <FileCard
                key={file.id}
                file={file}
                index={i}
                onPreview={setPreviewItem}
                selectMode={selectMode}
                selected={selectedIds.has(file.id)}
                onToggleSelect={toggleSelect}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {files.map((file, i) => (
              <FileRow
                key={file.id}
                file={file}
                index={i}
                onPreview={setPreviewItem}
                selectMode={selectMode}
                selected={selectedIds.has(file.id)}
                onToggleSelect={toggleSelect}
              />
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

interface SelectableProps {
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: (id: number) => void;
}

function ArtifactCard({ artifact, index, onNavigate, onPreview, selectMode, selected, onToggleSelect }: { artifact: any; index: number; onNavigate: (path: string) => void; onPreview: (item: any) => void } & SelectableProps) {
  const Icon = getArtifactIcon(artifact.artifactType);
  const isImage = isImageType(artifact.artifactType);
  const isCode = isCodeType(artifact.artifactType);
  const hasContent = !!(artifact.content);

  const handleClick = () => {
    if (selectMode) {
      onToggleSelect(artifact.id);
    } else {
      onPreview(artifact);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      className={cn(
        "group relative bg-card border rounded-xl overflow-hidden hover:shadow-md transition-all cursor-pointer",
        selected ? "border-primary ring-1 ring-primary/20 shadow-primary/10" : "border-border hover:border-primary/30 hover:shadow-primary/5"
      )}
      onClick={handleClick}
    >
      {/* Selection checkbox */}
      {selectMode && (
        <div className="absolute top-2 left-2 z-10">
          <div
            className={cn(
              "w-5 h-5 rounded-md flex items-center justify-center transition-all",
              selected
                ? "bg-primary text-primary-foreground"
                : "bg-background/80 backdrop-blur-sm border border-border"
            )}
          >
            {selected && <Check className="w-3 h-3" />}
          </div>
        </div>
      )}

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
          <Icon className="w-8 h-8 text-muted-foreground" />
        </div>
      )}

      {/* Hover actions */}
      {!selectMode && (
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
      )}

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

function ArtifactRow({ artifact, index, onNavigate, onPreview, selectMode, selected, onToggleSelect }: { artifact: any; index: number; onNavigate: (path: string) => void; onPreview: (item: any) => void } & SelectableProps) {
  const Icon = getArtifactIcon(artifact.artifactType);
  const isImage = isImageType(artifact.artifactType);

  const handleClick = () => {
    if (selectMode) {
      onToggleSelect(artifact.id);
    } else {
      onPreview(artifact);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15, delay: index * 0.01 }}
      className={cn(
        "group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer",
        selected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-accent/50"
      )}
      onClick={handleClick}
    >
      {/* Selection checkbox */}
      {selectMode && (
        <div
          className={cn(
            "w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all",
            selected
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-background"
          )}
        >
          {selected && <Check className="w-3 h-3" />}
        </div>
      )}

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
      {!selectMode && (
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
      )}
    </motion.div>
  );
}

function FileCard({ file, index, onPreview, selectMode, selected, onToggleSelect }: { file: any; index: number; onPreview: (item: any) => void } & SelectableProps) {
  const Icon = getFileIcon(file.mimeType);
  const isImage = file.mimeType?.startsWith("image/");

  const handleClick = () => {
    if (selectMode) {
      onToggleSelect(file.id);
    } else {
      onPreview(file);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      className={cn(
        "group relative bg-card border rounded-xl overflow-hidden hover:shadow-md transition-all cursor-pointer",
        selected ? "border-primary ring-1 ring-primary/20 shadow-primary/10" : "border-border hover:border-primary/30 hover:shadow-primary/5"
      )}
      onClick={handleClick}
    >
      {/* Selection checkbox */}
      {selectMode && (
        <div className="absolute top-2 left-2 z-10">
          <div
            className={cn(
              "w-5 h-5 rounded-md flex items-center justify-center transition-all",
              selected
                ? "bg-primary text-primary-foreground"
                : "bg-background/80 backdrop-blur-sm border border-border"
            )}
          >
            {selected && <Check className="w-3 h-3" />}
          </div>
        </div>
      )}

      {isImage ? (
        <div className="aspect-video bg-muted/30 overflow-hidden">
          <img src={file.url} alt={file.fileName} className="w-full h-full object-cover" loading="lazy" />
        </div>
      ) : (
        <div className="aspect-video bg-muted/20 flex items-center justify-center">
          <Icon className="w-8 h-8 text-muted-foreground" />
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
      {!selectMode && (
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
      )}
    </motion.div>
  );
}

function FileRow({ file, index, onPreview, selectMode, selected, onToggleSelect }: { file: any; index: number; onPreview: (item: any) => void } & SelectableProps) {
  const Icon = getFileIcon(file.mimeType);
  const isImage = file.mimeType?.startsWith("image/");

  const handleClick = () => {
    if (selectMode) {
      onToggleSelect(file.id);
    } else {
      onPreview(file);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15, delay: index * 0.01 }}
      className={cn(
        "group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer",
        selected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-accent/50"
      )}
      onClick={handleClick}
    >
      {/* Selection checkbox */}
      {selectMode && (
        <div
          className={cn(
            "w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all",
            selected
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-background"
          )}
        >
          {selected && <Check className="w-3 h-3" />}
        </div>
      )}

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
      {!selectMode && (
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
      )}
    </motion.div>
  );
}
