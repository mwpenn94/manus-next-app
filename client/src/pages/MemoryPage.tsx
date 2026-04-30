/**
 * MemoryPage — Cross-session memory management
 *
 * Users can view, add, search, and delete persistent memory entries
 * that the agent uses to personalize responses across sessions.
 * Supports drag-and-drop multi-file upload with progress bars and auto-categorization.
 * Includes Active/Archived tabs with one-click unarchive and bulk actions.
 */
import { useState, useRef, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/EmptyState";
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
  Archive,
  RotateCcw,
  Clock,
  CheckSquare,
  Square,
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
  const entries: Array<{ key: string; value: string }> = [];
  const baseName = file.name.replace(/\.[^.]+$/, "");

  if (file.name.endsWith(".pdf") || file.type === "application/pdf") {
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );
    try {
      const response = await fetch("/api/trpc/library.extractPdfFromUpload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ json: { base64, fileName: file.name } }),
      });
      if (!response.ok) throw new Error("PDF extraction failed");
      const data = await response.json();
      const result = data?.result?.data?.json || data?.result?.data || data;
      const pdfText = result?.text || "";
      if (pdfText) {
        const sections = pdfText.split(/\n-- \d+ of \d+ --\n/).filter((s: string) => s.trim());
        if (sections.length > 1) {
          sections.forEach((section: string, i: number) => {
            const firstLine = section.trim().split("\n")[0]?.slice(0, 80) || `Page ${i + 1}`;
            entries.push({ key: `${baseName} — ${firstLine}`.slice(0, 500), value: section.trim().slice(0, 5000) });
          });
        } else {
          entries.push({ key: baseName, value: pdfText.slice(0, 5000) });
        }
      } else {
        entries.push({ key: baseName, value: "[PDF text extraction returned empty]" });
      }
    } catch (err) {
      entries.push({ key: baseName, value: `[Failed to extract PDF: ${err instanceof Error ? err.message : "Unknown"}]` });
    }
    return entries.length > 0 ? entries : [{ key: baseName, value: "[Empty PDF]" }];
  }

  const text = await file.text();
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
          entries.push({ key: k.slice(0, 500), value: typeof v === "string" ? v.slice(0, 5000) : JSON.stringify(v).slice(0, 5000) });
        });
      }
    } catch { entries.push({ key: baseName, value: text.slice(0, 5000) }); }
  } else if (file.name.endsWith(".csv")) {
    const lines = text.split("\n").filter((l) => l.trim());
    const headers = lines[0]?.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    for (let i = 1; i < lines.length && i <= 100; i++) {
      const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      const key = cols[0] || `${baseName} row ${i}`;
      const value = headers ? headers.map((h, j) => `${h}: ${cols[j] || ""}`).join("\n") : cols.join(", ");
      entries.push({ key: key.slice(0, 500), value: value.slice(0, 5000) });
    }
  } else if (file.name.endsWith(".md") || file.name.endsWith(".txt")) {
    const sections = text.split(/(?=^#{1,3}\s)/m).filter((s) => s.trim());
    if (sections.length > 1) {
      sections.forEach((section) => {
        const firstLine = section.split("\n")[0].replace(/^#+\s*/, "").trim();
        entries.push({ key: (firstLine || baseName).slice(0, 500), value: section.trim().slice(0, 5000) });
      });
    } else {
      const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 20);
      if (paragraphs.length > 1) {
        paragraphs.forEach((p, i) => {
          const firstLine = p.split("\n")[0].trim().slice(0, 80);
          entries.push({ key: `${baseName} — ${firstLine || `Section ${i + 1}`}`.slice(0, 500), value: p.trim().slice(0, 5000) });
        });
      } else { entries.push({ key: baseName, value: text.slice(0, 5000) }); }
    }
  } else { entries.push({ key: baseName, value: text.slice(0, 5000) }); }
  return entries.slice(0, 100);
}

type TabId = "active" | "archived";

export default function MemoryPage() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<TabId>("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [adding, setAdding] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<FileUploadItem[]>([]);
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [selectedArchived, setSelectedArchived] = useState<Set<number>>(new Set());
  const [selectedMemoryId, setSelectedMemoryId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: memories = [], refetch, isLoading: memoriesLoading } = trpc.memory.list.useQuery(
    { limit: 100 },
    { enabled: isAuthenticated }
  );
  const { data: archivedMemories = [], refetch: refetchArchived } = trpc.memory.listArchived.useQuery(
    { limit: 200 },
    { enabled: isAuthenticated && activeTab === "archived" }
  );
  const { data: searchResults } = trpc.memory.search.useQuery(
    { query: searchQuery, limit: 20 },
    { enabled: isAuthenticated && searchQuery.length > 0 && activeTab === "active" }
  );

  const addMemory = trpc.memory.add.useMutation({
    onSuccess: () => { toast.success("Memory added"); setNewKey(""); setNewValue(""); setAdding(false); refetch(); },
    onError: (err) => { toast.error(err.message); },
  });
  const bulkAdd = trpc.memory.bulkAdd.useMutation({ onError: (err) => { toast.error("Bulk add failed: " + err.message); } });
  const deleteMemory = trpc.memory.delete.useMutation({
    onSuccess: () => { toast.success("Memory deleted"); refetch(); refetchArchived(); },
    onError: (err) => { toast.error("Delete failed: " + err.message); },
  });
  const unarchiveMemory = trpc.memory.unarchive.useMutation({
    onSuccess: () => { toast.success("Memory restored"); refetch(); refetchArchived(); },
    onError: (err) => { toast.error("Restore failed: " + err.message); },
  });

  const handleBulkUnarchive = useCallback(async () => {
    if (selectedArchived.size === 0) return;
    const ids = Array.from(selectedArchived);
    let restored = 0;
    for (const id of ids) {
      try { await unarchiveMemory.mutateAsync({ id }); restored++; } catch { /* handled */ }
    }
    setSelectedArchived(new Set());
    if (restored > 0) toast.success(`Restored ${restored} memor${restored === 1 ? "y" : "ies"}`);
  }, [selectedArchived, unarchiveMemory]);

  const toggleArchivedSelection = useCallback((id: number) => {
    setSelectedArchived((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);

  const selectAllArchived = useCallback(() => {
    if (selectedArchived.size === archivedMemories.length) setSelectedArchived(new Set());
    else setSelectedArchived(new Set(archivedMemories.map((m: any) => m.id)));
  }, [selectedArchived.size, archivedMemories]);

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const validFiles = fileArray.filter((f) => {
        if (f.size > MAX_FILE_SIZE) { toast.error(`${f.name} is too large (max 10MB)`); return false; }
        const ext = "." + f.name.split(".").pop()?.toLowerCase();
        if (!ACCEPTED_EXTENSIONS.includes(ext) && !ACCEPTED_TYPES.includes(f.type)) { toast.error(`${f.name}: unsupported file type`); return false; }
        return true;
      });
      if (validFiles.length === 0) return;
      setShowUploadPanel(true);
      const newItems: FileUploadItem[] = validFiles.map((f) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, file: f, status: "pending" as const, progress: 0, category: "", entriesCount: 0,
      }));
      setUploadQueue((prev) => [...prev, ...newItems]);
      for (const item of newItems) {
        try {
          setUploadQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: "parsing" as const, progress: 20 } : q)));
          const entries = await parseFileToEntries(item.file);
          const text = await item.file.text();
          const category = autoCategory(item.file.name, text);
          setUploadQueue((prev) => prev.map((q) => q.id === item.id ? { ...q, status: "uploading" as const, progress: 50, category, entriesCount: entries.length } : q));
          if (entries.length > 0) {
            const taggedEntries = entries.map((e) => ({ ...e, key: `[${category}] ${e.key}`, source: "user" as const }));
            for (let i = 0; i < taggedEntries.length; i += 50) {
              const batch = taggedEntries.slice(i, i + 50);
              await bulkAdd.mutateAsync({ entries: batch });
              const batchProgress = 50 + Math.round(((i + batch.length) / taggedEntries.length) * 45);
              setUploadQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, progress: batchProgress } : q)));
            }
          }
          setUploadQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: "done" as const, progress: 100 } : q)));
        } catch (err: any) {
          setUploadQueue((prev) => prev.map((q) => q.id === item.id ? { ...q, status: "error" as const, error: err.message || "Failed to process" } : q));
        }
      }
      refetch();
      toast.success(`Processed ${validFiles.length} file(s)`);
    },
    [bulkAdd, refetch]
  );

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files); }, [processFiles]);
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(false); }, []);

  const filteredArchived = useMemo(() => archivedMemories.filter((m: any) => m.archived === 1), [archivedMemories]);

  if (authLoading) {
    return (<div className="flex items-center justify-center min-h-[50vh]"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>);
  }
  if (!isAuthenticated) {
    return (<div className="flex flex-col items-center justify-center min-h-[50vh] gap-4"><Brain className="w-12 h-12 text-muted-foreground" /><p className="text-muted-foreground">Sign in to manage your memory</p><Button onClick={() => (window.location.href = getLoginUrl())}>Sign In</Button></div>);
  }

  const displayMemories = searchQuery.length > 0 && activeTab === "active" ? searchResults || [] : memories;

  return (
    <div className="h-full overflow-y-auto relative" onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}>
      {dragOver && (
        <div className="absolute inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary rounded-xl flex items-center justify-center backdrop-blur-sm">
          <div className="text-center">
            <Upload className="w-10 h-10 text-primary mx-auto mb-2" />
            <p className="text-lg font-medium text-primary">Drop files to import</p>
            <p className="text-sm text-muted-foreground mt-1">.txt, .md, .csv, .json, .pdf, .docx</p>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/")} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-semibold text-foreground">Memory</h1>
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{memories.length} active</span>
          {filteredArchived.length > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{filteredArchived.length} archived</span>
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          Memory entries persist across sessions. The agent uses them to personalize responses.
          Add facts, preferences, or drag-and-drop files to bulk import knowledge.
        </p>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 p-1 bg-muted/50 rounded-lg w-fit">
          <button
            onClick={() => { setActiveTab("active"); setSelectedArchived(new Set()); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === "active" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <span className="flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5" />
              Active
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{memories.length}</span>
            </span>
          </button>
          <button
            onClick={() => { setActiveTab("archived"); refetchArchived(); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === "archived" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <span className="flex items-center gap-1.5">
              <Archive className="w-3.5 h-3.5" />
              Archived
              {filteredArchived.length > 0 && (
                <span className="text-[10px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded-full">{filteredArchived.length}</span>
              )}
            </span>
          </button>
        </div>

        {/* Active tab */}
        {activeTab === "active" && (
          <>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search memories..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-card border-border/60" />
            </div>

            <div className="flex gap-2 mb-6">
              {adding ? (
                <div className="w-full p-4 rounded-xl bg-card border border-border/60 space-y-3">
                  <Input placeholder="Key (e.g., 'Preferred programming language')" value={newKey} onChange={(e) => setNewKey(e.target.value)} className="bg-background border-border/60" autoFocus />
                  <textarea placeholder="Value (e.g., 'TypeScript — prefers strict mode')" value={newValue} onChange={(e) => setNewValue(e.target.value)} className="w-full resize-none bg-background border border-border/60 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[80px]" />
                  <div className="flex items-center gap-2">
                    <Button onClick={() => addMemory.mutate({ key: newKey, value: newValue, source: "user" })} disabled={!newKey.trim() || !newValue.trim()} size="sm">Save</Button>
                    <Button variant="outline" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <Button variant="outline" className="flex-1 border-dashed" onClick={() => setAdding(true)}>
                    <Plus className="w-4 h-4 mr-2" />Add Entry
                  </Button>
                  <Button variant="outline" className="flex-1 border-dashed" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />Import Files
                  </Button>
                  <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_EXTENSIONS.join(",")} className="hidden" onChange={(e) => { if (e.target.files && e.target.files.length > 0) { processFiles(e.target.files); e.target.value = ""; } }} />
                </>
              )}
            </div>

            {showUploadPanel && uploadQueue.length > 0 && (
              <div className="mb-6 rounded-xl bg-card border border-border/60 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">File Import</span>
                    <span className="text-xs text-muted-foreground">{uploadQueue.filter((q) => q.status === "done").length}/{uploadQueue.length} complete</span>
                  </div>
                  <button onClick={() => { setShowUploadPanel(false); setUploadQueue([]); }} className="p-1 rounded text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
                </div>
                <div className="divide-y divide-border">
                  {uploadQueue.map((item) => (
                    <div key={item.id} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          {item.status === "done" ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" /> : item.status === "error" ? <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" /> : <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />}
                          <span className="text-sm text-foreground truncate">{item.file.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {item.category && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{item.category}</span>}
                          {item.entriesCount > 0 && <span className="text-[10px] text-muted-foreground">{item.entriesCount} entries</span>}
                        </div>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-300 ${item.status === "error" ? "bg-destructive" : item.status === "done" ? "bg-green-500" : "bg-primary"}`} style={{ width: `${item.progress}%` }} />
                      </div>
                      {item.error && <p className="text-[10px] text-destructive mt-1">{item.error}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {memoriesLoading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="p-3 rounded-lg bg-card border border-border/60 animate-pulse">
                      <div className="h-4 w-24 bg-muted rounded mb-2" />
                      <div className="h-3 w-full bg-muted rounded mb-1" />
                      <div className="h-3 w-2/3 bg-muted rounded" />
                    </div>
                  ))}
                </div>
              ) : displayMemories.length === 0 ? (
                <EmptyState
                  icon={<Sparkles className="w-7 h-7 text-primary" />}
                  title={searchQuery ? "No matching memories" : "No memories yet"}
                  description={searchQuery ? "Try adjusting your search terms." : "Add entries or drag-and-drop files to import knowledge."}
                />
              ) : (
                displayMemories.map((m: any) => (
                  <div key={m.id}>
                    <div
                      className={`group p-3 rounded-lg bg-card border transition-colors cursor-pointer ${
                        selectedMemoryId === m.id ? "border-primary/40 bg-primary/5" : "border-border/60 hover:border-primary/20"
                      }`}
                      onClick={() => setSelectedMemoryId(selectedMemoryId === m.id ? null : m.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Tag className="w-3 h-3 text-primary" />
                            <span className="text-sm font-medium text-foreground">{m.key}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{m.source}</span>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{m.value}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">{formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); deleteMemory.mutate({ id: m.id }); }} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100" title="Delete memory">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {selectedMemoryId === m.id && (
                      <RelatedMemories memoryKey={m.key} memoryValue={m.value} currentId={m.id} />
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Archived tab */}
        {activeTab === "archived" && (
          <>
            {filteredArchived.length > 0 && (
              <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-card border border-border/60">
                <div className="flex items-center gap-3">
                  <button onClick={selectAllArchived} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors" title={selectedArchived.size === filteredArchived.length ? "Deselect all" : "Select all"}>
                    {selectedArchived.size === filteredArchived.length && filteredArchived.length > 0 ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                  </button>
                  <span className="text-sm text-muted-foreground">{selectedArchived.size > 0 ? `${selectedArchived.size} selected` : `${filteredArchived.length} archived memor${filteredArchived.length === 1 ? "y" : "ies"}`}</span>
                </div>
                {selectedArchived.size > 0 && (
                  <Button size="sm" variant="outline" onClick={handleBulkUnarchive} disabled={unarchiveMemory.isPending} className="text-primary border-primary/30 hover:bg-primary/10">
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />Restore {selectedArchived.size}
                  </Button>
                )}
              </div>
            )}

            <div className="space-y-2">
              {filteredArchived.length === 0 ? (
                <div className="py-12 text-center">
                  <Archive className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium text-muted-foreground mb-2">No archived memories</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    Memories that haven't been used in 30+ days are automatically archived to keep your active memory focused and relevant. Archived memories can be restored at any time.
                  </p>
                </div>
              ) : (
                filteredArchived.map((m: any) => (
                  <div key={m.id} className={`group p-3 rounded-lg border transition-colors ${selectedArchived.has(m.id) ? "bg-primary/5 border-primary/30" : "bg-card border-border/60 hover:border-amber-500/20"}`}>
                    <div className="flex items-start gap-3">
                      <button onClick={() => toggleArchivedSelection(m.id)} className="mt-0.5 p-0.5 rounded text-muted-foreground hover:text-primary transition-colors shrink-0">
                        {selectedArchived.has(m.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Tag className="w-3 h-3 text-amber-500" />
                          <span className="text-sm font-medium text-foreground/70">{m.key}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">archived</span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{m.value}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />Created {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}
                          </span>
                          {m.lastAccessedAt && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">Last used {formatDistanceToNow(new Date(m.lastAccessedAt), { addSuffix: true })}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => unarchiveMemory.mutate({ id: m.id })} className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Restore memory">
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteMemory.mutate({ id: m.id })} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Delete permanently">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   RELATED MEMORIES — keyword-based similarity
   ═══════════════════════════════════════════════════════ */
function RelatedMemories({ memoryKey, memoryValue, currentId }: { memoryKey: string; memoryValue: string; currentId: number }) {
  // Build a search query from the memory's key words
  const searchTerm = useMemo(() => {
    const words = memoryKey.split(/[\s\-_]+/).filter(w => w.length > 2).slice(0, 3);
    return words.join(" ");
  }, [memoryKey]);

  const { data: related, isLoading } = trpc.memory.search.useQuery(
    { query: searchTerm, limit: 6 },
    { enabled: searchTerm.length > 0 }
  );

  const filtered = useMemo(() => {
    if (!related) return [];
    return related.filter((r: any) => r.id !== currentId).slice(0, 4);
  }, [related, currentId]);

  if (isLoading) {
    return (
      <div className="ml-4 mt-1 mb-2 pl-3 border-l-2 border-primary/20 py-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          Finding related memories...
        </div>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="ml-4 mt-1 mb-2 pl-3 border-l-2 border-muted py-2">
        <p className="text-[11px] text-muted-foreground">No related memories found</p>
      </div>
    );
  }

  return (
    <div className="ml-4 mt-1 mb-2 pl-3 border-l-2 border-primary/20 py-2 space-y-1.5">
      <p className="text-[11px] font-medium text-primary/70 flex items-center gap-1">
        <Sparkles className="w-3 h-3" />
        Related Memories ({filtered.length})
      </p>
      {filtered.map((r: any) => (
        <div key={r.id} className="p-2 rounded-md bg-muted/30 border border-border/60/50">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Tag className="w-2.5 h-2.5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">{r.key}</span>
          </div>
          <p className="text-[11px] text-muted-foreground line-clamp-2">{r.value}</p>
        </div>
      ))}
    </div>
  );
}
