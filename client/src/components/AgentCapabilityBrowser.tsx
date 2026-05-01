import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, LayoutGrid, List, ArrowUpDown, ChevronDown, Wrench, Shield, ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// --- TYPES ---
type CapabilityParameter = {
  name: string;
  type: string;
  required: boolean;
  description: string;
};

export type Capability = {
  id: string;
  name: string;
  description: string;
  category: string;
  parameters?: CapabilityParameter[];
  examples?: string[];
  isEnabled: boolean;
  usageCount: number;
};

export interface AgentCapabilityBrowserProps {
  capabilities: Capability[];
  onToggle: (id: string, enabled: boolean) => void;
  onSearch: (query: string) => void;
  searchQuery: string;
}

type SortKey = 'name' | 'usage' | 'category';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';

// --- SUB-COMPONENTS ---

const CapabilityCard = ({
  capability,
  onToggle,
  isExpanded,
  onExpand,
  viewMode,
}: {
  capability: Capability;
  onToggle: (id: string, enabled: boolean) => void;
  isExpanded: boolean;
  onExpand: () => void;
  viewMode: ViewMode;
}) => {
  const Icon = capability.isEnabled ? ShieldCheck : ShieldAlert;

  return (
    <Card className="flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out hover:shadow-lg dark:hover:shadow-primary/20">
      <CardHeader className="flex flex-row items-start justify-between gap-4 cursor-pointer" onClick={onExpand}>
        <div className="flex-grow">
          <div className="flex items-center gap-2">
             <Icon className={cn("h-5 w-5", capability.isEnabled ? "text-green-500" : "text-amber-500")} />
            <CardTitle className="text-lg font-semibold">{capability.name}</CardTitle>
          </div>
          <CardDescription className="mt-1 line-clamp-2">{capability.description}</CardDescription>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <Switch
                checked={capability.isEnabled}
                onCheckedChange={(checked) => onToggle(capability.id, checked)}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Toggle ${capability.name}`}
            />
            <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
        </div>
      </CardHeader>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.section
            key="content"
            initial="collapsed"
            animate="open"
            exit="collapsed"
            variants={{
              open: { opacity: 1, height: 'auto' },
              collapsed: { opacity: 0, height: 0 },
            }}
            transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
            className="overflow-hidden"
          >
            <CardContent className="pt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Badge variant="secondary">{capability.category}</Badge>
                    <div className="text-sm text-muted-foreground">
                        Usage: <span className="font-medium text-foreground">{capability.usageCount.toLocaleString()}</span>
                    </div>
                </div>

                {capability.parameters && capability.parameters.length > 0 && (
                  <div>
                    <h4 className="mb-2 font-semibold text-md">Parameters</h4>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Required</TableHead>
                            <TableHead className="hidden md:table-cell">Description</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {capability.parameters.map((param) => (
                            <TableRow key={param.name}>
                              <TableCell className="font-mono text-sm">{param.name}</TableCell>
                              <TableCell className="font-mono text-sm text-amber-400">{param.type}</TableCell>
                              <TableCell>{param.required ? <ShieldCheck className="w-4 h-4 text-green-500" /> : <ShieldQuestion className="w-4 h-4 text-muted-foreground"/>}</TableCell>
                              <TableCell className="hidden text-sm md:table-cell text-muted-foreground">{param.description}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {capability.examples && capability.examples.length > 0 && (
                  <div>
                    <h4 className="mb-2 font-semibold text-md">Examples</h4>
                    <div className="p-4 space-y-2 rounded-lg bg-background/50">
                      {capability.examples.map((example, index) => (
                        <pre key={index} className="p-3 text-sm rounded-md bg-background text-foreground/80 font-mono overflow-x-auto"><code>{example}</code></pre>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </motion.section>
        )}
      </AnimatePresence>
    </Card>
  );
};

// --- MAIN COMPONENT ---

export const AgentCapabilityBrowser = ({
  capabilities,
  onToggle,
  onSearch,
  searchQuery,
}: AgentCapabilityBrowserProps) => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories = useMemo(() => 
    ['all', ...Array.from(new Set(capabilities.map(c => c.category)))]
  , [capabilities]);

  const filteredAndSortedCapabilities = useMemo(() => {
    let filtered = capabilities;

    if (activeCategory !== 'all') {
      filtered = filtered.filter(c => c.category === activeCategory);
    }

    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(lowercasedQuery) || 
        c.description.toLowerCase().includes(lowercasedQuery)
      );
    }

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortKey === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortKey === 'usage') {
        comparison = b.usageCount - a.usageCount;
      } else if (sortKey === 'category') {
        comparison = a.category.localeCompare(b.category);
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [capabilities, activeCategory, searchQuery, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  return (
    <div className="flex h-full bg-background">
      {/* Category Sidebar */}
      <aside className="hidden w-48 p-4 border-r md:block border-border">
        <h3 className="mb-4 text-lg font-semibold">Categories</h3>
        <Tabs
          orientation="vertical"
          value={activeCategory}
          onValueChange={setActiveCategory as (value: string) => void}
          className="w-full"
        >
          <TabsList className="flex flex-col items-start justify-start h-auto p-0 bg-transparent">
            {categories.map(category => (
              <TabsTrigger key={category} value={category} className="justify-start w-full capitalize data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 overflow-y-auto md:p-6">
        <header className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-grow">
            <Search className="absolute w-5 h-5 left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search capabilities..."
              className="w-full pl-10"
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between gap-2 md:justify-end">
            <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => handleSort('name')}>Name</Button>
                <Button variant="outline" size="sm" onClick={() => handleSort('usage')}>Usage</Button>
                <Button variant="outline" size="sm" onClick={() => handleSort('category')}>Category</Button>
                <Button variant="ghost" size="icon" onClick={() => handleSort(sortKey)}>
                    <ArrowUpDown className="w-4 h-4" />
                </Button>
            </div>
            <div className="p-1 rounded-md bg-muted">
                <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('grid')}><LayoutGrid className="w-5 h-5" /></Button>
                <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')}><List className="w-5 h-5" /></Button>
            </div>
          </div>
        </header>

        <div className={cn(
          "transition-all duration-300",
          viewMode === 'grid' 
            ? 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6'
            : 'flex flex-col gap-4'
        )}>
          {filteredAndSortedCapabilities.map(capability => (
            <CapabilityCard 
              key={capability.id}
              capability={capability}
              onToggle={onToggle}
              isExpanded={expandedId === capability.id}
              onExpand={() => setExpandedId(prevId => prevId === capability.id ? null : capability.id)}
              viewMode={viewMode}
            />
          ))}
        </div>
        {filteredAndSortedCapabilities.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-center rounded-lg bg-card border-border">
                <Wrench className="w-12 h-12 mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold">No Capabilities Found</h3>
                <p className="text-muted-foreground">Try adjusting your search or filters.</p>
            </div>
        )}
      </main>
    </div>
  );
};
