/**
 * BrowserAuthCard — Manus-style inline chat card for browser authorization
 *
 * Matches the Manus pattern: Globe icon, explanation text,
 * three stacked buttons: "No, use default browser", "Check again",
 * "Use My Browser on Crimson-Hawk"
 *
 * Now wired to useCrimsonHawk for real connection management:
 * - "Use My Browser" triggers WebSocket connection attempt to local extension
 * - "Check again" retries the connection
 * - "No, use default" falls back to cloud browser
 * - Shows connection status feedback inline
 */
import { useState, useEffect } from "react";
import { Globe, Loader2, CheckCircle2, XCircle, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCrimsonHawk, type CrimsonHawkStatus } from "@/hooks/useCrimsonHawk";

export type BrowserChoice = "default" | "check" | "crimson-hawk";

interface BrowserAuthCardProps {
  onChoice: (choice: BrowserChoice) => void;
  disabled?: boolean;
  className?: string;
}

function StatusBadge({ status }: { status: CrimsonHawkStatus }) {
  switch (status) {
    case "connecting":
    case "handshaking":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-yellow-400">
          <Loader2 className="w-3 h-3 animate-spin" />
          {status === "handshaking" ? "Authenticating..." : "Connecting..."}
        </span>
      );
    case "connected":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-foreground/70">
          <CheckCircle2 className="w-3 h-3" />
          Connected to Crimson-Hawk
        </span>
      );
    case "error":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-red-400">
          <XCircle className="w-3 h-3" />
          Connection failed — is the extension running?
        </span>
      );
    default:
      return null;
  }
}

export default function BrowserAuthCard({ onChoice, disabled, className }: BrowserAuthCardProps) {
  const crimsonHawk = useCrimsonHawk();
  const [attempted, setAttempted] = useState(false);
  const [resolved, setResolved] = useState(false);

  // When connection succeeds, auto-resolve after brief delay
  useEffect(() => {
    if (crimsonHawk.status === "connected" && attempted && !resolved) {
      const timer = setTimeout(() => {
        setResolved(true);
        onChoice("crimson-hawk");
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [crimsonHawk.status, attempted, resolved, onChoice]);

  const handleUseCrimsonHawk = () => {
    setAttempted(true);
    setResolved(false);
    crimsonHawk.connect();
  };

  const handleCheckAgain = () => {
    setAttempted(true);
    setResolved(false);
    crimsonHawk.checkConnection();
  };

  const handleUseDefault = () => {
    if (crimsonHawk.isConnected) {
      crimsonHawk.disconnect();
    }
    onChoice("default");
  };

  const isConnecting = crimsonHawk.status === "connecting" || crimsonHawk.status === "handshaking";
  const buttonsDisabled = disabled || isConnecting || resolved;

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-xl p-5 max-w-md",
        className
      )}
    >
      {/* Header with globe icon and explanation */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Globe className="w-4.5 h-4.5 text-primary" />
        </div>
        <div>
          <p className="text-sm text-foreground leading-relaxed">
            Authorize Manus to use a new tab from My Browser to complete your task.
          </p>
          {/* Connection status feedback */}
          {attempted && (
            <div className="mt-2">
              <StatusBadge status={crimsonHawk.status} />
            </div>
          )}
        </div>
      </div>

      {/* Three stacked action buttons */}
      <div className="flex flex-col gap-2">
        <button
          onClick={handleUseDefault}
          disabled={buttonsDisabled}
          className="w-full py-2.5 px-4 rounded-lg text-sm font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors disabled:opacity-50"
        >
          No, use default browser
        </button>
        <button
          onClick={handleCheckAgain}
          disabled={buttonsDisabled}
          className="w-full py-2.5 px-4 rounded-lg text-sm font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors disabled:opacity-50"
        >
          {isConnecting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Checking...
            </span>
          ) : (
            "Check again"
          )}
        </button>
        <button
          onClick={handleUseCrimsonHawk}
          disabled={buttonsDisabled}
          className={cn(
            "w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-50",
            crimsonHawk.isConnected
              ? "bg-muted/50 border border-border text-foreground/70"
              : "bg-card border border-border text-foreground hover:bg-accent"
          )}
        >
          {crimsonHawk.isConnected ? (
            <span className="inline-flex items-center gap-2">
              <Wifi className="w-3.5 h-3.5" />
              Connected — Using My Browser
            </span>
          ) : isConnecting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Connecting to Crimson-Hawk...
            </span>
          ) : (
            "Use My Browser on Crimson-Hawk"
          )}
        </button>
      </div>
    </div>
  );
}
