import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Loader, X, Code, Terminal, ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface CodeExecutionSandboxProps {
  initialCode?: string;
  language: string;
  onExecute: (code: string, language: string) => Promise<{ stdout: string; stderr?: string; duration: number }>;
  isRunning: boolean;
  output?: { stdout: string; stderr?: string; duration: number };
  supportedLanguages: string[];
  onLanguageChange: (language: string) => void;
}

export const CodeExecutionSandbox: React.FC<CodeExecutionSandboxProps> = ({
  initialCode = '',
  language,
  onExecute,
  isRunning,
  output,
  supportedLanguages,
  onLanguageChange,
}) => {
  const [code, setCode] = useState(initialCode);
  const [localOutput, setLocalOutput] = useState(output);
  const [panelHeight, setPanelHeight] = useState(200);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isResizing = useRef(false);

  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const lineNumbersRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLocalOutput(output);
  }, [output]);

  const handleExecute = useCallback(async () => {
    const result = await onExecute(code, language);
    setLocalOutput(result);
  }, [code, language, onExecute]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        handleExecute();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleExecute]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isResizing.current = true;
    document.body.style.cursor = 'ns-resize';
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newHeight = containerRect.bottom - e.clientY;
    if (newHeight >= 100 && newHeight <= containerRect.height - 150) {
      setPanelHeight(newHeight);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = 'auto';
  }, []);

  useEffect(() => {
    if (isResizing.current) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const syncScroll = () => {
    if (editorRef.current && lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = editorRef.current.scrollTop;
    }
  };

  const lineCount = code.split('\n').length;

  return (
    <Card className="w-full h-full flex flex-col overflow-hidden bg-card">
      <CardHeader className="flex-shrink-0 p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-muted-foreground" />
                <span className="font-semibold">Code Sandbox</span>
            </div>
            <Select value={language} onValueChange={onLanguageChange as (value: string) => void}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {supportedLanguages.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang.charAt(0).toUpperCase() + lang.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleExecute} disabled={isRunning} size="sm">
              {isRunning ? (
                <Loader className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Run
              <span className="ml-2 text-muted-foreground text-xs">⌘+Enter</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-grow flex flex-col overflow-hidden" ref={containerRef}>
        <div className="flex-grow flex flex-col relative" style={{ height: `calc(100% - ${localOutput ? panelHeight : 0}px)` }}>
            <div className="flex-grow flex overflow-hidden">
                <div ref={lineNumbersRef} className="w-12 text-right pr-4 pt-4 bg-background/50 text-muted-foreground font-mono text-sm select-none overflow-hidden">
                    {Array.from({ length: lineCount }, (_, i) => (
                        <div key={i}>{i + 1}</div>
                    ))}
                </div>
                <textarea
                    ref={editorRef}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onScroll={syncScroll}
                    className="flex-grow p-4 bg-transparent font-mono text-sm resize-none focus:outline-none w-full h-full"
                    placeholder="// Your code here..."
                    spellCheck="false"
                />
            </div>
        </div>
        
        {localOutput && <div onMouseDown={handleMouseDown} className="w-full h-1.5 bg-border hover:bg-primary cursor-ns-resize transition-colors" />} 

        <AnimatePresence>
          {localOutput && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: panelHeight, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring' as const, stiffness: 300, damping: 30 }}
              className="flex-shrink-0 bg-background/80 overflow-hidden"
            >
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between p-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-muted-foreground" />
                    <span className="font-semibold">Output</span>
                    {localOutput.duration > 0 && (
                      <Badge variant="secondary">{localOutput.duration.toFixed(2)}ms</Badge>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setLocalOutput(undefined)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <pre className="p-4 font-mono text-sm flex-grow overflow-auto">
                  {localOutput.stdout && <code className="text-foreground whitespace-pre-wrap">{localOutput.stdout}</code>}
                  {localOutput.stderr && <code className="text-red-500 whitespace-pre-wrap">{localOutput.stderr}</code>}
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};
