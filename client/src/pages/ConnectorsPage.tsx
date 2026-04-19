import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
                  <Button size="sm" variant="outline" onClick={() => toast.info(`${c.name} connector coming soon`)}>
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
}