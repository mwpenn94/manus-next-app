import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Search, Puzzle, Users, ArrowDownUp } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string; // For simplicity, we'll use a placeholder
  isInstalled: boolean;
  isPopular: boolean;
  rating: number;
  installCount: number;
}

interface IntegrationMarketplaceProps {
  integrations: Integration[];
  onInstall: (id: string) => void;
  onUninstall: (id: string) => void;
  onConfigure: (id: string) => void;
  categories: string[];
  searchQuery: string;
  onSearch: (query: string) => void;
}

const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeInOut" as const } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: "easeInOut" as const } },
  hover: { scale: 1.03, boxShadow: "0px 10px 20px rgba(0,0,0,0.1)" },
};

const IntegrationCard = ({ integration, onInstall, onUninstall, onConfigure }: {
  integration: Integration;
  onInstall: (id: string) => void;
  onUninstall: (id: string) => void;
  onConfigure: (id: string) => void;
}) => {
  return (
    <motion.div layout variants={cardVariants} initial="initial" animate="animate" exit="exit" whileHover="hover">
      <Card className="flex flex-col h-full bg-card overflow-hidden">
        <CardHeader className="flex flex-row items-start gap-4 p-4">
          <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
            <Puzzle className="w-6 h-6 text-accent-foreground" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">{integration.name}</CardTitle>
            <Badge variant="secondary" className="mt-1">{integration.category}</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 px-4 pb-2">
          <CardDescription className="line-clamp-3">{integration.description}</CardDescription>
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-4 p-4">
            <div className="flex items-center justify-between w-full text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span>{integration.rating.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{`${(integration.installCount / 1000).toFixed(1)}k`}</span>
                </div>
            </div>
            <div className="flex w-full gap-2">
                {integration.isInstalled ? (
                    <>
                        <Button variant="outline" className="w-full" onClick={() => onUninstall(integration.id)}>Uninstall</Button>
                        <Button className="w-full" onClick={() => onConfigure(integration.id)}>Configure</Button>
                    </>
                ) : (
                    <Button className="w-full" onClick={() => onInstall(integration.id)}>Install</Button>
                )}
            </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export const IntegrationMarketplace = ({
  integrations,
  onInstall,
  onUninstall,
  onConfigure,
  categories,
  searchQuery,
  onSearch,
}: IntegrationMarketplaceProps) => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState('popular');

  const popularIntegrations = useMemo(() => integrations.filter(int => int.isPopular), [integrations]);

  const filteredIntegrations = useMemo(() => {
    return integrations
      .filter(int => {
        const matchesCategory = activeCategory === 'All' || int.category === activeCategory;
        const matchesSearch = 
            searchQuery.trim() === '' ||
            int.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            int.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      });
  }, [integrations, activeCategory, searchQuery]);

  const sortedIntegrations = useMemo(() => {
    return [...filteredIntegrations].sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'newest':
          // Assuming newer integrations have higher IDs or a timestamp not provided in props
          // For now, we'll simulate with ID
          return parseInt(b.id) - parseInt(a.id);
        case 'popular':
        default:
          return b.installCount - a.installCount;
      }
    });
  }, [filteredIntegrations, sortBy]);

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-background text-foreground">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Integration Marketplace</h1>
        <p className="text-muted-foreground mt-2">Browse and connect third-party services to extend your capabilities.</p>
      </header>

      {popularIntegrations.length > 0 && (
        <section className="mb-12">
            <h2 className="text-2xl font-semibold tracking-tight mb-4">Popular Integrations</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence>
                    {popularIntegrations.map(integration => (
                        <IntegrationCard 
                            key={integration.id} 
                            integration={integration} 
                            onInstall={onInstall}
                            onUninstall={onUninstall}
                            onConfigure={onConfigure}
                        />
                    ))}
                </AnimatePresence>
            </div>
        </section>
      )}

      <section>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="relative flex-1 md:grow-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input 
                    placeholder="Search integrations..." 
                    className="pl-10 w-full md:w-80"
                    value={searchQuery}
                    onChange={(e) => onSearch(e.target.value)}
                />
            </div>
            <div className="flex items-center gap-4 overflow-x-auto pb-2">
                <Tabs value={activeCategory} onValueChange={setActiveCategory as (value: string) => void}>
                    <TabsList>
                        <TabsTrigger value="All">All</TabsTrigger>
                        {categories.map(cat => <TabsTrigger key={cat} value={cat}>{cat}</TabsTrigger>)}
                    </TabsList>
                </Tabs>
                <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
                    <ArrowDownUp className="w-4 h-4" />
                    <span>Sort by:</span>
                </div>
                <Tabs value={sortBy} onValueChange={setSortBy as (value: string) => void}>
                    <TabsList>
                        <TabsTrigger value="popular">Popular</TabsTrigger>
                        <TabsTrigger value="newest">Newest</TabsTrigger>
                        <TabsTrigger value="rating">Rating</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
                {sortedIntegrations.map(integration => (
                    <IntegrationCard 
                        key={integration.id} 
                        integration={integration} 
                        onInstall={onInstall}
                        onUninstall={onUninstall}
                        onConfigure={onConfigure}
                    />
                ))}
            </AnimatePresence>
        </div>
        {sortedIntegrations.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 text-muted-foreground">
                <p className="text-lg">No integrations found.</p>
                <p>Try adjusting your search or filter criteria.</p>
            </motion.div>
        )}
      </section>
    </div>
  );
};
