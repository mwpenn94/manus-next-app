import { useState, useMemo } from "react";
import {
  BookOpen,
  Search,
  Plus,
  Trash2,
  FileText,
  Code,
  Clock,
  ChevronRight,
  Loader2,
  Eye,
  Brain,
  StickyNote,
  BookMarked,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

interface KnowledgeBaseExplorerProps {
  projectExternalId?: string;
}

const TYPE_CONFIG = {
  instruction: { icon: BookMarked, label: "Instruction", color: "text-blue-500", bg: "bg-blue-500/10" },
  file: { icon: Code, label: "File", color: "text-green-500", bg: "bg-green-500/10" },
  note: { icon: StickyNote, label: "Note", color: "text-amber-500", bg: "bg-amber-500/10" },
} as const;

export default function KnowledgeBaseExplorer({ projectExternalId }: KnowledgeBaseExplorerProps): React.JSX.Element {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ type: "note" as "instruction" | "file" | "note", title: "", content: "" });

  const utils = trpc.useUtils();

  const { data: items = [], isLoading } = trpc.project.knowledge.list.useQuery(
    { projectExternalId: projectExternalId ?? "" },
    { enabled: !!projectExternalId }
  );

  const addItem = trpc.project.knowledge.add.useMutation({
    onSuccess: () => {
      utils.project.knowledge.list.invalidate({ projectExternalId: projectExternalId ?? "" });
      setShowAdd(false);
      setNewItem({ type: "note", title: "", content: "" });
      toast.success("Knowledge item added");
    },
    onError: (err) => { toast.error(err.message); },
  });

  const deleteItem = trpc.project.knowledge.delete.useMutation({
    onSuccess: () => {
      utils.project.knowledge.list.invalidate({ projectExternalId: projectExternalId ?? "" });
      setSelectedItemId(null);
      toast.success("Item deleted");
    },
    onError: (err) => { toast.error(err.message); },
  });

  const filtered = useMemo(() => {
    let result = items as any[];
    if (filterType !== "all") {
      result = result.filter((item) => item.type === filterType);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((item: any) =>
        item.title?.toLowerCase().includes(q) || item.content?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, filterType, searchQuery]);

  const selectedItem = filtered.find((item: any) => item.id === selectedItemId);

  return (
    <div className="flex flex-col h-full bg-background text-foreground rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Knowledge Base</h2>
            <p className="text-xs text-muted-foreground">
              {(items as any[]).length} items
            </p>
          </div>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5" disabled={!projectExternalId}>
              <Plus className="w-3.5 h-3.5" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Knowledge Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="flex gap-2">
                {(["instruction", "file", "note"] as const).map((t) => {
                  const cfg = TYPE_CONFIG[t];
                  return (
                    <button
                      key={t}
                      onClick={() => setNewItem({ ...newItem, type: t })}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors border",
                        newItem.type === t ? `${cfg.bg} ${cfg.color} border-current` : "border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <cfg.icon className="w-3.5 h-3.5" />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
              <Input
                placeholder="Title"
                value={newItem.title}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
              />
              <textarea
                placeholder="Content..."
                value={newItem.content}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewItem({ ...newItem, content: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
              />
              <Button
                onClick={() => addItem.mutate({
                  projectExternalId: projectExternalId!,
                  type: newItem.type,
                  title: newItem.title,
                  content: newItem.content,
                })}
                className="w-full"
                disabled={!newItem.title.trim() || !newItem.content.trim() || addItem.isPending}
              >
                {addItem.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Add Item
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Filter */}
      <div className="px-5 py-3 border-b border-border flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            placeholder="Search knowledge base..."
            className="w-full pl-8 pr-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-1">
          {["all", "instruction", "file", "note"].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={cn(
                "px-2 py-1 text-[10px] rounded-md transition-colors",
                filterType === t ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "all" ? "All" : TYPE_CONFIG[t as keyof typeof TYPE_CONFIG].label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Item List */}
        <div className="w-80 border-r border-border overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="w-6 h-6 mx-auto mb-2 opacity-40" />
              <p className="text-xs">{searchQuery ? "No matching items." : "No knowledge items yet."}</p>
            </div>
          )}

          {filtered.map((item: any) => {
            const cfg = TYPE_CONFIG[item.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.note;
            return (
              <button
                key={item.id}
                className={cn(
                  "w-full text-left px-4 py-3 border-b border-border/50 transition-colors",
                  selectedItemId === item.id ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-accent/30"
                )}
                onClick={() => setSelectedItemId(item.id)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn("w-5 h-5 rounded flex items-center justify-center", cfg.bg)}>
                    <cfg.icon className={cn("w-3 h-3", cfg.color)} />
                  </div>
                  <span className="text-xs font-medium truncate">{item.title}</span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground/30 ml-auto shrink-0" />
                </div>
                <p className="text-[10px] text-muted-foreground line-clamp-2 ml-7">
                  {item.content?.slice(0, 120)}
                </p>
              </button>
            );
          })}
        </div>

        {/* Detail Panel */}
        <div className="flex-1 overflow-y-auto p-5">
          {!selectedItem && (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Eye className="w-6 h-6 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Select an item to view details.</p>
              </div>
            </div>
          )}

          {selectedItem && (() => {
            const cfg = TYPE_CONFIG[selectedItem.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.note;
            return (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", cfg.bg)}>
                      <cfg.icon className={cn("w-4 h-4", cfg.color)} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">{selectedItem.title}</h3>
                      <p className="text-[10px] text-muted-foreground">{cfg.label}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-red-500 hover:text-red-600"
                    onClick={() => deleteItem.mutate({ id: selectedItem.id })}
                    disabled={deleteItem.isPending}
                  >
                    {deleteItem.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Delete
                  </Button>
                </div>

                <div className="p-4 rounded-lg bg-card border border-border">
                  <pre className="text-xs text-foreground whitespace-pre-wrap leading-relaxed font-sans">
                    {selectedItem.content}
                  </pre>
                </div>

                {selectedItem.fileUrl && (
                  <div className="mt-3 p-3 rounded-lg bg-muted/30 border border-border">
                    <p className="text-[10px] text-muted-foreground mb-1">Attached File</p>
                    <a
                      href={selectedItem.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      {selectedItem.fileUrl}
                    </a>
                  </div>
                )}

                {selectedItem.createdAt && (
                  <p className="text-[10px] text-muted-foreground mt-3">
                    Created: {new Date(selectedItem.createdAt).toLocaleString()}
                  </p>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
