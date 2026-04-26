/**
 * SharedTaskView — Manus-style public share page
 *
 * Standalone layout (outside AppLayout sidebar/nav) that renders a
 * read-only view of a shared task conversation. Closely mirrors the
 * Manus share page at manus.im/share/{id}:
 *
 *  - Sticky header: paw logo + "manus" brand + model badge + action icons
 *  - max-w-[800px] centered message container
 *  - User messages right-aligned, assistant messages left-aligned with avatar
 *  - Action steps accordion with vertical connector line + checkmark circles
 *  - Interactive output cards for artifacts
 *  - Loading skeleton overlay
 *  - Sticky bottom CTA: "Try Manus Next" button
 *  - Password gate for protected shares
 *  - noindex meta tag (server-injected)
 */
import { useState, useEffect, useMemo } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import BrandAvatar from "@/components/BrandAvatar";
import { Input } from "@/components/ui/input";
import {
  Lock,
  AlertCircle,
  Link2,
  Check,
  ChevronDown,
  ChevronRight,
  SquarePen,
  Ellipsis,
  FileText,
  Globe,
  Code,
  Terminal,
  Search,
  Image as ImageIcon,
  Paintbrush,
  BookOpen,
  Wrench,
  Pencil,
  Eye,
  Download,
  ArrowUp,
  MousePointerClick,
  ScrollText,
  Rocket,
  BarChart3,
  Send,
  Package,
} from "lucide-react";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ────────────────────────────────────────────────────────────────────────────
 * Types for action steps (matches the AgentAction union from TaskContext)
 * ──────────────────────────────────────────────────────────────────────────── */
interface ActionStep {
  type: string;
  status: "active" | "done";
  url?: string;
  element?: string;
  command?: string;
  file?: string;
  query?: string;
  description?: string;
  label?: string;
  packages?: string;
  preview?: string;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Shared message type from the API
 * ──────────────────────────────────────────────────────────────────────────── */
interface SharedMessage {
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string | Date;
  actions?: ActionStep[];
  cardType?: string;
  cardData?: Record<string, unknown>;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Action step icon mapping
 * ──────────────────────────────────────────────────────────────────────────── */
function getActionIcon(type: string) {
  const map: Record<string, React.ElementType> = {
    browsing: Globe,
    scrolling: ScrollText,
    clicking: MousePointerClick,
    executing: Terminal,
    creating: FileText,
    searching: Search,
    generating: ImageIcon,
    thinking: BookOpen,
    writing: Pencil,
    researching: Search,
    building: Rocket,
    editing: Pencil,
    reading: Eye,
    installing: Package,
    versioning: Code,
    analyzing: BarChart3,
    designing: Paintbrush,
    sending: Send,
    deploying: Rocket,
  };
  return map[type] || Wrench;
}

function getActionLabel(action: ActionStep): string {
  switch (action.type) {
    case "browsing": return `Browsing ${action.url || "web page"}`;
    case "scrolling": return "Scrolling page";
    case "clicking": return `Clicking ${action.element || "element"}`;
    case "executing": return `Executing ${action.command || "command"}`;
    case "creating": return `Creating ${action.file || "file"}`;
    case "searching": return `Searching "${action.query || ""}"`;
    case "generating": return `Generating ${action.description || "content"}`;
    case "thinking": return "Thinking...";
    case "writing": return `Writing ${action.label || ""}`;
    case "researching": return `Researching ${action.label || ""}`;
    case "building": return `Building ${action.label || ""}`;
    case "editing": return `Editing ${action.file || action.label || ""}`;
    case "reading": return `Reading ${action.file || action.label || ""}`;
    case "installing": return `Installing ${action.packages || action.label || ""}`;
    case "versioning": return `Versioning ${action.label || ""}`;
    case "analyzing": return `Analyzing ${action.label || ""}`;
    case "designing": return `Designing ${action.label || ""}`;
    case "sending": return `Sending ${action.label || ""}`;
    case "deploying": return `Deploying ${action.label || ""}`;
    default: return action.label || action.type || "Action";
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * ActionStepsList — collapsible action steps with vertical connector
 * ──────────────────────────────────────────────────────────────────────────── */
function ActionStepsList({ actions }: { actions: ActionStep[] }) {
  const [expanded, setExpanded] = useState(false);
  const doneCount = actions.filter(a => a.status === "done").length;

  return (
    <div className="my-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
        <span className="font-medium">
          {doneCount} action{doneCount !== 1 ? "s" : ""} completed
        </span>
      </button>

      {expanded && (
        <div className="ml-1.5 mt-1 relative">
          {/* Vertical connector line */}
          <div className="absolute left-[5px] top-1 bottom-1 w-px bg-border" />

          {actions.map((action, i) => {
            const Icon = getActionIcon(action.type);
            const isDone = action.status === "done";
            return (
              <div key={i} className="flex items-start gap-2.5 py-1 relative">
                {/* Step circle */}
                <div
                  className={cn(
                    "w-[11px] h-[11px] rounded-full border-2 shrink-0 mt-0.5 z-10 bg-background",
                    isDone
                      ? "border-green-500 bg-green-500"
                      : "border-muted-foreground/40"
                  )}
                />
                {/* Step content */}
                <div className="flex items-center gap-1.5 min-w-0 text-xs text-muted-foreground">
                  <Icon className="w-3 h-3 shrink-0" />
                  <span className="truncate">{getActionLabel(action)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * OutputCard — simplified interactive output card for shared view
 * ──────────────────────────────────────────────────────────────────────────── */
function SharedOutputCard({ cardData }: { cardData: Record<string, unknown> }) {
  const title = (cardData.title as string) || "Output";
  const description = (cardData.description as string) || "";
  const outputType = (cardData.outputType as string) || "document";
  const openUrl = cardData.openUrl as string;
  const downloadUrl = cardData.downloadUrl as string;

  const typeConfig: Record<string, { icon: React.ElementType; color: string }> = {
    website: { icon: Globe, color: "text-blue-400" },
    dashboard: { icon: BarChart3, color: "text-purple-400" },
    document: { icon: FileText, color: "text-amber-400" },
    spreadsheet: { icon: BarChart3, color: "text-green-400" },
    presentation: { icon: FileText, color: "text-orange-400" },
    image: { icon: ImageIcon, color: "text-pink-400" },
    chart: { icon: BarChart3, color: "text-cyan-400" },
    code: { icon: Code, color: "text-emerald-400" },
  };

  const config = typeConfig[outputType] || typeConfig.document;
  const Icon = config.icon;

  return (
    <div className="my-2 rounded-lg border border-border/60 bg-card/50 overflow-hidden">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className={cn("w-8 h-8 rounded-md bg-muted/50 flex items-center justify-center shrink-0", config.color)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{title}</p>
          {description && (
            <p className="text-xs text-muted-foreground truncate">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {openUrl && (
            <a
              href={openUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Open"
            >
              <Eye className="w-3.5 h-3.5" />
            </a>
          )}
          {downloadUrl && (
            <a
              href={downloadUrl}
              download={title}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Download"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Message rendering
 * ──────────────────────────────────────────────────────────────────────────── */
function MessageBubble({ msg }: { msg: SharedMessage }) {
  const isUser = msg.role === "user";
  const actions = msg.actions as ActionStep[] | undefined;
  const hasActions = actions && actions.length > 0;
  const isOutputCard = msg.cardType === "interactive_output" && msg.cardData;

  if (msg.role === "system") return null;

  return (
    <div className={cn("flex gap-3 mb-4", isUser ? "justify-end" : "")}>
      {/* Assistant avatar */}
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center shrink-0 mt-1">
          <BrandAvatar size="sm" />
        </div>
      )}

      {/* Message content */}
      <div className={cn("max-w-[85%] min-w-0", isUser ? "order-first" : "")}>
        {isUser ? (
          <div className="bg-foreground text-background rounded-2xl rounded-br-md px-4 py-2.5">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
          </div>
        ) : (
          <div className="text-foreground">
            {/* Action steps accordion */}
            {hasActions && <ActionStepsList actions={actions} />}

            {/* Output card */}
            {isOutputCard && msg.cardData && (
              <SharedOutputCard cardData={msg.cardData} />
            )}

            {/* Text content */}
            {msg.content && (
              <div className="text-sm prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border/50 prose-code:text-foreground">
                <Streamdown>{msg.content}</Streamdown>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Loading skeleton
 * ──────────────────────────────────────────────────────────────────────────── */
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header skeleton */}
      <div className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-2.5 max-w-[800px] mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
            <div className="w-16 h-4 rounded bg-muted animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-muted animate-pulse" />
            <div className="w-5 h-5 rounded bg-muted animate-pulse" />
          </div>
        </div>
      </div>

      {/* Message skeletons */}
      <div className="flex-1 max-w-[800px] mx-auto w-full px-6 pt-6 space-y-6">
        {/* User message skeleton */}
        <div className="flex justify-end">
          <div className="w-[60%] h-12 rounded-2xl bg-muted/60 animate-pulse" />
        </div>
        {/* Assistant message skeleton */}
        <div className="flex gap-3">
          <div className="w-7 h-7 rounded-full bg-muted animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="w-[80%] h-4 rounded bg-muted/60 animate-pulse" />
            <div className="w-[65%] h-4 rounded bg-muted/60 animate-pulse" />
            <div className="w-[45%] h-4 rounded bg-muted/60 animate-pulse" />
          </div>
        </div>
        {/* Another user message */}
        <div className="flex justify-end">
          <div className="w-[40%] h-10 rounded-2xl bg-muted/60 animate-pulse" />
        </div>
        {/* Another assistant message */}
        <div className="flex gap-3">
          <div className="w-7 h-7 rounded-full bg-muted animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="w-[90%] h-4 rounded bg-muted/60 animate-pulse" />
            <div className="w-[70%] h-4 rounded bg-muted/60 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Password gate
 * ──────────────────────────────────────────────────────────────────────────── */
function PasswordGate({ onSubmit, wrongPassword }: { onSubmit: (pw: string) => void; wrongPassword?: boolean }) {
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-foreground/5 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-muted-foreground" />
          </div>
          <h1 className="text-lg font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
            Protected Share
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Enter the password to view this task
          </p>
          {wrongPassword && (
            <p className="text-sm text-destructive mt-2 font-medium">
              Incorrect password. Please try again.
            </p>
          )}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (password) onSubmit(password);
          }}
          className="space-y-3"
        >
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-card border-border h-10"
            autoFocus
          />
          <Button type="submit" className="w-full h-10" disabled={!password}>
            Unlock
          </Button>
        </form>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Error view
 * ──────────────────────────────────────────────────────────────────────────── */
function ErrorView({ message, detail }: { message: string; detail?: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6 text-destructive" />
        </div>
        <h1 className="text-lg font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          {message}
        </h1>
        {detail && (
          <p className="text-sm text-muted-foreground mt-1.5">{detail}</p>
        )}
        <a
          href="/"
          className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Go to Manus Next
        </a>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Main component
 * ──────────────────────────────────────────────────────────────────────────── */
export default function SharedTaskView() {
  const params = useParams<{ token: string }>();
  const token = params.token || "";
  const [submittedPassword, setSubmittedPassword] = useState<string | undefined>();
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error } = trpc.share.view.useQuery(
    { shareToken: token, password: submittedPassword },
    { enabled: !!token, retry: false }
  );

  // Set document title
  useEffect(() => {
    if (data && "task" in data && data.task) {
      document.title = `${data.task.title || "Shared Task"} — Manus Next`;
    } else {
      document.title = "Shared Task — Manus Next";
    }
    return () => { document.title = "Manus Next"; };
  }, [data]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Parse messages with actions from JSON
  const messages: SharedMessage[] = useMemo(() => {
    if (!data || "error" in data || !data.messages) return [];
    return data.messages.map((m: any) => {
      let parsedActions = m.actions;
      if (typeof parsedActions === "string") {
        try { parsedActions = JSON.parse(parsedActions); } catch { parsedActions = undefined; }
      }
      let parsedCardData = m.cardData;
      if (typeof parsedCardData === "string") {
        try { parsedCardData = JSON.parse(parsedCardData); } catch { parsedCardData = undefined; }
      }
      return {
        role: m.role,
        content: m.content || "",
        createdAt: m.createdAt,
        actions: Array.isArray(parsedActions) ? parsedActions : undefined,
        cardType: m.cardType || undefined,
        cardData: parsedCardData || undefined,
      };
    });
  }, [data]);

  // ── Loading state ──
  if (isLoading) return <LoadingSkeleton />;

  // ── Password required or wrong password ──
  const dataCode = data && "code" in data ? (data as any).code : undefined;
  if (data && "error" in data && (data.error === "password_required" || dataCode === "PASSWORD_REQUIRED" || dataCode === "WRONG_PASSWORD")) {
    return (
      <PasswordGate
        onSubmit={setSubmittedPassword}
        wrongPassword={dataCode === "WRONG_PASSWORD"}
      />
    );
  }

  // ── Error states ──
  if (data && "error" in data) {
    return (
      <ErrorView
        message={data.error as string}
        detail="This share link may have expired or been deleted."
      />
    );
  }

  if (error) {
    return (
      <ErrorView
        message="Failed to load shared task"
        detail="Please check the URL and try again."
      />
    );
  }

  const task = data?.task;

  // ── Main shared view ──
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ═══ Sticky Header ═══ */}
      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-2.5">
          {/* Left: Logo + brand + model badge */}
          <div className="flex items-center gap-1.5">
            <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <BrandAvatar size="md" />
              <span
                className="text-[14px] font-semibold tracking-tight text-foreground"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                manus
              </span>
            </a>
            <span className="text-[11px] text-muted-foreground/60 font-medium ml-1">
              next
            </span>
          </div>

          {/* Center: Task title (desktop only) */}
          <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 max-w-[40%] pointer-events-none">
            <p className="text-sm font-medium text-foreground truncate">
              {task?.title || "Shared Task"}
            </p>
          </div>

          {/* Right: Action icons */}
          <div className="flex items-center gap-1">
            <a
              href="/"
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="New task"
            >
              <SquarePen className="w-4 h-4" />
            </a>
            <button
              onClick={handleCopyLink}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Copy link"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Link2 className="w-4 h-4" />}
            </button>
            <button
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="More options"
              onClick={() => toast.info("More options coming soon")}
            >
              <Ellipsis className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ═══ Messages Container ═══ */}
      <div className="flex-1 w-full max-w-[800px] mx-auto px-6 pt-6 pb-24">
        {/* Task title (mobile only) */}
        <div className="md:hidden mb-6">
          <h1
            className="text-lg font-semibold text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {task?.title || "Shared Task"}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {task?.status === "completed" ? "Completed" : task?.status || ""}
            {task?.createdAt && (
              <> · {new Date(task.createdAt).toLocaleDateString()}</>
            )}
          </p>
        </div>

        {/* Messages */}
        {messages.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-muted-foreground">No messages in this shared task.</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <MessageBubble key={`${msg.role}-${i}`} msg={msg} />
          ))
        )}
      </div>

      {/* ═══ Sticky Bottom CTA ═══ */}
      <div className="sticky bottom-0 z-10 pb-3 pt-2 px-4 bg-gradient-to-t from-background via-background to-transparent">
        <div className="max-w-[800px] mx-auto">
          <a
            href="/"
            className="flex items-center justify-center gap-2 w-full py-3 bg-foreground text-background rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shadow-lg"
          >
            <BrandAvatar size="sm" />
            Try Manus Next
            <ArrowUp className="w-4 h-4 rotate-45" />
          </a>
        </div>
      </div>
    </div>
  );
}
