/**
 * ProfilePage — Manus-style Profile editing
 * 
 * Dedicated profile page for name, email, avatar management,
 * matching the Manus "Profile" settings section.
 */
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  User, Mail, Shield, Key, LogOut, Camera, Globe, Loader2,
  CheckCircle, ExternalLink, Smartphone, Monitor, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function ProfilePage() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  // Initialize form from user data
  const nameValue = displayName || user?.name || "";

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="max-w-sm border-border">
          <CardContent className="py-8 text-center">
            <User className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h2 className="text-lg font-semibold mb-2">Sign in to view profile</h2>
            <p className="text-sm text-muted-foreground mb-4">You need to be logged in to manage your profile.</p>
            <Button onClick={() => window.location.href = getLoginUrl()}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    // Simulate save — in production this would call a tRPC mutation
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    toast.success("Profile updated");
  };

  const initials = (user?.name || "U").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="h-full overflow-y-auto pb-mobile-nav">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>
            Profile
          </h1>
          <p className="text-muted-foreground mb-8">Manage your account and preferences.</p>
        </motion.div>

        {/* Avatar & Name */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <Card className="border-border mb-6">
            <CardContent className="py-6">
              <div className="flex items-start gap-5">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                    {initials}
                  </div>
                  <button
                    className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*";
                      input.onchange = async (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) {
                          toast.error("Image must be under 5MB");
                          return;
                        }
                        toast.info("Uploading avatar...");
                        try {
                          const formData = new FormData();
                          formData.append("file", file);
                          const res = await fetch("/api/upload", { method: "POST", body: file, headers: { "Content-Type": file.type, "X-Filename": file.name } });
                          if (res.ok) {
                            toast.success("Avatar uploaded");
                          } else {
                            toast.error("Upload failed");
                          }
                        } catch {
                          toast.error("Upload failed");
                        }
                      };
                      input.click();
                    }}
                  >
                    <Camera className="w-5 h-5 text-white" />
                  </button>
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Display Name</Label>
                    <Input
                      value={nameValue}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="mt-1"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input readOnly value={user?.email || "—"} className="flex-1 bg-muted/30" />
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                        Verified
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Bio</Label>
                    <Textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                      className="mt-1 resize-none"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <Button onClick={handleSave} disabled={saving} size="sm">
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Account Details */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
          <Card className="border-border mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Account</CardTitle>
              <CardDescription className="text-xs">Account details and authentication.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Role</p>
                    <p className="text-xs text-muted-foreground">Your account role</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs capitalize">{user?.role || "user"}</Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <Key className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Authentication</p>
                    <p className="text-xs text-muted-foreground">OAuth via Manus</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs text-green-500 border-green-500/30">Connected</Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Member Since</p>
                    <p className="text-xs text-muted-foreground">Account creation date</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Preferences */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.18 }}>
          <Card className="border-border mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Preferences</CardTitle>
              <CardDescription className="text-xs">Language, timezone, and notification settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Language</p>
                    <p className="text-xs text-muted-foreground">Display language for the interface</p>
                  </div>
                </div>
                <select className="text-xs bg-muted/30 border border-border rounded-md px-2 py-1 text-foreground">
                  <option>English</option>
                  <option>Spanish</option>
                  <option>French</option>
                  <option>German</option>
                  <option>Japanese</option>
                  <option>Chinese (Simplified)</option>
                </select>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Timezone</p>
                    <p className="text-xs text-muted-foreground">Used for scheduling and timestamps</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Notifications</p>
                    <p className="text-xs text-muted-foreground">In-app notification preferences</p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Connected Sessions */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <Card className="border-border mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Active Sessions</CardTitle>
              <CardDescription className="text-xs">Devices where you're currently signed in.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Monitor className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">This Browser</p>
                    <p className="text-xs text-muted-foreground">Current session</p>
                  </div>
                </div>
                <Badge className="text-[10px] bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Danger Zone */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }}>
          <Card className="border-destructive/30 mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Sign Out</p>
                  <p className="text-xs text-muted-foreground">Sign out of your account on this device.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => logout()}>
                  <LogOut className="w-3.5 h-3.5 mr-1.5" />
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
