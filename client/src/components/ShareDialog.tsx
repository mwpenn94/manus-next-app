/**
 * ShareDialog — Create and manage share links for tasks
 *
 * Supports optional password protection and expiration.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Copy, ExternalLink, Link2, Lock, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskExternalId: string;
  taskTitle: string;
}

export default function ShareDialog({ open, onOpenChange, taskExternalId, taskTitle }: ShareDialogProps) {
  const [password, setPassword] = useState("");
  const [expiresInHours, setExpiresInHours] = useState<number | undefined>();
  const [creating, setCreating] = useState(false);

  const { data: shares = [], refetch } = trpc.share.list.useQuery(
    { taskExternalId },
    { enabled: open }
  );

  const createShare = trpc.share.create.useMutation({
    onSuccess: (data) => {
      const fullUrl = `${window.location.origin}${data.shareUrl}`;
      navigator.clipboard.writeText(fullUrl);
      toast.success("Share link created and copied to clipboard");
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

  const copyLink = (token: string) => {
    const fullUrl = `${window.location.origin}/shared/${token}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success("Link copied to clipboard");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Share Task</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Create a shareable link for "{taskTitle}"
          </DialogDescription>
        </DialogHeader>

        {/* Create new share */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
            <Input
              placeholder="Optional password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-background border-border"
            />
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
            <select
              value={expiresInHours ?? ""}
              onChange={(e) => setExpiresInHours(e.target.value ? Number(e.target.value) : undefined)}
              className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground"
            >
              <option value="">No expiration</option>
              <option value="1">1 hour</option>
              <option value="24">1 day</option>
              <option value="168">1 week</option>
              <option value="720">30 days</option>
            </select>
          </div>
          <Button onClick={handleCreate} disabled={creating} className="w-full">
            <Link2 className="w-4 h-4 mr-2" />
            {creating ? "Creating..." : "Create Share Link"}
          </Button>
        </div>

        {/* Existing shares */}
        {shares.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Links</h4>
            {shares.map((share: any) => (
              <div
                key={share.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-border"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {share.passwordHash && <Lock className="w-3 h-3" />}
                    <span>{share.viewCount} views</span>
                    <span>·</span>
                    <span>{formatDistanceToNow(new Date(share.createdAt), { addSuffix: true })}</span>
                    {share.expiresAt && (
                      <>
                        <span>·</span>
                        <span>Expires {formatDistanceToNow(new Date(share.expiresAt), { addSuffix: true })}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => copyLink(share.shareToken)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    title="Copy link"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => window.open(`/shared/${share.shareToken}`, "_blank")}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteShare.mutate({ id: share.id })}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Delete share"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
