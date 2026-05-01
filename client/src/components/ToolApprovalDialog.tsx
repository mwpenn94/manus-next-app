
"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

import {
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,

  AlertTriangle,
  CheckCircle2,
  XCircle,
  Pencil,
  History,
  Info,
} from "lucide-react";


type RiskLevel = "low" | "medium" | "high" | "critical";

interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
  description: string;
  riskLevel: RiskLevel;
}

interface ApprovalHistoryItem {
  toolName: string;
  status: "approved" | "denied" | "modified";
  timestamp: string;
}

interface ToolApprovalDialogProps {
  toolCall: ToolCall;
  isOpen: boolean;
  onApprove: () => void;
  onDeny: () => void;
  onModify?: (modifiedArgs: Record<string, unknown>) => void;
  autoApproveTimeout?: number; // in seconds
  history?: ApprovalHistoryItem[];
}

const riskConfig = {
  low: {
    color: "border-green-500",
    icon: <ShieldCheck className="h-5 w-5 text-green-500" />,
    label: "Low Risk",
    explanation: "This is a safe, read-only operation.",
  },
  medium: {
    color: "border-yellow-500",
    icon: <ShieldQuestion className="h-5 w-5 text-yellow-500" />,
    label: "Medium Risk",
    explanation: "This operation might modify data or state.",
  },
  high: {
    color: "border-orange-500",
    icon: <ShieldAlert className="h-5 w-5 text-orange-500" />,
    label: "High Risk",
    explanation: "This operation could have significant side effects.",
  },
  critical: {
    color: "border-red-500",
    icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
    label: "Critical Risk",
    explanation: "This is a potentially destructive or irreversible operation.",
  },
};

const historyIcons = {
    approved: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    denied: <XCircle className="h-4 w-4 text-red-500" />,
    modified: <Pencil className="h-4 w-4 text-blue-500" />,
};

export const ToolApprovalDialog = ({
  toolCall,
  isOpen,
  onApprove,
  onDeny,
  onModify,
  autoApproveTimeout,
  history = [],
}: ToolApprovalDialogProps) => {
  const [confirmationText, setConfirmationText] = useState("");
  const [countdown, setCountdown] = useState(autoApproveTimeout || 0);
  const [editedArgs, setEditedArgs] = useState<string>("");
  const [isJsonValid, setIsJsonValid] = useState(true);

  const config = riskConfig[toolCall.riskLevel];
  const isCritical = toolCall.riskLevel === "critical";
  const isLowRiskWithTimeout = toolCall.riskLevel === "low" && autoApproveTimeout;

  const argsRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setEditedArgs(JSON.stringify(toolCall.arguments, null, 2));
      setIsJsonValid(true);
      setConfirmationText("");
      if (isLowRiskWithTimeout) {
        setCountdown(autoApproveTimeout);
      }
    }
  }, [isOpen, toolCall.arguments, isLowRiskWithTimeout, autoApproveTimeout]);

  useEffect(() => {
    if (!isOpen || !isLowRiskWithTimeout || countdown <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onApprove();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isLowRiskWithTimeout, countdown, onApprove]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onDeny();
      }
      if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        // Prevent approve if focus is on editable args or confirm input
        if (document.activeElement === argsRef.current || (isCritical && document.activeElement?.id === "critical-confirm-input")) {
            return;
        }
        handleApprove();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onDeny, onApprove, isCritical, confirmationText]);

  const handleArgsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedArgs(e.target.value);
    try {
      JSON.parse(e.target.value);
      setIsJsonValid(true);
    } catch (error) {
      setIsJsonValid(false);
    }
  };

  const handleModifyAndApprove = () => {
    if (!onModify || !isJsonValid) return;
    try {
      const modifiedArgs = JSON.parse(editedArgs);
      onModify(modifiedArgs);
    } catch (error) {
      console.error("Failed to parse modified arguments:", error);
    }
  };

  const isApproveDisabled = isCritical && confirmationText !== "CONFIRM";

  const handleApprove = () => {
    if (!isApproveDisabled) {
      onApprove();
    }
  };

  const pulseAnimation = isCritical ? { 
    scale: [1, 1.05, 1], 
    transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" as const }
  } : {};

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onDeny()}>
      <DialogContent
        className={cn("sm:max-w-2xl border-2", config.color)}
        onEscapeKeyDown={onDeny}
      >
        <motion.div animate={pulseAnimation}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {config.icon}
              Tool Execution Request: <span className="font-mono text-primary">{toolCall.name}</span>
            </DialogTitle>
            <DialogDescription>{toolCall.description}</DialogDescription>
          </DialogHeader>
        </motion.div>

        <div className="my-4 space-y-4">
          <div className="flex items-start gap-2 rounded-lg border bg-card p-3 text-card-foreground">
            <Info className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
            <div>
              <Badge variant={isCritical ? "destructive" : "secondary"}>{config.label}</Badge>
              <p className="mt-1 text-sm text-muted-foreground">{config.explanation}</p>
            </div>
          </div>

          {onModify && (
            <div>
              <label htmlFor="tool-args" className="text-sm font-medium">Arguments (Editable JSON)</label>
              <Textarea
                id="tool-args"
                ref={argsRef}
                value={editedArgs}
                onChange={handleArgsChange}
                className={cn("mt-1 font-mono text-sm h-32", !isJsonValid && "border-red-500 focus-visible:ring-red-500")}
              />
              {!isJsonValid && <p className="mt-1 text-xs text-red-500">Invalid JSON format.</p>}
            </div>
          )}

          {isCritical && (
            <div>
              <label htmlFor="critical-confirm-input" className="text-sm font-medium">
                Type <span className="font-bold text-red-500">CONFIRM</span> to approve this critical operation.
              </label>
              <Input
                id="critical-confirm-input"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                className="mt-1 font-mono"
                autoComplete="off"
              />
            </div>
          )}

          {isLowRiskWithTimeout && (
            <div>
              <p className="text-sm text-muted-foreground">Auto-approving in {countdown} seconds...</p>
              <Progress value={(countdown / autoApproveTimeout) * 100} className="mt-2 h-2" />
            </div>
          )}

          {history.length > 0 && (
            <div className="space-y-2">
                <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <History className="h-4 w-4" />
                    Recent Activity
                </h4>
                <div className="max-h-24 overflow-y-auto rounded-md border bg-muted/50 p-2 space-y-1">
                    {history.slice(0, 5).map((item, index) => (
                        <div key={index} className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                                {historyIcons[item.status]}
                                <span className="font-mono">{item.toolName}</span>
                                <span>({item.status})</span>
                            </div>
                            <span className="text-xs">{new Date(item.timestamp).toLocaleTimeString()}</span>
                        </div>
                    ))}
                </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button variant="destructive" onClick={onDeny}>Deny</Button>
          {onModify && (
            <Button variant="outline" onClick={handleModifyAndApprove} disabled={!isJsonValid}>
              Modify and Approve
            </Button>
          )}
          <Button onClick={handleApprove} disabled={isApproveDisabled}>
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
