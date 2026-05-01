
'use client';

import * as React from 'react';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Tag, PlusCircle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// --- TYPES ---
type TagCategory = 'Technology' | 'Project' | 'Personal' | 'Finance';

interface TagData {
  id: string;
  text: string;
  category: TagCategory;
}

const CATEGORY_COLORS: Record<TagCategory, string> = {
  Technology: 'bg-blue-500',
  Project: 'bg-green-500',
  Personal: 'bg-purple-500',
  Finance: 'bg-yellow-500',
};

// --- MOCK DATA ---
const PREDEFINED_TAGS: TagData[] = [
  { id: '1', text: 'React', category: 'Technology' },
  { id: '2', text: 'TypeScript', category: 'Technology' },
  { id: '3', text: 'Project Phoenix', category: 'Project' },
  { id: '4', text: 'Q3 Budget', category: 'Finance' },
  { id: '5', text: 'Health', category: 'Personal' },
  { id: '6', text: 'Next.js', category: 'Technology' },
  { id: '7', text: 'Side Hustle', category: 'Personal' },
];

const MAX_TAGS = 10;

export default function TagInput() {
  const [inputValue, setInputValue] = useState('');
  const [selectedTags, setSelectedTags] = useState<TagData[]>([PREDEFINED_TAGS[0], PREDEFINED_TAGS[2]]);
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const availableTags = useMemo(() => {
    const selectedIds = new Set(selectedTags.map(t => t.id));
    return PREDEFINED_TAGS.filter(t => !selectedIds.has(t.id));
  }, [selectedTags]);

  const filteredSuggestions = useMemo(() => {
    if (!inputValue) return [];
    return availableTags.filter(tag =>
      tag.text.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [inputValue, availableTags]);

  const groupedSuggestions = useMemo(() => {
    const groups: Record<string, TagData[]> = {};
    filteredSuggestions.forEach(tag => {
      if (!groups[tag.category]) {
        groups[tag.category] = [];
      }
      groups[tag.category].push(tag);
    });
    return Object.entries(groups);
  }, [filteredSuggestions]);

  const flatSuggestions = useMemo(() => groupedSuggestions.flatMap(([, tags]) => tags), [groupedSuggestions]);

  const handleAddTag = useCallback((tag: TagData) => {
    if (selectedTags.length < MAX_TAGS && !selectedTags.some(t => t.id === tag.id)) {
      setSelectedTags(prev => [...prev, tag]);
      setInputValue('');
      setActiveIndex(-1);
    }
  }, [selectedTags]);

  const handleRemoveTag = (tagId: string) => {
    setSelectedTags(prev => prev.filter(t => t.id !== tagId));
  };

  const handleCreateTag = (text: string) => {
    if (selectedTags.length >= MAX_TAGS || !text.trim()) return;
    const newTag: TagData = {
      id: `new-${Date.now()}`,
      text: text.trim(),
      category: 'Personal', // Default category for new tags
    };
    handleAddTag(newTag);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && inputValue === '' && selectedTags.length > 0) {
      handleRemoveTag(selectedTags[selectedTags.length - 1].id);
    } else if (isDropdownOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % flatSuggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (prev - 1 + flatSuggestions.length) % flatSuggestions.length);
      } else if (e.key === 'Enter' && activeIndex !== -1) {
        e.preventDefault();
        handleAddTag(flatSuggestions[activeIndex]);
      } else if (e.key === 'Enter' && inputValue) {
        e.preventDefault();
        handleCreateTag(inputValue);
      } else if (e.key === 'Escape') {
        setDropdownOpen(false);
      }
    }
  };

  useEffect(() => {
    if (inputValue) {
      setDropdownOpen(true);
      setActiveIndex(-1);
    } else {
      setDropdownOpen(false);
    }
  }, [inputValue]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <Card className="w-full max-w-lg mx-auto bg-card">
      <CardContent className="p-4">
        <div className="relative">
          <div
            className="flex flex-wrap items-center gap-2 p-2 border rounded-md border-border bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background"
            onClick={() => inputRef.current?.focus()}
          >
            <AnimatePresence>
              {selectedTags.map(tag => (
                <motion.div
                  key={tag.id}
                  layout
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.2 }}
                >
                  <Badge variant="secondary" className="flex items-center gap-1.5 pl-2 pr-1 text-sm">
                    <span className={`h-2 w-2 rounded-full ${CATEGORY_COLORS[tag.category]}`}></span>
                    {tag.text}
                    <Button
                      aria-label={`Remove ${tag.text}`}
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 rounded-full hover:bg-destructive/20"
                      onClick={() => handleRemoveTag(tag.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                </motion.div>
              ))}
            </AnimatePresence>
            <Input
              ref={inputRef}
              type="text"
              placeholder={selectedTags.length >= MAX_TAGS ? 'Tag limit reached' : 'Add a tag...'}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 h-auto p-0 text-sm bg-transparent border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              disabled={selectedTags.length >= MAX_TAGS}
              aria-label="Tag input"
            />
          </div>
          <AnimatePresence>
            {isDropdownOpen && (groupedSuggestions.length > 0 || inputValue) && (
              <motion.div
                ref={dropdownRef}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-10 w-full mt-2 overflow-hidden text-sm border rounded-md shadow-lg bg-card border-border"
              >
                {groupedSuggestions.map(([category, tags], groupIndex) => (
                  <div key={category}>
                    <h4 className="px-3 py-2 text-xs font-semibold tracking-wider text-muted-foreground">{category}</h4>
                    <ul>
                      {tags.map(tag => {
                        const itemIndex = flatSuggestions.findIndex(t => t.id === tag.id);
                        return (
                          <li
                            key={tag.id}
                            role="option"
                            aria-selected={activeIndex === itemIndex}
                            className={cn(
                              'flex items-center gap-2 px-3 py-2 cursor-pointer',
                              activeIndex === itemIndex && 'bg-muted'
                            )}
                            onMouseDown={() => handleAddTag(tag)}
                          >
                            <span className={`h-2 w-2 rounded-full ${CATEGORY_COLORS[tag.category]}`}></span>
                            {tag.text}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
                {inputValue && !filteredSuggestions.some(t => t.text.toLowerCase() === inputValue.toLowerCase()) && (
                  <div
                    className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer text-muted-foreground hover:bg-muted"
                    onMouseDown={() => handleCreateTag(inputValue)}
                  >
                    <PlusCircle className="w-4 h-4" />
                    Create new tag: "{inputValue}"
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="mt-2 text-xs text-right text-muted-foreground">
          {selectedTags.length} / {MAX_TAGS} tags
        </div>
      </CardContent>
    </Card>
  );
}
