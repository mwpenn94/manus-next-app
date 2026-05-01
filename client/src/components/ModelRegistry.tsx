import React, { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { History, Layers, GitCommit, Server, CheckCircle, Archive, BarChart, SlidersHorizontal, ShieldAlert, CircleX, Wrench, GitCompareArrows } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

// TypeScript Types
type ModelVersionStatus = "staging" | "production" | "archived";

type Deployment = {
  id: string;
  timestamp: string;
  version: string;
  notes: string;
};

type ModelVersion = {
  id: string;
  version: string;
  status: ModelVersionStatus;
  metrics: { accuracy: number; precision: number; recall: number; };
};

type Model = {
  id: string;
  name: string;
  description: string;
  versions: ModelVersion[];
  deploymentHistory: Deployment[];
  endpointUrl: string;
  healthStatus: "healthy" | "degraded" | "unhealthy";
  abTestConfig: { versionA: string; versionB: string; trafficSplit: number; } | null;
};

// Mock Data
const mockModels: Model[] = Array.from({ length: 4 }, (_, i) => ({
  id: `model-${i + 1}`,
  name: ["Triton-XL", "Phoenix-Vision", "Nexus-Audio", "Orion-Analytics"][i],
  description: ["Large-scale language model for text generation.", "Image recognition and object detection model.", "Speech-to-text and audio processing model.", "Predictive analytics and time-series forecasting."][i],
  endpointUrl: `https://api.manus.ai/models/${["triton-xl", "phoenix-vision", "nexus-audio", "orion-analytics"][i]}`,
  healthStatus: (["healthy", "degraded", "healthy", "unhealthy"] as const)[i],
  abTestConfig: i === 1 ? { versionA: '2.1.0', versionB: '2.2.0', trafficSplit: 50 } : null,
  deploymentHistory: i === 0 ? [
      { id: 'd1', version: '1.0.0', timestamp: '2023-10-26T10:00:00Z', notes: 'Initial production release.' },
      { id: 'd2', version: '1.2.0', timestamp: '2024-01-15T14:30:00Z', notes: 'Promoted to production after successful staging.' },
  ] : [],
  versions: Array.from({ length: 3 }, (__, j) => ({
    id: `v${i+1}.${j}.0`,
    version: `${i+1}.${j}.0`,
    status: (i === j ? 'production' : (j === i + 1 || (i === 3 && j === 1)) ? 'staging' : 'archived') as ModelVersionStatus,
    metrics: { accuracy: 0.9 - i*0.02 + j*0.03, precision: 0.9 - i*0.03 + j*0.02, recall: 0.9 - i*0.01 + j*0.04 },
  })),
}));

const statusConfig: { [key in ModelVersionStatus]: { color: string; icon: React.ElementType } } = {
  production: { color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle },
  staging: { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Wrench },
  archived: { color: "bg-gray-500/20 text-gray-400 border-gray-500/30", icon: Archive },
};

const healthConfig: { [key in Model['healthStatus']]: { color: string; icon: React.ElementType } } = {
    healthy: { color: "text-green-400", icon: CheckCircle },
    degraded: { color: "text-yellow-400", icon: ShieldAlert },
    unhealthy: { color: "text-red-400", icon: CircleX },
};

const ModelCard: React.FC<{ model: Model; onModelUpdate: (updatedModel: Model) => void; }> = ({ model, onModelUpdate }) => {
    const [selectedVersionId, setSelectedVersionId] = useState<string | null>((model.versions.find(v => v.status === 'production') || model.versions[0]).id);
    const selectedVersion = useMemo(() => model.versions.find(v => v.id === selectedVersionId), [model.versions, selectedVersionId]);

    const handleAction = (status: ModelVersionStatus, targetVersionId: string) => {
        const newVersions = model.versions.map(v => {
            if (v.status === 'production' && status === 'production') return { ...v, status: 'archived' as ModelVersionStatus };
            if (v.id === targetVersionId) return { ...v, status };
            return v;
        });
        const targetVersion = model.versions.find(v => v.id === targetVersionId);
        const note = status === 'production' ? `Promoted version ${targetVersion?.version} to production.` : `Rolled back to version ${targetVersion?.version}.`;
        const newDeployment: Deployment = { id: `dep-${Date.now()}`, timestamp: new Date().toISOString(), version: targetVersion?.version || '', notes: note };
        onModelUpdate({ ...model, versions: newVersions, deploymentHistory: [...model.deploymentHistory, newDeployment] });
    };

    return (
        <Card className="bg-card/50 backdrop-blur-sm border-border/20 overflow-hidden flex flex-col">
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                    <CardTitle className="text-xl font-bold text-foreground">{model.name}</CardTitle>
                    <p className="text-muted-foreground text-sm mt-1">{model.description}</p>
                </div>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <div className={cn("flex items-center gap-2", healthConfig[model.healthStatus].color)}>
                                {React.createElement(healthConfig[model.healthStatus].icon, { className: 'h-4 w-4' })}
                                <span className="capitalize">{model.healthStatus}</span>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent><p>Endpoint Health: {model.healthStatus}</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </CardHeader>
            <CardContent className="flex-grow">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-muted-foreground">Endpoint:</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded-md">{model.endpointUrl}</code>
                </div>
                <Separator />
                <div className="mt-4">
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">Versions</h4>
                    <div className="flex flex-wrap gap-2">
                        {model.versions.map(v => (
                            <motion.div key={v.id} whileHover={{ y: -2 }}>
                                <Badge onClick={() => setSelectedVersionId(v.id)} className={cn("cursor-pointer transition-all border", selectedVersionId === v.id ? statusConfig[v.status].color : 'bg-muted text-muted-foreground border-transparent')}>{React.createElement(statusConfig[v.status].icon, { className: 'h-3 w-3 mr-1.5' })}{v.version}</Badge>
                            </motion.div>
                        ))}
                    </div>
                </div>
                <AnimatePresence mode="wait">
                    {selectedVersion && (
                        <motion.div key={selectedVersion.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="mt-4 p-4 rounded-lg bg-muted/50 border border-border/20">
                            <div className="flex justify-between items-center">
                                <h5 className="font-semibold">Version {selectedVersion.version}</h5>
                                <Badge className={cn(statusConfig[selectedVersion.status].color)}>{selectedVersion.status}</Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-center mt-4">
                                {Object.entries(selectedVersion.metrics).map(([key, value]) => (
                                    <div key={key}><p className="text-sm text-muted-foreground capitalize">{key}</p><p className="text-lg font-semibold">{value.toFixed(3)}</p></div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 bg-background/20 p-4 mt-auto">
                 <Dialog><DialogTrigger asChild><Button variant="outline" size="sm"><History className="h-4 w-4 mr-2" />History</Button></DialogTrigger><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Deployment History for {model.name}</DialogTitle></DialogHeader><div className="mt-4 max-h-[60vh] overflow-y-auto pr-4">{model.deploymentHistory.length > 0 ? <ul className="relative border-l border-border/20 ml-4 space-y-8">{model.deploymentHistory.map(d => <li key={d.id} className="pl-8"><div className="absolute -left-2.5 mt-1.5 h-5 w-5 rounded-full bg-primary border-4 border-background"></div><p className="font-semibold text-foreground">Version {d.version}</p><p className="text-sm text-muted-foreground">{d.notes}</p><time className="text-xs text-muted-foreground/70 mt-1">{new Date(d.timestamp).toLocaleString()}</time></li>)}</ul> : <p className="text-muted-foreground text-center py-8">No deployment history.</p>}</div></DialogContent></Dialog>
                 <Dialog><DialogTrigger asChild><Button variant="outline" size="sm"><SlidersHorizontal className="h-4 w-4 mr-2" />A/B Test</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>A/B Test</DialogTitle></DialogHeader><p>Configure A/B test for {model.name}</p></DialogContent></Dialog>
                 <Dialog><DialogTrigger asChild><Button variant="secondary" size="sm" disabled={selectedVersion?.status !== 'staging'}><Layers className="h-4 w-4 mr-2" />Promote</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Promote to Production</DialogTitle></DialogHeader><p>Are you sure you want to promote version <strong>{selectedVersion?.version}</strong> to production?</p><DialogFooter><DialogClose asChild><Button onClick={() => handleAction('production', selectedVersion!.id)}>Confirm</Button></DialogClose></DialogFooter></DialogContent></Dialog>
                 <Dialog><DialogTrigger asChild><Button variant="destructive" size="sm" disabled={!model.versions.some(v => v.status === 'production')}><History className="h-4 w-4 mr-2" />Rollback</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Rollback Production Model</DialogTitle></DialogHeader><RollbackDialogContent model={model} onRollback={(vid) => handleAction('production', vid)} /></DialogContent></Dialog>
            </CardFooter>
        </Card>
    );
};

const RollbackDialogContent: React.FC<{model: Model, onRollback: (versionId: string) => void}> = ({ model, onRollback }) => {
    const [selectedRollbackVersion, setSelectedRollbackVersion] = useState<string>("");
    const archivedVersions = model.versions.filter(v => v.status === 'archived');
    if (archivedVersions.length === 0) return <p className="text-muted-foreground text-center py-8">No archived versions to roll back to.</p>
    return (
        <div>
            <p className="mb-4 text-muted-foreground">Select a version to restore to production.</p>
            <RadioGroup value={selectedRollbackVersion} onValueChange={setSelectedRollbackVersion}>{archivedVersions.map(v => <div key={v.id} className="flex items-center space-x-2"><RadioGroupItem value={v.id} id={v.id} /><Label htmlFor={v.id}>Version {v.version} (Acc: {v.metrics.accuracy.toFixed(3)})</Label></div>)}</RadioGroup>
            <DialogFooter className="mt-4"><DialogClose asChild><Button onClick={() => onRollback(selectedRollbackVersion)} disabled={!selectedRollbackVersion}>Confirm Rollback</Button></DialogClose></DialogFooter>
        </div>
    )
}

export default function ModelRegistry() {
  const [models, setModels] = useState<Model[]>(mockModels);
  const handleModelUpdate = (updatedModel: Model) => setModels(prev => prev.map(m => m.id === updatedModel.id ? updatedModel : m));

  return (
    <div className="bg-background min-h-screen p-8 text-foreground">
        <div className="max-w-7xl mx-auto">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">Model Registry</h1>
                    <p className="text-muted-foreground mt-2">Manage, version, and deploy your machine learning models.</p>
                </div>
                <Dialog><DialogTrigger asChild><Button variant="outline"><GitCompareArrows className="h-4 w-4 mr-2"/>Compare Models</Button></DialogTrigger><DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>Compare Models</DialogTitle></DialogHeader><p>Select two models to compare.</p></DialogContent></Dialog>
            </header>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {models.map(model => <ModelCard key={model.id} model={model} onModelUpdate={handleModelUpdate} />)}
            </div>
        </div>
    </div>
  );
}
