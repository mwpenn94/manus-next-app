import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Database, FileText, Workflow, Shield, Users, Globe, Lock, Building, Filter, FileDown, Sparkles } from 'lucide-react';

// Type Definitions
type ClassificationLevel = 'Public' | 'Internal' | 'Confidential' | 'Restricted';
type DataAssetType = 'database' | 'file' | 'API';

interface DataAsset {
  id: string;
  name: string;
  type: DataAssetType;
  classification: ClassificationLevel;
  suggestion?: {
    level: ClassificationLevel;
    confidence: number;
  };
}

// Mock Data
const mockDataAssets: DataAsset[] = [
  { id: 'db-001', name: 'Customer Profiles', type: 'database', classification: 'Confidential' },
  { id: 'file-002', name: 'Q2 Marketing Report', type: 'file', classification: 'Internal', suggestion: { level: 'Confidential', confidence: 0.85 } },
  { id: 'api-003', name: 'Public Product Catalog API', type: 'API', classification: 'Public' },
  { id: 'db-004', name: 'Employee PII', type: 'database', classification: 'Restricted' },
  { id: 'file-005', name: 'Archived Invoices 2023', type: 'file', classification: 'Confidential' },
  { id: 'db-006', name: 'Analytics Warehouse', type: 'database', classification: 'Internal' },
  { id: 'file-007', name: 'Onboarding_Documentation.pdf', type: 'file', classification: 'Internal' },
  { id: 'api-008', name: 'Partner Integration Endpoint', type: 'API', classification: 'Confidential', suggestion: { level: 'Restricted', confidence: 0.92 } },
  { id: 'db-009', name: 'Logging Database', type: 'database', classification: 'Internal' },
  { id: 'file-010', name: 'Press Release Draft', type: 'file', classification: 'Public' },
  { id: 'api-011', name: 'Internal Metrics Service', type: 'API', classification: 'Internal' },
  { id: 'db-012', name: 'GDPR Deletion Records', type: 'database', classification: 'Restricted' },
];

const classificationConfig: Record<ClassificationLevel, { color: string; icon: React.ComponentType<any> }> = {
  Public: { color: 'bg-green-500', icon: Globe },
  Internal: { color: 'bg-blue-500', icon: Building },
  Confidential: { color: 'bg-yellow-500', icon: Users },
  Restricted: { color: 'bg-red-500', icon: Lock },
};

const assetTypeConfig: Record<DataAssetType, React.ComponentType<any>> = {
  database: Database,
  file: FileText,
  API: Workflow,
};

const AssetTypeIcon = ({ type }: { type: DataAssetType }) => {
  const Icon = assetTypeConfig[type];
  return <Icon className="h-5 w-5 text-muted-foreground" />;
};

export default function DataClassificationGrid() {
  const [assets, setAssets] = useState<DataAsset[]>(mockDataAssets);
  const [filterLevel, setFilterLevel] = useState<ClassificationLevel | 'all'>('all');
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());

  const filteredAssets = useMemo(() => {
    if (filterLevel === 'all') return assets;
    return assets.filter(asset => asset.classification === filterLevel);
  }, [assets, filterLevel]);

  const handleClassificationChange = useCallback((id: string, newLevel: ClassificationLevel) => {
    setAssets(prevAssets => prevAssets.map(asset => asset.id === id ? { ...asset, classification: newLevel } : asset));
  }, []);

  const handleBulkReclassify = useCallback((newLevel: ClassificationLevel) => {
    setAssets(prevAssets => prevAssets.map(asset => selectedAssets.has(asset.id) ? { ...asset, classification: newLevel } : asset));
    setSelectedAssets(new Set());
  }, [selectedAssets]);

  const handleSelect = useCallback((id: string) => {
    setSelectedAssets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleExport = () => {
    const data = JSON.stringify(assets, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data_inventory.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleApplySuggestion = useCallback((id: string) => {
    const asset = assets.find(a => a.id === id);
    if (asset && asset.suggestion) {
      setAssets(prevAssets => prevAssets.map(a => a.id === id ? { ...a, classification: asset.suggestion!.level, suggestion: undefined } : a));
    }
  }, [assets]);

  const handleDismissSuggestion = useCallback((id: string) => {
    setAssets(prevAssets => prevAssets.map(a => a.id === id ? { ...a, suggestion: undefined } : a));
  }, []);

  return (
    <TooltipProvider>
      <div className="bg-background text-foreground p-6 font-sans">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold">Data Classification Grid</h1>
            <p className="text-muted-foreground">Manage data sensitivity labels across your assets.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select onValueChange={(value: ClassificationLevel | 'all') => setFilterLevel(value)} defaultValue="all">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {Object.keys(classificationConfig).map(level => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={selectedAssets.size === 0}>
                  Bulk Reclassify ({selectedAssets.size})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {Object.keys(classificationConfig).map(level => (
                  <DropdownMenuItem key={level} onSelect={() => handleBulkReclassify(level as ClassificationLevel)}>
                    Reclassify as {level}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" onClick={handleExport}>
              <FileDown className="mr-2 h-4 w-4" />
              Export Inventory
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {filteredAssets.map(asset => (
              <motion.div key={asset.id} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.3 }}>
                <Card className="h-full flex flex-col bg-card border-border hover:shadow-lg hover:shadow-primary/10 transition-shadow duration-300">
                  <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <div className="flex items-center gap-3">
                      <AssetTypeIcon type={asset.type} />
                      <CardTitle className="text-base font-medium leading-tight">{asset.name}</CardTitle>
                    </div>
                    <Checkbox checked={selectedAssets.has(asset.id)} onCheckedChange={() => handleSelect(asset.id)} />
                  </CardHeader>
                  <CardContent className="flex-grow flex flex-col justify-between gap-4 pt-2">
                    <div className="flex items-center justify-between">
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge className={cn("border-none", classificationConfig[asset.classification].color)}>
                            {React.createElement(classificationConfig[asset.classification].icon, { className: 'h-3 w-3 mr-1.5' })}
                            {asset.classification}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Current classification level</p>
                        </TooltipContent>
                      </Tooltip>
                      <Select value={asset.classification} onValueChange={(value: ClassificationLevel) => handleClassificationChange(asset.id, value)}>
                        <SelectTrigger className="w-[160px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(classificationConfig).map(level => (
                            <SelectItem key={level} value={level} className="text-xs">Change to {level}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {asset.suggestion && (
                      <div className="bg-muted/50 p-3 rounded-lg border border-dashed border-primary/30">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <h4 className="text-sm font-semibold">Auto-classification Suggestion</h4>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">
                            Suggests: <span className="font-semibold text-foreground">{asset.suggestion.level}</span> ({(asset.suggestion.confidence * 100).toFixed(0)}% conf.)
                          </p>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => handleApplySuggestion(asset.id)}>Apply</Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => handleDismissSuggestion(asset.id)}>Dismiss</Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        {filteredAssets.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
                <p>No data assets match the current filter.</p>
            </div>
        )}
      </div>
    </TooltipProvider>
  );
}
