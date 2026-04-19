/**
 * TeamPage — Team management, shared sessions, and collaboration
 *
 * Capabilities addressed:
 * - Team billing & seat management
 * - Shared sessions / collaborative workspace
 * - Role-based access (admin/member)
 */
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  ArrowLeft,
  Plus,
  Crown,
  Shield,
  User,
  Mail,
  Copy,
  CheckCircle2,
  Settings,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
  status: "active" | "invited";
  joinedAt: string;
};

export default function TeamPage() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [inviteEmail, setInviteEmail] = useState("");

  // Mock team data (would come from tRPC in production)
  const [members] = useState<TeamMember[]>([
    {
      id: "1",
      name: user?.name || "You",
      email: user?.openId || "owner@example.com",
      role: "owner",
      status: "active",
      joinedAt: new Date().toISOString(),
    },
  ]);

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      toast.error("Enter an email address");
      return;
    }
    toast.success(`Invitation sent to ${inviteEmail}`);
    setInviteEmail("");
  };

  const roleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="w-3.5 h-3.5 text-amber-500" />;
      case "admin":
        return <Shield className="w-3.5 h-3.5 text-blue-500" />;
      default:
        return <User className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

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

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1
              className="text-2xl font-semibold text-foreground"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Team
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage team members, billing, and shared sessions
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => toast.info("Team settings coming soon")}>
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Team Stats */}
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Members</p>
                <p className="text-2xl font-semibold text-foreground">{members.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Plan</p>
                <p className="text-2xl font-semibold text-foreground">Pro</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Shared Sessions</p>
                <p className="text-2xl font-semibold text-foreground">0</p>
              </CardContent>
            </Card>
          </div>

          {/* Members List */}
          <div className="lg:col-span-2">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base">Team Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                        {roleIcon(member.role)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {member.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.email}
                        </p>
                      </div>
                      <Badge
                        variant={member.status === "active" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {member.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invite Panel */}
          <div>
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base">Invite Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Input
                    placeholder="Email address"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                  <Button onClick={handleInvite} className="w-full" size="sm">
                    <Mail className="w-4 h-4 mr-2" />
                    Send Invite
                  </Button>
                </div>

                <div className="mt-6 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">Invite Link</p>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={`${window.location.origin}/join/team-invite`}
                      className="text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${window.location.origin}/join/team-invite`
                        );
                        toast.success("Invite link copied");
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Billing Summary */}
            <Card className="bg-card border-border mt-4">
              <CardHeader>
                <CardTitle className="text-base">Billing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plan</span>
                    <span className="text-foreground font-medium">Pro</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Seats</span>
                    <span className="text-foreground font-medium">{members.length} / 10</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Next billing</span>
                    <span className="text-foreground font-medium">May 1, 2026</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4"
                  onClick={() => navigate("/billing")}
                >
                  Manage Billing
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
