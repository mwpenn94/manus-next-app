import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Search, CornerDownLeft } from 'lucide-react';
import type { ReactNode } from 'react';

// A simple fuzzy search utility
const fuzzyMatch = (query: string, text: string): boolean => {
  const search = query.toLowerCase().replace(/\s/g, '');
  const target = text.toLowerCase();
  let searchPosition = 0;
  for (let i = 0; i < target.length; i++) {
    if (searchPosition < search.length && target[i] === search[searchPosition]) {
      searchPosition++;
    }
  }
  return searchPosition === search.length;
};

export interface Command {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  category: string;
  action: () => void;
  keywords?: string[];
  shortcut?: string[];
}

export interface CommandPaletteProps {
  commands: Command[];
  recentCommandIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onCommandSelect: (commandId: string) => void;
}

export const CommandPalette = ({
  commands,
  recentCommandIds,
  isOpen,
  onClose,
  onCommandSelect,
}: CommandPaletteProps) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCommands = useMemo(() => {
    if (!search) {
      const recent = recentCommandIds
        .map(id => commands.find(cmd => cmd.id === id))
        .filter((cmd): cmd is Command => !!cmd);
      const other = commands.filter(cmd => !recentCommandIds.includes(cmd.id));
      return [...recent, ...other];
    }

    return commands.filter(command => 
      fuzzyMatch(search, command.label) ||
      (command.description && fuzzyMatch(search, command.description)) ||
      (command.keywords && command.keywords.some(kw => fuzzyMatch(search, kw)))
    );
  }, [search, commands, recentCommandIds]);

  const groupedCommands = useMemo(() => {
    return filteredCommands.reduce((acc, command) => {
      const category = search ? command.category : (recentCommandIds.includes(command.id) ? 'Recent' : command.category);
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(command);
      return acc;
    }, {} as Record<string, Command[]>);
  }, [filteredCommands, search, recentCommandIds]);

  const commandList = useMemo(() => {
    const categoryOrder = search ? Object.keys(groupedCommands).sort() : ['Recent', ...Object.keys(groupedCommands).filter(c => c !== 'Recent').sort()];
    return categoryOrder.flatMap(category => [{ type: 'category' as const, label: category }, ...groupedCommands[category]]) as (Command | { type: 'category'; label: string })[];
  }, [groupedCommands, search]);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (isOpen) onClose();
      // Note: Opening is handled globally, this just handles closing.
    }
    if (!isOpen) return;

    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : commandList.length - 1));
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < commandList.length - 1 ? prev + 1 : 0));
        break;
      case 'Enter': {
        e.preventDefault();
        const selectedItem = commandList[selectedIndex];
        if (selectedItem && 'action' in selectedItem && 'id' in selectedItem) {
          (selectedItem as Command).action();
          onCommandSelect((selectedItem as Command).id);
          onClose();
        }
        break;
      }
    }
  }, [isOpen, onClose, commandList, selectedIndex, onCommandSelect]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const currentItem = commandList[selectedIndex];
    if (currentItem && !('action' in currentItem)) {
      setSelectedIndex(prev => (prev < commandList.length - 1 ? prev + 1 : 0));
    }
  }, [selectedIndex, commandList]);

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="overflow-hidden p-0 shadow-2xl max-w-2xl bg-background/80 backdrop-blur-xl border-border/50" asChild>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] as const }}
            >
              <div className="flex items-center border-b border-border/50 px-4">
                <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  ref={inputRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Type a command or search..."
                  className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="max-h-[300px] overflow-y-auto p-2">
                {commandList.length === 0 && (
                  <div className="py-6 text-center text-sm text-muted-foreground">No results found.</div>
                )}
                {Object.entries(groupedCommands).map(([category, items]) => (
                  <div key={category}>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{category}</div>
                    {items.map((item, index) => {
                      const globalIndex = commandList.findIndex(i => 'id' in i && (i as Command).id === item.id);
                      return (
                        <div
                          key={item.id}
                          onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                          onClick={() => {
                            item.action();
                            onCommandSelect(item.id);
                            onClose();
                          }}
                          className={cn(
                            'flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
                            selectedIndex === globalIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                          )}
                        >
                          <div className="mr-3 text-muted-foreground">{item.icon || <CornerDownLeft className="h-4 w-4" />}</div>
                          <div className="flex-grow">
                            <p className="font-medium">{item.label}</p>
                            {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                          </div>
                          {item.shortcut && (
                            <div className="flex items-center gap-1">
                              {item.shortcut.map(key => (
                                <kbd key={key} className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                  {key}
                                </kbd>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
};