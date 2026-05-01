import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Star, Tag, Trash2, X, PlusCircle, ChevronDown, ChevronUp, FileDown, Search, Filter, GripVertical } from 'lucide-react';

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Types
type Example = {
  id: string;
  input: string;
  output: string;
  rating: number;
  tags: string[];
  createdAt: number;
  source: string;
};

type AgentTrainingDataViewerProps = {
  examples: Example[];
  onRate: (id: string, rating: number) => void;
  onDelete: (id: string | string[]) => void;
  onAddTag: (id: string | string[], tag: string) => void;
  onRemoveTag: (id: string, tag: string) => void;
  onExport: (selectedIds?: string[]) => void;
  filters: { tag?: string; minRating?: number; source?: string; search?: string };
  onFilterChange: (filters: Partial<AgentTrainingDataViewerProps['filters']>) => void;
};

const StarRating = ({ rating, onRate, disabled = false }: { rating: number; onRate: (rating: number) => void; disabled?: boolean }) => {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <motion.div whileHover={{ scale: disabled ? 1 : 1.2 }} key={star}>
            <Star
              className={cn(
                "h-5 w-5",
                rating >= star ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground",
                !disabled && "cursor-pointer"
              )}
              onClick={() => !disabled && onRate(star)}
            />
        </motion.div>
      ))}
    </div>
  );
};

const AddTagDialog = ({ onAddTag }: { onAddTag: (tag: string) => void }) => {
    const [tag, setTag] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const handleAdd = () => {
        if (tag.trim()) {
            onAddTag(tag.trim());
            setTag('');
            setIsOpen(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                    <PlusCircle className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Tag</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Input
                        id="tag"
                        value={tag}
                        onChange={(e) => setTag(e.target.value)}
                        placeholder="Enter new tag"
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    />
                </div>
                <DialogFooter>
                    <Button onClick={handleAdd}>Add Tag</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const TrainingExampleCard = React.memo(({
    example,
    onRate,
    onDelete,
    onAddTag,
    onRemoveTag,
    isSelected,
    onSelectToggle,
}: Omit<AgentTrainingDataViewerProps, 'examples' | 'onExport' | 'filters' | 'onFilterChange'> & {
    example: Example;
    isSelected: boolean;
    onSelectToggle: (id: string) => void;
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const sourceBadgeVariant = useMemo(() => {
        switch (example.source.toLowerCase()) {
            case 'manual': return 'default';
            case 'generated': return 'secondary';
            case 'imported': return 'outline';
            default: return 'default';
        }
    }, [example.source]);

    return (
        <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <Card className={cn("overflow-hidden transition-shadow hover:shadow-lg", isSelected && "ring-2 ring-primary")}>
                <CardHeader className="flex flex-row items-start gap-4 space-y-0 p-4 bg-card/50">
                    <div className="flex items-center h-full pt-1">
                        <Checkbox checked={isSelected} onCheckedChange={() => onSelectToggle(example.id)} />
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant={sourceBadgeVariant}>{example.source}</Badge>
                                <span className="text-xs text-muted-foreground">{new Date(example.createdAt).toLocaleDateString()}</span>
                            </div>
                            <StarRating rating={example.rating} onRate={(rating) => onRate(example.id, rating)} />
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {example.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="group relative pr-6">
                                    {tag}
                                    <button onClick={() => onRemoveTag(example.id, tag)} className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                            <AddTagDialog onAddTag={(tag) => onAddTag(example.id, tag)} />
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)}>
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onDelete(example.id)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ type: "spring" as const, duration: 0.4, bounce: 0.1 }}
                        >
                            <CardContent className="p-4 border-t border-border text-sm">
                                <h4 className="font-semibold mb-2 text-foreground">Input</h4>
                                <pre className="bg-background p-2 rounded-md whitespace-pre-wrap font-mono text-xs"><code>{example.input}</code></pre>
                                <h4 className="font-semibold mt-4 mb-2 text-foreground">Output</h4>
                                <pre className="bg-background p-2 rounded-md whitespace-pre-wrap font-mono text-xs"><code>{example.output}</code></pre>
                            </CardContent>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>
        </motion.div>
    );
});

export const AgentTrainingDataViewer = ({
    examples,
    onRate,
    onDelete,
    onAddTag,
    onRemoveTag,
    onExport,
    filters,
    onFilterChange,
}: AgentTrainingDataViewerProps) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const filteredExamples = useMemo(() => {
        return examples.filter(ex => {
            const searchMatch = filters.search ? (ex.input.toLowerCase().includes(filters.search.toLowerCase()) || ex.output.toLowerCase().includes(filters.search.toLowerCase())) : true;
            const tagMatch = filters.tag ? ex.tags.includes(filters.tag) : true;
            const ratingMatch = filters.minRating ? ex.rating >= filters.minRating : true;
            const sourceMatch = filters.source ? ex.source.toLowerCase() === filters.source.toLowerCase() : true;
            return searchMatch && tagMatch && ratingMatch && sourceMatch;
        });
    }, [examples, filters]);

    const handleSelectToggle = useCallback((id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    }, []);

    const handleSelectAll = () => {
        if (selectedIds.size === filteredExamples.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredExamples.map(ex => ex.id)));
        }
    };

    const allTags = useMemo(() => Array.from(new Set(examples.flatMap(ex => ex.tags))), [examples]);
    const allSources = useMemo(() => Array.from(new Set(examples.map(ex => ex.source))), [examples]);

    const handleBulkDelete = () => {
        if (selectedIds.size > 0) {
            onDelete(Array.from(selectedIds));
            setSelectedIds(new Set());
        }
    };

    const handleBulkAddTag = (tag: string) => {
        if (selectedIds.size > 0) {
            onAddTag(Array.from(selectedIds), tag);
        }
    };

    return (
        <div className="p-4 bg-background text-foreground space-y-4">
            <Card>
                <CardContent className="p-4 flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[200px] relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search in input/output..."
                            value={filters.search || ''}
                            onChange={e => onFilterChange({ ...filters, search: e.target.value })}
                            className="pl-10"
                        />
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="gap-2"><Filter className="h-4 w-4" /> Filters</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[250px]">
                            <div className="p-2 space-y-2">
                                <div>
                                    <label className="text-sm font-medium">Min Rating</label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <StarRating rating={filters.minRating || 0} onRate={(r) => onFilterChange({ ...filters, minRating: r })} />
                                        {filters.minRating && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onFilterChange({ ...filters, minRating: undefined })}><X className="h-4 w-4" /></Button>}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Tag</label>
                                    <select
                                        value={filters.tag || ''}
                                        onChange={e => onFilterChange({ ...filters, tag: e.target.value || undefined })}
                                        className="w-full mt-1 bg-input border border-border rounded-md p-2 text-sm"
                                    >
                                        <option value="">All Tags</option>
                                        {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Source</label>
                                    <select
                                        value={filters.source || ''}
                                        onChange={e => onFilterChange({ ...filters, source: e.target.value || undefined })}
                                        className="w-full mt-1 bg-input border border-border rounded-md p-2 text-sm"
                                    >
                                        <option value="">All Sources</option>
                                        {allSources.map(source => <option key={source} value={source}>{source}</option>)}
                                    </select>
                                </div>
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button onClick={() => onExport()}><FileDown className="h-4 w-4 mr-2" /> Export All</Button>
                </CardContent>
            </Card>

            {selectedIds.size > 0 && (
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <p className="text-sm font-medium">{selectedIds.size} selected</p>
                        <Button variant="destructive" onClick={handleBulkDelete}>Delete Selected</Button>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline">Add Tag to Selected</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Add Tag to {selectedIds.size} items</DialogTitle></DialogHeader>
                                <AddTagDialog onAddTag={handleBulkAddTag} />
                            </DialogContent>
                        </Dialog>
                        <Button variant="secondary" onClick={() => onExport(Array.from(selectedIds))}>Export Selected</Button>
                    </CardContent>
                </Card>
            )}

            <div className="flex items-center gap-2 py-2">
                <Checkbox
                    checked={selectedIds.size > 0 && selectedIds.size === filteredExamples.length}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                />
                <span className="text-sm text-muted-foreground">Select all ({filteredExamples.length} items)</span>
            </div>

            <div className="grid grid-cols-1 gap-4">
                <AnimatePresence>
                    {filteredExamples.map(example => (
                        <TrainingExampleCard
                            key={example.id}
                            example={example}
                            onRate={onRate}
                            onDelete={onDelete}
                            onAddTag={onAddTag}
                            onRemoveTag={onRemoveTag}
                            isSelected={selectedIds.has(example.id)}
                            onSelectToggle={handleSelectToggle}
                        />
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};
