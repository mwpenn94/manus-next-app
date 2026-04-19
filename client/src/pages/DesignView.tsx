/**
 * DesignView — Visual canvas for AI-generated artifacts
 * 
 * Stub implementation. Full canvas rendering engine planned for future release.
 * Currently shows a placeholder with feature description.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Paintbrush, Layers, Image, FileText, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

const PLANNED_FEATURES = [
  { icon: Paintbrush, title: "Visual Canvas", description: "Drag-and-drop canvas for arranging AI-generated content" },
  { icon: Layers, title: "Layer System", description: "Stack text, images, charts, and code blocks in layers" },
  { icon: Image, title: "Image Generation", description: "Generate and edit images directly on the canvas" },
  { icon: FileText, title: "Document Assembly", description: "Assemble multi-page documents from canvas elements" },
];

export default function DesignView() {
  const [, navigate] = useLocation();

  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      <div className="max-w-lg text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Paintbrush className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
          Design View
        </h1>
        <p className="text-muted-foreground mb-8">
          A visual canvas for composing AI-generated artifacts is coming soon.
          This will allow you to arrange text, images, charts, and code in a
          freeform layout.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {PLANNED_FEATURES.map((feature) => (
            <Card key={feature.title} className="bg-card border-border">
              <CardContent className="p-4 text-left">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <feature.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{feature.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{feature.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
      </div>
    </div>
  );
}
