import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
}