/**
 * HeroIllustration — Reusable hero banner for capability pages.
 *
 * On first visit: shows a gradient placeholder, then calls illustrations.generate
 * to produce an AI-generated hero image. The URL is cached in localStorage so
 * subsequent visits load instantly. If the user is not authenticated or generation
 * fails, the gradient fallback remains — no broken states.
 */
import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Sparkles, RefreshCw } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

interface HeroIllustrationProps {
  /** The illustration type key, e.g. "hero-documents" */
  type: string;
  /** Page title displayed over the hero */
  title: string;
  /** Subtitle / description */
  subtitle: string;
  /** Optional icon component to display alongside the title */
  icon?: React.ReactNode;
  /** Optional badge text (e.g. "beta") */
  badge?: string;
  /** Additional className for the outer container */
  className?: string;
}

const CACHE_PREFIX = "sovereign-hero-";

function getCachedUrl(type: string): string | null {
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + type);
    if (cached) {
      const { url, ts } = JSON.parse(cached);
      // Cache for 7 days
      if (Date.now() - ts < 7 * 24 * 60 * 60 * 1000) return url;
    }
  } catch { /* ignore */ }
  return null;
}

function setCachedUrl(type: string, url: string) {
  try {
    localStorage.setItem(CACHE_PREFIX + type, JSON.stringify({ url, ts: Date.now() }));
  } catch { /* quota exceeded — ignore */ }
}

export default function HeroIllustration({
  type, title, subtitle, icon, badge, className,
}: HeroIllustrationProps) {
  const { isAuthenticated } = useAuth();
  const [imageUrl, setImageUrl] = useState<string | null>(() => getCachedUrl(type));
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);

  const generateMutation = trpc.illustrations.generate.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        setImageUrl(data.url);
        setCachedUrl(type, data.url);
      }
      setIsGenerating(false);
    },
    onError: () => {
      setIsGenerating(false);
    },
  });

  // Auto-generate on first visit if authenticated and no cached image
  useEffect(() => {
    if (isAuthenticated && !imageUrl && !hasAttempted && !isGenerating) {
      setHasAttempted(true);
      setIsGenerating(true);
      generateMutation.mutate({ type });
    }
  }, [isAuthenticated, imageUrl, hasAttempted, isGenerating, type]);

  const handleRegenerate = useCallback(() => {
    if (isGenerating) return;
    setIsGenerating(true);
    generateMutation.mutate({ type });
  }, [isGenerating, type]);

  return (
    <div className={cn("relative overflow-hidden rounded-xl mb-8", className)}>
      {/* Background layer */}
      <div className="absolute inset-0">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="w-full h-full object-cover opacity-40 transition-opacity duration-700"
            loading="eager"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/5 to-transparent" />
        )}
        {/* Overlay gradient for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-background/40" />
      </div>

      {/* Content layer */}
      <div className="relative z-10 px-6 py-8 sm:py-10">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-2">
              {icon && (
                <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  {icon}
                </div>
              )}
              <h1
                className="text-2xl sm:text-3xl font-semibold text-foreground"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {title}
              </h1>
              {badge && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary uppercase tracking-wider">
                  {badge}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground max-w-lg">
              {subtitle}
            </p>
          </div>

          {/* Generate / Regenerate button */}
          {isAuthenticated && (
            <button
              onClick={handleRegenerate}
              disabled={isGenerating}
              className={cn(
                "shrink-0 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all",
                isGenerating && "animate-pulse"
              )}
              title={imageUrl ? "Regenerate illustration" : "Generate illustration"}
            >
              {isGenerating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Generation status */}
        {isGenerating && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Generating custom illustration...</span>
          </div>
        )}
      </div>
    </div>
  );
}
