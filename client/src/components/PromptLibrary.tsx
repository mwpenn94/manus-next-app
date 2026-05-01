import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Search, Star, Plus, LayoutGrid, List, Copy, Edit, Trash2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// --- TYPES ---
type Prompt = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  category: string;
  usageCount: number;
  lastUsed?: number;
  isFavorite: boolean;
  createdAt: number;
};

type EditablePrompt = Omit<Prompt, 'id' | 'usageCount' | 'lastUsed' | 'isFavorite' | 'createdAt'> & { id?: string };

type PromptLibraryProps = {
  prompts: Prompt[];
  onUsePrompt: (content: string) => void;
  onSavePrompt: (prompt: EditablePrompt) => void;
  onDeletePrompt: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  categories: string[];
};

// --- DIALOGS ---

const PromptDialog = ({ categories, onSave, prompt, children }: { categories: string[], onSave: (prompt: EditablePrompt) => void, prompt?: Prompt, children: React.ReactNode }) => {
    const [title, setTitle] = useState(prompt?.title || '');
    const [content, setContent] = useState(prompt?.content || '');
    const [category, setCategory] = useState(prompt?.category || categories[0] || '');
    const [tags, setTags] = useState(prompt?.tags.join(', ') || '');
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTitle(prompt?.title || '');
            setContent(prompt?.content || '');
            setCategory(prompt?.category || categories[0] || '');
            setTags(prompt?.tags.join(', ') || '');
        }
    }, [isOpen, prompt, categories]);

    const handleSave = () => {
        if (title && content && category) {
            const promptToSave: EditablePrompt = { title, content, category, tags: tags.split(',').map(t => t.trim()).filter(Boolean) };
            if (prompt?.id) {
                promptToSave.id = prompt.id;
            }
            onSave(promptToSave);
            setIsOpen(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-card">
                <DialogHeader>
                    <DialogTitle>{prompt ? 'Edit Prompt' : 'Create New Prompt'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Input placeholder="Prompt Title" value={title} onChange={(e) => setTitle(e.target.value)} className="col-span-3" />
                    <Textarea placeholder="Prompt Content..." value={content} onChange={(e) => setContent(e.target.value)} className="col-span-3 min-h-[150px]" />
                    <Select onValueChange={setCategory} value={category}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Input placeholder="Tags (comma-separated)" value={tags} onChange={(e) => setTags(e.target.value)} className="col-span-3" />
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                    <Button type="submit" onClick={handleSave}>Save Prompt</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// --- PROMPT CARD ---

const PromptCard = ({ prompt, onUse, onToggleFavorite, onEdit, onDelete, view, categories }: { prompt: Prompt, onUse: (content: string) => void, onToggleFavorite: (id: string) => void, onEdit: (prompt: EditablePrompt) => void, onDelete: (id: string) => void, view: 'grid' | 'list', categories: string[] }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const cardVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
    };

    return (
        <motion.div layout variants={cardVariants} initial="hidden" animate="visible" exit="exit" className="w-full">
            <Card className="h-full flex flex-col bg-card hover:bg-accent/50 transition-colors duration-200 overflow-hidden">
                <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                    <div className="flex-grow cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                        <CardTitle className="text-lg font-semibold">{prompt.title}</CardTitle>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => onToggleFavorite(prompt.id)}>
                        <Star className={cn("h-5 w-5", prompt.isFavorite ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground")} />
                    </Button>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col gap-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                    <p className={cn("text-sm text-muted-foreground", !isExpanded && (view === 'grid' ? 'line-clamp-3' : 'line-clamp-1'))}>
                        {prompt.content}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-auto pt-2">
                        {prompt.tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                    </div>
                </CardContent>
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="border-t border-border px-4 py-2 flex items-center justify-between gap-2 bg-accent/20"
                        >
                            <div className="text-xs text-muted-foreground">Uses: {prompt.usageCount}</div>
                            <div className="flex gap-1">
                                <PromptDialog categories={categories} onSave={onEdit} prompt={prompt}>
                                    <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                                </PromptDialog>
                                <Button variant="ghost" size="icon" onClick={() => onDelete(prompt.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => navigator.clipboard.writeText(prompt.content)}><Copy className="h-4 w-4" /></Button>
                                <Button variant="default" size="sm" onClick={() => onUse(prompt.content)}>Use</Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>
        </motion.div>
    );
}

// --- MAIN COMPONENT ---

export const PromptLibrary = ({ prompts, onUsePrompt, onSavePrompt, onDeletePrompt, onToggleFavorite, categories }: PromptLibraryProps) => {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [sort, setSort] = useState('newest');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    prompts.forEach(p => p.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [prompts]);

  const filteredAndSortedPrompts = useMemo(() => {
    let filtered = prompts.filter(p => {
        const searchMatch = searchTerm.toLowerCase() === '' ||
            p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

        const categoryMatch = categoryFilter === 'all' || p.category === categoryFilter;
        const tagMatch = selectedTags.length === 0 || selectedTags.every(st => p.tags.includes(st));

        return searchMatch && categoryMatch && tagMatch;
    });

    return filtered.sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;

        switch (sort) {
            case 'newest': return b.createdAt - a.createdAt;
            case 'alphabetical': return a.title.localeCompare(b.title);
            case 'most_used': return b.usageCount - a.usageCount;
            case 'recently_used': return (b.lastUsed || 0) - (a.lastUsed || 0);
            default: return 0;
        }
    });
  }, [prompts, searchTerm, categoryFilter, selectedTags, sort]);

  const favoritePrompts = filteredAndSortedPrompts.filter(p => p.isFavorite);
  const regularPrompts = filteredAndSortedPrompts.filter(p => !p.isFavorite);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }

  return (
    <div className="p-4 bg-background text-foreground flex flex-col h-full max-h-screen">
      <div className="flex flex-col gap-4 mb-4 shrink-0">
        <div className="flex items-center gap-2">
            <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search prompts..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <PromptDialog categories={categories} onSave={onSavePrompt}>
                <Button variant="default"><Plus className="mr-2 h-4 w-4" /> New Prompt</Button>
            </PromptDialog>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
            <Select onValueChange={(value) => setCategoryFilter(value as string)} defaultValue="all">
                <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Filter by category" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select onValueChange={(value) => setSort(value as string)} defaultValue="newest">
                <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Sort by" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="alphabetical">Alphabetical</SelectItem>
                    <SelectItem value="most_used">Most Used</SelectItem>
                    <SelectItem value="recently_used">Recently Used</SelectItem>
                </SelectContent>
            </Select>
            <div className="flex items-center gap-1 ml-auto">
                <Button variant={view === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setView('grid')}><LayoutGrid className="h-4 w-4" /></Button>
                <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setView('list')}><List className="h-4 w-4" /></Button>
            </div>
        </div>
        {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm font-medium text-muted-foreground shrink-0">Tags:</span>
                <div className="flex flex-wrap gap-1.5">
                    {allTags.map(tag => (
                        <Badge key={tag} variant={selectedTags.includes(tag) ? 'default' : 'secondary'} onClick={() => toggleTag(tag)} className="cursor-pointer transition-colors">
                            {tag}
                        </Badge>
                    ))}
                </div>
            </div>
        )}
      </div>

      <div className="flex-grow overflow-y-auto pr-2 -mr-2">
        <AnimatePresence>
            {favoritePrompts.length > 0 && (
                <motion.div layout className="mb-6">
                    <h2 className="text-xl font-bold mb-3 text-yellow-400 flex items-center"><Star className="mr-2 h-5 w-5 fill-current" /> Favorites</h2>
                    <motion.div layout className={cn("grid gap-4", view === 'grid' ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1")}>
                        {favoritePrompts.map(p => <PromptCard key={p.id} prompt={p} onUse={onUsePrompt} onToggleFavorite={onToggleFavorite} onEdit={onSavePrompt} onDelete={onDeletePrompt} view={view} categories={categories} />)}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
        <motion.div layout className={cn("grid gap-4", view === 'grid' ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1")}>
            <AnimatePresence>
                {regularPrompts.map(p => <PromptCard key={p.id} prompt={p} onUse={onUsePrompt} onToggleFavorite={onToggleFavorite} onEdit={onSavePrompt} onDelete={onDeletePrompt} view={view} categories={categories} />)}
            </AnimatePresence>
        </motion.div>
        {filteredAndSortedPrompts.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg">No prompts found.</p>
                <p>Try adjusting your search or filters.</p>
            </div>
        )}
      </div>
    </div>
  );
};
