/**
 * MemoryPage — Cross-session memory management
 *
 * Users can view, add, search, and delete persistent memory entries
 * that the agent uses to personalize responses across sessions.
 * Supports drag-and-drop multi-file upload with progress bars and auto-categorization.
 */
import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Brain,
  Plus,
  Search,
  Trash2,
  Sparkles,
  ArrowLeft,
  Tag,
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";

/** Supported file types for knowledge import */
const ACCEPTED_TYPES = [
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ACCEPTED_EXTENSIONS = [".txt", ".md", ".csv", ".json", ".pdf", ".docx"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface FileUploadItem {
  id: string;
  file: File;
  status: "pending" | "parsing" | "uploading" | "done" | "error";
  progress: number;
  category: string;
  entriesCount: number;
  error?: string;
}

/** Auto-categorize based on file name and content */
function autoCategory(fileName: string, content: string): string {
  const lower = fileName.toLowerCase();
  const contentLower = content.toLowerCase().slice(0, 500);

  if (lower.includes("resume") || lower.includes("cv")) return "Personal — Resume";
  if (lower.includes("preference") || lower.includes("pref")) return "Preferences";
  if (lower.includes("note") || lower.includes("memo")) return "Notes";
  if (lower.includes("config") || lower.includes("setting")) return "Configuration";
  if (lower.includes("api") || lower.includes("endpoint")) return "API Reference";
  if (lower.includes("todo") || lower.includes("task")) return "Tasks & Plans";
  if (contentLower.includes("function") || contentLower.includes("import ") || contentLower.includes("const "))
    return "Code Snippets";
  if (contentLower.includes("http://") || contentLower.includes("https://"))
    return "Links & Resources";
  if (lower.endsWith(".csv") || lower.endsWith(".json")) return "Data";
  if (lower.endsWith(".md")) return "Documentation";
  return "General Knowledge";
}

/** Parse file content into key-value memory entries */
async function parseFileToEntries(file: File): Promise<Array<{ key: string; value: string }>> {
  const text = await file.text();
  const entries: Array<{ key: string; value: string }> = [];
  const baseName = file.name.replace(/\.[^.]+$/, "");

  if (file.name.endsWith(".json")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        parsed.forEach((item: any, i: number) => {
          const key = item.key || item.title || item.name || `${baseName} [${i + 1}]`;
          const value = item.value || item.content || item.description || JSON.stringify(item);
          entries.push({ key: String(key).slice(0, 500), value: String(value).slice(0, 5000) });
        });
      } else if (typeof parsed === "object") {
        Object.entries(parsed).forEach(([k, v]) => {
          entries.push({
            key: k.slice(0, 500),
            value: typeof v === "string" ? v.slice(0, 5000) : JSON.stringify(v).slice(0, 5000),
          });
        });
      }
    } catch {
      entries.push({ key: baseName, value: text.slice(0, 5000) });
    }
  } else if (file.name.endsWith(".csv")) {
    const lines = text.split("\n").filter((l) => l.trim());
    const headers = lines[0]?.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    for (let i = 1; i < lines.length && i <= 100; i++) {
      const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      const key = cols[0] || `${baseName} row ${i}`;
      const value = headers
        ? headers.map((h, j) => `${h}: ${cols[j] || ""}`).join("\n")
        : cols.join(", ");
      entries.push({ key: key.slice(0, 500), value: value.slice(0, 5000) });
    }
  } else if (file.name.endsWith(".md") || file.name.endsWith(".txt")) {
    // Split by headings or double newlines
    const sections = text.split(/(?=^#{1,3}\s)/m).filter((s) => s.trim());
    if (sections.length > 1) {
      sections.forEach((section) => {
        const firstLine = section.split("\n")[0].replace(/^#+\s*/, "").trim();
        const key = firstLine || baseName;
        entries.push({ key: key.slice(0, 500), value: section.trim().slice(0, 5000) });
      });
    } else {
      // Split by paragraphs if no headings
      const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 20);
      if (paragraphs.length > 1) {
        paragraphs.forEach((p, i) => {
          const firstLine = p.split("\n")[0].trim().slice(0, 80);
          entries.push({
            key: `${baseName} — ${firstLine || `Section ${i + 1}`}`.slice(0, 500),
            value: p.trim().slice(0, 5000),
          });
        });
      } else {
        entries.push({ key: baseName, value: text.slice(0, 5000) });
      }
    }
  } else {
    // Fallback: treat as single entry
    entries.push({ key: baseName, value: text.slice(0, 5000) });
  }

  return entries.slice(0, 100); // Cap at 100 entries per file
}

export default function MemoryPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [adding, setAdding] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<FileUploadItem[]>([]);
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: memories = [], refetch } = trpc.memory.list.useQuery(
    { limit: 100 },
    { enabled: isAuthenticated }
  );

  const { data: searchResults } = trpc.memory.search.useQuery(
    { query: searchQuery, limit: 20 },
    { enabled: isAuthenticated && searchQuery.length > 0 }
  );

  const addMemory = trpc.memory.add.useMutation({
    onSuccess: () => {
      toast.success("Memory added");
      setNewKey("");
      setNewValue("");
      setAdding(false);
      refetch();
    },
    onError: (err) => { toast.error(err.message); },
  });

  const bulkAdd = trpc.memory.bulkAdd.useMutation();

  const deleteMemory = trpc.memory.delete.useMutation({
    onSuccess: () => {
      toast.success("Memory deleted");
      refetch();
    },
  });

  /** Process a batch of files for upload */
  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const validFiles = fileArray.filter((f) => {
        if (f.size > MAX_FILE_SIZE) {
          toast.error(`${f.name} is too large (max 10MB)`);
          return false;
        }
        const ext = "." + f.name.split(".").pop()?.toLowerCase();
        if (!ACCEPTED_EXTENSIONS.includes(ext) && !ACCEPTED_TYPES.includes(f.type)) {
          toast.error(`${f.name}: unsupported file type`);
          return false;
        }
        return true;
      });

      if (validFiles.length === 0) return;

      setShowUploadPanel(true);

      const newItems: FileUploadItem[] = validFiles.map((f) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file: f,
        status: "pending" as const,
        progress: 0,
        category: "",
        entriesCount: 0,
      }));

      setUploadQueue((prev) => [...prev, ...newItems]);

      // Process each file sequentially
      for (const item of newItems) {
        try {
          // Parse phase
          setUploadQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, status: "parsing" as const, progress: 20 } : q))
          );

          const entries = await parseFileToEntries(item.file);
          const text = await item.file.text();
          const category = autoCategory(item.file.name, text);

          setUploadQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? { ...q, status: "uploading" as const, progress: 50, category, entriesCount: entries.length }
                : q
            )
          );

          // Upload phase — bulk add entries
          if (entries.length > 0) {
            const taggedEntries = entries.map((e) => ({
              ...e,
              key: `[${category}] ${e.key}`,
              source: "user" as const,
            }));

            // Batch in groups of 50
            for (let i = 0; i < taggedEntries.length; i += 50) {
              const batch = taggedEntries.slice(i, i + 50);
              await bulkAdd.mutateAsync({ entries: batch });
              const batchProgress = 50 + Math.round(((i + batch.length) / taggedEntries.length) * 45);
              setUploadQueue((prev) =>
                prev.map((q) => (q.id === item.id ? { ...q, progress: batchProgress } : q))
              );
            }
          }

          setUploadQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, status: "done" as const, progress: 100 } : q))
          );
        } catch (err: any) {
          setUploadQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? { ...q, status: "error" as const, error: err.message || "Failed to process" }
                : q
            )
          );
        }
      }

      refetch();
      toast.success(`Processed ${validFiles.length} file(s)`);
    },
    [bulkAdd, refetch]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Brain className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">Sign in to manage your memory</p>
        <Button onClick={() => (window.location.href = getLoginUrl())}>Sign In</Button>
      </div>
    );
  }

  const displayMemories = searchQuery.length > 0 ? searchResults || [] : memories;

  return (
    <div
      className="h-full overflow-y-auto relative"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Drag overlay */}
      {dragOver && (
        <div className="absolute inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary rounded-xl flex items-center justify-center backdrop-blur-sm">
          <div className="text-center">
            <Upload className="w-10 h-10 text-primary mx-auto mb-2" />
            <p className="text-lg font-medium text-primary">Drop files to import</p>
            <p className="text-sm text-muted-foreground mt-1">
              .txt, .md, .csv, .json, .pdf, .docx
            </p>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-semibold text-foreground">Memory</h1>
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {memories.length} entries
          </span>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          Memory entries persist across sessions. The agent uses them to personalize responses.
          Add facts, preferences, or drag-and-drop files to bulk import knowledge.
        </p>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search memories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mb-6">
          {adding ? (
            <div className="w-full p-4 rounded-xl bg-card border border-border space-y-3">
              <Input
                placeholder="Key (e.g., 'Preferred programming language')"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="bg-background border-border"
                autoFocus
              />
              <textarea
                placeholder="Value (e.g., 'TypeScript — prefers strict mode')"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="w-full resize-none bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[80px]"
              />
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => addMemory.mutate({ key: newKey, value: newValue, source: "user" })}
                  disabled={!newKey.trim() || !newValue.trim()}
                  size="sm"
                >
                  Save
                </Button>
                <Button variant="outline" size="sm" onClick={() => setAdding(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Button
                variant="outline"
                className="flex-1 border-dashed"
                onClick={() => setAdding(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Entry
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-dashed"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Import Files
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED_EXTENSIONS.join(",")}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    processFiles(e.target.files);
                    e.target.value = "";
                  }
                }}
              />
            </>
          )}
        </div>

        {/* Upload progress panel */}
        {showUploadPanel && uploadQueue.length > 0 && (
          <div className="mb-6 rounded-xl bg-card border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">File Import</span>
                <span className="text-xs text-muted-foreground">
                  {uploadQueue.filter((q) => q.status === "done").length}/{uploadQueue.length} complete
                </span>
              </div>
              <button
                onClick={() => {
                  setShowUploadPanel(false);
                  setUploadQueue([]);
                }}
                className="p-1 rounded text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="divide-y divide-border">
              {uploadQueue.map((item) => (
                <div key={item.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      {item.status === "done" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      ) : item.status === "error" ? (
                        <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                      ) : (
                        <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
                      )}
                      <span className="text-sm text-foreground truncate">{item.file.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.category && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          {item.category}
                        </span>
                      )}
                      {item.entriesCount > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          {item.entriesCount} entries
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        item.status === "error"
                          ? "bg-destructive"
                          : item.status === "done"
                          ? "bg-green-500"
                          : "bg-primary"
                      }`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  {item.error && (
                    <p className="text-[10px] text-destructive mt-1">{item.error}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Memory list */}
        <div className="space-y-2">
          {displayMemories.length === 0 ? (
            <div className="py-12 text-center">
              <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? "No matching memories found"
                  : "No memories yet. Add entries or drag-and-drop files to import knowledge."}
              </p>
            </div>
          ) : (
            displayMemories.map((m: any) => (
              <div
                key={m.id}
                className="group p-3 rounded-lg bg-card border border-border hover:border-primary/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Tag className="w-3 h-3 text-primary" />
                      <span className="text-sm font-medium text-foreground">{m.key}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {m.source}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{m.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteMemory.mutate({ id: m.id })}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete memory"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
