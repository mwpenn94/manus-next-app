/**
 * SessionCostPanel — Expandable panel showing aggregate token usage,
 * estimated cost, streaming speed, and per-turn breakdown for the current session.
 *
 * Manus parity+: shows real-time cost transparency and generation speed during task execution.
 */
import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp, Coins, Zap, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  turn: number;
}

interface SessionCostPanelProps {
  tokenUsage: TokenUsage | null;
  agentMode: string;
  isStreaming: boolean;
}

// Approximate cost per 1M tokens (based on typical LLM pricing)
const COST_PER_1M_INPUT = 3.0; // $3/1M input tokens
const COST_PER_1M_OUTPUT = 15.0; // $15/1M output tokens

function estimateCost(promptTokens: number, completionTokens: number): number {
  return (promptTokens / 1_000_000) * COST_PER_1M_INPUT + (completionTokens / 1_000_000) * COST_PER_1M_OUTPUT;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

function formatCost(cost: number): string {
  if (cost < 0.01) return "<$0.01";
  return `$${cost.toFixed(3)}`;
}

/** Hook to track streaming speed (tokens/sec) */
function useStreamingSpeed(tokenUsage: TokenUsage | null, isStreaming: boolean) {
  const streamStartRef = useRef<number | null>(null);
  const prevTokensRef = useRef(0);
  const [tokensPerSec, setTokensPerSec] = useState(0);

  useEffect(() => {
    if (isStreaming && tokenUsage) {
      if (!streamStartRef.current) {
        streamStartRef.current = Date.now();
        prevTokensRef.current = tokenUsage.completion_tokens;
      }
      const elapsed = (Date.now() - streamStartRef.current) / 1000;
      const tokensDelta = tokenUsage.completion_tokens - prevTokensRef.current;
      if (elapsed > 0.5 && tokensDelta > 0) {
        setTokensPerSec(Math.round(tokensDelta / elapsed));
      }
    } else {
      streamStartRef.current = null;
      prevTokensRef.current = 0;
    }
  }, [tokenUsage, isStreaming]);

  return tokensPerSec;
}

export default function SessionCostPanel({ tokenUsage, agentMode, isStreaming }: SessionCostPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const tokensPerSec = useStreamingSpeed(tokenUsage, isStreaming);

  if (!tokenUsage || tokenUsage.total_tokens === 0) return null;

  const estimatedCost = estimateCost(tokenUsage.prompt_tokens, tokenUsage.completion_tokens);
  const contextPressure = tokenUsage.prompt_tokens / 200_000; // Fraction of typical 200k context
  const efficiency = tokenUsage.total_tokens > 0
    ? (tokenUsage.completion_tokens / tokenUsage.total_tokens * 100)
    : 0;

  return (
    <div className="relative">
      {/* Compact trigger */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium transition-colors",
          "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground",
          isStreaming && "ring-1 ring-primary/20"
        )}
        title="Session cost details"
      >
        <Coins className="w-3 h-3" />
        <span className="font-mono">{formatCost(estimatedCost)}</span>
        <span className="text-muted-foreground/60">·</span>
        <span className="font-mono">{formatTokens(tokenUsage.total_tokens)}</span>
        {isStreaming && tokensPerSec > 0 && (
          <>
            <span className="text-muted-foreground/60">·</span>
            <span className="font-mono text-primary">{tokensPerSec} tok/s</span>
          </>
        )}
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {/* Expanded panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1 w-72 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg z-[60] p-3"
          >
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Session Cost</span>
                <span className="text-xs text-muted-foreground capitalize">{agentMode} mode</span>
              </div>

              {/* Cost breakdown */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/30 rounded-md p-2">
                  <div className="text-[10px] text-muted-foreground mb-0.5">Input</div>
                  <div className="text-xs font-mono font-medium">{formatTokens(tokenUsage.prompt_tokens)}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    {formatCost((tokenUsage.prompt_tokens / 1_000_000) * COST_PER_1M_INPUT)}
                  </div>
                </div>
                <div className="bg-muted/30 rounded-md p-2">
                  <div className="text-[10px] text-muted-foreground mb-0.5">Output</div>
                  <div className="text-xs font-mono font-medium">{formatTokens(tokenUsage.completion_tokens)}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    {formatCost((tokenUsage.completion_tokens / 1_000_000) * COST_PER_1M_OUTPUT)}
                  </div>
                </div>
              </div>

              {/* Context pressure bar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-muted-foreground">Context usage</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{(contextPressure * 100).toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      contextPressure > 0.9 ? "bg-red-500" : contextPressure > 0.7 ? "bg-amber-500" : "bg-emerald-500"
                    )}
                    style={{ width: `${Math.min(contextPressure * 100, 100)}%` }}
                  />
                </div>
              </div>

              {/* Speed & Efficiency */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5">
                  <Gauge className="w-3 h-3 text-muted-foreground" />
                  <div>
                    <div className="text-[10px] text-muted-foreground">Speed</div>
                    <div className="text-[10px] font-mono font-medium">
                      {isStreaming && tokensPerSec > 0 ? `${tokensPerSec} tok/s` : "—"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-muted-foreground" />
                  <div>
                    <div className="text-[10px] text-muted-foreground">Efficiency</div>
                    <div className="text-[10px] font-mono font-medium">{efficiency.toFixed(0)}% output</div>
                  </div>
                </div>
              </div>

              {/* Turn info */}
              <div className="flex items-center justify-between pt-1 border-t border-border/50">
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">Turn {tokenUsage.turn}</span>
                </div>
                <span className="text-[10px] font-mono font-medium text-foreground">
                  Total: {formatCost(estimatedCost)}
                </span>
              </div>

              {/* Streaming indicator */}
              {isStreaming && (
                <div className="flex items-center gap-1.5 text-[10px] text-primary">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  Generating{tokensPerSec > 0 ? ` at ${tokensPerSec} tok/s` : "..."}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
