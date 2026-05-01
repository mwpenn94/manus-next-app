/**
 * PublishSheet — Manus-style bottom sheet for publishing/deployment management
 *
 * Matches the Manus pattern: "Publish" title, Deployment status (Live badge),
 * Website address with copy button, "+ Customize domain" link,
 * Visibility dropdown, info banner, "Publish latest version" button.
 */
import { useState } from "react";
import { Globe, Copy, Check, ChevronDown, Info, Loader2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

type DeploymentStatus = "live" | "deploying" | "offline" | "error";
type Visibility = "public" | "private" | "password";

interface PublishSheetProps {
  open: boolean;
  onClose: () => void;
  appName: string;
  domain: string;
  deploymentStatus: DeploymentStatus;
  visibility: Visibility;
  hasUnpublishedChanges: boolean;
  onPublish: () => void;
  onCustomizeDomain?: () => void;
  onVisibilityChange?: (v: Visibility) => void;
  publishing?: boolean;
}

const STATUS_CONFIG: Record<DeploymentStatus, { label: string; color: string; dot: string }> = {
  live: { label: "Live", color: "text-muted-foreground", dot: "bg-foreground/70" },
  deploying: { label: "Deploying", color: "text-muted-foreground", dot: "bg-muted-foreground" },
  offline: { label: "Offline", color: "text-muted-foreground", dot: "bg-muted-foreground" },
  error: { label: "Error", color: "text-destructive", dot: "bg-destructive" },
};

const VISIBILITY_OPTIONS: { value: Visibility; label: string; icon: typeof Globe }[] = [
  { value: "public", label: "Everyone can see this site", icon: Globe },
  { value: "private", label: "Only you can see this site", icon: Globe },
  { value: "password", label: "Password protected", icon: Globe },
];

export default function PublishSheet({
  open,
  onClose,
  domain,
  deploymentStatus,
  visibility,
  hasUnpublishedChanges,
  onPublish,
  onCustomizeDomain,
  onVisibilityChange,
  publishing,
}: PublishSheetProps) {
  const [copied, setCopied] = useState(false);
  const [visDropdownOpen, setVisDropdownOpen] = useState(false);
  const statusCfg = STATUS_CONFIG[deploymentStatus];
  const currentVis = VISIBILITY_OPTIONS.find((v) => v.value === visibility) || VISIBILITY_OPTIONS[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(domain);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[var(--overlay)]"
            onClick={onClose}
          />
          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-2xl max-h-[85vh] overflow-y-auto"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="px-6 pb-8 space-y-6">
              {/* Title */}
              <h2 className="text-2xl font-bold text-foreground">Publish</h2>

              {/* Deployment status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Deployment status</span>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-border">
                  <div className={cn("w-2 h-2 rounded-full", statusCfg.dot)} />
                  <span className={cn("text-sm font-medium", statusCfg.color)}>{statusCfg.label}</span>
                </div>
              </div>

              {/* Website address */}
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">Website address</span>
                <div className="flex items-center gap-2 bg-muted rounded-xl px-4 py-3">
                  <a
                    href={`https://${domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-sm text-foreground underline underline-offset-2 truncate"
                  >
                    {domain}
                  </a>
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-md hover:bg-accent transition-colors shrink-0"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              {/* Customize domain */}
              <button
                onClick={onCustomizeDomain}
                className="text-sm font-medium text-primary hover:underline"
              >
                + Customize domain
              </button>

              {/* Visibility */}
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">Visibility</span>
                <div className="relative">
                  <button
                    onClick={() => setVisDropdownOpen(!visDropdownOpen)}
                    className="w-full flex items-center gap-3 bg-muted rounded-xl px-4 py-3"
                  >
                    <Globe className="w-5 h-5 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-sm text-foreground text-left">{currentVis.label}</span>
                    <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", visDropdownOpen && "rotate-180")} />
                  </button>
                  <AnimatePresence>
                    {visDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute top-full mt-1 left-0 right-0 bg-popover border border-border rounded-xl shadow-lg z-10 py-1"
                      >
                        {VISIBILITY_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => {
                              onVisibilityChange?.(opt.value);
                              setVisDropdownOpen(false);
                            }}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors text-left",
                              opt.value === visibility && "text-primary"
                            )}
                          >
                            <opt.icon className="w-4 h-4" />
                            {opt.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Info banner */}
              {hasUnpublishedChanges && (
                <div className="flex items-start gap-3 bg-muted rounded-xl px-4 py-3">
                  <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    Your latest changes are not yet live. Update to publish them.
                  </p>
                </div>
              )}

              {/* Publish button */}
              <button
                onClick={onPublish}
                disabled={publishing || (!hasUnpublishedChanges && deploymentStatus === "live")}
                className={cn(
                  "w-full py-3.5 rounded-xl text-base font-semibold transition-all",
                  publishing
                    ? "bg-muted text-foreground cursor-wait"
                    : hasUnpublishedChanges
                    ? "bg-foreground text-background hover:opacity-80 shadow-lg"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                {publishing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Publishing...
                  </span>
                ) : (
                  "Publish latest version"
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
