import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, Trash2, Clock, MessageSquare, ChevronDown, X, Loader2, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Types ---
type Conversation = {
  id: string;
  title: string;
  preview: string;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  model: string;
};

export type AgentConversationHistoryProps = {
  conversations: Conversation[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onSearch: (query: string) => void;
  searchQuery: string;
  isLoading: boolean;
  selectedId?: string;
};

type SortOption = 'newest' | 'oldest' | 'messages';

// --- Helper Functions ---
const formatRelativeTime = (timestamp: number): string => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSeconds < 60) return 'just now';
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

// --- Sub-components ---
const ConversationItem = React.memo(
  ({
    conversation,
    isSelected,
    onSelect,
    onDelete,
  }: {
    conversation: Conversation;
    isSelected: boolean;
    onSelect: (id: string) => void;
    onDelete: () => void;
  }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: 'easeInOut' as const }}
      className={cn(
        'relative rounded-lg border p-4 transition-colors duration-200 cursor-pointer hover:bg-accent',
        isSelected ? 'bg-accent border-primary' : 'border-border'
      )}
      onClick={() => onSelect(conversation.id)}
    >
      <div className="flex justify-between items-start">
        <h3 className="font-semibold text-sm pr-10 truncate text-foreground">{conversation.title}</h3>
        <Badge variant="outline" className="text-xs shrink-0">{conversation.model}</Badge>
      </div>
      <p className="text-xs text-muted-foreground mt-1 truncate">{conversation.preview}</p>
      <div className="flex items-center justify-between text-xs text-muted-foreground mt-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3 h-3" />
          <span>{conversation.messageCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3" />
          <span>{formatRelativeTime(conversation.updatedAt)}</span>
        </div>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 w-7 h-7 text-muted-foreground hover:text-destructive"
                onClick={(e) => e.stopPropagation()}
            >
                <Trash2 className="w-4 h-4" />
            </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete the conversation "{conversation.title}". This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className={cn(Button({ variant: 'destructive' }))}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
);

// --- Main Component ---
export const AgentConversationHistory = ({
  conversations,
  onSelect,
  onDelete,
  onSearch,
  searchQuery,
  isLoading,
  selectedId,
}: AgentConversationHistoryProps) => {
  const [sort, setSort] = useState<SortOption>('newest');
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(15);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    conversations.forEach(c => c.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [conversations]);

  const toggleTag = useCallback((tag: string) => {
    setActiveTags(prev => {
      const newTags = new Set(prev);
      if (newTags.has(tag)) {
        newTags.delete(tag);
      } else {
        newTags.add(tag);
      }
      return newTags;
    });
  }, []);

  const filteredAndSortedConversations = useMemo(() => {
    let processed = [...conversations];

    if (activeTags.size > 0) {
      processed = processed.filter(c => c.tags.some(t => activeTags.has(t)));
    }

    return processed.sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return a.updatedAt - b.updatedAt;
        case 'messages':
          return b.messageCount - a.messageCount;
        case 'newest':
        default:
          return b.updatedAt - a.updatedAt;
      }
    });
  }, [conversations, sort, activeTags]);

  const visibleConversations = useMemo(() => {
      return filteredAndSortedConversations.slice(0, visibleCount);
  }, [filteredAndSortedConversations, visibleCount]);

  const canLoadMore = visibleCount < filteredAndSortedConversations.length;

  const loadMore = () => {
      setVisibleCount(prev => Math.min(prev + 15, filteredAndSortedConversations.length));
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            className="pl-10"
            value={searchQuery}
            onChange={e => onSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground mr-2">Filter by tag:</span>
            {allTags.map(tag => (
              <Badge
                key={tag}
                variant={activeTags.has(tag) ? 'default' : 'secondary'}
                onClick={() => toggleTag(tag)}
                className="cursor-pointer transition-colors"
              >
                {tag}
              </Badge>
            ))}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="shrink-0">
                Sort by: {sort.charAt(0).toUpperCase() + sort.slice(1)}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSort('newest')}>Newest</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSort('oldest')}>Oldest</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSort('messages')}>Most Messages</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-grow">
        <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            ) : visibleConversations.length > 0 ? (
                <AnimatePresence>
                    {visibleConversations.map(convo => (
                        <ConversationItem
                            key={convo.id}
                            conversation={convo}
                            isSelected={convo.id === selectedId}
                            onSelect={onSelect}
                            onDelete={() => onDelete(convo.id)}
                        />
                    ))}
                </AnimatePresence>
            ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                    <Inbox className="w-12 h-12 mb-4" />
                    <h3 className="font-semibold">No Conversations Found</h3>
                    <p className="text-sm">Try adjusting your search or filters.</p>
                </div>
            )}
            </div>
        </ScrollArea>
      </CardContent>
      {canLoadMore && (
          <CardFooter className="p-4 border-t border-border">
              <Button variant="secondary" className="w-full" onClick={loadMore} disabled={isLoading}>
                  {isLoading ? 'Loading...' : 'Load More'}
              </Button>
          </CardFooter>
      )}
    </Card>
  );
};
