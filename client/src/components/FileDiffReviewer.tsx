
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Copy, MessageSquare, ChevronDown, ChevronRight, ChevronsRight, ChevronsLeft, Rows, Columns } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// --- Types ---
type DiffLine = {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  originalLineNumber?: number;
  modifiedLineNumber?: number;
};

type DiffViewLine = { 
  left: DiffLine | null; 
  right: DiffLine | null; 
  isCollapsed?: boolean;
  collapsedCount?: number;
};


export type Comment = {
  lineNumber: number;
  side: 'left' | 'right';
  text: string;
  author: string;
  timestamp: number;
};

export type FileDiffReviewerProps = {
  originalContent: string;
  modifiedContent: string;
  filename: string;
  language?: string;
  comments?: Comment[];
  onAddComment?: (lineNumber: number, side: 'left' | 'right', text: string) => void;
};

// --- Diffing Logic (Longest Common Subsequence) ---
const computeDiff = (original: string, modified: string) => {
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');
  const n = originalLines.length;
  const m = modifiedLines.length;

  const dp = Array(n + 1).fill(null).map(() => Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (originalLines[i - 1] === modifiedLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const result: { left: DiffLine | null; right: DiffLine | null }[] = [];
  let addedCount = 0;
  let removedCount = 0;
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && originalLines[i - 1] === modifiedLines[j - 1]) {
      result.unshift({ 
        left: { type: 'unchanged', content: originalLines[i - 1], originalLineNumber: i },
        right: { type: 'unchanged', content: modifiedLines[j - 1], modifiedLineNumber: j }
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ 
        left: null,
        right: { type: 'added', content: modifiedLines[j - 1], modifiedLineNumber: j }
      });
      addedCount++;
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      result.unshift({ 
        left: { type: 'removed', content: originalLines[i - 1], originalLineNumber: i },
        right: null
      });
      removedCount++;
      i--;
    } else {
        break;
    }
  }

  return { lines: result, addedCount, removedCount };
};

const commentAnimation: Variants = {
  hidden: { opacity: 0, height: 0, marginTop: 0 },
  visible: {
    opacity: 1,
    height: 'auto',
    marginTop: '8px',
    transition: { type: "spring" as const, duration: 0.4, bounce: 0 },
  },
};

// --- Main Component ---
export const FileDiffReviewer = ({ 
    originalContent, 
    modifiedContent, 
    filename, 
    language, 
    comments = [], 
    onAddComment 
}: FileDiffReviewerProps) => {

  const [view, setView] = useState<'split' | 'unified'>('split');
  const [collapsed, setCollapsed] = useState<{[key: number]: boolean}>({});

  const { lines: rawLines, addedCount, removedCount } = useMemo(() => 
    computeDiff(originalContent, modifiedContent), 
    [originalContent, modifiedContent]
  );

  const processedLines = useMemo((): DiffViewLine[] => {
    const lines: DiffViewLine[] = [];
    let unchangedBuffer: DiffViewLine[] = [];

    const flushUnchangedBuffer = () => {
        if (unchangedBuffer.length > 5) { // Threshold to be collapsible
            const firstLineIndex = lines.length;
            if (collapsed[firstLineIndex]) {
                lines.push({ left: null, right: null, isCollapsed: true, collapsedCount: unchangedBuffer.length });
            } else {
                lines.push(...unchangedBuffer);
            }
        } else {
            lines.push(...unchangedBuffer);
        }
        unchangedBuffer = [];
    }

    rawLines.forEach(line => {
        if (line.left?.type === 'unchanged') {
            unchangedBuffer.push(line);
        } else {
            flushUnchangedBuffer();
            lines.push(line);
        }
    });
    flushUnchangedBuffer();

    return lines;
  }, [rawLines, collapsed]);

  const [activeComment, setActiveComment] = useState<{lineNumber: number, side: 'left' | 'right'} | null>(null);
  const [commentText, setCommentText] = useState('');

  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

  const handleScroll = (panel: 'left' | 'right') => {
    if (view !== 'split' || isSyncing.current) return;
    isSyncing.current = true;

    const source = panel === 'left' ? leftPanelRef.current : rightPanelRef.current;
    const target = panel === 'left' ? rightPanelRef.current : leftPanelRef.current;

    if (source && target) {
      target.scrollTop = source.scrollTop;
    }

    setTimeout(() => {
      isSyncing.current = false;
    }, 50);
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleAddCommentClick = (lineNumber: number, side: 'left' | 'right') => {
    setActiveComment({ lineNumber, side });
    setCommentText('');
  };

  const handleSaveComment = () => {
    if (activeComment && commentText.trim()) {
      onAddComment?.(activeComment.lineNumber, activeComment.side, commentText);
      setActiveComment(null);
      setCommentText('');
    }
  };

  const toggleCollapse = (index: number) => {
      setCollapsed(prev => ({...prev, [index]: !prev[index]}));
  }

  const commentsByLine = useMemo(() => {
    const grouped: { [key: string]: Comment[] } = {};
    comments.forEach(comment => {
      const key = `${comment.side}-${comment.lineNumber}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(comment);
    });
    return grouped;
  }, [comments]);

  const renderCommentSection = (side: 'left' | 'right', lineNumber: number) => {
    const lineComments = commentsByLine[`${side}-${lineNumber}`] || [];
    const isCommenting = activeComment?.lineNumber === lineNumber && activeComment?.side === side;

    if (!lineComments.length && !isCommenting) return null;

    return (
        <AnimatePresence>
            <motion.div variants={commentAnimation} initial="hidden" animate="visible" exit="hidden" className="overflow-hidden">
                <div className={cn("flex", view === 'split' ? "" : "w-full")}>
                    <div className={cn(view === 'split' ? "w-20" : "w-28")}></div>
                    <div className="flex-1 pr-4">
                        {isCommenting && (
                            <div className="my-2 p-2 rounded-lg border bg-background">
                                <Textarea 
                                    placeholder="Leave a comment..." 
                                    value={commentText} 
                                    onChange={(e) => setCommentText(e.target.value)}
                                    className="mb-2 text-sm"
                                />
                                <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => setActiveComment(null)}>Cancel</Button>
                                    <Button size="sm" onClick={handleSaveComment}>Save</Button>
                                </div>
                            </div>
                        )}
                        {lineComments.map((comment, i) => (
                            <div key={i} className="my-2 p-2 rounded-lg border bg-background/50">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-semibold text-xs">{comment.author}</span>
                                    <span className="text-xs text-muted-foreground">{new Date(comment.timestamp).toLocaleString()}</span>
                                </div>
                                <p className="text-sm font-sans">{comment.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
  }

  const renderSplitView = () => (
    <div className="flex-grow overflow-hidden flex h-full">
      <div ref={leftPanelRef} onScroll={() => handleScroll('left')} className="w-1/2 border-r overflow-y-auto h-full">
        {processedLines.map((line, index) => {
            if (line.isCollapsed) {
                return (
                    <div key={`left-collapsed-${index}`} className="flex items-center justify-center bg-zinc-800/50 h-8 cursor-pointer" onClick={() => toggleCollapse(index)}>
                        <ChevronDown className="h-4 w-4 mr-2" /> {line.collapsedCount} lines hidden
                    </div>
                )
            }
            const lineData = line.left;
            const currentLineNum = lineData?.originalLineNumber;
            const bgColor = lineData?.type === 'removed' ? 'bg-red-900/20' : !lineData ? 'bg-zinc-800/20' : 'bg-transparent';
            const lineComments = currentLineNum ? commentsByLine[`left-${currentLineNum}`] || [] : [];

            return (
                <div key={`left-${index}-container`}>
                    <div className={cn("flex", bgColor)}>
                        <span 
                            className="w-12 text-right pr-4 text-muted-foreground select-none sticky left-0 bg-inherit cursor-pointer hover:text-foreground"
                            onClick={() => currentLineNum && handleAddCommentClick(currentLineNum, 'left')}
                        >
                            {currentLineNum || ''}
                        </span>
                        <div className="w-8 flex items-center justify-center">
                            {lineComments.length > 0 && <MessageSquare className="h-4 w-4 text-blue-400" />}
                        </div>
                        <pre className="flex-1 whitespace-pre-wrap break-all px-2">{lineData?.content}</pre>
                    </div>
                    {currentLineNum && renderCommentSection('left', currentLineNum)}
                </div>
            );
        })}
      </div>
      <div ref={rightPanelRef} onScroll={() => handleScroll('right')} className="w-1/2 overflow-y-auto h-full">
        {processedLines.map((line, index) => {
            if (line.isCollapsed) {
                return (
                    <div key={`right-collapsed-${index}`} className="flex items-center justify-center bg-zinc-800/50 h-8 cursor-pointer" onClick={() => toggleCollapse(index)}>
                        <ChevronDown className="h-4 w-4 mr-2" /> {line.collapsedCount} lines hidden
                    </div>
                )
            }
            const lineData = line.right;
            const currentLineNum = lineData?.modifiedLineNumber;
            const bgColor = lineData?.type === 'added' ? 'bg-green-900/20' : !lineData ? 'bg-zinc-800/20' : 'bg-transparent';
            const lineComments = currentLineNum ? commentsByLine[`right-${currentLineNum}`] || [] : [];

            return (
                <div key={`right-${index}-container`}>
                    <div className={cn("flex", bgColor)}>
                        <span 
                            className="w-12 text-right pr-4 text-muted-foreground select-none sticky left-0 bg-inherit cursor-pointer hover:text-foreground"
                            onClick={() => currentLineNum && handleAddCommentClick(currentLineNum, 'right')}
                        >
                            {currentLineNum || ''}
                        </span>
                        <div className="w-8 flex items-center justify-center">
                            {lineComments.length > 0 && <MessageSquare className="h-4 w-4 text-blue-400" />}
                        </div>
                        <pre className="flex-1 whitespace-pre-wrap break-all px-2">{lineData?.content}</pre>
                    </div>
                    {currentLineNum && renderCommentSection('right', currentLineNum)}
                </div>
            );
        })}
      </div>
    </div>
  );

  const renderUnifiedView = () => (
    <div className="flex-grow overflow-y-auto h-full">
        {processedLines.map((line, index) => {
            if (line.isCollapsed) {
                return (
                    <div key={`unified-collapsed-${index}`} className="flex items-center justify-center bg-zinc-800/50 h-8 cursor-pointer" onClick={() => toggleCollapse(index)}>
                        <ChevronDown className="h-4 w-4 mr-2" /> {line.collapsedCount} lines hidden
                    </div>
                )
            }

            if (line.left?.type === 'unchanged') {
                const currentLineNum = line.left.originalLineNumber!;
                return (
                    <div key={`unified-${index}-container`}>
                        <div className="flex bg-transparent">
                            <span className="w-12 text-right pr-4 text-muted-foreground select-none">{line.left.originalLineNumber}</span>
                            <span className="w-12 text-right pr-4 text-muted-foreground select-none">{line.right?.modifiedLineNumber}</span>
                            <pre className="flex-1 whitespace-pre-wrap break-all px-2">  {line.left.content}</pre>
                        </div>
                        {renderCommentSection('left', currentLineNum)}
                    </div>
                )
            }

            return (
                <React.Fragment key={`unified-frag-${index}`}>
                    {line.left && (
                        <div key={`unified-left-${index}-container`}>
                            <div className="flex bg-red-900/20">
                                <span className="w-12 text-right pr-4 text-muted-foreground select-none">{line.left.originalLineNumber}</span>
                                <span className="w-12 text-right pr-4 text-muted-foreground select-none"></span>
                                <pre className="flex-1 whitespace-pre-wrap break-all px-2">- {line.left.content}</pre>
                            </div>
                            {renderCommentSection('left', line.left.originalLineNumber!)}
                        </div>
                    )}
                    {line.right && (
                        <div key={`unified-right-${index}-container`}>
                            <div className="flex bg-green-900/20">
                                <span className="w-12 text-right pr-4 text-muted-foreground select-none"></span>
                                <span className="w-12 text-right pr-4 text-muted-foreground select-none">{line.right.modifiedLineNumber}</span>
                                <pre className="flex-1 whitespace-pre-wrap break-all px-2">+ {line.right.content}</pre>
                            </div>
                            {renderCommentSection('right', line.right.modifiedLineNumber!)}
                        </div>
                    )}
                </React.Fragment>
            )
        })}
    </div>
  )

  return (
    <div className="border rounded-lg bg-card text-card-foreground shadow-sm w-full h-full flex flex-col font-mono text-sm">
      <div className="p-2 px-4 border-b flex justify-between items-center bg-background/80 sticky top-0 z-10">
        <div className="flex items-center gap-4">
            <h2 className="font-semibold text-base font-sans">{filename}</h2>
            {language && <Badge variant="outline" className="font-sans">{language}</Badge>}
        </div>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 font-sans">
                <Button variant={view === 'split' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('split')}><Columns className="h-4 w-4 mr-2"/>Split</Button>
                <Button variant={view === 'unified' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('unified')}><Rows className="h-4 w-4 mr-2"/>Unified</Button>
            </div>
            <div className="w-px h-6 bg-border mx-2"></div>
            <div className="flex items-center gap-2">
                <span className="text-green-500 font-medium">+{addedCount}</span>
                <span className="text-red-500 font-medium">-{removedCount}</span>
            </div>
            <div className="w-px h-6 bg-border mx-2"></div>
            <Button variant="ghost" size="icon" onClick={() => handleCopy(originalContent)}>
                <Copy className="h-4 w-4" />
                <span className="sr-only">Copy original file</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleCopy(modifiedContent)}>
                <Copy className="h-4 w-4" />
                <span className="sr-only">Copy modified file</span>
            </Button>
        </div>
      </div>
      {view === 'split' ? renderSplitView() : renderUnifiedView()}
    </div>
  );
};
