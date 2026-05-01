import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bold, Italic, Link, Code, Highlighter } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ToolbarPosition {
  top: number;
  left: number;
}

const FloatingToolbar = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<ToolbarPosition>({ top: 0, left: 0 });
  const [activeButtons, setActiveButtons] = useState<Set<string>>(new Set());
  const contentRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const contentElement = contentRef.current;

    if (!contentElement || !contentElement.contains(range.commonAncestorContainer)) {
        setIsVisible(false);
        return;
    }

    if (range.collapsed) {
      setIsVisible(false);
      return;
    }

    const domRect = range.getBoundingClientRect();
    const contentRect = contentElement.getBoundingClientRect();
    const toolbarWidth = toolbarRef.current?.offsetWidth || 220; // Estimate width

    const top = domRect.top - contentRect.top - 60;
    let left = domRect.left - contentRect.left + domRect.width / 2 - toolbarWidth / 2;

    // Ensure the toolbar doesn't overflow the content area
    left = Math.max(0, left);
    left = Math.min(left, contentRect.width - toolbarWidth);

    setPosition({ top, left });
    setIsVisible(true);
  }, []);

  useEffect(() => {
    const handleMouseUp = () => {
      // Use a small delay to allow the selection to be finalized
      setTimeout(handleSelectionChange, 10);
    };

    const handleClickOutside = (event: MouseEvent) => {
        if (contentRef.current && !contentRef.current.contains(event.target as Node) && 
            toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
            setIsVisible(false);
        }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleSelectionChange]);

  const toggleButton = (name: string) => {
    setActiveButtons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(name)) {
        newSet.delete(name);
      } else {
        newSet.add(name);
      }
      // Here you would typically also apply the formatting to the document
      // document.execCommand(name.toLowerCase(), false);
      return newSet;
    });
  };

  const toolbarButtons = [
    { name: 'Bold', icon: Bold, shortcut: '⌘B' },
    { name: 'Italic', icon: Italic, shortcut: '⌘I' },
    { name: 'Link', icon: Link, shortcut: '⌘K' },
    { name: 'Highlight', icon: Highlighter, shortcut: '⌘H' },
    { name: 'Code', icon: Code, shortcut: '⌘E' },
  ];

  return (
    <div className="relative w-full max-w-3xl mx-auto p-8 bg-background text-foreground font-sans">
      <div ref={contentRef} className="relative prose prose-invert lg:prose-xl mx-auto p-10 bg-card rounded-xl border border-border focus:outline-none shadow-sm" contentEditable suppressContentEditableWarning>
          <p>In a realm where pixels and code converge, a developer sought to create a floating toolbar—a subtle companion for the modern writer. This interface element would only appear when summoned by the act of text selection, offering its assistance without intrusion.</p>
          <p>Select any piece of this narrative to witness the toolbar materialize. It is designed to be both elegant and functional, providing essential formatting options right where you need them. The toolbar gracefully fades into view, its position intelligently calculated based on your selection.</p>
      </div>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={toolbarRef}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30, duration: 0.2 }}
            className="absolute bg-card/80 backdrop-blur-lg border border-border rounded-lg shadow-xl p-1 flex items-center gap-1 z-10"
            style={{ top: position.top, left: position.left }}
            onMouseDown={(e) => e.preventDefault()} // Prevent toolbar from stealing focus and collapsing selection
          >
            <TooltipProvider delayDuration={100}>
              {toolbarButtons.map((button) => (
                <Tooltip key={button.name}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleButton(button.name)}
                      className={cn('p-2 h-auto rounded-md', {
                        'bg-primary text-primary-foreground hover:bg-primary/90': activeButtons.has(button.name),
                      })}
                    >
                      <button.icon className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="flex items-center gap-2 bg-background/80 backdrop-blur-sm border-border">
                    <p>{button.name}</p>
                    <span className="text-xs text-muted-foreground">{button.shortcut}</span>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FloatingToolbar;
