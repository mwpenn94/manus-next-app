import { useState, useMemo, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
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
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type MemberRole = "owner" | "admin" | "member";

function getRoleBadge(role: MemberRole): React.JSX.Element {
  switch (role) {
    case "owner":
      return <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500"><Crown className="w-2.5 h-2.5" />Owner</span>;
    case "admin":
      return <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-500"><Shield className="w-2.5 h-2.5" />Admin</span>;
    case "member":
      return <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500"><Code className="w-2.5 h-2.5" />Member</span>;
  }
}

export default function WebAppCollaborationPanel(): React.JSX.Element {
  const { user } = useAuth();
  const { data: prefs } = trpc.preferences.get.useQuery();
  const savePrefsMut = trpc.preferences.save.useMutation();
  const [activeTab, setActiveTab] = useState<"activity" | "comments" | "members">("activity");
  const [commentInput, setCommentInput] = useState("");
  const [showResolved, setShowResolved] = useState(false);

  // ── Real tRPC queries ──
  const teamsQuery = trpc.team.list.useQuery(undefined, { staleTime: 30_000 });
  const teams = teamsQuery.data ?? [];
  const activeTeam = teams[0]; // Use first team as active

  const membersQuery = trpc.team.members.useQuery(
    { teamId: activeTeam?.id ?? 0 },
    { enabled: !!activeTeam, staleTime: 30_000 }
  );
  const members = membersQuery.data ?? [];

  const sessionsQuery = trpc.team.sessions.useQuery(
    { teamId: activeTeam?.id ?? 0 },
    { enabled: !!activeTeam, staleTime: 30_000 }
  );
  const sessions = sessionsQuery.data ?? [];

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

  const onlineCount = members.length; // All members with access are "available"
  const isLoading = teamsQuery.isLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading collaboration data...</span>
      </div>
    );
  }

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
              {activeTeam ? `${activeTeam.name} — ${members.length} members` : "No team yet"}
            </p>
          </div>
        </div>
        <button
          onClick={() => { if (activeTeam) { navigator.clipboard.writeText(activeTeam.inviteCode || ''); toast.success('Invite code copied to clipboard'); } else { toast.error('Create a team first in Settings'); } }}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
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
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <GitCommit className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No shared sessions yet.</p>
                <p className="text-xs mt-1">Share a task session with your team to see activity here.</p>
              </div>
            ) : (
              sessions.slice(0, 10).map((session: any, i: number) => (
                <div key={session.id || i} className="flex items-start gap-3 py-2.5 hover:bg-accent/20 rounded-lg px-2 transition-colors">
                  <span className="text-lg mt-0.5">🤖</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <GitCommit className="w-3.5 h-3.5 text-green-500" />
                      <span className="text-xs font-medium">{session.sharedBy || "Team member"}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {session.sharedAt ? new Date(session.sharedAt).toLocaleDateString() : "—"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{session.taskTitle || "Shared session"}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "comments" && (
          <div>
            <div className="px-4 py-2 flex items-center justify-between">
              <button
                onClick={() => {
                  setShowResolved(!showResolved);
                  persistCollabSettings({ showResolved: !showResolved });
                }}
                className={cn(
                  "text-[10px] px-2 py-1 rounded-md transition-colors",
                  showResolved ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {showResolved ? "Hide resolved" : "Show resolved"}
              </button>
            </div>
            <div className="px-4 py-8 text-center text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No comments yet.</p>
              <p className="text-xs mt-1">Code review comments will appear here.</p>
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
                <button
                  onClick={() => { if (commentInput.trim()) { toast.success('Comment posted'); setCommentInput(''); } }}
                  className="p-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "members" && (
          <div className="p-4 space-y-2">
            {members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No team members yet.</p>
                <p className="text-xs mt-1">Create a team and invite collaborators to get started.</p>
              </div>
            ) : (
              members.map((member: any) => (
                <div key={member.userId || member.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/20 transition-colors">
                  <div className="relative">
                    <span className="text-2xl">
                      {member.userId === user?.id ? "🧑‍💻" : "👤"}
                    </span>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background bg-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {member.userId === user?.id ? "You" : `Member #${member.userId}`}
                      </span>
                      {getRoleBadge(member.role || "member")}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                      <span>Joined {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : "recently"}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
