import { useState, useMemo } from "react";
import {
  GitBranch,
  GitCommit,
  Clock,
  User,
  ChevronRight,
  RotateCcw,
  Eye,
  Plus,
  Minus,
  FileCode,
  ArrowLeftRight,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface VersionEntry {
  id: string;
  hash: string;
  label: string;
  message: string;
  author: string;
  timestamp: string;
  filesChanged: number;
  additions: number;
  deletions: number;
  status: "live" | "previous" | "rollback";
}

interface FileDiff {
  path: string;
  status: "added" | "modified" | "deleted";
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
}

interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

interface DiffLine {
  type: "context" | "addition" | "deletion";
  content: string;
  lineNumber: { old?: number; new?: number };
}

const MOCK_VERSIONS: VersionEntry[] = [
  { id: "v1", hash: "a1b2c3d", label: "v2.4.1", message: "Fix responsive layout on mobile dashboard", author: "Agent", timestamp: "2 hours ago", filesChanged: 3, additions: 24, deletions: 8, status: "live" },
  { id: "v2", hash: "e4f5g6h", label: "v2.4.0", message: "Add real-time analytics dashboard with WebSocket", author: "Agent", timestamp: "5 hours ago", filesChanged: 7, additions: 312, deletions: 45, status: "previous" },
  { id: "v3", hash: "i7j8k9l", label: "v2.3.2", message: "Optimize bundle size and tree-shake unused imports", author: "Agent", timestamp: "1 day ago", filesChanged: 12, additions: 18, deletions: 156, status: "previous" },
  { id: "v4", hash: "m0n1o2p", label: "v2.3.1", message: "Add dark mode support with system preference detection", author: "Agent", timestamp: "2 days ago", filesChanged: 5, additions: 89, deletions: 12, status: "previous" },
  { id: "v5", hash: "q3r4s5t", label: "v2.3.0", message: "Implement user authentication with OAuth flow", author: "Agent", timestamp: "3 days ago", filesChanged: 9, additions: 445, deletions: 23, status: "previous" },
];

const MOCK_DIFFS: FileDiff[] = [
  {
    path: "src/components/Dashboard.tsx",
    status: "modified",
    additions: 15,
    deletions: 5,
    hunks: [
      {
        header: "@@ -42,8 +42,18 @@",
        lines: [
          { type: "context", content: "  const [data, setData] = useState(null);", lineNumber: { old: 42, new: 42 } },
          { type: "context", content: "  const { user } = useAuth();", lineNumber: { old: 43, new: 43 } },
          { type: "deletion", content: "  const layout = 'fixed';", lineNumber: { old: 44 } },
          { type: "addition", content: "  const [layout, setLayout] = useState('responsive');", lineNumber: { new: 44 } },
          { type: "addition", content: "  const isMobile = useMediaQuery('(max-width: 768px)');", lineNumber: { new: 45 } },
          { type: "context", content: "", lineNumber: { old: 45, new: 46 } },
          { type: "deletion", content: "  return <div className=\"grid grid-cols-3 gap-4\">;", lineNumber: { old: 46 } },
          { type: "addition", content: "  return (", lineNumber: { new: 47 } },
          { type: "addition", content: "    <div className={cn(", lineNumber: { new: 48 } },
          { type: "addition", content: "      'grid gap-4',", lineNumber: { new: 49 } },
          { type: "addition", content: "      isMobile ? 'grid-cols-1' : 'grid-cols-3'", lineNumber: { new: 50 } },
          { type: "addition", content: "    )}>", lineNumber: { new: 51 } },
        ],
      },
    ],
  },
  {
    path: "src/hooks/useMediaQuery.ts",
    status: "added",
    additions: 9,
    deletions: 0,
    hunks: [
      {
        header: "@@ -0,0 +1,9 @@",
        lines: [
          { type: "addition", content: "import { useState, useEffect } from 'react';", lineNumber: { new: 1 } },
          { type: "addition", content: "", lineNumber: { new: 2 } },
          { type: "addition", content: "export function useMediaQuery(query: string): boolean {", lineNumber: { new: 3 } },
          { type: "addition", content: "  const [matches, setMatches] = useState(false);", lineNumber: { new: 4 } },
          { type: "addition", content: "  useEffect(() => {", lineNumber: { new: 5 } },
          { type: "addition", content: "    const mql = window.matchMedia(query);", lineNumber: { new: 6 } },
          { type: "addition", content: "    setMatches(mql.matches);", lineNumber: { new: 7 } },
          { type: "addition", content: "  }, [query]);", lineNumber: { new: 8 } },
          { type: "addition", content: "  return matches;", lineNumber: { new: 9 } },
        ],
      },
    ],
  },
  {
    path: "src/styles/layout.css",
    status: "modified",
    additions: 3,
    deletions: 3,
    hunks: [
      {
        header: "@@ -18,5 +18,5 @@",
        lines: [
          { type: "context", content: ".dashboard-grid {", lineNumber: { old: 18, new: 18 } },
          { type: "deletion", content: "  display: grid;", lineNumber: { old: 19 } },
          { type: "deletion", content: "  grid-template-columns: repeat(3, 1fr);", lineNumber: { old: 20 } },
          { type: "deletion", content: "  gap: 16px;", lineNumber: { old: 21 } },
          { type: "addition", content: "  display: flex;", lineNumber: { new: 19 } },
          { type: "addition", content: "  flex-wrap: wrap;", lineNumber: { new: 20 } },
          { type: "addition", content: "  gap: 1rem;", lineNumber: { new: 21 } },
        ],
      },
    ],
  },
];

export default function WebAppVersionDiffView(): React.JSX.Element {
  const [selectedVersion, setSelectedVersion] = useState<string>("v1");
  const [compareVersion, setCompareVersion] = useState<string>("v2");
  const [showDiff, setShowDiff] = useState(true);
  const [diffStyle, setDiffStyle] = useState<"split" | "unified">("unified");

  const selectedEntry = MOCK_VERSIONS.find((v) => v.id === selectedVersion);
  const compareEntry = MOCK_VERSIONS.find((v) => v.id === compareVersion);

  const totalAdditions = MOCK_DIFFS.reduce((s, d) => s + d.additions, 0);
  const totalDeletions = MOCK_DIFFS.reduce((s, d) => s + d.deletions, 0);

  return (
    <div className="flex flex-col h-full bg-background text-foreground rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Version History</h2>
            <p className="text-xs text-muted-foreground">Compare versions and rollback changes</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDiffStyle(diffStyle === "unified" ? "split" : "unified")}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg bg-muted hover:bg-accent transition-colors"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            {diffStyle === "unified" ? "Unified" : "Split"}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Version List */}
        <div className="w-72 border-r border-border flex flex-col bg-card/30">
          <div className="p-3 border-b border-border">
            <h3 className="text-xs font-medium text-muted-foreground">Versions</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {MOCK_VERSIONS.map((version) => (
              <button
                key={version.id}
                className={cn(
                  "w-full text-left px-4 py-3 border-b border-border/50 transition-colors",
                  selectedVersion === version.id ? "bg-primary/5" : "hover:bg-accent/50"
                )}
                onClick={() => setSelectedVersion(version.id)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <GitCommit className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium">{version.label}</span>
                  {version.status === "live" && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-500">live</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate ml-5.5">{version.message}</p>
                <div className="flex items-center gap-3 mt-1.5 ml-5.5 text-[10px] text-muted-foreground">
                  <code className="font-mono">{version.hash}</code>
                  <span>{version.timestamp}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 ml-5.5">
                  <span className="text-[10px] text-green-500">+{version.additions}</span>
                  <span className="text-[10px] text-red-500">-{version.deletions}</span>
                  <span className="text-[10px] text-muted-foreground">{version.filesChanged} files</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Diff View */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Compare Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-card border border-border text-xs">
              <span className="font-mono">{selectedEntry?.hash}</span>
              <span className="text-muted-foreground">{selectedEntry?.label}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-card border border-border text-xs">
              <span className="font-mono">{compareEntry?.hash}</span>
              <span className="text-muted-foreground">{compareEntry?.label}</span>
            </div>
            <div className="ml-auto flex items-center gap-3 text-xs">
              <span className="text-green-500">+{totalAdditions}</span>
              <span className="text-red-500">-{totalDeletions}</span>
              <span className="text-muted-foreground">{MOCK_DIFFS.length} files</span>
            </div>
          </div>

          {/* File Diffs */}
          <div className="flex-1 overflow-y-auto">
            {MOCK_DIFFS.map((diff) => (
              <div key={diff.path} className="border-b border-border">
                {/* File header */}
                <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b border-border/50">
                  <FileCode className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-mono font-medium">{diff.path}</span>
                  <span className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded-full",
                    diff.status === "added" && "bg-green-500/10 text-green-500",
                    diff.status === "modified" && "bg-blue-500/10 text-blue-500",
                    diff.status === "deleted" && "bg-red-500/10 text-red-500"
                  )}>
                    {diff.status}
                  </span>
                  <div className="ml-auto flex items-center gap-2 text-[10px]">
                    <span className="text-green-500">+{diff.additions}</span>
                    <span className="text-red-500">-{diff.deletions}</span>
                  </div>
                </div>
                {/* Hunks */}
                <div className="font-mono text-xs">
                  {diff.hunks.map((hunk, hi) => (
                    <div key={hi}>
                      <div className="px-4 py-1 bg-blue-500/5 text-blue-400 text-[10px]">
                        {hunk.header}
                      </div>
                      {hunk.lines.map((line, li) => (
                        <div
                          key={li}
                          className={cn(
                            "flex items-start px-4 py-0.5 border-l-2",
                            line.type === "addition" && "bg-green-500/5 border-green-500",
                            line.type === "deletion" && "bg-red-500/5 border-red-500",
                            line.type === "context" && "border-transparent"
                          )}
                        >
                          <span className="w-8 text-right text-[10px] text-muted-foreground/50 select-none shrink-0">
                            {line.lineNumber.old ?? ""}
                          </span>
                          <span className="w-8 text-right text-[10px] text-muted-foreground/50 select-none shrink-0">
                            {line.lineNumber.new ?? ""}
                          </span>
                          <span className={cn(
                            "w-4 text-center select-none shrink-0",
                            line.type === "addition" && "text-green-500",
                            line.type === "deletion" && "text-red-500"
                          )}>
                            {line.type === "addition" ? "+" : line.type === "deletion" ? "-" : " "}
                          </span>
                          <span className={cn(
                            "flex-1",
                            line.type === "addition" && "text-green-400",
                            line.type === "deletion" && "text-red-400"
                          )}>
                            {line.content}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Rollback Footer */}
          {selectedVersion !== "v1" && (
            <div className="px-4 py-3 border-t border-border bg-card/50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>Rolling back will create a new deployment from this version</span>
              </div>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-500/10 text-amber-500 rounded-lg hover:bg-amber-500/20 transition-colors">
                <RotateCcw className="w-3.5 h-3.5" />
                Rollback to {selectedEntry?.label}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
