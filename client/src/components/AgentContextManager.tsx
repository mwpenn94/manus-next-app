import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { User, Bot, Wrench, Terminal, File as FileIcon, Pin, PinOff, Trash2, ArrowUpDown, GripVertical, Check, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

// --- Type Definitions ---
type ContextItemType = 'system' | 'user' | 'assistant' | 'tool' | 'file';

interface ContextItem {
  id: string;
  type: ContextItemType;
  content: string;
  tokens: number;
  pinned: boolean;
  timestamp: number;
}

interface AgentContextManagerProps {
  contextItems: ContextItem[];
  maxTokens: number;
  currentTokens: number;
  onRemove: (id: string) => void;
  onPin: (id: string) => void;
  onUnpin: (id: string) => void;
  onClear: () => void;
  onSummarize: (ids: string[]) => void;
}

type SortOption = 'newest' | 'oldest' | 'largest' | 'type';
type FilterType = 'all' | ContextItemType;

// --- Icon Mapping ---
const typeIcons: { [key in ContextItemType]: React.ReactNode } = {
  system: <Wrench className="h-4 w-4" />,
  user: <User className="h-4 w-4" />,
  assistant: <Bot className="h-4 w-4" />,
  tool: <Terminal className="h-4 w-4" />,
  file: <FileIcon className="h-4 w-4" />,
};

const typeColors: { [key in ContextItemType]: string } = {
    system: 'bg-blue-900/50 border-blue-700',
    user: 'bg-green-900/50 border-green-700',
    assistant: 'bg-purple-900/50 border-purple-700',
    tool: 'bg-yellow-900/50 border-yellow-700',
    file: 'bg-gray-700/50 border-gray-500',
};

// --- Framer Motion Variants ---
const listVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
        },
    },
} as const satisfies Variants;

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, x: -50, transition: { duration: 0.2 } },
} as const satisfies Variants;

// --- Main Component ---
export const AgentContextManager: React.FC<AgentContextManagerProps> = ({
  contextItems,
  maxTokens,
  currentTokens,
  onRemove,
  onPin,
  onUnpin,
  onClear,
  onSummarize,
}) => {
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const tokenPercentage = maxTokens > 0 ? (currentTokens / maxTokens) * 100 : 0;

  const getProgressColor = () => {
    if (tokenPercentage > 90) return 'bg-red-600';
    if (tokenPercentage > 75) return 'bg-yellow-500';
    return 'bg-primary';
  };

  const handleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
      if (selectedIds.size === filteredAndSortedItems.length) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(filteredAndSortedItems.map(item => item.id)));
      }
  }

  const filteredAndSortedItems = useMemo(() => {
    let items = [...contextItems];

    // Filter
    if (activeFilter !== 'all') {
      items = items.filter(item => item.type === activeFilter);
    }

    // Sort
    items.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;

      switch (sortOption) {
        case 'oldest':
          return a.timestamp - b.timestamp;
        case 'largest':
          return b.tokens - a.tokens;
        case 'type':
          return a.type.localeCompare(b.type);
        case 'newest':
        default:
          return b.timestamp - a.timestamp;
      }
    });

    return items;
  }, [contextItems, activeFilter, sortOption]);

  const handleSummarize = () => {
    onSummarize(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleClear = () => {
      onClear();
      setSelectedIds(new Set());
  }

  return (
    <Card className="w-full max-w-4xl mx-auto bg-card/80 backdrop-blur-sm border-border/80">
      <CardHeader className="border-b border-border/80">
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-xl font-bold">Agent Context Manager</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Manage and prune context window contents.</p>
            </div>
            <div className="flex items-center gap-2">
                {selectedIds.size > 0 && (
                    <Button onClick={handleSummarize} size="sm" variant="secondary">
                        <Bot className="mr-2 h-4 w-4" /> Summarize ({selectedIds.size})
                    </Button>
                )}
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">Clear All</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete all non-pinned context items. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleClear}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
        <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm font-medium text-muted-foreground">
                <span>Token Budget</span>
                <span>{currentTokens.toLocaleString()} / {maxTokens.toLocaleString()}</span>
            </div>
            <Progress value={tokenPercentage} className={cn("h-2", getProgressColor())} />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-4 border-b border-border/80">
            <Tabs value={activeFilter} onValueChange={value => setActiveFilter(value as FilterType)}>
                <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="system">System</TabsTrigger>
                    <TabsTrigger value="user">User</TabsTrigger>
                    <TabsTrigger value="assistant">Assistant</TabsTrigger>
                    <TabsTrigger value="tool">Tool</TabsTrigger>
                    <TabsTrigger value="file">File</TabsTrigger>
                </TabsList>
            </Tabs>
        </div>
        <div className="flex items-center justify-between p-4 border-b border-border/80 bg-background/50">
            <div className="flex items-center gap-2">
                <Checkbox 
                    id="select-all"
                    checked={selectedIds.size > 0 && selectedIds.size === filteredAndSortedItems.length}
                    onCheckedChange={handleSelectAll}
                />
                <label htmlFor="select-all" className="text-sm font-medium text-muted-foreground">Select All</label>
            </div>
            <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
                    <SelectTrigger className="w-[180px] h-8">
                        <SelectValue placeholder="Sort by..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="newest">Newest</SelectItem>
                        <SelectItem value="oldest">Oldest</SelectItem>
                        <SelectItem value="largest">Largest</SelectItem>
                        <SelectItem value="type">Type</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
        <div className="max-h-[500px] overflow-y-auto">
            <AnimatePresence initial={false}>
                {filteredAndSortedItems.length > 0 ? (
                    <motion.ul variants={listVariants} initial="hidden" animate="visible" className="divide-y divide-border/50">
                        {filteredAndSortedItems.map((item) => (
                            <motion.li key={item.id} variants={itemVariants} layout className={cn("flex items-center p-3 gap-3", selectedIds.has(item.id) && "bg-accent/50")}>
                                <Checkbox checked={selectedIds.has(item.id)} onCheckedChange={() => handleSelect(item.id)} />
                                <div className={cn("flex items-center justify-center h-8 w-8 rounded-md border", typeColors[item.type])}>
                                    {typeIcons[item.type]}
                                </div>
                                <div className="flex-1 truncate">
                                    <p className="text-sm font-medium truncate">{item.content}</p>
                                    <span className="text-xs text-muted-foreground">{item.type}</span>
                                </div>
                                <Badge variant="secondary" className="font-mono">{item.tokens.toLocaleString()} tokens</Badge>
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => item.pinned ? onUnpin(item.id) : onPin(item.id)} className="h-8 w-8">
                                        {item.pinned ? <PinOff className="h-4 w-4 text-primary" /> : <Pin className="h-4 w-4" />}
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => onRemove(item.id)} className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-900/50">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </motion.li>
                        ))}
                    </motion.ul>
                ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                        <p className="text-muted-foreground">No context items match the current filter.</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
};
