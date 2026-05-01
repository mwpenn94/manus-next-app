import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal as TerminalIcon, ChevronRight, Copy, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Line {
  id: number;
  text: string;
  type: 'command' | 'success' | 'error' | 'warning' | 'info';
}

const mockHistory: { command: string; output: string; type: Line['type'] }[] = [
  { command: "npm install", output: "Success: Dependencies installed.", type: "success" },
  { command: "git status", output: "On branch main\nYour branch is up to date with 'origin/main'.\n\nnothing to commit, working tree clean", type: "info" },
  { command: "ls -la", output: "total 8\ndrwxr-xr-x 2 user user 4096 May 1 15:20 .\ndrwxr-xr-x 5 user user 4096 May 1 15:15 ..", type: "info" },
  { command: "cat unknown.file", output: "Error: No such file or directory.", type: "error" },
  { command: "npm run build", output: "Build successful. Artifacts are ready for deployment.", type: "success" },
  { command: "ping google.com", output: "PING google.com (142.250.180.142): 56 data bytes\n64 bytes from 142.250.180.142: icmp_seq=0 ttl=118 time=12.3 ms", type: "info" },
  { command: "rm -rf /", output: "Warning: This is a dangerous command!", type: "warning" },
  { command: "echo 'Hello World'", output: "Hello World", type: "info" },
  { command: "date", output: new Date().toString(), type: "info" },
  { command: "uname -a", output: "Linux ubuntu 5.15.0-101-generic #111-Ubuntu SMP Tue Mar 26 13:24:48 UTC 2024 x86_64 x86_64 x86_64 GNU/Linux", type: "info" },
];

const getAnsiColorClass = (type: Line['type']): string => {
  switch (type) {
    case 'success': return 'text-green-400';
    case 'error': return 'text-red-400';
    case 'warning': return 'text-yellow-400';
    default: return 'text-muted-foreground';
  }
};

export default function TerminalEmulator() {
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState<string>('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [height, setHeight] = useState<number>(400);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initialLines = mockHistory.flatMap((item, index) => [
      { id: index * 2, text: item.command, type: 'command' as const },
      { id: index * 2 + 1, text: item.output, type: item.type },
    ]);
    setLines(initialLines);
    setHistory(mockHistory.map(h => h.command));
  }, []);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [lines]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    const command = input.trim();
    const newLines: Line[] = [...lines, { id: Date.now(), text: command, type: 'command' }];
    
    const mockResponse = mockHistory.find(h => h.command.toLowerCase() === command.toLowerCase());
    if (mockResponse) {
      newLines.push({ id: Date.now() + 1, text: mockResponse.output, type: mockResponse.type });
    } else {
      newLines.push({ id: Date.now() + 1, text: `command not found: ${command}`, type: 'error' });
    }

    setLines(newLines);
    setHistory(prev => [command, ...prev.filter(c => c !== command)]);
    setInput('');
    setHistoryIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = Math.min(history.length - 1, historyIndex + 1);
        setHistoryIndex(newIndex);
        setInput(history[newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex >= 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[newIndex] || '');
      }
    }
  };

  const handleTerminalClick = () => {
    inputRef.current?.focus();
  };

  const clearTerminal = () => {
    setLines([]);
  };

  const copyToClipboard = () => {
    const output = lines.map(line => `${line.type === 'command' ? '> ' : ''}${line.text}`).join('\n');
    navigator.clipboard.writeText(output);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <TooltipProvider>
      <motion.div 
        className={cn('bg-background text-foreground font-mono text-sm rounded-lg border w-full flex flex-col shadow-2xl overflow-hidden', 'dark')}
        style={{ height }}
        animate={{ height }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="flex items-center justify-between px-4 py-2 bg-card border-b">
          <div className="flex items-center gap-2">
            <TerminalIcon className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold">Terminal</span>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={copyToClipboard}>
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isCopied ? "Copied!" : "Copy Output"}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={clearTerminal}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Clear Terminal</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div ref={scrollAreaRef} className='flex-grow p-4 overflow-y-auto' onClick={handleTerminalClick}>
          <AnimatePresence initial={false}>
            {lines.map(line => (
              <motion.div
                key={line.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                className={cn('whitespace-pre-wrap', getAnsiColorClass(line.type))}
              >
                {line.type === 'command' && <span className='text-cyan-400'><ChevronRight className='inline h-4 w-4 -ml-1 mr-1' /></span>}
                {line.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className='flex-shrink-0 p-2 border-t bg-muted/20'>
          <form onSubmit={handleSubmit} className='flex items-center'>
            <ChevronRight className='h-4 w-4 text-cyan-400 mr-2' />
            <input
              ref={inputRef}
              type='text'
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className='bg-transparent border-none focus:ring-0 w-full placeholder-muted-foreground'
              placeholder='Enter command...'
              autoComplete='off'
              autoFocus
            />
            <motion.div
              className="w-2 h-4 bg-green-400 rounded-sm"
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            />
          </form>
        </div>

        <motion.div 
          className="w-full h-2 cursor-ns-resize flex items-center justify-center"
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0}
          onDrag={(_, info) => {
            setHeight(height + info.delta.y);
          }}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </motion.div>
    </TooltipProvider>
  );
}
