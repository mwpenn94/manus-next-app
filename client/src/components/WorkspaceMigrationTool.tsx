import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Upload, Download, FileJson, AlertTriangle, CheckCircle, ChevronRight, Loader2, HardDriveDownload, HardDriveUpload } from 'lucide-react';

type WorkspaceConfig = {
  name: string;
  settings: Record<string, string>;
  integrations: string[];
  members: number;
};

type ImportStatus = {
  step: string;
  progress: number;
  errors: string[];
};

type WorkspaceMigrationToolProps = {
  workspaceConfig: WorkspaceConfig;
  onExport: () => Promise<string>;
  onImport: (config: string) => Promise<{ success: boolean; errors?: string[] }>;
  importStatus?: ImportStatus;
  isExporting: boolean;
  isImporting: boolean;
};

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { staggerChildren: 0.1, duration: 0.5, ease: [0.4, 0, 0.2, 1] as const },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const } },
};

const WorkspaceSummaryCard: React.FC<{ config: WorkspaceConfig }> = ({ config }) => (
  <motion.div variants={itemVariants}>
    <Card className="bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileJson className="w-5 h-5 text-primary" />
          {config.name}
        </CardTitle>
        <CardDescription>Current workspace configuration summary.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        <div className="flex justify-between"><span>Settings</span> <Badge variant="secondary">{Object.keys(config.settings).length}</Badge></div>
        <div className="flex justify-between"><span>Integrations</span> <Badge variant="secondary">{config.integrations.length}</Badge></div>
        <div className="flex justify-between"><span>Members</span> <Badge variant="secondary">{config.members}</Badge></div>
      </CardContent>
    </Card>
  </motion.div>
);

export const WorkspaceMigrationTool: React.FC<WorkspaceMigrationToolProps> = ({
  workspaceConfig,
  onExport,
  onImport,
  importStatus,
  isExporting,
  isImporting,
}) => {
  const [configToImport, setConfigToImport] = useState('');
  const [importResult, setImportResult] = useState<{ success: boolean; errors?: string[] } | null>(null);
  const [showImportConfirmation, setShowImportConfirmation] = useState(false);

  const parsedConfig = useMemo(() => {
    try {
      if (!configToImport) return null;
      return JSON.parse(configToImport) as WorkspaceConfig;
    } catch {
      return null;
    }
  }, [configToImport]);

  const isConfigValid = useMemo(() => {
    if (!parsedConfig) return false;
    return (
      typeof parsedConfig.name === 'string' &&
      typeof parsedConfig.settings === 'object' &&
      Array.isArray(parsedConfig.integrations) &&
      typeof parsedConfig.members === 'number'
    );
  }, [parsedConfig]);

  const handleExport = async () => {
    const exportedConfig = await onExport();
    const blob = new Blob([exportedConfig], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workspaceConfig.name.toLowerCase().replace(/\s+/g, '-')}-config.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!isConfigValid) return;
    setImportResult(null);
    const result = await onImport(configToImport);
    setImportResult(result);
    if (result.success) {
      setConfigToImport('');
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setConfigToImport(text);
      };
      reader.readAsText(file);
    }
  };

  const triggerFileInput = () => {
    document.getElementById('import-file-input')?.click();
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><HardDriveDownload className="w-5 h-5 text-primary" />Export Workspace</CardTitle>
            <CardDescription>Export your current workspace configuration to a JSON file.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <WorkspaceSummaryCard config={workspaceConfig} />
            <pre className="p-4 bg-background rounded-md border border-border text-xs overflow-x-auto">
              {JSON.stringify(workspaceConfig, null, 2)}
            </pre>
          </CardContent>
          <CardFooter>
            <Button onClick={handleExport} disabled={isExporting} className="w-full sm:w-auto">
              {isExporting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Exporting...</>
              ) : (
                <><Download className="mr-2 h-4 w-4" /> Export Configuration</>
              )}
            </Button>
          </CardFooter>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><HardDriveUpload className="w-5 h-5 text-primary" />Import Workspace</CardTitle>
            <CardDescription>Import a workspace configuration from a JSON file or pasted text.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Paste your workspace configuration JSON here..."
              value={configToImport}
              onChange={(e) => setConfigToImport(e.target.value)}
              className="min-h-[150px] font-mono text-xs"
              disabled={isImporting}
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={triggerFileInput} disabled={isImporting} className="w-full sm:w-auto">
                <Upload className="mr-2 h-4 w-4" /> Upload from File
              </Button>
              <input id="import-file-input" type="file" accept=".json" onChange={handleFileChange} className="hidden" />
            </div>
            {configToImport && (
              <AnimatePresence>
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  {isConfigValid ? (
                    <div className="flex items-center gap-2 text-sm text-green-500 p-2 bg-green-500/10 rounded-md border border-green-500/20">
                      <CheckCircle className="w-4 h-4" />
                      <span>Configuration format is valid. Ready to import.</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-destructive p-2 bg-destructive/10 rounded-md border border-destructive/20">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Invalid configuration format. Check JSON syntax and structure.</span>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
            {isImporting && importStatus && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 pt-4">
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>{importStatus.step}</span>
                  <span>{Math.round(importStatus.progress)}%</span>
                </div>
                <Progress value={importStatus.progress} className="w-full" />
                {importStatus.errors.length > 0 && (
                  <div className="pt-2">
                    <h4 className="font-semibold text-destructive">Import Errors:</h4>
                    <ul className="list-disc list-inside text-sm text-destructive/80 space-y-1 mt-1">
                      {importStatus.errors.map((error, index) => <li key={index}>{error}</li>)}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}
            {importResult && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-4">
                {importResult.success ? (
                  <div className="flex items-center gap-2 text-sm text-green-500 p-3 bg-green-500/10 rounded-md border border-green-500/20">
                    <CheckCircle className="w-5 h-5" />
                    <span>Workspace imported successfully!</span>
                  </div>
                ) : (
                  <div className="p-3 bg-destructive/10 rounded-md border border-destructive/20">
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertTriangle className="w-5 h-5" />
                      <span>Import failed. Please check the errors below.</span>
                    </div>
                    {importResult.errors && importResult.errors.length > 0 && (
                      <ul className="list-disc list-inside text-sm text-destructive/80 space-y-1 mt-2 pl-5">
                        {importResult.errors.map((error, index) => <li key={index}>{error}</li>)}
                      </ul>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </CardContent>
          <CardFooter>
            <AlertDialog open={showImportConfirmation} onOpenChange={setShowImportConfirmation}>
              <AlertDialogTrigger asChild>
                <Button disabled={!isConfigValid || isImporting} className="w-full sm:w-auto">
                  {isImporting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...</>
                  ) : (
                    <><ChevronRight className="mr-2 h-4 w-4" /> Import Configuration</>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Workspace Import</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will overwrite your current workspace settings. This action cannot be undone.
                    Are you sure you want to proceed?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleImport}>Confirm and Import</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      </motion.div>
    </motion.div>
  );
};
