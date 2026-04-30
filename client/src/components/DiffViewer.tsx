/**
 * DiffViewer — Lightweight unified diff viewer for file changes.
 * 
 * Manus-aligned: minimal, purposeful, no heavy dependencies.
 * Uses a simple LCS-based line diff algorithm with color-coded output.
 * Green for additions, red for deletions, gray for context.
 */
import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface DiffViewerProps {
  original: string;
  modified: string;
  filename?: string;
  className?: string;
}

type DiffLineType = "context" | "addition" | "deletion";

interface DiffLine {
  type: DiffLineType;
  content: string;
  oldLineNum: number | null;
  newLineNum: number | null;
}

/**
 * Simple LCS-based diff algorithm.
 * Computes the longest common subsequence of lines, then derives
 * additions, deletions, and context lines.
 */
function computeDiff(original: string, modified: string): DiffLine[] {
  const oldLines = original.split("\n");
  const newLines = modified.split("\n");

  // Handle identical content
  if (original === modified) {
    return oldLines.map((line, i) => ({
      type: "context" as DiffLineType,
      content: line,
      oldLineNum: i + 1,
      newLineNum: i + 1,
    }));
  }

  // LCS table
  const m = oldLines.length;
  const n = newLines.length;

  // For very large files, fall back to a simpler approach
  if (m * n > 500_000) {
    return simpleDiff(oldLines, newLines);
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to get diff
  const result: DiffLine[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.unshift({
        type: "context",
        content: oldLines[i - 1],
        oldLineNum: i,
        newLineNum: j,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({
        type: "addition",
        content: newLines[j - 1],
        oldLineNum: null,
        newLineNum: j,
      });
      j--;
    } else if (i > 0) {
      result.unshift({
        type: "deletion",
        content: oldLines[i - 1],
        oldLineNum: i,
        newLineNum: null,
      });
      i--;
    }
  }

  return result;
}

/**
 * Simple fallback diff for very large files — just show all old as deleted, all new as added.
 */
function simpleDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  const result: DiffLine[] = [];
  oldLines.forEach((line, i) => {
    result.push({ type: "deletion", content: line, oldLineNum: i + 1, newLineNum: null });
  });
  newLines.forEach((line, i) => {
    result.push({ type: "addition", content: line, oldLineNum: null, newLineNum: i + 1 });
  });
  return result;
}

/**
 * Compute summary stats for the diff
 */
function computeStats(lines: DiffLine[]): { additions: number; deletions: number; unchanged: number } {
  let additions = 0;
  let deletions = 0;
  let unchanged = 0;
  for (const line of lines) {
    if (line.type === "addition") additions++;
    else if (line.type === "deletion") deletions++;
    else unchanged++;
  }
  return { additions, deletions, unchanged };
}

export default function DiffViewer({ original, modified, filename, className }: DiffViewerProps) {
  const diffLines = useMemo(() => computeDiff(original, modified), [original, modified]);
  const stats = useMemo(() => computeStats(diffLines), [diffLines]);
  const isIdentical = stats.additions === 0 && stats.deletions === 0;

  return (
    <div className={cn("rounded-lg border border-border overflow-hidden bg-card", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-2">
          {filename && (
            <span className="text-xs font-mono text-muted-foreground">{filename}</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs">
          {isIdentical ? (
            <span className="text-muted-foreground">No changes</span>
          ) : (
            <>
              <span className="text-emerald-400">+{stats.additions}</span>
              <span className="text-red-400">−{stats.deletions}</span>
              <span className="text-muted-foreground">{stats.unchanged} unchanged</span>
            </>
          )}
        </div>
      </div>

      {/* Diff content */}
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        {isIdentical ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            File content is identical — no changes to review.
          </div>
        ) : (
          <table className="w-full text-xs font-mono border-collapse">
            <tbody>
              {diffLines.map((line, idx) => (
                <tr
                  key={idx}
                  className={cn(
                    "border-b border-border/30 last:border-b-0",
                    line.type === "addition" && "bg-emerald-500/10",
                    line.type === "deletion" && "bg-red-500/10"
                  )}
                >
                  {/* Old line number */}
                  <td className="w-10 px-2 py-0.5 text-right text-muted-foreground select-none border-r border-border/20 shrink-0">
                    {line.oldLineNum ?? ""}
                  </td>
                  {/* New line number */}
                  <td className="w-10 px-2 py-0.5 text-right text-muted-foreground select-none border-r border-border/20 shrink-0">
                    {line.newLineNum ?? ""}
                  </td>
                  {/* Indicator */}
                  <td
                    className={cn(
                      "w-5 px-1 py-0.5 text-center select-none shrink-0",
                      line.type === "addition" && "text-emerald-400",
                      line.type === "deletion" && "text-red-400",
                      line.type === "context" && "text-muted-foreground"
                    )}
                  >
                    {line.type === "addition" ? "+" : line.type === "deletion" ? "−" : " "}
                  </td>
                  {/* Content */}
                  <td className="px-2 py-0.5 whitespace-pre">
                    <span
                      className={cn(
                        line.type === "addition" && "text-emerald-300",
                        line.type === "deletion" && "text-red-300",
                        line.type === "context" && "text-muted-foreground"
                      )}
                    >
                      {line.content || " "}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// Export the diff computation for testing
export { computeDiff, computeStats, type DiffLine, type DiffLineType };
