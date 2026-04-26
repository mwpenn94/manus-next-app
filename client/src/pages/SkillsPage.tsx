import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Puzzle, Search, Star, Download, Trash2, Loader2, Plus, Wand2, Code, FileText } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const AVAILABLE_SKILLS = [
  { id: "web-search", name: "Web Search", description: "Search the web for real-time information using DuckDuckGo and Wikipedia", category: "Research", rating: 4.8 },
  { id: "wide-research", name: "Wide Research", description: "Parallel multi-source research synthesis with LLM aggregation", category: "Research", rating: 4.9 },
  { id: "code-execution", name: "Code Execution", description: "Execute JavaScript code in a sandboxed environment", category: "Development", rating: 4.7 },
  { id: "image-generation", name: "Image Generation", description: "Generate images from text descriptions via AI", category: "Creative", rating: 4.6 },
  { id: "document-generation", name: "Document Generation", description: "Create formatted documents (markdown, reports, plans)", category: "Productivity", rating: 4.5 },
  { id: "data-analysis", name: "Data Analysis", description: "Analyze datasets with structured insights and visualizations", category: "Analytics", rating: 4.7 },
  { id: "memory-search", name: "Memory Search", description: "Search cross-session memory entries for context", category: "Core", rating: 4.4 },
  { id: "image-analysis", name: "Image Analysis", description: "Analyze and describe uploaded images using vision AI", category: "Creative", rating: 4.5 },
  { id: "slide-generation", name: "Slide Generation", description: "Create AI-generated presentation decks", category: "Productivity", rating: 4.3 },
  { id: "email-drafting", name: "Email Drafting", description: "Draft professional emails with AI assistance", category: "Communication", rating: 4.2 },
  { id: "meeting-notes", name: "Meeting Notes", description: "Transcribe and summarize meeting recordings", category: "Communication", rating: 4.4 },
  { id: "browse-web", name: "Web Browsing", description: "Browse and extract structured data from web pages", category: "Research", rating: 4.3 },
];

export default function SkillsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const { data: installedSkills = [], isLoading } = trpc.skill.list.useQuery(undefined, { enabled: !!user });
  const utils = trpc.useUtils();

  const installMutation = trpc.skill.install.useMutation({
    onSuccess: () => {
      utils.skill.list.invalidate();
      toast.success("Skill installed successfully");
    },
    onError: (err) => { toast.error(`Failed to install: ${err.message}`); },
  });

  const uninstallMutation = trpc.skill.uninstall.useMutation({
    onSuccess: () => {
      utils.skill.list.invalidate();
      toast.success("Skill uninstalled");
    },
    onError: (err) => { toast.error(`Failed to uninstall: ${err.message}`); },
  });

  const toggleMutation = trpc.skill.toggle.useMutation({
    onSuccess: () => { utils.skill.list.invalidate(); },
    onError: (err) => { toast.error(`Failed to toggle: ${err.message}`); },
  });

  const installedIds = useMemo(() => new Set(installedSkills.map((s) => s.skillId)), [installedSkills]);
  const categories = useMemo(() => ["all", ...Array.from(new Set(AVAILABLE_SKILLS.map((s) => s.category)))], []);

  const filtered = useMemo(
    () =>
      AVAILABLE_SKILLS.filter((s) => {
        const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === "all" || s.category === filter;
        return matchesSearch && matchesFilter;
      }),
    [search, filter]
  );

  const handleInstall = (skill: (typeof AVAILABLE_SKILLS)[0]) => {
    installMutation.mutate({ skillId: skill.id, name: skill.name, description: skill.description, category: skill.category });
  };

  const handleUninstall = (skillId: string) => {
    uninstallMutation.mutate({ skillId });
  };

  const handleToggle = (skillId: string, enabled: boolean) => {
    toggleMutation.mutate({ skillId, enabled });
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Puzzle className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Skills Library</h1>
          <Badge variant="secondary" className="ml-auto">{installedSkills.length} installed</Badge>
        </div>

        {/* Skill Creator — Manus-style conversational tool creation */}
        <Card className="mb-6 border-dashed border-primary/30 bg-primary/5 hover:border-primary/50 transition-colors">
          <CardContent className="py-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Wand2 className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground mb-0.5">Create Custom Skill</h3>
                <p className="text-xs text-muted-foreground">
                  Describe what you want the skill to do and the agent will build it for you
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  toast.info("Describe your skill in the chat — the agent will create it conversationally");
                  window.location.href = "/";
                }}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Create
              </Button>
            </div>
          </CardContent>
        </Card>
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search skills..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 min-h-[44px]" />
          </div>
          <div className="flex gap-1.5 flex-wrap overflow-x-auto scrollbar-none">
            {categories.map((cat) => (
              <Button key={cat} variant={filter === cat ? "default" : "outline"} size="sm" onClick={() => setFilter(cat)} className="capitalize min-h-[44px] px-4 whitespace-nowrap">
                {cat}
              </Button>
            ))}
          </div>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
                <Search className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No skills match your search</p>
              <p className="text-xs text-muted-foreground max-w-sm">Try adjusting your search terms or category filter.</p>
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((skill) => {
              const installed = installedIds.has(skill.id);
              const installedRecord = installedSkills.find((s) => s.skillId === skill.id);
              return (
                <Card key={skill.id} className={`hover:border-primary/30 transition-colors ${installed ? "border-primary/20 bg-primary/5" : ""}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{skill.name}</CardTitle>
                      <Badge variant={installed ? "default" : "outline"}>{installed ? "Installed" : "Available"}</Badge>
                    </div>
                    <CardDescription>{skill.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                        {skill.rating}
                        <span className="mx-1">&middot;</span>
                        <Badge variant="secondary" className="text-xs">{skill.category}</Badge>
                      </div>
                      {installed ? (
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={installedRecord?.enabled ?? true}
                            onCheckedChange={(checked) => handleToggle(skill.id, checked)}
                          />
                          <Button size="sm" variant="ghost" onClick={() => handleUninstall(skill.id)}>
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleInstall(skill)} disabled={installMutation.isPending}>
                          {installMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Download className="w-3.5 h-3.5 mr-1" />}
                          Install
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          )
        )}
      </div>
    </div>
  );
}
