import React, { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Eye, EyeOff, Plus, Trash2, Upload, Download, GitCompareArrows, ShieldAlert, Check, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type EnvVariable = {
  id: string;
  key: string;
  value: string;
  isSecret: boolean;
};

type Environment = 'development' | 'staging' | 'production';

const initialData: Record<Environment, EnvVariable[]> = {
  development: [
    { id: 'dev1', key: 'DATABASE_URL', value: 'postgres://dev:password@localhost:5432/devdb', isSecret: true },
    { id: 'dev2', key: 'API_KEY', value: 'dev-secret-key-123', isSecret: true },
    { id: 'dev3', key: 'NODE_ENV', value: 'development', isSecret: false },
    { id: 'dev4', key: 'PORT', value: '3000', isSecret: false },
    { id: 'dev5', key: 'SESSION_SECRET', value: 'a-very-long-and-random-session-secret-for-dev', isSecret: true },
  ],
  staging: [
    { id: 'stg1', key: 'DATABASE_URL', value: 'postgres://staging:password@staging-db:5432/stagingdb', isSecret: true },
    { id: 'stg2', key: 'API_KEY', value: 'stg-secret-key-456', isSecret: true },
    { id: 'stg3', key: 'NODE_ENV', value: 'staging', isSecret: false },
    { id: 'stg4', key: 'ENABLE_FEATURE_X', value: 'true', isSecret: false },
    { id: 'stg5', key: 'SENTRY_DSN', value: 'https://public@sentry.example.com/1', isSecret: true },
  ],
  production: [
    { id: 'prod1', key: 'DATABASE_URL', value: 'postgres://prod:********@prod-db:5432/proddb', isSecret: true },
    { id: 'prod2', key: 'API_KEY', value: 'prod-secret-key-789', isSecret: true },
    { id: 'prod3', key: 'NODE_ENV', value: 'production', isSecret: false },
    { id: 'prod4', key: 'WORKER_COUNT', value: '4', isSecret: false },
    { id: 'prod5', key: 'REDIS_URL', value: 'redis://:********@prod-redis:6379', isSecret: true },
  ],
};

export default function EnvironmentManager() {
  const [data, setData] = useState(initialData);
  const [activeEnv, setActiveEnv] = useState<Environment>('development');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSecrets, setShowSecrets] = useState(false);
  const [editingVar, setEditingVar] = useState<{id: string, field: 'key' | 'value'} | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newVar, setNewVar] = useState({ key: '', value: '', isSecret: false });
  const [diffTarget, setDiffTarget] = useState<Environment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddVar = useCallback(() => {
    if (!newVar.key || !newVar.value) return;
    const keyExists = data[activeEnv].some(v => v.key === newVar.key);
    if (keyExists) {
        alert("Key already exists in this environment.");
        return;
    }
    setData(prev => ({
      ...prev,
      [activeEnv]: [...prev[activeEnv], { ...newVar, id: `${activeEnv}-${Date.now()}` }]
    }));
    setNewVar({ key: '', value: '', isSecret: false });
  }, [newVar, activeEnv, data]);

  const handleDeleteVar = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      [activeEnv]: prev[activeEnv].filter(v => v.id !== id)
    }));
  }, [activeEnv]);

  const handleUpdateVar = useCallback((id: string, field: 'key' | 'value', value: string) => {
    if (field === 'key' && data[activeEnv].some(v => v.key === value && v.id !== id)) {
        alert("Key already exists in this environment.");
        setEditingVar(null);
        return;
    }
    setData(prev => ({
        ...prev,
        [activeEnv]: prev[activeEnv].map(v => v.id === id ? { ...v, [field]: value } : v)
    }));
    setEditingVar(null);
    setEditValue('');
}, [activeEnv, data]);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'environments.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const text = await file.text();
        const importedData = JSON.parse(text);
        // Basic validation
        if (importedData.development && importedData.staging && importedData.production) {
            setData(importedData);
        } else {
            alert("Invalid JSON structure.");
        }
      } catch (error) {
        alert("Failed to parse JSON file.");
      }
    }
  };

  const diffData = useMemo(() => {
    if (!diffTarget) return new Map();
    const currentVars = new Map(data[activeEnv].map(v => [v.key, v.value]));
    const targetVars = new Map(data[diffTarget].map(v => [v.key, v.value]));
    const diff = new Map<string, {type: 'added' | 'removed' | 'changed', targetValue?: string}>();

    for (const [key, value] of Array.from(currentVars.entries())) {
        if (!targetVars.has(key)) {
            diff.set(key, {type: 'removed'});
        } else if (targetVars.get(key) !== value) {
            diff.set(key, {type: 'changed', targetValue: targetVars.get(key)});
        }
    }
    for (const [key, value] of Array.from(targetVars.entries())) {
        if (!currentVars.has(key)) {
            diff.set(key, {type: 'added', targetValue: value});
        }
    }
    return diff;
  }, [data, activeEnv, diffTarget]);

  const filteredData = useMemo(() => {
    let vars = data[activeEnv];
    if (diffTarget) {
        const diffKeys = Array.from(diffData.keys());
        const addedVars = diffKeys
            .filter(key => diffData.get(key)?.type === 'added')
            .map(key => ({ id: `diff-add-${key}`, key, value: diffData.get(key)?.targetValue || '', isSecret: false }));
        vars = [...vars, ...addedVars];
    }
    return vars.filter(v => v.key.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [data, activeEnv, searchTerm, diffTarget, diffData]);

  const getValidationState = (key: string) => {
    if (!key) return null;
    const isDuplicate = data[activeEnv].some(v => v.key === key && newVar.key === key);
    if (isDuplicate) return <X className="h-4 w-4 text-destructive" />;
    if (key.match(/^[A-Z0-9_]+$/)) return <Check className="h-4 w-4 text-green-500" />;
    return <ShieldAlert className="h-4 w-4 text-yellow-500" />;
  }

  return (
    <Card className="w-full max-w-5xl mx-auto bg-background text-foreground border-border shadow-2xl">
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
        <CardTitle className="text-lg font-semibold">Environment Manager</CardTitle>
        <div className="flex items-center space-x-2">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
          <Button variant="outline" size="sm" onClick={handleImportClick}><Upload className="h-4 w-4 mr-2"/>Import</Button>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-2"/>Export</Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setShowSecrets(s => !s)}>
                  <AnimatePresence mode="wait">
                    <motion.div key={showSecrets ? 'eye-off' : 'eye'} initial={{scale:0.5, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.5, opacity:0}}>
                      {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </motion.div>
                  </AnimatePresence>
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>{showSecrets ? 'Hide' : 'Show'} Secret Values</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs value={activeEnv} onValueChange={(value) => { setActiveEnv(value as Environment); setDiffTarget(null); }} className="w-full">
          <TabsList className="grid w-full grid-cols-3 rounded-none">
            <TabsTrigger value="development">Development</TabsTrigger>
            <TabsTrigger value="staging">Staging</TabsTrigger>
            <TabsTrigger value="production">Production</TabsTrigger>
          </TabsList>
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <div className="relative w-full max-w-xs">
                <Input placeholder="Search variables..." value={searchTerm} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)} className="pl-10 bg-muted/50"/>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center space-x-2">
                  <GitCompareArrows className="h-4 w-4 text-muted-foreground"/>
                  <span className="text-sm text-muted-foreground">Diff against:</span>
                  {(['development', 'staging', 'production'] as Environment[]).filter(e => e !== activeEnv).map(e => (
                      <Button key={e} variant={diffTarget === e ? 'secondary' : 'ghost'} size="sm" onClick={() => setDiffTarget(prev => prev === e ? null : e)}>{e}</Button>
                  ))}
              </div>
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={activeEnv} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <TabsContent value={activeEnv} className="m-0">
                  <div className="border rounded-md overflow-hidden">
                    <div className="p-3 bg-muted/50 font-medium grid grid-cols-[2fr_3fr_80px] gap-4 items-center text-sm text-muted-foreground">
                      <div>Key</div>
                      <div>Value</div>
                      <div className="text-right">Actions</div>
                    </div>
                    <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
                      <AnimatePresence>
                        {filteredData.map((variable) => {
                          const diffInfo = diffData.get(variable.key);
                          const rowClass = cn("p-3 grid grid-cols-[2fr_3fr_80px] gap-4 items-center hover:bg-muted/20 transition-colors", {
                            "bg-green-500/10": diffInfo?.type === 'added',
                            "bg-red-500/10": diffInfo?.type === 'removed',
                            "bg-yellow-500/10": diffInfo?.type === 'changed',
                          });

                          return (
                            <motion.div layout key={variable.id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className={rowClass}>
                              <div className="flex items-center space-x-2 font-mono text-sm">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>{getValidationState(variable.key)}</TooltipTrigger>
                                    <TooltipContent><p>UPPER_SNAKE_CASE recommended</p></TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                {editingVar?.id === variable.id && editingVar.field === 'key' ? (
                                  <Input autoFocus value={editValue} onChange={e => setEditValue(e.target.value.toUpperCase())} onBlur={() => handleUpdateVar(variable.id, 'key', editValue)} onKeyDown={e => e.key === 'Enter' && handleUpdateVar(variable.id, 'key', editValue)} className="h-8"/>
                                ) : (
                                  <span className="cursor-pointer" onClick={() => { setEditingVar({id: variable.id, field: 'key'}); setEditValue(variable.key); }}>{variable.key}</span>
                                )}
                              </div>
                              <div className="font-mono text-sm break-all">
                                {editingVar?.id === variable.id && editingVar.field === 'value' ? (
                                  <Input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => handleUpdateVar(variable.id, 'value', editValue)} onKeyDown={e => e.key === 'Enter' && handleUpdateVar(variable.id, 'value', editValue)} className="h-8"/>
                                ) : (
                                  <span className="cursor-pointer" onClick={() => { setEditingVar({id: variable.id, field: 'value'}); setEditValue(variable.value); }}>
                                    {variable.isSecret && !showSecrets ? '●●●●●●●●●●' : variable.value}
                                    {diffInfo?.type === 'changed' && showSecrets && <span className="text-xs text-yellow-400 ml-2">(was: {diffInfo.targetValue})</span>}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-end space-x-1">
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-8 w-8" disabled={diffInfo?.type === 'added'}><Trash2 className="h-4 w-4" /></Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete the <span className='font-mono text-foreground'>{variable.key}</span> variable from the {activeEnv} environment.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteVar(variable.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                    <div className="p-3 bg-muted/50 border-t grid grid-cols-[2fr_3fr_80px] gap-4 items-center">
                        <div className="flex items-center space-x-2">
                            <Input placeholder="NEW_VARIABLE" value={newVar.key} onChange={e => setNewVar(v => ({...v, key: e.target.value.toUpperCase()}))} className="font-mono h-8"/>
                            {getValidationState(newVar.key)}
                        </div>
                        <Input placeholder="Value" value={newVar.value} onChange={e => setNewVar(v => ({...v, value: e.target.value}))} className="h-8"/>
                        <div className="flex items-center justify-end space-x-1">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant={newVar.isSecret ? 'secondary' : 'ghost'} size="icon" onClick={() => setNewVar(v => ({...v, isSecret: !v.isSecret}))} className="h-8 w-8">
                                            <ShieldAlert className={cn("h-4 w-4", newVar.isSecret && "text-primary")} />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Mark as secret</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <Button size="icon" onClick={handleAddVar} className="h-8 w-8"><Plus className="h-4 w-4" /></Button>
                        </div>
                    </div>
                  </div>
                </TabsContent>
              </motion.div>
            </AnimatePresence>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
