
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { File, Save, Undo, Redo, Code, HelpCircle, Settings, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const mockHtmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Awesome Webapp</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header>
    <h1>Welcome to the Live Editor!</h1>
  </header>
  <main>
    <p>You can edit this HTML content directly.</p>
    <button id="myButton">Click me!</button>
  </main>
  <script src="script.js"></script>
</body>
</html>`;

export default function WebAppLiveEditor() {
  const [code, setCode] = useState(mockHtmlContent);
  const [isSaved, setIsSaved] = useState(true);
  const [lines, setLines] = useState(mockHtmlContent.split("\n").length);
  const [history, setHistory] = useState([mockHtmlContent]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLines(code.split("\n").length);
  }, [code]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCode(e.target.value);
    if (isSaved) setIsSaved(false);
    // Add to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(e.target.value);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const { selectionStart, selectionEnd } = e.currentTarget;
      const newCode = code.substring(0, selectionStart) + '  ' + code.substring(selectionEnd);
      setCode(newCode);
      // Move cursor after inserted spaces
      setTimeout(() => {
        if(textAreaRef.current) {
          textAreaRef.current.selectionStart = textAreaRef.current.selectionEnd = selectionStart + 2;
        }
      }, 0);
    } else if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      setIsSaved(true);
      // Here you would typically save the file
      console.log('File saved!');
    } else if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        handleUndo();
    } else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        handleRedo();
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCode(history[newIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCode(history[newIndex]);
    }
  };

  const handleFormat = () => {
    // This is a mock format function. A real implementation would use a library like Prettier.
    const indentedCode = code.split('\n').map(line => line.trim().startsWith('<') ? '  ' + line.trim() : line.trim()).join('\n');
    setCode(indentedCode);
    if (isSaved) setIsSaved(false);
  };

  const updateCursorPos = () => {
    if (textAreaRef.current) {
        const { selectionStart } = textAreaRef.current;
        const textUntilCursor = code.substring(0, selectionStart);
        const lines = textUntilCursor.split('\n');
        const line = lines.length;
        const col = lines[lines.length - 1].length + 1;
        setCursorPos({ line, col });
    }
  };

  useEffect(() => {
    updateCursorPos();
  }, [code]);

  const handleScroll = () => {
    if (textAreaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textAreaRef.current.scrollTop;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto my-8 shadow-lg border-none bg-zinc-900/50 text-white font-mono flex flex-col h-[80vh] min-h-[600px] backdrop-blur-sm">
      <CardHeader className="p-3 border-b border-zinc-700 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <span>src</span>
            <ChevronRight className="h-4 w-4" />
            <span>components</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-white">webapp</span>
            <ChevronRight className="h-4 w-4" />
            <span className="font-semibold text-white">index.html</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-zinc-600 text-zinc-300">HTML</Badge>
            <AnimatePresence mode="wait">
              <motion.div
                key={isSaved ? "saved" : "unsaved"}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
              >
                {isSaved ? (
                  <Badge variant="secondary" className="bg-green-800/50 text-green-300 border-green-600/50">Saved</Badge>
                ) : (
                  <Badge variant="secondary" className="bg-yellow-800/50 text-yellow-300 border-yellow-600/50">Unsaved</Badge>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-grow relative flex overflow-hidden">
        <div ref={lineNumbersRef} className="w-12 bg-zinc-900/30 text-right p-2 text-zinc-500 select-none overflow-y-hidden">
          {Array.from({ length: lines }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <textarea
          ref={textAreaRef}
          onSelect={updateCursorPos}
          className="flex-1 bg-transparent p-2 resize-none outline-none font-mono text-base leading-relaxed tracking-wide text-zinc-200 no-scrollbar"
          value={code}
          onChange={handleCodeChange}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          spellCheck="false"
        />
      </CardContent>
      <CardFooter className="p-2 border-t border-zinc-700 flex-shrink-0 flex items-center justify-between text-sm text-zinc-400">
        <div className="flex items-center gap-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={handleUndo} variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:bg-zinc-700 hover:text-white" disabled={historyIndex === 0}><Undo className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent><p>Undo (Ctrl+Z)</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={handleRedo} variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:bg-zinc-700 hover:text-white" disabled={historyIndex === history.length - 1}><Redo className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent><p>Redo (Ctrl+Y)</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={handleFormat} variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:bg-zinc-700 hover:text-white"><Code className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent><p>Format Code</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-4">
          <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
          <span>{lines} lines</span>
          <span>{code.length} characters</span>
          <Separator orientation="vertical" className="h-5 bg-zinc-600" />
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:bg-zinc-700 hover:text-white"><HelpCircle className="h-4 w-4" /></Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-700 text-white">
              <DialogHeader>
                <DialogTitle>Keyboard Shortcuts</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <p><kbd className="p-1 bg-zinc-700 rounded">Ctrl+S</kbd></p><p>Save file</p>
                <p><kbd className="p-1 bg-zinc-700 rounded">Ctrl+Z</kbd></p><p>Undo</p>
                <p><kbd className="p-1 bg-zinc-700 rounded">Ctrl+Y</kbd></p><p>Redo</p>
                <p><kbd className="p-1 bg-zinc-700 rounded">Tab</kbd></p><p>Indent</p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardFooter>
    </Card>
  );
}
