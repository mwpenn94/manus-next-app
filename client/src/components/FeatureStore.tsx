import React, { useState, useMemo } from 'react';
import { Search, GitBranch, History, BarChart2, PlusCircle, ChevronsUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// Data Structures
type FeatureType = 'Categorical' | 'Numerical' | 'Boolean' | 'Text' | 'Timestamp';

interface Feature {
  id: string;
  name: string;
  type: FeatureType;
  description: string;
  freshness: 'fresh' | 'stale' | 'archived';
  version: number;
  versionHistory: { version: number; date: string; author: string; message: string }[];
  lineage: {
    source: string;
    transform: string;
  };
  usage: string[];
  group: string;
}

const MOCK_FEATURES: Feature[] = [
  // Group: User Behavior
  { id: 'f1', name: 'user_session_duration', type: 'Numerical', description: 'Total time spent by user in a session.', freshness: 'fresh', version: 3, versionHistory: [{ version: 3, date: '2026-04-20', author: 'ml_engineer', message: 'Optimized aggregation logic' }, { version: 2, date: '2026-03-15', author: 'data_scientist', message: 'Added new grouping' }, { version: 1, date: '2026-01-10', author: 'data_scientist', message: 'Initial commit' }], lineage: { source: 'raw_logs', transform: 'session_aggregator.py' }, usage: ['recommendation_model_v2', 'churn_predictor'], group: 'User Behavior' },
  { id: 'f2', name: 'user_purchase_count', type: 'Numerical', description: 'Number of purchases in the last 30 days.', freshness: 'fresh', version: 5, versionHistory: [{ version: 5, date: '2026-05-01', author: 'ml_engineer', message: 'Backfilled historical data' }], lineage: { source: 'transactions_db', transform: 'purchase_counter.sql' }, usage: ['recommendation_model_v2', 'fraud_detection_v3'], group: 'User Behavior' },
  { id: 'f3', name: 'user_is_premium', type: 'Boolean', description: 'Whether the user has a premium subscription.', freshness: 'stale', version: 1, versionHistory: [{ version: 1, date: '2025-11-11', author: 'data_analyst', message: 'Created premium flag' }], lineage: { source: 'user_accounts', transform: 'lookup' }, usage: ['churn_predictor', 'ad_targeting'], group: 'User Behavior' },
  { id: 'f4', name: 'user_last_seen', type: 'Timestamp', description: 'Timestamp of the user\'s last activity.', freshness: 'fresh', version: 2, versionHistory: [{ version: 2, date: '2026-04-28', author: 'data_engineer', message: 'Switched to new log format' }], lineage: { source: 'raw_logs', transform: 'activity_tracker' }, usage: ['churn_predictor'], group: 'User Behavior' },

  // Group: Product Interaction
  { id: 'f5', name: 'product_view_category', type: 'Categorical', description: 'Most frequently viewed product category.', freshness: 'fresh', version: 4, versionHistory: [{ version: 4, date: '2026-04-18', author: 'ml_engineer', message: 'Improved category mapping' }], lineage: { source: 'product_views', transform: 'category_extractor' }, usage: ['recommendation_model_v2'], group: 'Product Interaction' },
  { id: 'f6', name: 'product_rating_avg', type: 'Numerical', description: 'Average rating given by the user.', freshness: 'stale', version: 2, versionHistory: [{ version: 2, date: '2026-02-22', author: 'data_scientist', message: 'Corrected for rating bias' }], lineage: { source: 'user_ratings', transform: 'avg_aggregator' }, usage: ['recommendation_model_v2'], group: 'Product Interaction' },
  { id: 'f7', name: 'product_search_terms', type: 'Text', description: 'Recent search terms used by the user.', freshness: 'fresh', version: 1, versionHistory: [{ version: 1, date: '2026-03-01', author: 'data_analyst', message: 'Initial implementation' }], lineage: { source: 'search_logs', transform: 'term_extractor' }, usage: ['ad_targeting'], group: 'Product Interaction' },
  { id: 'f8', name: 'product_added_to_cart', type: 'Boolean', description: 'If a user added a product to cart in the last 7 days.', freshness: 'archived', version: 1, versionHistory: [{ version: 1, date: '2025-12-10', author: 'data_engineer', message: 'Created cart event flag' }], lineage: { source: 'cart_events', transform: 'flag_generator' }, usage: ['fraud_detection_v3'], group: 'Product Interaction' },

  // Group: Transactional
  { id: 'f9', name: 'transaction_amount_usd', type: 'Numerical', description: 'Value of the transaction in USD.', freshness: 'fresh', version: 7, versionHistory: [{ version: 7, date: '2026-04-25', author: 'ml_engineer', message: 'Added support for more currencies' }], lineage: { source: 'payments_api', transform: 'currency_converter' }, usage: ['fraud_detection_v3'], group: 'Transactional' },
  { id: 'f10', name: 'transaction_failed', type: 'Boolean', description: 'Whether the transaction was successful.', freshness: 'fresh', version: 2, versionHistory: [{ version: 2, date: '2026-04-15', author: 'data_engineer', message: 'Refined failure codes' }], lineage: { source: 'payments_api', transform: 'status_checker' }, usage: ['fraud_detection_v3'], group: 'Transactional' },
  { id: 'f11', name: 'payment_method', type: 'Categorical', description: 'Payment method used for the transaction.', freshness: 'stale', version: 1, versionHistory: [{ version: 1, date: '2025-10-20', author: 'data_analyst', message: 'Added payment method feature' }], lineage: { source: 'user_profiles', transform: 'lookup' }, usage: ['fraud_detection_v3'], group: 'Transactional' },
  { id: 'f12', name: 'time_since_last_transaction', type: 'Numerical', description: 'Time in hours since the last transaction.', freshness: 'fresh', version: 3, versionHistory: [{ version: 3, date: '2026-04-29', author: 'data_scientist', message: 'Improved time calculation accuracy' }], lineage: { source: 'transactions_db', transform: 'time_diff_calculator' }, usage: ['churn_predictor'], group: 'Transactional' },
];

const FeatureLineage: React.FC<{ lineage: Feature["lineage"], featureName: string }> = ({ lineage, featureName }) => {
  return (
    <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground p-4 bg-muted rounded-lg">
      <div className="text-center">
        <p className="font-mono text-xs">Source</p>
        <p className="font-semibold">{lineage.source}</p>
      </div>
      <p className="text-2xl font-thin">→</p>
      <div className="text-center">
        <p className="font-mono text-xs">Transform</p>
        <p className="font-semibold">{lineage.transform}</p>
      </div>
      <p className="text-2xl font-thin">→</p>
      <div className="text-center bg-primary/10 p-2 rounded-md">
        <p className="font-mono text-xs">Feature</p>
        <p className="font-semibold text-primary">{featureName}</p>
      </div>
    </div>
  );
};

const FeatureCard: React.FC<{ feature: Feature, onSelect: (feature: Feature) => void }> = ({ feature, onSelect }) => {
  const freshnessColor = {
    fresh: "bg-green-500",
    stale: "bg-yellow-500",
    archived: "bg-gray-500",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className="cursor-pointer"
      onClick={() => onSelect(feature)}
    >
      <Card className="hover:border-primary transition-colors duration-200 bg-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="truncate w-4/5">{feature.name}</span>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">{feature.type}</Badge>
              <div className={cn("w-3 h-3 rounded-full", freshnessColor[feature.freshness])} />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground h-10 overflow-hidden">{feature.description}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const CreateFeatureForm: React.FC<{ onCreate: (feature: Omit<Feature, "id" | "version" | "usage">) => void, groups: string[], onFinish: () => void }> = ({ onCreate, groups, onFinish }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<FeatureType>("Numerical");
  const [group, setGroup] = useState(groups[0]);
  const [source, setSource] = useState("");
  const [transform, setTransform] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      name,
      description,
      type,
      group,
      freshness: "fresh",
      lineage: { source, transform },
      versionHistory: [{ version: 1, date: new Date().toISOString().split('T')[0], author: 'current_user', message: 'Initial feature creation' }]
    });
    onFinish();
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <label htmlFor="name" className="text-right">Name</label>
        <Input id="name" value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} className="col-span-3" />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <label htmlFor="description" className="text-right">Description</label>
        <Textarea id="description" value={description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)} className="col-span-3" />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <label htmlFor="type" className="text-right">Type</label>
        <Select onValueChange={(value: FeatureType) => setType(value)} defaultValue={type}>
          <SelectTrigger className="col-span-3">
            <SelectValue placeholder="Select a feature type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Numerical">Numerical</SelectItem>
            <SelectItem value="Categorical">Categorical</SelectItem>
            <SelectItem value="Boolean">Boolean</SelectItem>
            <SelectItem value="Text">Text</SelectItem>
            <SelectItem value="Timestamp">Timestamp</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <label htmlFor="group" className="text-right">Group</label>
        <Select onValueChange={(value: string) => setGroup(value)} defaultValue={group}>
          <SelectTrigger className="col-span-3">
            <SelectValue placeholder="Select a group" />
          </SelectTrigger>
          <SelectContent>
            {groups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <label htmlFor="source" className="text-right">Source</label>
        <Input id="source" value={source} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSource(e.target.value)} className="col-span-3" />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <label htmlFor="transform" className="text-right">Transform</label>
        <Input id="transform" value={transform} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTransform(e.target.value)} className="col-span-3" />
      </div>
      <Button type="submit">Create</Button>
    </form>
  );
};

export default function FeatureStore() {
  const [features, setFeatures] = useState<Feature[]>(MOCK_FEATURES);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);

  const featureGroups = useMemo(() => {
    return Array.from(new Set(MOCK_FEATURES.map(f => f.group)));
  }, []);

  const filteredFeatures = useMemo(() => {
    return features.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [features, searchTerm]);

  const handleCreateFeature = (newFeature: Omit<Feature, "id" | "version" | "usage">) => {
    const createdFeature: Feature = {
      ...newFeature,
      id: `f${features.length + 1}`,
      version: 1,
      usage: [],
    };
    setFeatures(prev => [...prev, createdFeature]);
  };

  return (
    <div className="bg-background text-foreground p-6 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Feature Store</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2 h-4 w-4" /> Create Feature</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>Create New Feature</DialogTitle>
            </DialogHeader>
            <CreateFeatureForm onCreate={(newFeature) => { handleCreateFeature(newFeature); setCreateDialogOpen(false); }} groups={featureGroups} onFinish={() => setCreateDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search features..."
            className="pl-10 w-full"
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue={featureGroups[0]} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          {featureGroups.map(group => (
            <TabsTrigger key={group} value={group}>{group}</TabsTrigger>
          ))}
        </TabsList>
        {featureGroups.map(group => (
          <TabsContent key={group} value={group}>
            <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
              <AnimatePresence>
                {filteredFeatures.filter(f => f.group === group).map(feature => (
                  <FeatureCard key={feature.id} feature={feature} onSelect={setSelectedFeature} />
                ))}
              </AnimatePresence>
            </motion.div>
          </TabsContent>
        ))}
      </Tabs>

      <AnimatePresence>
        {selectedFeature && (
          <Dialog open={!!selectedFeature} onOpenChange={(open) => !open && setSelectedFeature(null)}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedFeature.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                <p className="text-muted-foreground">{selectedFeature.description}</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><Badge variant="secondary">{selectedFeature.type}</Badge></div>
                  <div><span className={cn("inline-block w-3 h-3 rounded-full mr-2", {
                    "bg-green-500": selectedFeature.freshness === "fresh",
                    "bg-yellow-500": selectedFeature.freshness === "stale",
                    "bg-gray-500": selectedFeature.freshness === "archived",
                  })} />{selectedFeature.freshness}</div>
                  <div><History className="inline-block mr-2 h-4 w-4" /> Version {selectedFeature.version}</div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Feature Lineage</h3>
                  <FeatureLineage lineage={selectedFeature.lineage} featureName={selectedFeature.name} />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Usage</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedFeature.usage.length > 0 ? (
                      selectedFeature.usage.map(model => (
                        <Badge key={model} variant="outline"><BarChart2 className="mr-2 h-3 w-3" />{model}</Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Not used by any models yet.</p>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Version History</h3>
                  <div className="space-y-4 max-h-48 overflow-y-auto pr-2">
                    {selectedFeature.versionHistory.map(vh => (
                      <div key={vh.version} className="flex items-start space-x-3 text-sm">
                        <GitBranch className="h-4 w-4 mt-1 text-muted-foreground" />
                        <div>
                          <p className="font-semibold">Version {vh.version} <span className="font-normal text-muted-foreground">by {vh.author} on {vh.date}</span></p>
                          <p className="text-muted-foreground">{vh.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
