import { LogIn, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { cn } from "@/lib/utils";

interface GuestBannerProps {
  className?: string;
}

/**
 * GuestBanner — Shown to unauthenticated users exploring the app.
 * Matches Manus pattern: users can immediately access and explore without a gate.
 * Provides a subtle, non-blocking prompt to sign in for full features.
 */
export function GuestBanner({ className }: GuestBannerProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-lg",
        className
      )}
    >
      <Sparkles className="w-4 h-4 text-primary shrink-0" />
      <p className="text-xs text-foreground/80 flex-1">
        You're exploring as a guest. Sign in to save your work, access all
        capabilities, and personalize your experience.
      </p>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10"
        onClick={() => {
          window.location.href = getLoginUrl();
        }}
      >
        <LogIn className="w-3 h-3" />
        Sign in
      </Button>
    </div>
  );
}

export default GuestBanner;
