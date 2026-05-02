import { useState } from "react";
import {
  Brain,
  Clock,
  Search,
  Plus,
  Trash2,
  Tag,
  Archive,
  ArchiveRestore,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AgentMemoryTimeline(): React.JSX.Element {
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newEntry, setNewEntry] = useState({ key: "", value: "" });
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: memories = [], isLoading } = trpc.memory.list.useQuery();
  const { data: archivedMemories = [] } = trpc.memory.listArchived.useQuery(undefined, { enabled: showArchived });
  const { data: searchResults } = trpc.memory.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length > 2 }
  );

  const addMemory = trpc.memory.add.useMutation({
    onSuccess: () => {
      utils.memory.list.invalidate();
      setShowAdd(false);
      setNewEntry({ key: "", value: "" });
    },
  });
  const deleteMemory = trpc.memory.delete.useMutation({
    onSuccess: () => {
      utils.memory.list.invalidate();
      utils.memory.listArchived.invalidate();
    },
  });
  const unarchiveMemory = trpc.memory.unarchive.useMutation({
    onSuccess: () => {
      utils.memory.list.invalidate();
      utils.memory.listArchived.invalidate();
    },
  });

  const displayMemories = searchQuery.length > 2 && searchResults
    ? searchResults
    : showArchived ? archivedMemories : memories;

  const selected = displayMemories.find((m: any) => m.id === selectedId);

  return (
    <div className="flex flex-col h-full bg-background text-foreground rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Brain className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Agent Memory</h2>
            <p className="text-xs text-muted-foreground">
              {memories.length} active{showArchived ? ` · ${archivedMemories.length} archived` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className={cn("gap-1.5", showArchived && "bg-accent")}
            onClick={() => setShowArchived(!showArchived)}
          >
            <Archive className="w-3.5 h-3.5" />
            {showArchived ? "Active" : "Archived"}
          </Button>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Memory Entry</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <Input
                  placeholder="Key (e.g., user_preference_theme)"
                  value={newEntry.key}
                  onChange={(e) => setNewEntry({ ...newEntry, key: e.target.value })}
                />
                <textarea
                  placeholder="Value (what the agent should remember)"
                  value={newEntry.value}
                  onChange={(e) => setNewEntry({ ...newEntry, value: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <Button
                  onClick={() => addMemory.mutate({ key: newEntry.key, value: newEntry.value, source: "user" })}
                  className="w-full"
                  disabled={!newEntry.key.trim() || !newEntry.value.trim() || addMemory.isPending}
                >
                  {addMemory.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Brain className="w-4 h-4 mr-2" />}
                  Save Memory
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="px-5 py-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search memories (semantic + keyword)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Memory List */}
        <div className={cn("overflow-y-auto", selected ? "w-80 border-r border-border" : "flex-1")}>
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && displayMemories.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Brain className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">{searchQuery ? "No matching memories." : showArchived ? "No archived memories." : "No memories yet."}</p>
              <p className="text-xs mt-1">The agent learns from interactions and stores key information here.</p>
            </div>
          )}

          {!isLoading && displayMemories.map((memory: any) => (
            <button
              key={memory.id}
              className={cn(
                "w-full text-left px-4 py-3 border-b border-border/50 transition-colors",
                selectedId === memory.id ? "bg-primary/5" : "hover:bg-accent/30"
              )}
              onClick={() => setSelectedId(memory.id)}
            >
              <div className="flex items-start gap-2.5">
                <Tag className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium truncate">{memory.key}</span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full",
                      memory.source === "user" ? "bg-blue-500/10 text-blue-500" : "bg-purple-500/10 text-purple-500"
                    )}>
                      {memory.source}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{memory.value}</p>
                  <span className="text-[9px] text-muted-foreground/60 flex items-center gap-0.5 mt-1">
                    <Clock className="w-2.5 h-2.5" />
                    {memory.createdAt ? new Date(memory.createdAt).toLocaleString() : "—"}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="flex-1 overflow-y-auto p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold">{(selected as any).key}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full",
                    (selected as any).source === "user" ? "bg-blue-500/10 text-blue-500" : "bg-purple-500/10 text-purple-500"
                  )}>
                    {(selected as any).source}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {(selected as any).createdAt ? new Date((selected as any).createdAt).toLocaleString() : "—"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {showArchived ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => unarchiveMemory.mutate({ id: (selected as any).id })}
                    disabled={unarchiveMemory.isPending}
                  >
                    <ArchiveRestore className="w-3 h-3" />
                    Restore
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                  onClick={() => {
                    deleteMemory.mutate({ id: (selected as any).id });
                    setSelectedId(null);
                  }}
                  disabled={deleteMemory.isPending}
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </Button>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-card border border-border">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{(selected as any).value}</p>
            </div>

            {(selected as any).taskExternalId && (
              <div className="mt-3 text-xs text-muted-foreground">
                <span className="font-medium">Related Task:</span> {(selected as any).taskExternalId}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
