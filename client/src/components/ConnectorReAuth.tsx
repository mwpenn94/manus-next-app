/**
 * ConnectorReAuth — Modal/toast component that appears when a connector token
 * has expired and needs re-authentication. Triggered by the connector_auth_required
 * SSE event from the agent stream.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, RefreshCw, Key, ExternalLink, Shield } from "lucide-react";

interface ConnectorReAuthProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connector: string;
  reason: string;
}

export function ConnectorReAuth({ open, onOpenChange, connector, reason }: ConnectorReAuthProps) {
  const [patInput, setPATInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<"choice" | "pat" | "oauth">("choice");

  const storePat = trpc.connector.storeSmartPat.useMutation({
    onSuccess: () => {
      onOpenChange(false);
      setPATInput("");
      setMode("choice");
    },
  });

  const handleSubmitPAT = async () => {
    if (!patInput.trim()) return;
    setIsSubmitting(true);
    try {
      await storePat.mutateAsync({ token: patInput.trim() });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOAuthReconnect = () => {
    // Navigate to the connector settings page to re-initiate OAuth
    window.location.href = "/settings?tab=connectors&reconnect=github";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Re-authentication Required
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <span className="block">
              Your <Badge variant="outline" className="mx-1 capitalize">{connector}</Badge> connection
              has expired and needs to be refreshed.
            </span>
            <span className="block text-xs text-muted-foreground">
              Reason: {reason}
            </span>
          </DialogDescription>
        </DialogHeader>

        {mode === "choice" && (
          <div className="space-y-3 py-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => setMode("oauth")}
            >
              <RefreshCw className="w-4 h-4 text-primary" />
              <div className="text-left">
                <p className="text-sm font-medium">Reconnect via OAuth</p>
                <p className="text-xs text-muted-foreground">Re-authorize through GitHub (recommended)</p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => setMode("pat")}
            >
              <Key className="w-4 h-4 text-emerald-500" />
              <div className="text-left">
                <p className="text-sm font-medium">Enter a Personal Access Token</p>
                <p className="text-xs text-muted-foreground">Use a fine-grained PAT (never expires)</p>
              </div>
            </Button>
          </div>
        )}

        {mode === "pat" && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="pat-input" className="text-sm">
                GitHub Personal Access Token
              </Label>
              <Input
                id="pat-input"
                type="password"
                placeholder="github_pat_... or ghp_..."
                value={patInput}
                onChange={(e) => setPATInput(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Token is encrypted and stored securely. Never shared with third parties.
              </p>
            </div>

            <a
              href="https://github.com/settings/personal-access-tokens/new"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              Create a new fine-grained token on GitHub
            </a>

            <DialogFooter className="flex gap-2">
              <Button variant="ghost" onClick={() => setMode("choice")}>
                Back
              </Button>
              <Button
                onClick={handleSubmitPAT}
                disabled={!patInput.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save Token"
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {mode === "oauth" && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              You'll be redirected to GitHub to re-authorize the connection.
              This will generate a fresh OAuth token.
            </p>
            <DialogFooter className="flex gap-2">
              <Button variant="ghost" onClick={() => setMode("choice")}>
                Back
              </Button>
              <Button onClick={handleOAuthReconnect}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Reconnect GitHub
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
