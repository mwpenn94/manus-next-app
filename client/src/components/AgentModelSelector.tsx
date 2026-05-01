import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Gauge, Coins, CheckCircle, Scale, Search, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';

interface Model {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  speed: 'fast' | 'medium' | 'slow';
  cost: 'low' | 'medium' | 'high';
  capabilities: string[];
  isDefault: boolean;
}

interface AgentModelSelectorProps {
  models: Model[];
  selectedModelId: string;
  onSelectModel: (id: string) => void;
  onCompare: (modelIds: string[]) => void;
}

const speedIcons = {
  fast: <Gauge className="h-4 w-4 text-green-500" />,
  medium: <Gauge className="h-4 w-4 text-yellow-500" />,
  slow: <Gauge className="h-4 w-4 text-red-500" />,
};

const costIcons = {
  low: <Coins className="h-4 w-4 text-green-500" />,
  medium: <Coins className="h-4 w-4 text-yellow-500" />,
  high: <Coins className="h-4 w-4 text-red-500" />,
};

export const AgentModelSelector: React.FC<AgentModelSelectorProps> = ({ models, selectedModelId, onSelectModel, onCompare }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCompareMode, setCompareMode] = useState(false);
  const [comparisonSelection, setComparisonSelection] = useState<Set<string>>(new Set());

  const filteredModels = useMemo(() => {
    if (!searchQuery) return models;
    const lowercasedQuery = searchQuery.toLowerCase();
    return models.filter(
      (model) =>
        model.name.toLowerCase().includes(lowercasedQuery) ||
        model.provider.toLowerCase().includes(lowercasedQuery) ||
        model.capabilities.some((cap) => cap.toLowerCase().includes(lowercasedQuery))
    );
  }, [models, searchQuery]);

  const handleToggleCompareMode = () => {
    setCompareMode(!isCompareMode);
    setComparisonSelection(new Set());
  };

  const handleComparisonSelect = (modelId: string) => {
    setComparisonSelection((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(modelId)) {
        newSelection.delete(modelId);
      } else {
        newSelection.add(modelId);
      }
      return newSelection;
    });
  };

  const handleCardClick = (modelId: string) => {
    if (isCompareMode) {
      handleComparisonSelect(modelId);
    } else {
      onSelectModel(modelId);
    }
  };

  const comparisonModels = useMemo(() => {
    return models.filter(model => comparisonSelection.has(model.id));
  }, [models, comparisonSelection]);

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search models by name, provider, or capability..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleToggleCompareMode}>
            {isCompareMode ? 'Cancel Comparison' : 'Compare Models'}
          </Button>
          {isCompareMode && (
            <Dialog>
              <DialogTrigger asChild>
                <Button disabled={comparisonSelection.size < 2}>Compare ({comparisonSelection.size})</Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Model Comparison</DialogTitle>
                </DialogHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-accent">
                      <tr>
                        <th scope="col" className="px-6 py-3">Feature</th>
                        {comparisonModels.map(model => (
                          <th key={model.id} scope="col" className="px-6 py-3 text-center">{model.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border">
                        <th scope="row" className="px-6 py-4 font-medium">Provider</th>
                        {comparisonModels.map(model => <td key={model.id} className="px-6 py-4 text-center">{model.provider}</td>)}
                      </tr>
                      <tr className="border-b border-border">
                        <th scope="row" className="px-6 py-4 font-medium">Context Window</th>
                        {comparisonModels.map(model => <td key={model.id} className="px-6 py-4 text-center">{model.contextWindow.toLocaleString()}</td>)}
                      </tr>
                      <tr className="border-b border-border">
                        <th scope="row" className="px-6 py-4 font-medium">Speed</th>
                        {comparisonModels.map(model => <td key={model.id} className="px-6 py-4 flex justify-center">{speedIcons[model.speed]}</td>)}
                      </tr>
                      <tr className="border-b border-border">
                        <th scope="row" className="px-6 py-4 font-medium">Cost</th>
                        {comparisonModels.map(model => <td key={model.id} className="px-6 py-4 flex justify-center">{costIcons[model.cost]}</td>)}
                      </tr>
                      <tr className="border-b border-border">
                        <th scope="row" className="px-6 py-4 font-medium">Capabilities</th>
                        {comparisonModels.map(model => (
                          <td key={model.id} className="px-6 py-4">
                            <div className="flex flex-wrap gap-1 justify-center">
                              {model.capabilities.map(cap => <Badge key={cap} variant="secondary">{cap}</Badge>)}
                            </div>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                     <Button variant="outline">Close</Button>
                  </DialogClose>
                  <Button onClick={() => onCompare(Array.from(comparisonSelection))}>Use Comparison</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <AnimatePresence>
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filteredModels.map((model) => {
            const isSelected = isCompareMode ? comparisonSelection.has(model.id) : selectedModelId === model.id;
            return (
              <motion.div layout key={model.id} animate={{ scale: 1, opacity: 1 }} initial={{ scale: 0.8, opacity: 0 }}>
                <Card
                  onClick={() => handleCardClick(model.id)}
                  className={cn(
                    'cursor-pointer transition-all duration-200 hover:shadow-lg',
                    isSelected && 'ring-2 ring-primary shadow-lg',
                    isCompareMode && comparisonSelection.has(model.id) && 'ring-2 ring-blue-500'
                  )}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{model.name}</span>
                      {model.isDefault && <Badge variant="outline">Default</Badge>}
                    </CardTitle>
                    <Badge variant="secondary" className="w-fit">{model.provider}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Cpu className="h-4 w-4" />
                        <span>Context</span>
                      </div>
                      <span>{model.contextWindow.toLocaleString()} tokens</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        {speedIcons[model.speed]}
                        <span>Speed</span>
                      </div>
                      <span className="capitalize">{model.speed}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        {costIcons[model.cost]}
                        <span>Cost</span>
                      </div>
                      <span className="capitalize">{model.cost}</span>
                    </div>
                    <div className="pt-2">
                      <h4 className="text-sm font-medium mb-2">Capabilities</h4>
                      <div className="flex flex-wrap gap-2">
                        {model.capabilities.map((cap) => (
                          <Badge key={cap} variant="outline">{cap}</Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
