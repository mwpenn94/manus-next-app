/**
 * FeedbackWidget — In-app feedback collection widget
 *
 * Collects user feedback and routes it to the notification system.
 * Can be wired to GitHub Issues via webhook when configured.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, X, Send, Bug, Lightbulb, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type FeedbackType = "bug" | "feature" | "praise";

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const notifyOwner = trpc.system.notifyOwner.useMutation();

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error("Please enter feedback");
      return;
    }
    setSubmitting(true);
    try {
      await notifyOwner.mutateAsync({
        title: `[Feedback/${type}] User feedback`,
        content: `Type: ${type}\n\n${message}`,
      });
      toast.success("Feedback submitted — thank you!");
      setMessage("");
      setIsOpen(false);
    } catch {
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const types: { id: FeedbackType; label: string; icon: typeof Bug }[] = [
    { id: "bug", label: "Bug", icon: Bug },
    { id: "feature", label: "Feature", icon: Lightbulb },
    { id: "praise", label: "Praise", icon: ThumbsUp },
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-all flex items-center justify-center"
        title="Send Feedback"
      >
        <MessageSquare className="w-5 h-5" />
      </button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 z-50 w-80 shadow-2xl border-border bg-card">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Send Feedback</CardTitle>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          {types.map((t) => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors",
                type === t.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <t.icon className="w-3 h-3" />
              {t.label}
            </button>
          ))}
        </div>
        <Textarea
          placeholder="Describe your feedback..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="text-sm resize-none"
        />
        <Button
          onClick={handleSubmit}
          disabled={submitting || !message.trim()}
          size="sm"
          className="w-full"
        >
          <Send className="w-3.5 h-3.5 mr-2" />
          {submitting ? "Sending..." : "Submit"}
        </Button>
      </CardContent>
    </Card>
  );
}
