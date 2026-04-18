/**
 * MemoryPage — Cross-session memory management
 *
 * Users can view, add, search, and delete persistent memory entries
 * that the agent uses to personalize responses across sessions.
 */
import { useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";

export default function MemoryPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [adding, setAdding] = useState(false);

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
    onError: (err) => toast.error(err.message),
  });

  const deleteMemory = trpc.memory.delete.useMutation({
    onSuccess: () => {
      toast.success("Memory deleted");
      refetch();
    },
  });

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
    <div className="h-full overflow-y-auto">
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
          Add facts about yourself, preferences, or context the agent should remember.
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

        {/* Add new */}
        {adding ? (
          <div className="mb-6 p-4 rounded-xl bg-card border border-border space-y-3">
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
          <Button
            variant="outline"
            className="mb-6 w-full border-dashed"
            onClick={() => setAdding(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Memory Entry
          </Button>
        )}

        {/* Memory list */}
        <div className="space-y-2">
          {displayMemories.length === 0 ? (
            <div className="py-12 text-center">
              <Sparkles className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "No matching memories found" : "No memories yet. Add some to personalize your agent."}
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
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteMemory.mutate({ id: m.id })}
                    className="p-1.5 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
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
