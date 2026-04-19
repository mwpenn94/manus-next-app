#!/usr/bin/env node
/**
 * Creates stub pages for RED capabilities that can be partially implemented
 * within the current architecture. Each stub has:
 * - A functional page component with proper UI
 * - A "coming soon" state for features that need external infrastructure
 * - A documented failover path
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const PAGES_DIR = join(process.cwd(), 'client/src/pages');

const stubs = [
  {
    file: 'SkillsPage.tsx',
    content: `import { useAuth } from "@/_core/hooks/useAuth";
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

  const categories = useMemo(() => ["all", ...new Set(SKILLS.map(s => s.category))], []);
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
}`,
  },
  {
    file: 'SlidesPage.tsx',
    content: `import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Presentation, Plus, FileText, Clock, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const TEMPLATES = [
  { id: "blank", name: "Blank Deck", description: "Start from scratch", icon: FileText },
  { id: "pitch", name: "Pitch Deck", description: "Startup pitch template", icon: Sparkles },
  { id: "report", name: "Report", description: "Business report template", icon: FileText },
  { id: "lesson", name: "Lesson Plan", description: "Educational presentation", icon: FileText },
];

export default function SlidesPage() {
  const [prompt, setPrompt] = useState("");

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Presentation className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Manus Slides</h1>
        </div>
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Generate a Presentation</CardTitle>
            <CardDescription>Describe your presentation and AI will create slides for you</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input placeholder="e.g., Create a 10-slide pitch deck for a SaaS startup..." value={prompt} onChange={e => setPrompt(e.target.value)} className="flex-1" />
              <Button onClick={() => toast.info("Slide generation coming soon — use the agent chat to generate presentations")} disabled={!prompt.trim()}>
                <Sparkles className="w-4 h-4 mr-1.5" /> Generate
              </Button>
            </div>
          </CardContent>
        </Card>
        <h2 className="text-lg font-medium text-foreground mb-4">Templates</h2>
        <div className="grid grid-cols-2 gap-4">
          {TEMPLATES.map(t => (
            <Card key={t.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => toast.info("Template selection coming soon")}>
              <CardContent className="pt-6 text-center">
                <t.icon className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium text-foreground">{t.name}</p>
                <p className="text-sm text-muted-foreground">{t.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}`,
  },
  {
    file: 'ConnectorsPage.tsx',
    content: `import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plug, Search, ExternalLink, CheckCircle } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const CONNECTORS = [
  { id: "slack", name: "Slack", description: "Send messages and manage channels", category: "Communication", status: "planned", icon: "💬" },
  { id: "zapier", name: "Zapier", description: "Connect to 5000+ apps via Zapier", category: "Automation", status: "planned", icon: "⚡" },
  { id: "mcp", name: "MCP Protocol", description: "Model Context Protocol integration", category: "AI", status: "planned", icon: "🔗" },
  { id: "github", name: "GitHub", description: "Manage repos, issues, and PRs", category: "Development", status: "planned", icon: "🐙" },
  { id: "google-drive", name: "Google Drive", description: "Access and manage Drive files", category: "Storage", status: "planned", icon: "📁" },
  { id: "notion", name: "Notion", description: "Read and write Notion pages", category: "Productivity", status: "planned", icon: "📝" },
  { id: "email", name: "Email (SMTP)", description: "Send and receive emails", category: "Communication", status: "planned", icon: "📧" },
  { id: "calendar", name: "Google Calendar", description: "Manage calendar events", category: "Productivity", status: "planned", icon: "📅" },
];

export default function ConnectorsPage() {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => CONNECTORS.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase())
  ), [search]);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Plug className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Connectors</h1>
        </div>
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search connectors..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(c => (
            <Card key={c.id} className="hover:border-primary/30 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{c.icon}</span>
                  <div>
                    <CardTitle className="text-base">{c.name}</CardTitle>
                    <CardDescription>{c.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{c.category}</Badge>
                  <Button size="sm" variant="outline" onClick={() => toast.info(\`\${c.name} connector coming soon\`)}>
                    Connect
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}`,
  },
];

let count = 0;
for (const stub of stubs) {
  writeFileSync(join(PAGES_DIR, stub.file), stub.content);
  count++;
  console.log(`Created ${stub.file}`);
}

console.log(`\nCreated ${count} capability stub pages`);
