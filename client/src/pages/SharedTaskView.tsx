/**
 * SharedTaskView — Public view of a shared task
 *
 * Renders a read-only view of a task's conversation history.
 * Supports password-protected shares.
 */
import { useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, MessageSquare, Bot, User, AlertCircle } from "lucide-react";
import { Streamdown } from "streamdown";

export default function SharedTaskView() {
  const params = useParams<{ token: string }>();
  const token = params.token || "";
  const [password, setPassword] = useState("");
  const [submittedPassword, setSubmittedPassword] = useState<string | undefined>();

  const { data, isLoading, error } = trpc.share.view.useQuery(
    { shareToken: token, password: submittedPassword },
    { enabled: !!token, retry: false }
  );

  // Password required state
  if (data && "error" in data && data.error === "password_required") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-lg font-semibold text-foreground">Protected Share</h1>
            <p className="text-sm text-muted-foreground mt-1">Enter the password to view this task</p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSubmittedPassword(password);
            }}
            className="space-y-3"
          >
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-card border-border"
              autoFocus
            />
            <Button type="submit" className="w-full" disabled={!password}>
              Unlock
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Error state
  if (data && "error" in data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-foreground">{data.error}</h1>
          <p className="text-sm text-muted-foreground mt-1">This share link may have expired or been deleted.</p>
        </div>
      </div>
    );
  }

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Success — render task
  const task = data?.task;
  const messages = data?.messages || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-sm font-semibold text-foreground">{task?.title || "Shared Task"}</h1>
            <p className="text-xs text-muted-foreground">
              Shared via Manus · {task?.status || "unknown"}
            </p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {messages.map((msg: any, i: number) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role !== "user" && (
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4 text-primary" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-foreground"
              }`}
            >
              {msg.role === "user" ? (
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <div className="text-sm prose prose-invert prose-sm max-w-none">
                  <Streamdown>{msg.content}</Streamdown>
                </div>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-1">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-4 text-center">
        <p className="text-xs text-muted-foreground">
          Powered by <a href="/" className="text-primary hover:underline">Manus</a> — Open-source AI Agent Platform
        </p>
      </footer>
    </div>
  );
}
