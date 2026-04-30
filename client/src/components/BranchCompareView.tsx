/**
 * BranchCompareView — Side-by-side message diff between two branches.
 * Shows shared messages count and divergent messages from each branch.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { GitCompare, MessageSquare, ArrowRight, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface BranchCompareViewProps {
  taskExternalId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BranchCompareView({ taskExternalId, open, onOpenChange }: BranchCompareViewProps) {
  const [compareId, setCompareId] = useState("");
  const [triggered, setTriggered] = useState(false);

  const { data, isLoading, error } = trpc.branches.compare.useQuery(
    { taskAExternalId: taskExternalId, taskBExternalId: compareId },
    { enabled: triggered && !!compareId && !!taskExternalId }
  );

  const handleCompare = () => {
    if (!compareId.trim()) return;
    setTriggered(true);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTriggered(false);
    setCompareId("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <GitCompare className="w-4 h-4 text-primary" />
            Compare Branches
          </DialogTitle>
        </DialogHeader>

        {/* Input */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1.5 rounded-md">
            <MessageSquare className="w-3 h-3" />
            Current
          </div>
          <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
          <Input
            value={compareId}
            onChange={(e) => { setCompareId(e.target.value); setTriggered(false); }}
            placeholder="Enter branch task ID to compare..."
            className="h-8 text-xs flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleCompare()}
          />
          <Button size="sm" onClick={handleCompare} disabled={!compareId.trim() || isLoading}>
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Compare"}
          </Button>
        </div>

        {/* Results */}
        {data && (
          <div className="flex-1 overflow-y-auto space-y-3 mt-2">
            {/* Summary */}
            <div className="flex items-center gap-3 text-xs">
              <Badge variant="outline">{data.sharedMessages} shared messages</Badge>
              <Badge variant="secondary">{data.messagesA.length} unique in A</Badge>
              <Badge variant="secondary">{data.messagesB.length} unique in B</Badge>
            </div>

            {/* Side-by-side diff */}
            <div className="grid grid-cols-2 gap-2">
              {/* Column A header */}
              <div className="text-xs font-medium text-muted-foreground px-2 py-1 bg-blue-500/5 rounded-t-md border border-blue-500/20">
                {data.taskA.title} ({data.taskA.messageCount} msgs)
              </div>
              {/* Column B header */}
              <div className="text-xs font-medium text-muted-foreground px-2 py-1 bg-purple-500/5 rounded-t-md border border-purple-500/20">
                {data.taskB.title} ({data.taskB.messageCount} msgs)
              </div>

              {/* Messages */}
              {Array.from({ length: Math.max(data.messagesA.length, data.messagesB.length) }).map((_, i) => {
                const msgA = data.messagesA[i];
                const msgB = data.messagesB[i];
                return (
                  <div key={i} className="contents">
                    <div className={cn(
                      "text-xs p-2 rounded border min-h-[3rem]",
                      msgA ? "bg-card border-border" : "bg-muted/20 border-dashed border-border/50"
                    )}>
                      {msgA ? (
                        <>
                          <span className={cn(
                            "text-[10px] font-medium uppercase",
                            msgA.role === "user" ? "text-blue-500" : "text-green-500"
                          )}>
                            {msgA.role}
                          </span>
                          <p className="mt-0.5 text-foreground/80 line-clamp-4">{msgA.content}</p>
                        </>
                      ) : (
                        <span className="text-muted-foreground italic">No message</span>
                      )}
                    </div>
                    <div className={cn(
                      "text-xs p-2 rounded border min-h-[3rem]",
                      msgB ? "bg-card border-border" : "bg-muted/20 border-dashed border-border/50"
                    )}>
                      {msgB ? (
                        <>
                          <span className={cn(
                            "text-[10px] font-medium uppercase",
                            msgB.role === "user" ? "text-blue-500" : "text-green-500"
                          )}>
                            {msgB.role}
                          </span>
                          <p className="mt-0.5 text-foreground/80 line-clamp-4">{msgB.content}</p>
                        </>
                      ) : (
                        <span className="text-muted-foreground italic">No message</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-destructive text-center py-4">
            {error.message || "Failed to compare branches"}
          </p>
        )}

        {!data && !isLoading && !error && (
          <p className="text-xs text-muted-foreground text-center py-8">
            Enter a branch task ID above to compare message histories.
          </p>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={handleClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
