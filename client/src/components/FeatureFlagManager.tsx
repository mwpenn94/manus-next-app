import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, GitMerge, History, Plus, Archive, SlidersHorizontal, Users, Percent, X, Wrench, ArrowRight, Trash2, Power, PowerOff } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- TYPES ---
type Environment = 'dev' | 'staging' | 'prod';

type TargetingRule = {
  type: 'percentage' | 'userIds' | 'attributes';
  value: any;
};

type FeatureFlag = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  dependencies: string[];
  targetingRules: TargetingRule[];
  createdAt: string;
};

type ChangeEvent = {
  id: string;
  flagId: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
};

// --- MOCK DATA ---
const mockFlagsData: Record<Environment, FeatureFlag[]> = {
  dev: [
    { id: 'new-dashboard', name: 'New Dashboard UI', description: 'Activates the redesigned dashboard experience.', enabled: true, dependencies: [], targetingRules: [{ type: 'percentage', value: 100 }], createdAt: '2023-01-15T10:00:00Z' },
    { id: 'ai-assistant', name: 'AI Assistant', description: 'Enables the new AI-powered assistant.', enabled: false, dependencies: ['new-dashboard'], targetingRules: [{ type: 'userIds', value: ['dev-1', 'dev-2'] }], createdAt: '2023-02-20T14:30:00Z' },
  ],
  staging: [
    { id: 'new-dashboard', name: 'New Dashboard UI', description: 'Activates the redesigned dashboard experience.', enabled: true, dependencies: [], targetingRules: [{ type: 'percentage', value: 50 }], createdAt: '2023-01-15T10:00:00Z' },
    { id: 'api-v3', name: 'API v3', description: 'Routes traffic to the new v3 API endpoints.', enabled: true, dependencies: [], targetingRules: [{ type: 'attributes', value: { country: 'US' } }], createdAt: '2023-03-10T09:00:00Z' },
  ],
  prod: [
    { id: 'new-dashboard', name: 'New Dashboard UI', description: 'Activates the redesigned dashboard experience.', enabled: false, dependencies: [], targetingRules: [{ type: 'percentage', value: 5 }], createdAt: '2023-01-15T10:00:00Z' },
    { id: 'api-v3', name: 'API v3', description: 'Routes traffic to the new v3 API endpoints.', enabled: true, dependencies: [], targetingRules: [{ type: 'percentage', value: 100 }], createdAt: '2023-03-10T09:00:00Z' },
    { id: 'real-time-collab', name: 'Real-time Collaboration', description: 'Enables live collaboration features in documents.', enabled: true, dependencies: [], targetingRules: [{ type: 'attributes', value: { plan: 'enterprise' } }], createdAt: '2022-11-05T18:00:00Z' },
  ],
};

const mockHistory: ChangeEvent[] = [
    { id: 'hist-1', flagId: 'new-dashboard', timestamp: '2023-03-20T10:05:00Z', user: 'Alice', action: 'Update Targeting', details: 'Set percentage to 5% in prod' },
    { id: 'hist-2', flagId: 'new-dashboard', timestamp: '2023-03-19T15:00:00Z', user: 'Bob', action: 'Enable Flag', details: 'Enabled in staging' },
    { id: 'hist-3', flagId: 'ai-assistant', timestamp: '2023-03-18T11:00:00Z', user: 'Alice', action: 'Create Flag', details: 'Created in dev' },
    { id: 'hist-4', flagId: 'api-v3', timestamp: '2023-03-10T09:00:00Z', user: 'Charlie', action: 'Create Flag', details: 'Created in prod' },
];

// --- SUB-COMPONENTS ---
const FlagCard = ({ flag, onToggle, onSelect, onBulkSelect, isSelected }: { flag: FeatureFlag; onToggle: (id: string, enabled: boolean) => void; onSelect: (flag: FeatureFlag) => void; onBulkSelect: (id: string, selected: boolean) => void; isSelected: boolean; }) => (
    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
        <Card className={cn('bg-card/50 hover:bg-card/80 transition-all duration-200 relative', isSelected && 'ring-2 ring-primary')}>
            <div className="absolute top-3 left-3">
                <Checkbox checked={isSelected} onCheckedChange={(checked) => onBulkSelect(flag.id, !!checked)} aria-label={`Select ${flag.name}`} />
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2 pl-12">
                <CardTitle className="text-lg font-medium">{flag.name}</CardTitle>
                <Switch checked={flag.enabled} onCheckedChange={(checked) => onToggle(flag.id, checked)} aria-label={`Toggle ${flag.name}`} />
            </CardHeader>
            <CardContent className="pt-2 pl-12">
                <p className="text-sm text-muted-foreground mb-3 h-10">{flag.description}</p>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {flag.dependencies.length > 0 && <Badge variant="secondary"><GitMerge className="h-3 w-3 mr-1" />{flag.dependencies.length} Dep{flag.dependencies.length > 1 ? 's' : ''}</Badge>}
                        <Badge variant="outline"><SlidersHorizontal className="h-3 w-3 mr-1" />{flag.targetingRules.length} Rule{flag.targetingRules.length > 1 ? 's' : ''}</Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => onSelect(flag)}>
                        Details <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    </motion.div>
);

const DetailView = ({ flag, history, allFlags }: { flag: FeatureFlag; history: ChangeEvent[]; allFlags: FeatureFlag[]; }) => {
    const getRuleIcon = (type: TargetingRule['type']) => {
        switch (type) {
            case 'percentage': return <Percent className="h-4 w-4 text-muted-foreground" />;
            case 'userIds': return <Users className="h-4 w-4 text-muted-foreground" />;
            case 'attributes': return <Wrench className="h-4 w-4 text-muted-foreground" />;
        }
    };

    return (
        <DialogContent className="max-w-4xl bg-card border-border">
            <DialogHeader>
                <DialogTitle className="text-2xl font-bold">{flag.name}</DialogTitle>
                <p className="text-sm text-muted-foreground">{flag.description}</p>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 max-h-[70vh] overflow-y-auto pr-2 -mr-2">
                <div className="md:col-span-2 space-y-6">
                    <div>
                        <h3 className="font-semibold text-lg mb-3">Targeting Rules</h3>
                        <div className="space-y-3">
                            {flag.targetingRules.map((rule, i) => (
                                <div key={i} className="flex items-start gap-4 p-3 rounded-md bg-background border">
                                    {getRuleIcon(rule.type)}
                                    <div className="flex-grow">
                                        <p className="font-medium capitalize">{rule.type}</p>
                                        {rule.type === 'percentage' && <p className="text-sm text-muted-foreground">{rule.value}% of users</p>}
                                        {rule.type === 'userIds' && <p className="text-sm text-muted-foreground">Users: {rule.value.join(', ')}</p>}
                                        {rule.type === 'attributes' && <pre className="text-xs text-muted-foreground bg-black/20 p-2 rounded-md mt-1">{JSON.stringify(rule.value, null, 2)}</pre>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg mb-3">Dependencies</h3>
                        {flag.dependencies.length > 0 ? (
                            <div className="space-y-2">
                                {flag.dependencies.map(depId => {
                                    const depFlag = allFlags.find(f => f.id === depId);
                                    return (
                                        <div key={depId} className="flex items-center gap-3 p-3 rounded-md bg-background border">
                                            <GitMerge className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-mono text-sm flex-grow">{depId}</span>
                                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                            <Badge variant={depFlag?.enabled ? 'default' : 'destructive'} className={cn(depFlag?.enabled ? 'bg-green-600/20 text-green-300' : 'bg-red-600/20 text-red-300')}>
                                                {depFlag ? (depFlag.enabled ? 'Active' : 'Inactive') : 'Unknown'}
                                            </Badge>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : <p className="text-sm text-muted-foreground">No dependencies.</p>}
                    </div>
                </div>
                <div className="space-y-4 border-l border-border -ml-3 pl-6">
                    <h3 className="font-semibold text-lg">Change History</h3>
                    <div className="space-y-4 relative">
                        <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />
                        {history.map(event => (
                            <div key={event.id} className="flex items-start gap-4 relative">
                                <div className="h-4 w-4 bg-primary rounded-full flex items-center justify-center ring-4 ring-card">
                                    <History className="h-2.5 w-2.5 text-primary-foreground" />
                                </div>
                                <div className="-mt-1.5">
                                    <p className="font-medium">{event.action} by <span className="text-primary">{event.user}</span></p>
                                    <p className="text-sm text-muted-foreground">{event.details}</p>
                                    <p className="text-xs text-muted-foreground/70 mt-1">{new Date(event.timestamp).toLocaleString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </DialogContent>
    );
};

const CreateFlagDialog = ({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (open: boolean) => void; onCreate: (flag: Omit<FeatureFlag, 'enabled' | 'createdAt' | 'targetingRules' | 'dependencies'>) => void; }) => {
    const [name, setName] = useState('');
    const [id, setId] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = () => {
        if (name && id && description) {
            onCreate({ id, name, description });
            onOpenChange(false);
            setId(''); setName(''); setDescription('');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create New Feature Flag</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Input placeholder="Flag Name (e.g., New Checkout Flow)" value={name} onChange={e => setName(e.target.value)} />
                    <Input placeholder="Unique ID (e.g., new-checkout-flow)" value={id} onChange={e => setId(e.target.value.toLowerCase().replace(/\s+/g, '-'))} />
                    <Textarea placeholder="A brief description of what this flag controls." value={description} onChange={e => setDescription(e.target.value)} />
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={handleSubmit}>Create Flag</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const FeatureFlagManager: React.FC = () => {
    const [flags, setFlags] = useState(mockFlagsData);
    const [activeEnv, setActiveEnv] = useState<Environment>('prod');
    const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null);
    const [selectedForBulk, setSelectedForBulk] = useState<Set<string>>(new Set());
    const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);

    const handleToggle = useCallback((id: string, enabled: boolean) => {
        setFlags(prev => ({ ...prev, [activeEnv]: prev[activeEnv].map(f => f.id === id ? { ...f, enabled } : f) }));
    }, [activeEnv]);

    const handleBulkSelect = useCallback((id: string, selected: boolean) => {
        setSelectedForBulk(prev => {
            const newSet = new Set(prev);
            if (selected) newSet.add(id); else newSet.delete(id);
            return newSet;
        });
    }, []);

    const handleCreateFlag = (newFlagData: Omit<FeatureFlag, 'enabled' | 'createdAt' | 'targetingRules' | 'dependencies'>) => {
        const newFlag: FeatureFlag = {
            ...newFlagData,
            enabled: false,
            dependencies: [],
            targetingRules: [],
            createdAt: new Date().toISOString(),
        };
        setFlags(prev => ({ ...prev, [activeEnv]: [newFlag, ...prev[activeEnv]] }));
    };

    const handleBulkAction = (action: 'enable' | 'disable' | 'archive') => {
        const selectedIds = Array.from(selectedForBulk);
        if (action === 'archive') {
            setFlags(prev => ({ ...prev, [activeEnv]: prev[activeEnv].filter(f => !selectedIds.includes(f.id)) }));
        } else {
            const enabled = action === 'enable';
            setFlags(prev => ({ ...prev, [activeEnv]: prev[activeEnv].map(f => selectedIds.includes(f.id) ? { ...f, enabled } : f) }));
        }
        setSelectedForBulk(new Set());
    };

    const currentFlags = useMemo(() => flags[activeEnv], [flags, activeEnv]);
    const flagHistory = useMemo(() => selectedFlag ? mockHistory.filter(h => h.flagId === selectedFlag.id) : [], [selectedFlag]);

    return (
        <div className="p-4 sm:p-6 bg-background text-foreground min-h-screen">
            <header className="flex items-center justify-between mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold">Feature Flags</h1>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm"><Archive className="h-4 w-4 mr-2" />Archive</Button>
                    <Button size="sm" onClick={() => setCreateDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Create</Button>
                </div>
            </header>

            {selectedForBulk.size > 0 && (
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-card border">
                    <p className="font-medium">{selectedForBulk.size} selected</p>
                    <Button size="sm" variant="outline" onClick={() => handleBulkAction('enable')}><Power className="h-4 w-4 mr-2" /> Enable</Button>
                    <Button size="sm" variant="outline" onClick={() => handleBulkAction('disable')}><PowerOff className="h-4 w-4 mr-2" /> Disable</Button>
                    <Button size="sm" className="bg-red-800 hover:bg-red-700 text-white" onClick={() => handleBulkAction('archive')}><Trash2 className="h-4 w-4 mr-2" /> Archive</Button>
                    <Button size="icon" variant="ghost" onClick={() => setSelectedForBulk(new Set())}><X className="h-4 w-4" /></Button>
                </motion.div>
            )}

            <Tabs value={activeEnv} onValueChange={(value) => { setActiveEnv(value as Environment); setSelectedForBulk(new Set()); }} className="w-full">
                <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto mb-6">
                    <TabsTrigger value="dev">Development</TabsTrigger>
                    <TabsTrigger value="staging">Staging</TabsTrigger>
                    <TabsTrigger value="prod">Production</TabsTrigger>
                </TabsList>

                <AnimatePresence mode="wait">
                    <motion.div key={activeEnv} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                        <TabsContent value={activeEnv} className="mt-0">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                <AnimatePresence>
                                    {currentFlags.map(flag => (
                                        <FlagCard key={flag.id} flag={flag} onToggle={handleToggle} onSelect={setSelectedFlag} onBulkSelect={handleBulkSelect} isSelected={selectedForBulk.has(flag.id)} />
                                    ))}
                                </AnimatePresence>
                            </div>
                        </TabsContent>
                    </motion.div>
                </AnimatePresence>
            </Tabs>

            <Dialog open={selectedFlag !== null} onOpenChange={(isOpen) => !isOpen && setSelectedFlag(null)}>
                {selectedFlag && <DetailView flag={selectedFlag} history={flagHistory} allFlags={currentFlags} />}
            </Dialog>
            <CreateFlagDialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen} onCreate={handleCreateFlag} />
        </div>
    );
};

export default FeatureFlagManager;
