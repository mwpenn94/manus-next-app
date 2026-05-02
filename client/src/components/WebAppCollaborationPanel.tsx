import { useState, useMemo, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Users,
  MessageSquare,
  GitBranch,
  GitPullRequest,
  GitCommit,
  Share2,
  Bell,
  AtSign,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Plus,
  Eye,
  Code,
  FileText,
  ChevronRight,
  UserPlus,
  Shield,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";

type MemberRole = "owner" | "admin" | "editor" | "viewer";
type ActivityType = "commit" | "comment" | "review" | "deploy" | "invite" | "merge";

interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  role: MemberRole;
  online: boolean;
  lastActive: string;
  currentFile?: string;
}

interface ActivityItem {
  id: string;
  type: ActivityType;
  user: string;
  avatar: string;
  message: string;
  timestamp: string;
  details?: string;
}

interface Comment {
  id: string;
  user: string;
  avatar: string;
  message: string;
  timestamp: string;
  file?: string;
  line?: number;
  resolved: boolean;
}

const MOCK_MEMBERS: TeamMember[] = [
  { id: "m1", name: "You", avatar: "🧑‍💻", role: "owner", online: true, lastActive: "Now", currentFile: "src/pages/Home.tsx" },
  { id: "m2", name: "AI Agent", avatar: "🤖", role: "admin", online: true, lastActive: "Now", currentFile: "src/components/Dashboard.tsx" },
  { id: "m3", name: "Alex Chen", avatar: "👨‍💼", role: "editor", online: true, lastActive: "2 min ago", currentFile: "server/routers.ts" },
  { id: "m4", name: "Sarah Kim", avatar: "👩‍🎨", role: "editor", online: false, lastActive: "1 hour ago" },
  { id: "m5", name: "Jordan Lee", avatar: "🧑‍🔬", role: "viewer", online: false, lastActive: "3 hours ago" },
];

const MOCK_ACTIVITY: ActivityItem[] = [
  { id: "act1", type: "commit", user: "AI Agent", avatar: "🤖", message: "feat: add PersonalizationEngine component", timestamp: "2 min ago", details: "+342 -12 in 3 files" },
  { id: "act2", type: "comment", user: "Alex Chen", avatar: "👨‍💼", message: "Looks good! Can we add error boundaries?", timestamp: "5 min ago", details: "on src/components/Dashboard.tsx" },
  { id: "act3", type: "deploy", user: "You", avatar: "🧑‍💻", message: "Deployed to staging", timestamp: "15 min ago", details: "v0.8.2-beta" },
  { id: "act4", type: "review", user: "Sarah Kim", avatar: "👩‍🎨", message: "Approved PR #42: UI polish pass", timestamp: "1 hour ago" },
  { id: "act5", type: "merge", user: "AI Agent", avatar: "🤖", message: "Merged feature/batch-c into main", timestamp: "1 hour ago", details: "12 commits, 48 files changed" },
  { id: "act6", type: "commit", user: "You", avatar: "🧑‍💻", message: "fix: resolve TypeScript errors in TaskView", timestamp: "2 hours ago", details: "+28 -15 in 2 files" },
  { id: "act7", type: "invite", user: "You", avatar: "🧑‍💻", message: "Invited Jordan Lee as viewer", timestamp: "3 hours ago" },
];

const MOCK_COMMENTS: Comment[] = [
  { id: "c1", user: "Alex Chen", avatar: "👨‍💼", message: "Should we memoize this computation? It runs on every render.", timestamp: "5 min ago", file: "src/components/Dashboard.tsx", line: 42, resolved: false },
  { id: "c2", user: "AI Agent", avatar: "🤖", message: "Good catch. I'll wrap it in useMemo with the correct dependencies.", timestamp: "3 min ago", file: "src/components/Dashboard.tsx", line: 42, resolved: false },
  { id: "c3", user: "Sarah Kim", avatar: "👩‍🎨", message: "The spacing between cards is inconsistent on mobile. Can we use gap-3 instead of gap-4?", timestamp: "1 hour ago", file: "src/pages/Home.tsx", line: 128, resolved: true },
  { id: "c4", user: "You", avatar: "🧑‍💻", message: "Fixed in the latest commit.", timestamp: "45 min ago", file: "src/pages/Home.tsx", line: 128, resolved: true },
];

function getActivityIcon(type: ActivityType): React.JSX.Element {
  switch (type) {
    case "commit": return <GitCommit className="w-3.5 h-3.5 text-green-500" />;
    case "comment": return <MessageSquare className="w-3.5 h-3.5 text-blue-400" />;
    case "review": return <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />;
    case "deploy": return <Share2 className="w-3.5 h-3.5 text-amber-400" />;
    case "invite": return <UserPlus className="w-3.5 h-3.5 text-cyan-400" />;
    case "merge": return <GitPullRequest className="w-3.5 h-3.5 text-primary" />;
  }
}

function getRoleBadge(role: MemberRole): React.JSX.Element {
  switch (role) {
    case "owner":
      return <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500"><Crown className="w-2.5 h-2.5" />Owner</span>;
    case "admin":
      return <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-500"><Shield className="w-2.5 h-2.5" />Admin</span>;
    case "editor":
      return <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500"><Code className="w-2.5 h-2.5" />Editor</span>;
    case "viewer":
      return <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"><Eye className="w-2.5 h-2.5" />Viewer</span>;
  }
}

export default function WebAppCollaborationPanel(): React.JSX.Element {
  const { data: prefs } = trpc.preferences.get.useQuery();
  const savePrefsMut = trpc.preferences.save.useMutation();
  const [activeTab, setActiveTab] = useState<"activity" | "comments" | "members">("activity");
  const [commentInput, setCommentInput] = useState("");
  const [comments, setComments] = useState<Comment[]>(MOCK_COMMENTS);
  const [showResolved, setShowResolved] = useState(false);

  // Load persisted collaboration settings
  useEffect(() => {
    const saved = (prefs?.generalSettings as any)?.collaborationSettings;
    if (saved?.showResolved !== undefined) setShowResolved(saved.showResolved);
  }, [prefs]);

  const persistCollabSettings = useCallback((updates: Record<string, unknown>) => {
    const current = (prefs?.generalSettings ?? {}) as Record<string, unknown>;
    const existing = (current.collaborationSettings ?? {}) as Record<string, unknown>;
    savePrefsMut.mutate({ generalSettings: { ...current, collaborationSettings: { ...existing, ...updates } } });
  }, [prefs, savePrefsMut]);

  const filteredComments = useMemo(() => {
    if (showResolved) return comments;
    return comments.filter((c) => !c.resolved);
  }, [comments, showResolved]);

  const handleResolve = useCallback((id: string) => {
    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, resolved: !c.resolved } : c))
    );
  }, []);

  const onlineCount = MOCK_MEMBERS.filter((m) => m.online).length;
  const unresolvedCount = comments.filter((c) => !c.resolved).length;

  return (
    <div className="flex flex-col h-full bg-background text-foreground rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Collaboration</h2>
            <p className="text-xs text-muted-foreground">
              {onlineCount} online, {unresolvedCount} open comments
            </p>
          </div>
        </div>
        <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
          <UserPlus className="w-3.5 h-3.5" />
          Invite
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(["activity", "comments", "members"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2.5 text-xs font-medium transition-colors capitalize relative",
              activeTab === tab ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
            {tab === "comments" && unresolvedCount > 0 && (
              <span className="absolute top-1.5 right-[calc(50%-20px)] w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center">
                {unresolvedCount}
              </span>
            )}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "activity" && (
          <div className="p-4 space-y-0.5">
            {MOCK_ACTIVITY.map((item) => (
              <div key={item.id} className="flex items-start gap-3 py-2.5 hover:bg-accent/20 rounded-lg px-2 transition-colors">
                <span className="text-lg mt-0.5">{item.avatar}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {getActivityIcon(item.type)}
                    <span className="text-xs font-medium">{item.user}</span>
                    <span className="text-[10px] text-muted-foreground">{item.timestamp}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.message}</p>
                  {item.details && (
                    <span className="text-[10px] text-muted-foreground/60 mt-0.5 block">{item.details}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "comments" && (
          <div>
            <div className="px-4 py-2 flex items-center justify-between">
              <button
                onClick={() => setShowResolved(!showResolved)}
                className={cn(
                  "text-[10px] px-2 py-1 rounded-md transition-colors",
                  showResolved ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {showResolved ? "Hide resolved" : "Show resolved"}
              </button>
            </div>
            <div className="px-4 space-y-3">
              {filteredComments.map((comment) => (
                <div
                  key={comment.id}
                  className={cn(
                    "p-3 rounded-lg border transition-colors",
                    comment.resolved ? "bg-muted/30 border-border/50" : "bg-card border-border"
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{comment.avatar}</span>
                      <span className="text-xs font-medium">{comment.user}</span>
                      <span className="text-[10px] text-muted-foreground">{comment.timestamp}</span>
                    </div>
                    <button
                      onClick={() => handleResolve(comment.id)}
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full transition-colors",
                        comment.resolved ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {comment.resolved ? "Resolved" : "Resolve"}
                    </button>
                  </div>
                  <p className={cn("text-xs leading-relaxed", comment.resolved && "text-muted-foreground")}>{comment.message}</p>
                  {comment.file && (
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                      <FileText className="w-3 h-3" />
                      <span>{comment.file}</span>
                      {comment.line && <span>:L{comment.line}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Comment Input */}
            <div className="p-4 mt-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCommentInput(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 px-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
                <button className="p-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "members" && (
          <div className="p-4 space-y-2">
            {MOCK_MEMBERS.map((member) => (
              <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/20 transition-colors">
                <div className="relative">
                  <span className="text-2xl">{member.avatar}</span>
                  <div className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
                    member.online ? "bg-green-500" : "bg-muted"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{member.name}</span>
                    {getRoleBadge(member.role)}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                    <span>{member.online ? "Online" : member.lastActive}</span>
                    {member.currentFile && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-0.5">
                          <Code className="w-2.5 h-2.5" />
                          {member.currentFile}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
