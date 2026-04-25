/**
 * BranchTreeView — Visual branch tree/timeline diagram.
 * Shows parent-child relationships with connecting lines.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useTask } from "@/contexts/TaskContext";
import { cn } from "@/lib/utils";
import { GitBranch, ChevronDown, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface TreeNode {
  id: number;
  externalId: string;
  title: string;
  label?: string | null;
  children: TreeNode[];
  isCurrent: boolean;
}

interface BranchTreeNodeProps {
  node: TreeNode;
  depth: number;
  onNavigate: (externalId: string) => void;
}

function BranchTreeNode({ node, depth, onNavigate }: BranchTreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <div className="relative">
      {/* Node */}
      <div className="flex items-center gap-1.5 group">
        {/* Expand/collapse toggle */}
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            {expanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        ) : (
          <span className="w-4 h-4 flex items-center justify-center shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
          </span>
        )}

        {/* Node button */}
        <button
          onClick={() => onNavigate(node.externalId)}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all max-w-[200px]",
            node.isCurrent
              ? "bg-primary text-primary-foreground font-medium shadow-sm"
              : "bg-muted/50 text-foreground hover:bg-muted hover:shadow-sm"
          )}
        >
          <GitBranch className="w-3 h-3 shrink-0" />
          <span className="truncate">{node.label || node.title}</span>
        </button>

        {/* Branch count badge */}
        {hasChildren && (
          <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">
            {node.children.length}
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="ml-4 mt-1 pl-2 border-l border-border/50 space-y-1">
          {node.children.map((child) => (
            <BranchTreeNode
              key={child.externalId}
              node={child}
              depth={depth + 1}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface BranchTreeViewProps {
  taskExternalId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BranchTreeView({ taskExternalId, open, onOpenChange }: BranchTreeViewProps) {
  const [, navigate] = useLocation();
  const { setActiveTask } = useTask();
  const { data: tree, isLoading } = trpc.branches.tree.useQuery(
    { taskExternalId },
    { enabled: open && !!taskExternalId }
  );

  const handleNavigate = (externalId: string) => {
    setActiveTask(externalId);
    navigate(`/task/${externalId}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <GitBranch className="w-4 h-4 text-primary" />
            Branch Tree
          </DialogTitle>
        </DialogHeader>
        <div className="py-2 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : tree ? (
            <BranchTreeNode node={tree} depth={0} onNavigate={handleNavigate} />
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">
              No branch history found for this task.
            </p>
          )}
        </div>
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
