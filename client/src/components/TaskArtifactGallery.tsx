import { useState } from "react";
import {
  FileText,
  Image,
  Code,
  Download,
  ExternalLink,
  Eye,
  Grid3X3,
  List,
  Search,
  Clock,
  FileCode,
  FileSpreadsheet,
  FileImage,
  Film,
  Music,
  Archive,
  Loader2,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function getFileIcon(mimeType: string | null, fileName: string): React.JSX.Element {
  const mime = mimeType ?? "";
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext))
    return <FileImage className="w-5 h-5 text-pink-400" />;
  if (mime.startsWith("video/") || ["mp4", "webm", "mov"].includes(ext))
    return <Film className="w-5 h-5 text-purple-400" />;
  if (mime.startsWith("audio/") || ["mp3", "wav", "ogg"].includes(ext))
    return <Music className="w-5 h-5 text-green-400" />;
  if (["ts", "tsx", "js", "jsx", "py", "rs", "go", "java", "cpp", "c", "rb"].includes(ext))
    return <FileCode className="w-5 h-5 text-yellow-400" />;
  if (["csv", "xlsx", "xls", "tsv"].includes(ext))
    return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
  if (["zip", "tar", "gz", "rar", "7z"].includes(ext))
    return <Archive className="w-5 h-5 text-orange-400" />;
  if (["md", "txt", "pdf", "doc", "docx"].includes(ext))
    return <FileText className="w-5 h-5 text-blue-400" />;
  if (["html", "css", "json", "xml"].includes(ext))
    return <Code className="w-5 h-5 text-cyan-400" />;
  return <FileText className="w-5 h-5 text-muted-foreground" />;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface TaskArtifactGalleryProps {
  taskExternalId?: string;
}

export default function TaskArtifactGallery({ taskExternalId }: TaskArtifactGalleryProps): React.JSX.Element {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedFile, setSelectedFile] = useState<any>(null);

  const { data: files = [], isLoading } = trpc.file.list.useQuery(
    { taskExternalId: taskExternalId ?? "" },
    { enabled: !!taskExternalId }
  );

  const filtered = searchQuery
    ? files.filter((f: any) => f.fileName?.toLowerCase().includes(searchQuery.toLowerCase()))
    : files;

  const isImage = (f: any) => f.mimeType?.startsWith("image/") || /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(f.fileName ?? "");

  return (
    <div className="flex flex-col h-full bg-background text-foreground rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Task Artifacts</h2>
            <p className="text-xs text-muted-foreground">{files.length} files generated</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-7 w-7 p-0", viewMode === "grid" && "bg-accent")}
            onClick={() => setViewMode("grid")}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-7 w-7 p-0", viewMode === "list" && "bg-accent")}
            onClick={() => setViewMode("list")}
          >
            <List className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="px-5 py-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search artifacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        <div className={cn("overflow-y-auto p-4", selectedFile ? "w-1/2 border-r border-border" : "flex-1")}>
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && !taskExternalId && (
            <div className="text-center py-12 text-muted-foreground">
              <FolderOpen className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Select a task to view its artifacts.</p>
            </div>
          )}

          {!isLoading && taskExternalId && filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FolderOpen className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">{searchQuery ? "No matching artifacts." : "No artifacts generated yet."}</p>
            </div>
          )}

          {/* Grid View */}
          {viewMode === "grid" && filtered.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((file: any) => (
                <button
                  key={file.id}
                  className={cn(
                    "text-left p-3 rounded-lg border border-border hover:border-primary/30 transition-all group",
                    selectedFile?.id === file.id && "border-primary/50 bg-primary/5"
                  )}
                  onClick={() => setSelectedFile(file)}
                >
                  {isImage(file) && file.url ? (
                    <div className="w-full h-24 rounded-md bg-muted mb-2 overflow-hidden">
                      <img src={file.url} alt={file.fileName} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-full h-24 rounded-md bg-muted/50 mb-2 flex items-center justify-center">
                      {getFileIcon(file.mimeType, file.fileName)}
                    </div>
                  )}
                  <p className="text-xs font-medium truncate">{file.fileName}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                    <span>{formatSize(file.size)}</span>
                    {file.createdAt && (
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(file.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* List View */}
          {viewMode === "list" && filtered.length > 0 && (
            <div className="space-y-1">
              {filtered.map((file: any) => (
                <button
                  key={file.id}
                  className={cn(
                    "w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                    selectedFile?.id === file.id ? "bg-primary/5" : "hover:bg-accent/30"
                  )}
                  onClick={() => setSelectedFile(file)}
                >
                  {getFileIcon(file.mimeType, file.fileName)}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{file.fileName}</p>
                    <p className="text-[10px] text-muted-foreground">{file.mimeType ?? "unknown"}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{formatSize(file.size)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Preview Panel */}
        {selectedFile && (
          <div className="flex-1 overflow-y-auto p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {getFileIcon(selectedFile.mimeType, selectedFile.fileName)}
                <div>
                  <h3 className="text-sm font-semibold">{selectedFile.fileName}</h3>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                    <span>{formatSize(selectedFile.size)}</span>
                    <span>{selectedFile.mimeType ?? "—"}</span>
                    {selectedFile.createdAt && (
                      <span>{new Date(selectedFile.createdAt).toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {selectedFile.url && (
                  <>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" asChild>
                      <a href={selectedFile.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3" />
                        Open
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" asChild>
                      <a href={selectedFile.url} download={selectedFile.fileName}>
                        <Download className="w-3 h-3" />
                        Download
                      </a>
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Preview */}
            {isImage(selectedFile) && selectedFile.url ? (
              <div className="rounded-lg border border-border overflow-hidden bg-muted/30">
                <img src={selectedFile.url} alt={selectedFile.fileName} className="max-w-full h-auto" />
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-card border border-border text-center text-sm text-muted-foreground">
                <Eye className="w-6 h-6 mx-auto mb-2 opacity-40" />
                <p>Preview not available for this file type.</p>
                <p className="text-xs mt-1">Use the Open or Download button to view the file.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
