import React, { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Copy, ChevronDown, ChevronRight, FileText, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- TYPES ---
type Line = { number: number; content: string };
type DiffSegment =
  | { type: 'added'; lines: Line[] }
  | { type: 'removed'; lines: Line[] }
  | { type: 'unchanged'; oldLines: Line[]; newLines: Line[] };

type FileDiff = {
  fileName: string;
  oldCode: string;
  newCode: string;
};

// --- MOCK DATA ---
const mockDiffs: FileDiff[] = [
  {
    fileName: 'src/components/feature.tsx',
    oldCode: `import React from 'react';

function Feature() {
  // A component to show a feature
  return (
    <div className="feature">
      <h1>Old Feature</h1>
      <p>This is the old feature implementation.</p>
      <ul>
        <li>Point 1</li>
        <li>Point 2</li>
      </ul>
    </div>
  );
}

export default Feature;`,
    newCode: `import React, { useState } from 'react';

function Feature() {
  const [active, setActive] = useState(false);

  return (
    <div className="feature-v2">
      <h1>New & Improved Feature</h1>
      <p>This is the new feature implementation with state.</p>
      <button onClick={() => setActive(!active)}>
        {active ? 'Deactivate' : 'Activate'}
      </button>
    </div>
  );
}

export default Feature;`,
  },
  {
    fileName: 'src/styles/main.css',
    oldCode: `.body {
  font-family: Arial, sans-serif;
  background-color: #fff;
  color: #333;
}

.container {
  max-width: 960px;
  margin: 0 auto;
}`,
    newCode: `body {
  font-family: 'Inter', sans-serif;
  background-color: #f0f2f5;
  color: #1a1a1a;
}

.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 20px;
}`,
  },
];

// --- DIFFING LOGIC (LCS-based) ---
const computeDiffSegments = (oldCode: string, newCode: string): DiffSegment[] => {
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');
    const m = oldLines.length;
    const n = newLines.length;
    const lcs = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (oldLines[i - 1] === newLines[j - 1]) {
                lcs[i][j] = lcs[i - 1][j - 1] + 1;
            } else {
                lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1]);
            }
        }
    }

    const segments: DiffSegment[] = [];
    let i = m, j = n;
    let oldLineNum = m, newLineNum = n;

    const addSegment = (type: 'added' | 'removed' | 'unchanged', lines: Line[], oldLines?: Line[]) => {
        const lastSegment = segments[0];
        if (type === 'unchanged') {
            if (lastSegment && lastSegment.type === 'unchanged') {
                lastSegment.oldLines.unshift(...(oldLines as Line[]));
                lastSegment.newLines.unshift(...lines);
            } else {
                segments.unshift({ type, oldLines: oldLines as Line[], newLines: lines });
            }
        } else {
            if (lastSegment && lastSegment.type === type) {
                lastSegment.lines.unshift(...lines);
            } else {
                segments.unshift({ type, lines });
            }
        }
    };

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
            addSegment('unchanged', [{ number: newLineNum, content: newLines[j - 1] }], [{ number: oldLineNum, content: oldLines[i - 1] }]);
            i--; j--; oldLineNum--; newLineNum--;
        } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
            addSegment('added', [{ number: newLineNum, content: newLines[j - 1] }]);
            j--; newLineNum--;
        } else if (i > 0 && (j === 0 || lcs[i][j - 1] < lcs[i - 1][j])) {
            addSegment('removed', [{ number: oldLineNum, content: oldLines[i - 1] }]);
            i--; oldLineNum--;
        } else {
            break;
        }
    }
    return segments;
};

// --- HOOKS ---
const useCopyToClipboard = (text: string) => {
    const [copied, setCopied] = useState(false);
    const copy = useCallback(() => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }, [text]);
    return { copied, copy };
};

// --- SUB-COMPONENTS ---
const SyntaxHighlight = React.memo(({ code }: { code: string }) => {
    const highlighted = useMemo(() => {
        return code
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/\b(import|from|export|default|function|const|let|var|return|div|h1|p|button|useState|useEffect|useMemo|useCallback|React|className|onClick|true|false|null)\b/g, '<span class="text-sky-400">$1</span>')
            .replace(/('|"|`)(.*?)('|"|`)/g, '<span class="text-emerald-400">$1$2$3</span>')
            .replace(/(\/\/.*)/g, '<span class="text-gray-500">$1</span>');
    }, [code]);
    return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
});

const DiffRow = ({ oldLineNum, newLineNum, content, type }: { oldLineNum?: number, newLineNum?: number, content: string, type: 'added' | 'removed' | 'unchanged' }) => {
    const bg = {
        added: 'bg-green-500/10',
        removed: 'bg-red-500/10',
        unchanged: 'hover:bg-muted/50',
    }[type];

    const prefix = type === 'added' ? '+' : '-';

    return (
        <tr className={cn(bg, type === 'unchanged' && 'text-muted-foreground')}>
            <td className="w-10 text-right pr-4 select-none opacity-50">{oldLineNum}</td>
            <td className="w-10 text-right pr-4 select-none opacity-50">{newLineNum}</td>
            <td className={cn("w-6 text-center select-none", type === 'added' ? 'text-green-500' : type === 'removed' ? 'text-red-500' : 'text-transparent')}>{type !== 'unchanged' ? prefix : ''}</td>
            <td className="pl-2 pr-4 whitespace-pre-wrap break-words"><SyntaxHighlight code={content} /></td>
        </tr>
    );
};

const CollapsibleSection = ({ lineCount, onToggle, isCollapsed }: { lineCount: number, onToggle: () => void, isCollapsed: boolean }) => (
    <tr className="border-y border-border bg-muted/20">
        <td colSpan={4}>
            <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={onToggle}>
                {isCollapsed ? <ChevronRight className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                {lineCount} unchanged lines
            </Button>
        </td>
    </tr>
);

const SplitDiffView = ({ segments }: { segments: DiffSegment[] }) => {
    const [collapsed, setCollapsed] = useState<{[key: number]: boolean}>({});
    const toggleCollapse = (index: number) => setCollapsed(p => ({...p, [index]: !p[index]}));

    const oldCode = useMemo(() => segments.map(s => s.type !== 'added' ? (s.type === 'unchanged' ? s.oldLines : s.lines).map(l => l.content).join('\n') : null).filter(Boolean).join('\n'), [segments]);
    const newCode = useMemo(() => segments.map(s => s.type !== 'removed' ? (s.type === 'unchanged' ? s.newLines : s.lines).map(l => l.content).join('\n') : null).filter(Boolean).join('\n'), [segments]);
    const { copied: copiedOld, copy: copyOld } = useCopyToClipboard(oldCode);
    const { copied: copiedNew, copy: copyNew } = useCopyToClipboard(newCode);

    const renderLines = (type: 'old' | 'new') => {
        const lines: (React.ReactNode | null)[] = [];
        segments.forEach((segment, index) => {
            if (segment.type === 'unchanged') {
                if (segment.oldLines.length > 5) {
                    lines.push(<CollapsibleSection key={`collapse-${index}`} lineCount={segment.oldLines.length} onToggle={() => toggleCollapse(index)} isCollapsed={!!collapsed[index]} />);
                    if (collapsed[index]) return;
                }
                const sourceLines = type === 'old' ? segment.oldLines : segment.newLines;
                sourceLines.forEach(line => lines.push(<DiffRow key={`${type}-${line.number}`} oldLineNum={line.number} newLineNum={line.number} content={line.content} type="unchanged" />));
            } else if (segment.type === 'removed' && type === 'old') {
                segment.lines.forEach(line => lines.push(<DiffRow key={`old-${line.number}`} oldLineNum={line.number} content={line.content} type="removed" />));
            } else if (segment.type === 'added' && type === 'new') {
                segment.lines.forEach(line => lines.push(<DiffRow key={`new-${line.number}`} newLineNum={line.number} content={line.content} type="added" />));
            } else {
                const count = segment.lines.length;
                for (let i = 0; i < count; i++) {
                    lines.push(<tr key={`empty-${index}-${i}`} className="h-[24px] bg-muted/10"><td colSpan={4}></td></tr>);
                }
            }
        });
        return lines;
    };

    return (
        <div className="flex flex-row w-full text-xs">
            <div className="w-1/2 border-r border-border">
                <div className="sticky top-0 bg-muted/50 p-2 flex justify-between items-center border-b border-border z-10 h-12">
                    <span className="font-semibold px-2">Old Version</span>
                    <Button variant="ghost" size="icon" onClick={copyOld}>{copiedOld ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}</Button>
                </div>
                <table className="w-full table-fixed"><tbody>{renderLines('old')}</tbody></table>
            </div>
            <div className="w-1/2">
                <div className="sticky top-0 bg-muted/50 p-2 flex justify-between items-center border-b border-border z-10 h-12">
                    <span className="font-semibold px-2">New Version</span>
                    <Button variant="ghost" size="icon" onClick={copyNew}>{copiedNew ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}</Button>
                </div>
                <table className="w-full table-fixed"><tbody>{renderLines('new')}</tbody></table>
            </div>
        </div>
    );
};

const UnifiedDiffView = ({ segments }: { segments: DiffSegment[] }) => {
    const [collapsed, setCollapsed] = useState<{[key: number]: boolean}>({});
    const toggleCollapse = (index: number) => setCollapsed(p => ({...p, [index]: !p[index]}));

    return (
        <table className="w-full text-xs table-fixed">
            <tbody>
                {segments.map((segment, index) => {
                    if (segment.type === 'unchanged') {
                        if (segment.oldLines.length > 5) {
                            const isCollapsed = !!collapsed[index];
                            const displayLines = isCollapsed ? segment.oldLines.slice(0, 3) : segment.oldLines;
                            return (
                                <React.Fragment key={index}>
                                    <CollapsibleSection lineCount={segment.oldLines.length} onToggle={() => toggleCollapse(index)} isCollapsed={isCollapsed} />
                                    {!isCollapsed && displayLines.map(line => <DiffRow key={`unified-${line.number}`} oldLineNum={line.number} newLineNum={line.number} content={line.content} type="unchanged" />)}
                                </React.Fragment>
                            );
                        }
                        return segment.oldLines.map(line => <DiffRow key={`unified-${line.number}`} oldLineNum={line.number} newLineNum={line.number} content={line.content} type="unchanged" />);
                    }
                    if (segment.type === 'removed') {
                        return segment.lines.map(line => <DiffRow key={`unified-old-${line.number}`} oldLineNum={line.number} content={line.content} type="removed" />);
                    }
                    if (segment.type === 'added') {
                        return segment.lines.map(line => <DiffRow key={`unified-new-${line.number}`} newLineNum={line.number} content={line.content} type="added" />);
                    }
                    return null;
                })}
            </tbody>
        </table>
    );
};

export default function CodeDiffViewer() {
  const [selectedFile, setSelectedFile] = useState<string>(mockDiffs[0].fileName);
  const [viewType, setViewType] = useState<'split' | 'unified'>('split');

  const activeDiff = useMemo(() => {
    return mockDiffs.find(d => d.fileName === selectedFile) || mockDiffs[0];
  }, [selectedFile]);

  const segments = useMemo(() => computeDiffSegments(activeDiff.oldCode, activeDiff.newCode), [activeDiff]);

  const { additions, deletions } = useMemo(() => ({
      additions: segments.reduce((acc, s) => acc + (s.type === 'added' ? s.lines.length : 0), 0),
      deletions: segments.reduce((acc, s) => acc + (s.type === 'removed' ? s.lines.length : 0), 0),
  }), [segments]);

  return (
    <div className="bg-background text-foreground font-mono text-sm w-full max-w-6xl mx-auto border border-border rounded-lg overflow-hidden my-10">
      <header className="flex items-center justify-between p-3 bg-muted/50 border-b border-border h-14">
        <div className="flex items-center gap-4">
          <FileText className="h-5 w-5 text-muted-foreground ml-2" />
          <select
            value={selectedFile}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedFile(e.target.value)}
            className="bg-transparent font-semibold text-foreground focus:outline-none text-base"
          >
            {mockDiffs.map(diff => (
              <option key={diff.fileName} value={diff.fileName}>{diff.fileName}</option>
            ))}
          </select>
          <div className="flex items-center gap-2 text-xs font-medium">
              <span className="text-green-500">+{additions}</span>
              <span className="text-red-500">-{deletions}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 mr-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span>Unified</span>
            <Switch id="view-toggle" checked={viewType === 'split'} onCheckedChange={(checked: boolean) => setViewType(checked ? 'split' : 'unified')} aria-label="Toggle view" />
            <span>Split</span>
          </div>
        </div>
      </header>
      <AnimatePresence mode="wait">
        <motion.div
            key={viewType}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.1 }}
        >
            {viewType === 'split' ? (
                <SplitDiffView segments={segments} />
            ) : (
                <UnifiedDiffView segments={segments} />
            )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
