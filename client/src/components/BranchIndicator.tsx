/**
 * BranchIndicator — Shows branch lineage at the top of a branched task.
 * Also provides a "Branch from here" button for use in message actions.
 */
import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useTask } from "@/contexts/TaskContext";
import { cn } from "@/lib/utils";
import { GitBranch, ArrowLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Message } from "@/contexts/TaskContext";

interface BranchBannerProps {
  taskExternalId: string;
}

/**
 * Banner shown at the top of a branched task, linking back to the parent.
 */
export function BranchBanner({ taskExternalId }: BranchBannerProps) {
  const [, navigate] = useLocation();
  const { setActiveTask } = useTask();
  const { data: parentInfo, isLoading } = trpc.branches.parent.useQuery(
    { childTaskExternalId: taskExternalId },
    { enabled: !!taskExternalId }
  );

  if (isLoading || !parentInfo?.parentTask) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border-b border-primary/10 text-xs">
      <GitBranch className="w-3.5 h-3.5 text-primary shrink-0" />
      <span className="text-muted-foreground">Branched from</span>
      <button
        onClick={() => {
          setActiveTask(parentInfo.parentTask.externalId);
          navigate(`/task/${parentInfo.parentTask.externalId}`);
        }}
        className="text-primary hover:underline font-medium truncate max-w-[200px]"
      >
        {parentInfo.parentTask.title}
      </button>
      {parentInfo.label && (
        <>
          <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
          <span className="text-foreground font-medium truncate">{parentInfo.label}</span>
        </>
      )}
    </div>
  );
}

interface ChildBranchesProps {
  taskExternalId: string;
}

/**
 * Shows child branches of the current task (if any).
 */
export function ChildBranches({ taskExternalId }: ChildBranchesProps) {
  const [, navigate] = useLocation();
  const { setActiveTask } = useTask();
  const { data: children = [] } = trpc.branches.children.useQuery(
    { parentTaskExternalId: taskExternalId },
    { enabled: !!taskExternalId }
  );

  if (children.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap px-4 py-2 bg-muted/30 border-b border-border text-xs">
      <GitBranch className="w-3 h-3 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">Branches:</span>
      {children.map((child: any) => (
        <button
          key={child.id}
          onClick={() => {
            setActiveTask(child.childTaskId.toString());
            navigate(`/task/${child.childTaskId}`);
          }}
          className="px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
        >
          {child.label || `Branch ${child.id}`}
        </button>
      ))}
    </div>
  );
}

interface BranchButtonProps {
  taskExternalId: string;
  message: Message;
  messageIndex: number;
  allMessages: Message[];
  className?: string;
}

/**
 * "Branch from here" button shown on user messages.
 * Opens a dialog to name the branch, then creates it.
 */
export function BranchButton({
  taskExternalId,
  message,
  messageIndex,
  allMessages,
  className,
}: BranchButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [branchTitle, setBranchTitle] = useState("");
  const [, navigate] = useLocation();
  const { setActiveTask } = useTask();
  const branchMutation = trpc.branches.create.useMutation();

  const handleBranch = useCallback(async () => {
    if (!branchTitle.trim()) return;

    // Collect messages up to and including this message
    const messagesToCopy = allMessages.slice(0, messageIndex + 1).map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));

    try {
      const result = await branchMutation.mutateAsync({
        parentTaskExternalId: taskExternalId,
        branchPointMessageId: messageIndex,
        label: branchTitle.trim(),
        newTaskTitle: branchTitle.trim(),
        messagesToCopy,
      });

      toast.success("Branch created");
      setDialogOpen(false);
      setBranchTitle("");

      // Navigate to the new branch
      setActiveTask(result.externalId);
      navigate(`/task/${result.externalId}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create branch");
    }
  }, [branchTitle, allMessages, messageIndex, taskExternalId, branchMutation, navigate, setActiveTask]);

  return (
    <>
      <button
        onClick={() => {
          setBranchTitle(`Branch: ${message.content.slice(0, 40)}${message.content.length > 40 ? "..." : ""}`);
          setDialogOpen(true);
        }}
        className={cn(
          "flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent/50",
          className
        )}
        title="Branch conversation from this message"
        aria-label="Branch conversation from this message"
      >
        <GitBranch className="w-3 h-3" />
        Branch
      </button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-primary" />
              Branch Conversation
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              Create a new conversation branch from this point. All messages up to and including this one will be copied to the new branch.
            </p>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Branch Name
              </label>
              <Input
                value={branchTitle}
                onChange={(e) => setBranchTitle(e.target.value)}
                placeholder="e.g., Alternative approach..."
                className="bg-background"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleBranch();
                  }
                }}
                autoFocus
              />
            </div>
            <div className="text-[11px] text-muted-foreground bg-muted/50 rounded-lg p-2.5">
              <span className="font-medium text-foreground">{messageIndex + 1}</span> message{messageIndex > 0 ? "s" : ""} will be copied to the new branch
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBranch}
              disabled={!branchTitle.trim() || branchMutation.isPending}
              className="gap-1.5"
            >
              {branchMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <GitBranch className="w-3.5 h-3.5" />
                  Create Branch
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
