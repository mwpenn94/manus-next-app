import { useState, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Globe, Code, FileText, MessageSquare, Database, Wrench, Component } from 'lucide-react';

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// --- TYPES ---
interface Capability {
  id: string;
  name: string;
  category: string;
  description: string;
  enabled: boolean;
  usageCount: number;
  lastUsed?: number; // Unix timestamp
}

interface AgentCapabilityMatrixProps {
  capabilities: Capability[];
  onToggleCapability?: (id: string, enabled: boolean) => void;
  readOnly?: boolean;
}

// --- HELPERS ---
const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const seconds = Math.floor((now - timestamp) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const categoryIcons: Record<string, React.ElementType> = {
  Browser: Globe,
  Code: Code,
  Files: FileText,
  Communication: MessageSquare,
  Data: Database,
  Tools: Wrench,
  Default: Component,
};

const CategoryIcon = ({ category }: { category: string }) => {
  const Icon = categoryIcons[category] || categoryIcons.Default;
  return <Icon className="h-5 w-5 text-muted-foreground" />;
};

// --- SUB-COMPONENTS ---
const CapabilityCard = memo(({
  capability,
  onToggleCapability,
  readOnly,
}: {
  capability: Capability;
  onToggleCapability?: (id: string, enabled: boolean) => void;
  readOnly?: boolean;
}) => {
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  const content = (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] as const }}
      layout
      className={cn(
        "h-full border-2 rounded-lg transition-colors",
        capability.enabled ? "border-primary/50" : "border-border"
      )}
    >
      <Card className="h-full flex flex-col bg-card/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div className="flex items-center gap-3">
            <CategoryIcon category={capability.category} />
            <CardTitle className="text-base font-semibold">{capability.name}</CardTitle>
          </div>
          {!readOnly && (
            <Switch
              checked={capability.enabled}
              onCheckedChange={(checked) => onToggleCapability?.(capability.id, checked)}
              aria-label={`Toggle ${capability.name}`}
            />
          )}
        </CardHeader>
        <CardContent className="flex-grow pt-2">
          <CardDescription className="text-sm text-muted-foreground line-clamp-2 h-[40px]">
            {capability.description}
          </CardDescription>
          {capability.usageCount > 0 && (
            <Badge variant="secondary" className="mt-3">
              Used {capability.usageCount} time{capability.usageCount > 1 ? 's' : ''}
            </Badge>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  if (capability.lastUsed) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent>
            <p>Last used: {formatRelativeTime(capability.lastUsed)}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
});

// --- MAIN COMPONENT ---
export const AgentCapabilityMatrix = ({
  capabilities,
  onToggleCapability,
  readOnly = false,
}: AgentCapabilityMatrixProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAndGroupedCapabilities = useMemo(() => {
    const filtered = capabilities.filter(
      (c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.reduce<Record<string, Capability[]>>((acc, cap) => {
      if (!acc[cap.category]) {
        acc[cap.category] = [];
      }
      acc[cap.category].push(cap);
      return acc;
    }, {});
  }, [capabilities, searchTerm]);

  const handleToggleCategory = (category: string, enable: boolean) => {
    if (readOnly || !onToggleCapability) return;
    const categoryCaps = filteredAndGroupedCapabilities[category] || [];
    categoryCaps.forEach(cap => {
        if(cap.enabled !== enable) {
            onToggleCapability(cap.id, enable)
        }
    });
  };

  const categoryOrder = useMemo(() => 
    Object.keys(filteredAndGroupedCapabilities).sort((a, b) => a.localeCompare(b))
  , [filteredAndGroupedCapabilities]);

  return (
    <div className="w-full space-y-6">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg -mx-4 px-4 py-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter capabilities..."
            className="pl-10 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <AnimatePresence>
        {categoryOrder.map((category) => {
          const caps = filteredAndGroupedCapabilities[category];
          const enabledCount = caps.filter(c => c.enabled).length;

          return (
            <motion.div 
              key={category} 
              layout
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold tracking-tight">{category}</h2>
                    <Badge variant="outline">{enabledCount} / {caps.length}</Badge>
                </div>
                {!readOnly && (
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleToggleCategory(category, true)}>Enable All</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleToggleCategory(category, false)}>Disable All</Button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {caps.map((capability) => (
                  <CapabilityCard
                    key={capability.id}
                    capability={capability}
                    onToggleCapability={onToggleCapability}
                    readOnly={readOnly}
                  />
                ))}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
      {categoryOrder.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
            <p>No capabilities match your search.</p>
        </div>
      )}
    </div>
  );
};