import React, { useState, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GitCommit, GitMerge, GitBranch, ZoomIn, ZoomOut, X, ChevronsRight, User, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// --- TYPE DEFINITIONS ---
type Commit = {
  id: string;
  branch: string;
  parents: string[];
  message: string;
  author: string;
  timestamp: string;
};

type Branch = {
  name: string;
  color: string;
  head: string;
};

type CommitNode = Commit & { x: number; y: number };

// --- MOCK DATA ---
const mockCommits: Commit[] = [
  { id: "c1", branch: "main", parents: [], message: "Initial commit", author: "Alice", timestamp: "2026-04-01T10:00:00Z" },
  { id: "c2", branch: "main", parents: ["c1"], message: "Add README file", author: "Alice", timestamp: "2026-04-01T11:00:00Z" },
  { id: "c3", branch: "develop", parents: ["c2"], message: "Create develop branch", author: "Bob", timestamp: "2026-04-02T09:00:00Z" },
  { id: "c4", branch: "develop", parents: ["c3"], message: "Implement feature X", author: "Bob", timestamp: "2026-04-02T12:00:00Z" },
  { id: "c5", branch: "feature/task-1", parents: ["c4"], message: "Start task 1", author: "Charlie", timestamp: "2026-04-03T10:00:00Z" },
  { id: "c6", branch: "feature/task-1", parents: ["c5"], message: "Fix bug in task 1", author: "Charlie", timestamp: "2026-04-03T14:00:00Z" },
  { id: "c7", branch: "main", parents: ["c2"], message: "Hotfix: Critical security patch", author: "Alice", timestamp: "2026-04-03T15:00:00Z" },
  { id: "c8", branch: "develop", parents: ["c4", "c6"], message: "Merge branch 'feature/task-1' into develop", author: "Bob", timestamp: "2026-04-04T11:00:00Z" },
  { id: "c9", branch: "feature/task-2", parents: ["c4"], message: "Begin work on task 2", author: "David", timestamp: "2026-04-04T13:00:00Z" },
  { id: "c10", branch: "feature/task-2", parents: ["c9"], message: "Complete task 2 implementation", author: "David", timestamp: "2026-04-05T17:00:00Z" },
  { id: "c11", branch: "develop", parents: ["c8", "c10"], message: "Merge branch 'feature/task-2' into develop", author: "Bob", timestamp: "2026-04-06T10:00:00Z" },
  { id: "c12", branch: "main", parents: ["c7"], message: "Update documentation and styles", author: "Alice", timestamp: "2026-04-06T14:00:00Z" },
  { id: "c13", branch: "main", parents: ["c12", "c11"], message: "Merge branch 'develop' into main for release", author: "Alice", timestamp: "2026-04-07T11:00:00Z" },
  { id: "c14", branch: "main", parents: ["c13"], message: "Release v1.0.0", author: "Alice", timestamp: "2026-04-07T16:00:00Z" },
  { id: "c15", branch: "develop", parents: ["c11"], message: "Post-merge cleanup and refactoring", author: "Bob", timestamp: "2026-04-08T09:00:00Z" },
];

const mockBranches: Branch[] = [
  { name: "main", color: "#FF6B6B", head: "c14" },
  { name: "develop", color: "#4ECDC4", head: "c15" },
  { name: "feature/task-1", color: "#45B7D1", head: "c6" },
  { name: "feature/task-2", color: "#F9D423", head: "c10" },
];

const HEAD = "c14";
const COLUMN_WIDTH = 80;
const ROW_HEIGHT = 50;
const CIRCLE_RADIUS = 6;

// --- COMPONENT --- 
export default function GitBranchVisualizer() {
  const [zoom, setZoom] = useState(1);
  const [selectedCommit, setSelectedCommit] = useState<CommitNode | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { commitNodes, commitNodeMap, branchLayout, svgHeight, svgWidth } = useMemo(() => {
    const sortedCommits = [...mockCommits].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const commitMap = new Map<string, Commit>(mockCommits.map(c => [c.id, c]));

    const branchLanes = new Map<string, number>();
    const laneAssignments = new Map<string, string>(); // commit.id -> branch.name
    let laneCounter = 0;

    function getLane(branchName: string): number {
      if (!branchLanes.has(branchName)) {
        branchLanes.set(branchName, laneCounter++);
      }
      return branchLanes.get(branchName)!;
    }

    getLane('main');
    getLane('develop');

    const commitNodes: CommitNode[] = sortedCommits.map((commit, index) => {
      const lane = getLane(commit.branch);
      return {
        ...commit,
        y: index,
        x: lane,
      };
    });

    const commitNodeMap = new Map<string, CommitNode>(commitNodes.map(cn => [cn.id, cn]));

    const branchLayout = new Map<string, { color: string; head: string }>();
    mockBranches.forEach(b => branchLayout.set(b.name, { color: b.color, head: b.head }));

    const svgHeight = (commitNodes.length + 1) * ROW_HEIGHT;
    const svgWidth = (branchLanes.size + 2) * COLUMN_WIDTH;

    return { commitNodes, commitNodeMap, branchLayout, svgHeight, svgWidth };
  }, []);

  const getCommitNode = useCallback((id: string) => commitNodeMap.get(id), [commitNodeMap]);

  const handleZoom = (direction: 'in' | 'out') => {
    setZoom(prev => direction === 'in' ? Math.min(prev * 1.2, 3) : Math.max(prev / 1.2, 0.5));
  };

  return (
    <TooltipProvider>
      <div className="w-full h-[700px] bg-background text-foreground rounded-lg border p-4 flex flex-col relative overflow-hidden">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h2 className="text-xl font-bold">Git Branch Visualizer</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => handleZoom('in')}><ZoomIn className="w-4 h-4" /></Button>
            <Button variant="outline" size="icon" onClick={() => handleZoom('out')}><ZoomOut className="w-4 h-4" /></Button>
          </div>
        </div>
        <div className="flex-grow overflow-auto bg-muted/20 rounded-md" style={{ scrollbarWidth: 'thin' }}>
          <svg 
            ref={svgRef}
            width={svgWidth * zoom}
            height={svgHeight * zoom}
            className="min-w-full"
          >
            <defs>
              <marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" className="fill-current text-muted-foreground" />
              </marker>
            </defs>
            <g transform={`scale(${zoom})`}>
              {/* Render Lines */}
              {commitNodes.map(commit => 
                commit.parents.map(parentId => {
                  const parent = getCommitNode(parentId);
                  if (!parent) return null;

                  const isMerge = commit.parents.length > 1;
                  const branchColor = branchLayout.get(commit.branch)?.color || '#9CA3AF';
                  const path = `M ${parent.x * COLUMN_WIDTH + COLUMN_WIDTH / 2},${parent.y * ROW_HEIGHT + ROW_HEIGHT / 2} C ${parent.x * COLUMN_WIDTH + COLUMN_WIDTH / 2},${commit.y * ROW_HEIGHT} ${commit.x * COLUMN_WIDTH + COLUMN_WIDTH / 2},${parent.y * ROW_HEIGHT} ${commit.x * COLUMN_WIDTH + COLUMN_WIDTH / 2},${commit.y * ROW_HEIGHT + ROW_HEIGHT / 2}`;

                  return (
                    <path
                      key={`${commit.id}-${parentId}`}
                      d={path}
                      stroke={isMerge && parent.branch !== commit.branch ? branchLayout.get(parent.branch)?.color : branchColor}
                      strokeWidth="2"
                      fill="none"
                      markerEnd={isMerge ? "url(#arrowhead)" : undefined}
                    />
                  );
                })
              )}

              {/* Render Commits */}
              {commitNodes.map(commit => {
                const branchColor = branchLayout.get(commit.branch)?.color || '#9CA3AF';
                const isHead = commit.id === HEAD;
                return (
                  <Tooltip key={commit.id}>
                    <TooltipTrigger asChild>
                      <g 
                        transform={`translate(${commit.x * COLUMN_WIDTH + COLUMN_WIDTH / 2}, ${commit.y * ROW_HEIGHT + ROW_HEIGHT / 2})`}
                        onClick={() => setSelectedCommit(commit)}
                        className="cursor-pointer"
                      >
                        <motion.circle
                          r={CIRCLE_RADIUS}
                          fill={branchColor}
                          stroke={isHead ? '#A78BFA' : '#111827'}
                          strokeWidth={isHead ? 3 : 2}
                          whileHover={{ scale: 1.5 }}
                        />
                        {isHead && <circle r={CIRCLE_RADIUS + 4} fill="none" stroke="#A78BFA" strokeWidth="1.5" />} 
                      </g>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono text-xs">{commit.id.substring(0, 7)}</p>
                      <p>{commit.message}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}

              {/* Render Branch Labels */}
              {mockBranches.map(branch => {
                const headCommit = getCommitNode(branch.head);
                if (!headCommit) return null;
                return (
                  <foreignObject 
                    key={branch.name}
                    x={headCommit.x * COLUMN_WIDTH + COLUMN_WIDTH / 2 + 15}
                    y={headCommit.y * ROW_HEIGHT + ROW_HEIGHT / 2 - 12}
                    width="150" height="24"
                  >
                    <Badge variant="outline" style={{ borderColor: branch.color, color: branch.color }}>
                      <GitBranch className="w-3 h-3 mr-1" />
                      {branch.name}
                    </Badge>
                  </foreignObject>
                );
              })}
            </g>
          </svg>
        </div>

        <AnimatePresence>
          {selectedCommit && (
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute top-0 right-0 h-full w-full max-w-sm bg-card border-l shadow-lg"
            >
              <Card className="h-full rounded-none border-none">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Commit Details</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedCommit(null)}><X className="w-4 h-4" /></Button>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <p className="font-semibold text-foreground">{selectedCommit.message}</p>
                    <p className="text-muted-foreground font-mono text-xs mt-1">commit {selectedCommit.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <p><span className="font-semibold">{selectedCommit.author}</span></p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <p>{new Date(selectedCommit.timestamp).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4" style={{ color: branchLayout.get(selectedCommit.branch)?.color }} />
                    <p className="font-semibold" style={{ color: branchLayout.get(selectedCommit.branch)?.color }}>{selectedCommit.branch}</p>
                  </div>
                  {selectedCommit.parents.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Parents:</h4>
                      <ul className="space-y-1 list-disc list-inside text-muted-foreground font-mono text-xs">
                        {selectedCommit.parents.map(p => <li key={p}>{p}</li>)}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}
