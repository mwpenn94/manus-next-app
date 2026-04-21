/**
 * TeamPage — Real team collaboration with DB-backed operations
 * Capabilities: #56 Collab, #57 Team Billing, #58 Shared Sessions
 */
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Users, Plus, Copy, CreditCard, Share2, UserMinus,
  Loader2, Crown, Shield, User as UserIcon, ArrowLeft,
} from "lucide-react";
import { useLocation } from "wouter";

export default function TeamPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [newTeamName, setNewTeamName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  // Real tRPC queries
  const teamsQuery = trpc.team.list.useQuery(undefined, { enabled: !!user });
  const membersQuery = trpc.team.members.useQuery(
    { teamId: selectedTeamId! },
    { enabled: !!selectedTeamId }
  );
  const sessionsQuery = trpc.team.sessions.useQuery(
    { teamId: selectedTeamId! },
    { enabled: !!selectedTeamId }
  );

  // Real tRPC mutations
  const utils = trpc.useUtils();
  const createTeam = trpc.team.create.useMutation({
    onSuccess: () => {
      utils.team.list.invalidate();
      setNewTeamName("");
      toast.success("Team created!");
    },
    onError: (err) => { toast.error(err.message); },
  });
  const joinTeamMut = trpc.team.join.useMutation({
    onSuccess: () => {
      utils.team.list.invalidate();
      setInviteCode("");
      toast.success("Joined team!");
    },
    onError: (err) => { toast.error(err.message); },
  });
  const removeMember = trpc.team.removeMember.useMutation({
    onSuccess: () => {
      utils.team.members.invalidate();
      toast.success("Member removed");
    },
    onError: (err) => { toast.error(err.message); },
  });
  const shareSession = trpc.team.shareSession.useMutation({
    onSuccess: () => {
      utils.team.sessions.invalidate();
      toast.success("Session shared with team");
    },
    onError: (err) => { toast.error(err.message); },
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="max-w-sm">
          <CardContent className="p-6 text-center">
            <Users className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Team Management</h2>
            <p className="text-muted-foreground mb-4">Sign in to manage your team.</p>
            <Button onClick={() => (window.location.href = getLoginUrl())}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const teams = teamsQuery.data ?? [];
  const members = membersQuery.data ?? [];
  const sessions = sessionsQuery.data ?? [];
  const selectedTeam = teams.find((t: any) => t.id === selectedTeamId);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              Teams
            </h1>
            <p className="text-sm text-muted-foreground">
              Collaborate with shared sessions, billing, and team management.
            </p>
          </div>
        </div>

        {/* Create / Join */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="w-4 h-4" /> Create Team
              </CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Input
                placeholder="Team name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && newTeamName.trim() && createTeam.mutate({ name: newTeamName.trim() })}
              />
              <Button
                onClick={() => createTeam.mutate({ name: newTeamName.trim() })}
                disabled={!newTeamName.trim() || createTeam.isPending}
              >
                {createTeam.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Share2 className="w-4 h-4" /> Join Team
              </CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Input
                placeholder="Invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && inviteCode.trim() && joinTeamMut.mutate({ inviteCode: inviteCode.trim() })}
              />
              <Button
                onClick={() => joinTeamMut.mutate({ inviteCode: inviteCode.trim() })}
                disabled={!inviteCode.trim() || joinTeamMut.isPending}
              >
                {joinTeamMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Join"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Team List */}
        {teamsQuery.isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : teams.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No teams yet. Create one or join with an invite code.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team: any) => (
              <Card
                key={team.id}
                className={`cursor-pointer transition-all hover:border-primary/30 bg-card border-border ${selectedTeamId === team.id ? "border-primary ring-1 ring-primary/20" : ""}`}
                onClick={() => setSelectedTeamId(team.id)}
              >
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    {team.name}
                  </CardTitle>
                  <CardDescription>
                    {team.memberRole === "owner" ? "Owner" : team.memberRole} · Plan: {team.plan ?? "Free"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Max seats: {team.maxSeats}</span>
                    <span className="text-muted-foreground">Credits: {team.creditBalance ?? 0}</span>
                  </div>
                  {team.inviteCode && (
                    <div className="mt-3 flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">{team.inviteCode}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(team.inviteCode);
                          toast.success("Invite code copied!");
                        }}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Selected Team Details */}
        {selectedTeamId && selectedTeam && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5" /> {selectedTeam.name} — Members
            </h2>

            {membersQuery.isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members found.</p>
            ) : (
              <div className="space-y-2">
                {members.map((m: any) => (
                  <div key={m.userId} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
                    <div className="flex items-center gap-3">
                      {m.role === "owner" ? <Crown className="w-4 h-4 text-yellow-500" /> :
                       m.role === "admin" ? <Shield className="w-4 h-4 text-blue-500" /> :
                       <UserIcon className="w-4 h-4 text-muted-foreground" />}
                      <div>
                        <p className="text-sm font-medium text-foreground">{m.user?.name ?? "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{m.user?.email ?? ""} · {m.role}</p>
                      </div>
                    </div>
                    {m.role !== "owner" && selectedTeam.memberRole === "owner" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMember.mutate({ teamId: selectedTeamId!, userId: m.userId })}
                        disabled={removeMember.isPending}
                      >
                        <UserMinus className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Billing */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> Billing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{selectedTeam.creditBalance ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Credits</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{members.length}</p>
                    <p className="text-xs text-muted-foreground">Members</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{selectedTeam.maxSeats}</p>
                    <p className="text-xs text-muted-foreground">Max Seats</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shared Sessions */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Share2 className="w-4 h-4" /> Shared Sessions ({sessions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No shared sessions yet. Share a task session from the task page.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {sessions.map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                        <span className="text-foreground">{s.taskExternalId}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(s.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
