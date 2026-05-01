import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FilePlus2, Home, Settings, Star, CheckCircle2, CornerDownLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- MOCK DATA AND TYPES ---
type Action = {
  id: string;
  label: string;
  category: 'Navigation' | 'Create' | 'Settings';
  icon: React.ElementType;
  shortcut?: string[];
  keywords?: string;
  perform: () => void;
};

const allActions: Action[] = [
  { id: 'nav-home', label: 'Go to Home', category: 'Navigation', icon: Home, shortcut: ['G', 'H'], keywords: 'dashboard main page', perform: () => console.log('Navigating to Home...') },
  { id: 'nav-settings', label: 'Open Settings', category: 'Navigation', icon: Settings, shortcut: ['G', 'S'], keywords: 'preferences options', perform: () => console.log('Opening Settings...') },
  { id: 'create-doc', label: 'New Document', category: 'Create', icon: FilePlus2, shortcut: ['C', 'D'], keywords: 'new file text', perform: () => console.log('Creating new document...') },
  { id: 'create-project', label: 'New Project', category: 'Create', icon: FilePlus2, shortcut: ['C', 'P'], keywords: 'new workspace', perform: () => console.log('Creating new project...') },
  { id: 'settings-profile', label: 'Edit Profile', category: 'Settings', icon: Settings, keywords: 'account user details', perform: () => console.log('Editing profile...') },
  { id: 'settings-billing', label: 'Manage Billing', category: 'Settings', icon: Settings, keywords: 'subscription payment credit card', perform: () => console.log('Managing billing...') },
];

// --- COMPONENT IMPLEMENTATION ---
export default function QuickActions() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentActions, setRecentActions] = useState<Action[]>([]);
  const [feedbackActionId, setFeedbackActionId] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const executeAction = useCallback((action: Action) => {
    action.perform();
    setFeedbackActionId(action.id);
    setRecentActions(prev => [action, ...prev.filter(a => a.id !== action.id)].slice(0, 3));
    setTimeout(() => {
        setIsOpen(false);
        setFeedbackActionId(null);
    }, 700);
  }, []);

  const filteredActions = search
    ? allActions.filter(
        (action) =>
          action.label.toLowerCase().includes(search.toLowerCase()) ||
          action.keywords?.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const displayedGroups = search ? [
      { heading: 'Actions', actions: filteredActions }
    ] : [
      { heading: 'Recent', actions: recentActions },
      { heading: 'Navigation', actions: allActions.filter(a => a.category === 'Navigation') },
      { heading: 'Create', actions: allActions.filter(a => a.category === 'Create') },
    ];
    
  const flatActionList = displayedGroups.flatMap(g => g.actions);

  useEffect(() => {
    setActiveIndex(0);
  }, [search]);

  useEffect(() => {
    if (!isOpen) setSearch('');
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % flatActionList.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + flatActionList.length) % flatActionList.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selectedAction = flatActionList[activeIndex];
        if (selectedAction) {
          executeAction(selectedAction);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.removeEventListener('keydown', handleKeyDown);
    }

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeIndex, flatActionList, executeAction]);

  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)} className="w-64 justify-between text-muted-foreground">
        Quick actions...
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="p-0 overflow-hidden shadow-2xl max-w-lg bg-transparent border-0">
          <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
            <CommandInput 
              value={search}
              onValueChange={setSearch}
              placeholder="Type a command or search..." 
            />
            <CommandList ref={listRef} className="max-h-[330px]">
              <CommandEmpty>No results found.</CommandEmpty>
              {displayedGroups.map((group, groupIndex) => (
                group.actions.length > 0 && (
                  <CommandGroup key={group.heading} heading={group.heading}>
                    {group.actions.map((action) => {
                      const isSelected = activeIndex === displayedGroups.slice(0, groupIndex).reduce((acc, g) => acc + g.actions.length, 0) + group.actions.indexOf(action);
                      const isFeedback = feedbackActionId === action.id;
                      return (
                        <CommandItem
                          key={action.id}
                          ref={isSelected ? activeItemRef : null}
                          onSelect={() => executeAction(action)}
                          className={`relative ${isSelected ? 'bg-accent' : ''}`}
                        >
                          <AnimatePresence>
                            {isFeedback ? (
                              <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: 'easeOut' }}
                                className="absolute left-2.5 flex items-center justify-center"
                              >
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              </motion.div>
                            ) : (
                              <action.icon className="mr-2" />
                            )}
                          </AnimatePresence>
                          <motion.span layout className={`${isFeedback ? 'pl-6' : ''} transition-all duration-300 ease-out`}>
                            {action.label}
                          </motion.span>
                          <div className="ml-auto flex items-center gap-1">
                            {action.shortcut?.map((key) => (
                              <kbd key={key} className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                {key}
                              </kbd>
                            ))}
                            {isSelected && !isFeedback && (
                                <CornerDownLeft className="h-4 w-4 ml-2 text-muted-foreground" />
                            )}
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )
              ))}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}