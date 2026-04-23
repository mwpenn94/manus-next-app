/**
 * ConfirmationGate — Manus-style "agent pauses for user confirmation" block
 *
 * Renders inline in chat when the agent needs explicit user approval before
 * proceeding with a destructive, costly, or complex operation.
 *
 * States: pending → approved / rejected
 * Visual: amber warning card with action description, approve/reject buttons
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  Check,
  X,
  AlertTriangle,
  CreditCard,
  Trash2,
  Globe,
  Send,
  Settings,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ConfirmationCategory =
  | "destructive"
  | "payment"
  | "publish"
  | "external"
  | "sensitive"
  | "general";

export type ConfirmationStatus = "pending" | "approved" | "rejected";

interface ConfirmationGateProps {
  /** What the agent wants to do */
  action: string;
  /** Detailed description of what will happen */
  description?: string;
  /** Category determines icon and color */
  category?: ConfirmationCategory;
  /** Current status */
  status?: ConfirmationStatus;
  /** Called when user approves */
  onApprove?: () => void;
  /** Called when user rejects */
  onReject?: () => void;
  /** Whether the action is in progress after approval */
  isProcessing?: boolean;
}

const CATEGORY_CONFIG: Record<
  ConfirmationCategory,
  { icon: React.ElementType; color: string; bgColor: string; borderColor: string; label: string }
> = {
  destructive: {
    icon: Trash2,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
    label: "Destructive Action",
  },
  payment: {
    icon: CreditCard,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    label: "Payment Required",
  },
  publish: {
    icon: Globe,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    label: "Publishing",
  },
  external: {
    icon: Send,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
    label: "External Action",
  },
  sensitive: {
    icon: ShieldAlert,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/20",
    label: "Sensitive Operation",
  },
  general: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    label: "Confirmation Required",
  },
};

export default function ConfirmationGate({
  action,
  description,
  category = "general",
  status = "pending",
  onApprove,
  onReject,
  isProcessing = false,
}: ConfirmationGateProps) {
  const config = CATEGORY_CONFIG[category];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "rounded-xl border overflow-hidden",
        status === "pending" ? config.borderColor : "border-border/40",
        status === "approved" ? "border-green-500/30" : "",
        status === "rejected" ? "border-red-500/30 opacity-60" : ""
      )}
    >
      {/* Header bar */}
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-2.5",
          status === "pending" ? config.bgColor : "",
          status === "approved" ? "bg-green-500/10" : "",
          status === "rejected" ? "bg-red-500/5" : ""
        )}
      >
        <div
          className={cn(
            "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
            status === "pending" ? config.bgColor : "",
            status === "approved" ? "bg-green-500/20" : "",
            status === "rejected" ? "bg-red-500/10" : ""
          )}
        >
          {status === "pending" && <Icon className={cn("w-3.5 h-3.5", config.color)} />}
          {status === "approved" && <Check className="w-3.5 h-3.5 text-green-400" />}
          {status === "rejected" && <X className="w-3.5 h-3.5 text-red-400" />}
        </div>
        <span
          className={cn(
            "text-xs font-medium uppercase tracking-wider",
            status === "pending" ? config.color : "",
            status === "approved" ? "text-green-400" : "",
            status === "rejected" ? "text-red-400" : ""
          )}
        >
          {status === "pending"
            ? config.label
            : status === "approved"
              ? "Approved"
              : "Rejected"}
        </span>
      </div>

      {/* Body */}
      <div className="px-4 py-3 bg-card/50">
        <p className="text-sm font-medium text-foreground mb-1">{action}</p>
        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        )}

        {/* Manus-style notice */}
        {status === "pending" && (
          <p className="text-[11px] text-muted-foreground mt-2.5 italic">
            Manus will continue after your confirmation.
          </p>
        )}

        {/* Action buttons */}
        {status === "pending" && (
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={onApprove}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isProcessing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Check className="w-3 h-3" />
              )}
              {isProcessing ? "Processing..." : "Approve"}
            </button>
            <button
              onClick={onReject}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-muted/60 text-muted-foreground text-xs font-medium hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
            >
              <X className="w-3 h-3" />
              Reject
            </button>
          </div>
        )}

        {/* Status messages */}
        {status === "approved" && (
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-green-400">
            <Check className="w-3 h-3" />
            <span>Action approved — agent is proceeding</span>
          </div>
        )}
        {status === "rejected" && (
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-red-400">
            <X className="w-3 h-3" />
            <span>Action rejected — agent will find an alternative</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export { CATEGORY_CONFIG };
