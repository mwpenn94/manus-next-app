
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// A simple syntax highlighter, as no library was specified.
// In a real app, this would be replaced by a more robust solution like react-syntax-highlighter or Shiki.
const SimpleSyntaxHighlighter = ({ code, language }: { code: string; language: string }) => {
  const createLineNumber = (index: number) => {
    const lineNumber = index + 1;
    return (
      <span
        key={`line-${index}`}
        className="table-cell pr-4 text-right text-muted-foreground select-none"
        style={{ minWidth: '40px' }}
      >
        {lineNumber}
      </span>
    );
  };

  const createLineContent = (line: string, index: number) => (
    <span key={`code-${index}`} className="table-cell w-full">
      {line}
    </span>
  );

  return (
    <div className="text-sm font-mono bg-background text-foreground p-4 rounded-b-md overflow-auto">
      <div className="table w-full table-fixed">
        {code.split('\n').map((line, i) => (
          <div className="table-row" key={i}>
            {createLineNumber(i)}
            {createLineContent(line, i)}
          </div>
        ))}
      </div>
    </div>
  );
};

export type Artifact = {
  id: string;
  filename: string;
  content: string;
  language: string;
  status: 'writing' | 'complete';
  progress: number;
};

export interface ArtifactStreamViewerProps {
  artifacts: Artifact[];
  activeArtifactId: string | null;
  onSelectArtifact: (id: string) => void;
}

export const ArtifactStreamViewer = ({ artifacts, activeArtifactId, onSelectArtifact }: ArtifactStreamViewerProps) => {
  const activeArtifact = artifacts.find(a => a.id === activeArtifactId);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (contentRef.current) {
      const { scrollHeight, clientHeight, scrollTop } = contentRef.current;
      // Auto-scroll if user is near the bottom
      if (scrollHeight - scrollTop < clientHeight + 100) {
        contentRef.current.scrollTop = scrollHeight;
      }
    }
  }, [activeArtifact?.content]);

  const handleCopy = useCallback(() => {
    if (activeArtifact?.content) {
      navigator.clipboard.writeText(activeArtifact.content).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      });
    }
  }, [activeArtifact?.content]);

  return (
    <div className="bg-card border border-border rounded-lg shadow-md w-full h-full flex flex-col">
      <div className="flex items-center border-b border-border p-2 space-x-2 overflow-x-auto">
        {artifacts.map(artifact => (
          <div key={artifact.id} className="relative flex-shrink-0">
            <button
              onClick={() => onSelectArtifact(artifact.id)}
              className={cn(
                'relative px-3 py-1.5 text-sm rounded-md transition-colors duration-200',
                activeArtifactId === artifact.id
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <div className="flex items-center space-x-2">
                {artifact.status === 'writing' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 text-green-500" />
                )}
                <span>{artifact.filename}</span>
              </div>
            </button>
            {activeArtifactId === artifact.id && (
              <motion.div
                layoutId="activeArtifactTab"
                className="absolute inset-0 bg-primary rounded-md z-0"
                style={{ borderRadius: 6 }}
                transition={{ type: 'spring' as const, stiffness: 300, damping: 30 }}
              />
            )}
            <Progress value={artifact.progress} className="absolute bottom-0 left-0 right-0 h-0.5 w-full" />
          </div>
        ))}
      </div>

      <div className="relative flex-grow overflow-hidden">
        <AnimatePresence mode="wait">
          {activeArtifact ? (
            <motion.div
              key={activeArtifact.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] as const }}
              className="w-full h-full flex flex-col"
            >
              <div className="flex items-center justify-between p-2 border-b border-border bg-accent/50">
                <span className="text-xs font-mono bg-muted text-muted-foreground px-2 py-1 rounded">
                  {activeArtifact.language}
                </span>
                <Button variant="ghost" size="icon" onClick={handleCopy} className="h-8 w-8">
                  {isCopied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  <span className="sr-only">Copy code</span>
                </Button>
              </div>
              <div ref={contentRef} className="flex-grow overflow-auto relative">
                <SimpleSyntaxHighlighter code={activeArtifact.content} language={activeArtifact.language} />
                {activeArtifact.status === 'writing' && (
                  <div className="absolute bottom-4 right-4 h-4 w-1 bg-primary animate-pulse" />
                )}
              </div>
            </motion.div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Select an artifact to view its content.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
