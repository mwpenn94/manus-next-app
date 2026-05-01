import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Layers, Database, Globe, Tag, Clock, Trash2, RefreshCw, BarChart2 } from 'lucide-react';

// --- TYPES ---
type CacheEntry = {
  id: string;
  key: string;
  value: string;
  ttl: number;
  tags: string[];
};

type CacheLayerData = {
  name: string;
  level: 'L1' | 'L2' | 'L3';
  icon: React.ElementType;
  entries: CacheEntry[];
  hits: number;
  misses: number;
  size: number; // in KB
};

// --- MOCK DATA ---
const initialCacheData: CacheLayerData[] = [
  {
    name: 'In-Memory Cache',
    level: 'L1',
    icon: Layers,
    hits: 1250,
    misses: 80,
    size: 512,
    entries: [
      { id: 'l1-1', key: 'user:session:123', value: '...', ttl: 60, tags: ['user', 'session'] },
      { id: 'l1-2', key: 'product:details:abc', value: '...', ttl: 120, tags: ['product'] },
    ],
  },
  {
    name: 'Database Cache',
    level: 'L2',
    icon: Database,
    hits: 8500,
    misses: 450,
    size: 20480, // 20MB
    entries: [
      { id: 'l2-1', key: 'user:profile:456', value: '...', ttl: 3600, tags: ['user', 'profile'] },
      { id: 'l2-2', key: 'api:catalog:v2', value: '...', ttl: 1800, tags: ['api', 'catalog'] },
      { id: 'l2-3', key: 'config:global', value: '...', ttl: 86400, tags: ['config'] },
    ],
  },
  {
    name: 'CDN Cache',
    level: 'L3',
    icon: Globe,
    hits: 150000,
    misses: 2500,
    size: 102400, // 100MB
    entries: [
      { id: 'l3-1', key: '/assets/main.js', value: '...', ttl: 604800, tags: ['assets', 'js'] },
      { id: 'l3-2', key: '/images/logo.png', value: '...', ttl: 2592000, tags: ['assets', 'images'] },
    ],
  },
];

// --- HELPER COMPONENTS ---
const AnimatedCounter = ({ value }: { value: number }) => {
  // This is a simplified version. For a real animated counter, you'd use a library or a more complex hook.
  return <span className="font-bold">{value.toLocaleString()}</span>;
};

const CacheEntryCard = ({ entry, onInvalidate }: { entry: CacheEntry; onInvalidate: (id: string) => void }) => {
  const [remainingTtl, setRemainingTtl] = useState(entry.ttl);

  useEffect(() => {
    if (remainingTtl <= 0) return;
    const timer = setInterval(() => {
      setRemainingTtl(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [remainingTtl]);

  const formatTtl = (seconds: number) => {
    if (seconds <= 0) return 'Expired';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return [d > 0 && `${d}d`, h > 0 && `${h}h`, m > 0 && `${m}m`, s > 0 && `${s}s`].filter(Boolean).join(' ');
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="bg-card/50 p-3 rounded-lg border border-border/50 mb-2"
    >
      <div className="flex justify-between items-start">
        <div className="flex-grow">
          <p className="text-sm font-mono break-all">{entry.key}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>TTL: {formatTtl(remainingTtl)}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1 mt-2">
            <Tag className="w-3 h-3 text-muted-foreground" />
            {entry.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
            ))}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => onInvalidate(entry.id)} aria-label={`Invalidate ${entry.key}`}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
};

// --- MAIN COMPONENT ---
const CacheInvalidationUI: React.FC = () => {
  const [cacheData, setCacheData] = useState<CacheLayerData[]>(initialCacheData);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    cacheData.forEach(layer => layer.entries.forEach(entry => entry.tags.forEach(tag => tags.add(tag))));
    return Array.from(tags).sort();
  }, [cacheData]);

  const handleTagClick = (tag: string) => {
    setSelectedTags(prev => {
      const newTags = new Set(prev);
      if (newTags.has(tag)) {
        newTags.delete(tag);
      } else {
        newTags.add(tag);
      }
      return newTags;
    });
  };

  const handleInvalidateEntry = (layerIndex: number, entryId: string) => {
    setCacheData(prevData => {
      const newData = [...prevData];
      newData[layerIndex] = {
        ...newData[layerIndex],
        entries: newData[layerIndex].entries.filter(e => e.id !== entryId),
      };
      return newData;
    });
  };

  const handleInvalidateByTags = () => {
    if (selectedTags.size === 0) return;
    setCacheData(prevData =>
      prevData.map(layer => ({
        ...layer,
        entries: layer.entries.filter(entry => !entry.tags.some(tag => selectedTags.has(tag))),
      }))
    );
    setSelectedTags(new Set());
  };

  const handleBulkInvalidate = () => {
    setCacheData(prevData => prevData.map(layer => ({ ...layer, entries: [] })));
  };

  const handleWarmUp = () => {
    // Simulate warming up the cache by resetting to initial state
    setCacheData(initialCacheData);
  };

  const totalSize = useMemo(() => cacheData.reduce((acc, layer) => acc + layer.size, 0), [cacheData]);

  return (
    <div className="bg-background text-foreground p-4 md:p-6 lg:p-8 font-sans">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Cache Management</h1>
          <p className="text-muted-foreground">Interface for cache monitoring and invalidation.</p>
        </div>
        <div className="flex items-center gap-2 mt-4 md:mt-0">
          <Button onClick={handleBulkInvalidate} className="bg-red-500/10 text-red-500 hover:bg-red-500/20">
            <Trash2 className="w-4 h-4 mr-2" />
            Bulk Invalidate All
          </Button>
          <Button onClick={handleWarmUp} className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
            <RefreshCw className="w-4 h-4 mr-2" />
            Warm-up Cache
          </Button>
        </div>
      </header>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center"><BarChart2 className="w-5 h-5 mr-2" />Cache Size Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-muted rounded-full h-4 flex overflow-hidden">
            {cacheData.map((layer, i) => (
              <motion.div
                key={layer.level}
                className={cn('h-4', {
                  'bg-blue-500': layer.level === 'L1',
                  'bg-purple-500': layer.level === 'L2',
                  'bg-teal-500': layer.level === 'L3',
                })}
                style={{ width: `${(layer.size / totalSize) * 100}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${(layer.size / totalSize) * 100}%` }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs mt-2 text-muted-foreground">
            {cacheData.map(layer => (
              <div key={layer.level} className="flex items-center gap-2">
                <span className={cn('w-2 h-2 rounded-full', {
                  'bg-blue-500': layer.level === 'L1',
                  'bg-purple-500': layer.level === 'L2',
                  'bg-teal-500': layer.level === 'L3',
                })}></span>
                <span>{layer.level}: {(layer.size / 1024).toFixed(2)} MB</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center"><Tag className="w-5 h-5 mr-2" />Tag-based Invalidation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {allTags.map(tag => (
              <Badge
                key={tag}
                onClick={() => handleTagClick(tag)}
                className={cn(
                  'cursor-pointer transition-all',
                  selectedTags.has(tag) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                )}
                aria-pressed={selectedTags.has(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
          <Button onClick={handleInvalidateByTags} disabled={selectedTags.size === 0}>
            Invalidate Selected Tags ({selectedTags.size})
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {cacheData.map((layer, layerIndex) => {
          const totalRequests = layer.hits + layer.misses;
          const hitRatio = totalRequests > 0 ? (layer.hits / totalRequests) * 100 : 0;

          return (
            <Card key={layer.level} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/50">
                <CardTitle className="text-lg font-medium flex items-center">
                  <layer.icon className="w-6 h-6 mr-3" />
                  {layer.name} ({layer.level})
                </CardTitle>
                <div className="text-sm text-muted-foreground">
                  Hit Ratio: <span className="font-bold text-foreground">{hitRatio.toFixed(2)}%</span>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-center">
                  <div className="bg-card p-2 rounded-lg">
                    <p className="text-sm text-muted-foreground">Hits</p>
                    <AnimatedCounter value={layer.hits} />
                  </div>
                  <div className="bg-card p-2 rounded-lg">
                    <p className="text-sm text-muted-foreground">Misses</p>
                    <AnimatedCounter value={layer.misses} />
                  </div>
                  <div className="bg-card p-2 rounded-lg">
                    <p className="text-sm text-muted-foreground">Entries</p>
                    <span className="font-bold">{layer.entries.length}</span>
                  </div>
                </div>
                <div>
                  <AnimatePresence>
                    {layer.entries.map(entry => (
                      <CacheEntryCard
                        key={entry.id}
                        entry={entry}
                        onInvalidate={() => handleInvalidateEntry(layerIndex, entry.id)}
                      />
                    ))}
                  </AnimatePresence>
                  {layer.entries.length === 0 && (
                     <div className="text-center py-8 text-muted-foreground">
                       <p>Cache layer is empty.</p>
                     </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CacheInvalidationUI;
