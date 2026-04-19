import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Puzzle, Search, Star, Download, ExternalLink } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const SKILLS = [
  { id: "web-search", name: "Web Search", description: "Search the web for real-time information", category: "Research", installed: true, rating: 4.8 },
  { id: "wide-research", name: "Wide Research", description: "Parallel multi-source research synthesis", category: "Research", installed: true, rating: 4.9 },
  { id: "code-execution", name: "Code Execution", description: "Execute Python and JavaScript code", category: "Development", installed: true, rating: 4.7 },
  { id: "image-generation", name: "Image Generation", description: "Generate images from text descriptions", category: "Creative", installed: true, rating: 4.6 },
  { id: "document-generation", name: "Document Generation", description: "Create formatted documents (PDF, DOCX)", category: "Productivity", installed: true, rating: 4.5 },
  { id: "data-analysis", name: "Data Analysis", description: "Analyze datasets with visualizations", category: "Analytics", installed: true, rating: 4.7 },
  { id: "memory-search", name: "Memory Search", description: "Search cross-session memory entries", category: "Core", installed: true, rating: 4.4 },
  { id: "image-analysis", name: "Image Analysis", description: "Analyze and describe uploaded images", category: "Creative", installed: true, rating: 4.5 },
  { id: "slide-generation", name: "Slide Generation", description: "Create presentation decks", category: "Productivity", installed: false, rating: 4.3 },
  { id: "email-drafting", name: "Email Drafting", description: "Draft and send emails", category: "Communication", installed: false, rating: 4.2 },
  { id: "meeting-notes", name: "Meeting Notes", description: "Transcribe and summarize meetings", category: "Communication", installed: false, rating: 4.4 },
  { id: "figma-import", name: "Figma Import", description: "Import designs from Figma", category: "Design", installed: false, rating: 4.1 },
];

export default function SkillsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const categories = useMemo(() => ["all", ...Array.from(new Set(SKILLS.map(s => s.category)))], []);
  const filtered = useMemo(() => SKILLS.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || s.category === filter;
    return matchesSearch && matchesFilter;
  }), [search, filter]);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Puzzle className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Skills Library</h1>
        </div>
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search skills..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-1.5">
            {categories.map(cat => (
              <Button key={cat} variant={filter === cat ? "default" : "outline"} size="sm" onClick={() => setFilter(cat)} className="capitalize">
                {cat}
              </Button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(skill => (
            <Card key={skill.id} className="hover:border-primary/30 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{skill.name}</CardTitle>
                  <Badge variant={skill.installed ? "default" : "outline"}>
                    {skill.installed ? "Installed" : "Available"}
                  </Badge>
                </div>
                <CardDescription>{skill.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                    {skill.rating}
                    <span className="mx-1">·</span>
                    <Badge variant="secondary" className="text-xs">{skill.category}</Badge>
                  </div>
                  {!skill.installed && (
                    <Button size="sm" variant="outline" onClick={() => toast.info("Skill installation coming soon")}>
                      <Download className="w-3.5 h-3.5 mr-1" /> Install
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}