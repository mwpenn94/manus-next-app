/**
 * ShareDialog — Enhanced task sharing with URL preview card,
 * permission levels, and visual copy feedback.
 *
 * Matches Manus sharing UX: clean modal, shareable link preview,
 * password protection, expiration, and permission controls.
 */
import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Copy,
  Check,
  ExternalLink,
  Link2,
  Lock,
  Trash2,
  Clock,
  Globe,
  Eye,
  MessageSquare,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskExternalId: string;
  taskTitle: string;
}

type Permission = "view" | "comment";

export default function ShareDialog({ open, onOpenChange, taskExternalId, taskTitle }: ShareDialogProps) {
  const [password, setPassword] = useState("");
  const [expiresInHours, setExpiresInHours] = useState<number | undefined>();
  const [permission, setPermission] = useState<Permission>("view");
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: shares = [], refetch } = trpc.share.list.useQuery(
    { taskExternalId },
    { enabled: open }
  );

  const createShare = trpc.share.create.useMutation({
    onSuccess: (data) => {
      const fullUrl = `${window.location.origin}${data.shareUrl}`;
      navigator.clipboard.writeText(fullUrl);
      toast.success("Share link created and copied!");
      setPassword("");
      setExpiresInHours(undefined);
      setCreating(false);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message);
      setCreating(false);
    },
  });

  const deleteShare = trpc.share.delete.useMutation({
    onSuccess: () => {
      toast.success("Share link deleted");
      refetch();
    },
  });

  const handleCreate = () => {
    setCreating(true);
    createShare.mutate({
      taskExternalId,
      password: password || undefined,
      expiresInHours,
    });
  };

  const copyLink = useCallback((token: string, id: string) => {
    const fullUrl = `${window.location.origin}/shared/${token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    toast.success("Link copied!");
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Globe className="w-4.5 h-4.5 text-primary" />
            Share Task
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Anyone with the link can access this task
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          {/* URL Preview Card — shown when shares exist */}
          {shares.length > 0 && (
            <div className="rounded-xl border border-border bg-background/50 overflow-hidden">
              {/* Preview header */}
              <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                    <Link2 className="w-3 h-3 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{taskTitle}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {window.location.origin}/shared/...
                    </p>
                  </div>
                </div>
              </div>

              {/* Active links list */}
              <div className="divide-y divide-border/50">
                {shares.map((share: any) => (
                  <div
                    key={share.id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors"
                  >
                    {/* Link info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {share.passwordHash && (
                          <span className="flex items-center gap-0.5 text-amber-500">
                            <Lock className="w-3 h-3" />
                            Protected
                          </span>
                        )}
                        {!share.passwordHash && (
                          <span className="flex items-center gap-0.5 text-green-500">
                            <Globe className="w-3 h-3" />
                            Public
                          </span>
                        )}
                        <span className="text-muted-foreground/40">·</span>
                        <Eye className="w-3 h-3" />
                        <span>{share.viewCount}</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span>{formatDistanceToNow(new Date(share.createdAt), { addSuffix: true })}</span>
                        {share.expiresAt && (
                          <>
                            <span className="text-muted-foreground/40">·</span>
                            <Clock className="w-3 h-3" />
                            <span>{formatDistanceToNow(new Date(share.expiresAt), { addSuffix: true })}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => copyLink(share.shareToken, share.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                        title="Copy link"
                      >
                        {copiedId === share.id ? (
                          <Check className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => window.open(`/shared/${share.shareToken}`, "_blank")}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        title="Open"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteShare.mutate({ id: share.id })}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Permission selector */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPermission("view")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                permission === "view"
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-muted/50 text-muted-foreground border border-transparent hover:border-border"
              )}
            >
              <Eye className="w-3 h-3" />
              View only
            </button>
            <button
              onClick={() => setPermission("comment")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                permission === "comment"
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-muted/50 text-muted-foreground border border-transparent hover:border-border"
              )}
            >
              <MessageSquare className="w-3 h-3" />
              Can comment
            </button>
          </div>

          {/* Advanced options toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Shield className="w-3 h-3" />
            {showAdvanced ? "Hide" : "Show"} advanced options
          </button>

          {/* Advanced: password + expiration */}
          {showAdvanced && (
            <div className="space-y-2.5 pl-1">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <Input
                  placeholder="Optional password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-background border-border h-8 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <select
                  value={expiresInHours ?? ""}
                  onChange={(e) => setExpiresInHours(e.target.value ? Number(e.target.value) : undefined)}
                  className="flex h-8 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
                >
                  <option value="">No expiration</option>
                  <option value="1">1 hour</option>
                  <option value="24">1 day</option>
                  <option value="168">1 week</option>
                  <option value="720">30 days</option>
                </select>
              </div>
            </div>
          )}

          {/* Create button */}
          <Button onClick={handleCreate} disabled={creating} className="w-full" size="sm">
            <Link2 className="w-4 h-4 mr-2" />
            {creating ? "Creating..." : "Create New Share Link"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
