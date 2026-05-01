
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Search, X, ShieldAlert } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// --- Types ---
type ShortcutAction = () => void;

export interface Shortcut {
  id: string;
  keys: string[];
  label: string;
  category: string;
  action: ShortcutAction;
  enabled?: boolean;
}

interface KeyboardShortcutManagerProps {
  shortcuts: Shortcut[];
  isHelpOpen: boolean;
  onToggleHelp: () => void;
}

// --- Helper Functions ---
const formatKeys = (keys: string[]) => {
  return keys.map(key => {
    if (key.toLowerCase() === 'control') return 'Ctrl';
    if (key.toLowerCase() === 'meta') return '⌘';
    if (key.toLowerCase() === 'shift') return '⇧';
    if (key.toLowerCase() === 'alt') return '⌥';
    return key.charAt(0).toUpperCase() + key.slice(1);
  });
};

const dialogVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1] as const,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 1, 1] as const,
    },
  },
} as const satisfies Variants;

// --- Main Component ---
export const KeyboardShortcutManager: React.FC<KeyboardShortcutManagerProps> = ({ shortcuts, isHelpOpen, onToggleHelp }) => {
  const [enabledShortcuts, setEnabledShortcuts] = useState<Record<string, boolean>>(() =>
    shortcuts.reduce((acc, s) => ({ ...acc, [s.id]: s.enabled ?? true }), {})
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [conflicts, setConflicts] = useState<Record<string, string[]>>({});

  // --- Conflict Detection ---
  useEffect(() => {
    const keyMap: Record<string, string[]> = {};
    shortcuts.forEach(shortcut => {
      const keyString = [...shortcut.keys].sort().join('+').toLowerCase();
      if (!keyMap[keyString]) {
        keyMap[keyString] = [];
      }
      keyMap[keyString].push(shortcut.id);
    });

    const foundConflicts: Record<string, string[]> = {};
    for (const keyString in keyMap) {
      if (keyMap[keyString].length > 1) {
        keyMap[keyString].forEach(id => {
          foundConflicts[id] = keyMap[keyString].filter(cId => cId !== id);
        });
      }
    }
    setConflicts(foundConflicts);
  }, [shortcuts]);

  // --- Core Shortcut Listener ---
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === '?' && !/input|textarea/i.test((event.target as HTMLElement).tagName)) {
        event.preventDefault();
        onToggleHelp();
        return;
    }

    if (isHelpOpen || /input|textarea/i.test((event.target as HTMLElement).tagName)) {
      return;
    }

    const pressedKeys = new Set<string>();
    if (event.ctrlKey) pressedKeys.add('control');
    if (event.metaKey) pressedKeys.add('meta');
    if (event.shiftKey) pressedKeys.add('shift');
    if (event.altKey) pressedKeys.add('alt');
    pressedKeys.add(event.key.toLowerCase());

    const matchedShortcut = shortcuts.find(s => {
        if (!enabledShortcuts[s.id]) return false;
        const shortcutKeys = new Set(s.keys.map(k => k.toLowerCase()));
        return pressedKeys.size === shortcutKeys.size && Array.from(pressedKeys).every(k => shortcutKeys.has(k));
    });

    if (matchedShortcut) {
        event.preventDefault();
        matchedShortcut.action();
    }
  }, [shortcuts, onToggleHelp, isHelpOpen, enabledShortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // --- State & Render Logic ---
  const handleToggleShortcut = (id: string, checked: boolean) => {
    setEnabledShortcuts(prev => ({ ...prev, [id]: checked }));
  };

  const filteredShortcuts = useMemo(() => {
    return shortcuts.filter(s => 
        s.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.keys.join(' ').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [shortcuts, searchTerm]);

  const groupedShortcuts = useMemo(() => {
    return filteredShortcuts.reduce<Record<string, Shortcut[]>>((acc, s) => {
      if (!acc[s.category]) {
        acc[s.category] = [];
      }
      acc[s.category].push(s);
      return acc;
    }, {});
  }, [filteredShortcuts]);

  const categories = ['Navigation', 'Editing', 'View', 'Task Management'];

  return (
    <AnimatePresence>
      {isHelpOpen && (
        <Dialog open={isHelpOpen} onOpenChange={onToggleHelp}>
          <DialogContent asChild>
            <motion.div
              variants={dialogVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="max-w-3xl w-full bg-background p-0 border-border"
            >
              <div className="flex flex-col h-[70vh]">
                <DialogHeader className="p-6 pb-4 border-b border-border">
                  <DialogTitle className="text-2xl font-semibold text-foreground">Keyboard Shortcuts</DialogTitle>
                  <DialogDescription className="text-muted-foreground">Discover and customize your keyboard shortcuts.</DialogDescription>
                  <div className="relative mt-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search shortcuts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-full bg-accent border-border focus-visible:ring-primary"
                    />
                  </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {categories.map(category => (
                    groupedShortcuts[category] && groupedShortcuts[category].length > 0 && (
                      <div key={category}>
                        <h3 className="text-lg font-medium text-foreground mb-3">{category}</h3>
                        <div className="space-y-2">
                          {groupedShortcuts[category].map(shortcut => (
                            <div key={shortcut.id} className="flex items-center justify-between p-2 rounded-md hover:bg-accent">
                              <div className="flex items-center gap-4">
                                <p className="text-sm text-foreground w-48 truncate">{shortcut.label}</p>
                                {conflicts[shortcut.id] && (
                                    <Badge variant="destructive" className="flex items-center gap-1">
                                        <ShieldAlert className="h-3 w-3" />
                                        Conflict
                                    </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                  {formatKeys(shortcut.keys).map(key => (
                                    <kbd key={key} className="px-2 py-1 text-xs font-sans font-medium text-muted-foreground bg-muted border border-border rounded-md">
                                      {key}
                                    </kbd>
                                  ))}
                                </div>
                                <Switch
                                  checked={enabledShortcuts[shortcut.id] ?? true}
                                  onCheckedChange={(checked) => handleToggleShortcut(shortcut.id, checked)}
                                  aria-label={`Toggle ${shortcut.label}`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                   {filteredShortcuts.length === 0 && (
                      <div className="text-center py-10">
                          <p className="text-muted-foreground">No shortcuts found for "{searchTerm}".</p>
                      </div>
                  )}
                </div>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
};
