import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CheckCircle, XCircle, Loader, ChevronsRight, Server, Terminal, Copy, ShieldCheck, Trash2, Power, AlertTriangle, History, Globe, KeyRound, RefreshCw } from 'lucide-react';

const mockLogs = [
  '[INFO] Starting build process...',
  '[INFO] Cloning repository from git@github.com:manus-ai/webapp-builder.git',
  '[INFO] Repository cloned successfully.',
  '[INFO] Installing dependencies...',
  '[DEPS] Found 235 packages to install.',
  '[DEPS] Fetching packages...',
  '[DEPS] Linking dependencies...',
  '[DEPS] Dependencies installed.',
  '[INFO] Running build script...',
  '[BUILD] Compiling TypeScript files...',
  '[BUILD] Generating type definitions...',
  '[BUILD] Type definitions generated.',
  '[BUILD] Optimizing assets...',
  '[BUILD] Build successful in 45.8s.',
  '[INFO] Starting tests...',
  '[TEST] Found 128 test suites.',
  '[TEST] Running tests...',
  '[PASS] src/components/Button.test.tsx',
  '[PASS] src/components/Card.test.tsx',
  '[PASS] src/utils/helpers.test.tsx',
  '[TEST] All tests passed.',
  '[INFO] Starting deployment to staging...',
  '[DEPLOY] Creating new container...',
  '[DEPLOY] Container created successfully.',
  '[DEPLOY] Uploading build artifacts...',
  '[DEPLOY] Artifacts uploaded.',
  '[DEPLOY] Starting new container...',
  '[DEPLOY] Deployment successful.',
  '[INFO] Verifying deployment...',
  '[VERIFY] Pinging health check endpoint...',
  '[VERIFY] Health check successful.',
  '[VERIFY] Deployment verified.'
];

const mockEnvVars = [
  { key: 'DATABASE_URL', value: 'postgres://user:••••••••@host:port/db' },
  { key: 'API_KEY', value: 'sk-••••••••••••••••••••••••' },
  { key: 'SESSION_SECRET', value: '••••••••••••••••••••••••••••••••' },
  { key: 'REDIS_URL', value: 'redis://:••••••••@host:port' },
];

type StageStatus = 'pending' | 'running' | 'success' | 'failed';

interface PipelineStage {
  name: string;
  status: StageStatus;
  duration?: string;
}

const initialStages: PipelineStage[] = [
  { name: 'Build', status: 'pending' },
  { name: 'Test', status: 'pending' },
  { name: 'Deploy', status: 'pending' },
  { name: 'Verify', status: 'pending' },
];

const StatusIcon = ({ status }: { status: StageStatus }) => {
  switch (status) {
    case 'success':
      return <CheckCircle className="h-6 w-6 text-oklch(67.56% 0.224 150.35)" />;
    case 'failed':
      return <XCircle className="h-6 w-6 text-oklch(64.41% 0.224 25.4)" />;
    case 'running':
      return <Loader className="h-6 w-6 animate-spin text-oklch(65.73% 0.177 264.05)" />;
    case 'pending':
    default:
      return <Power className="h-6 w-6 text-gray-400 dark:text-gray-500" />;
  }
};

export default function DeploymentPipelineView() {
  const [stages, setStages] = useState<PipelineStage[]>(initialStages);
  const [logs, setLogs] = useState<string[]>([]);
  const [logIndex, setLogIndex] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const deploymentUrl = 'https://my-app-staging.manus.app';

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(deploymentUrl).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  }, [deploymentUrl]);

  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];
    const runPipeline = () => {
      setStages(prev => prev.map(s => s.name === 'Build' ? { ...s, status: 'running' } : s));

      timeouts.push(setTimeout(() => {
        setStages(prev => prev.map(s => s.name === 'Build' ? { ...s, status: 'success', duration: '45.8s' } : s));
        setStages(prev => prev.map(s => s.name === 'Test' ? { ...s, status: 'running' } : s));
      }, 1500));

      timeouts.push(setTimeout(() => {
        setStages(prev => prev.map(s => s.name === 'Test' ? { ...s, status: 'success', duration: '1m 12s' } : s));
        setStages(prev => prev.map(s => s.name === 'Deploy' ? { ...s, status: 'running' } : s));
      }, 3000));
    };

    runPipeline();

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    const currentStage = stages.find(s => s.status === 'running');
    if (currentStage && logIndex < mockLogs.length) {
      const logInterval = setInterval(() => {
        setLogs(prev => [...prev, mockLogs[logIndex]]);
        setLogIndex(prev => prev + 1);
      }, 100);
      return () => clearInterval(logInterval);
    }
  }, [stages, logIndex]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [logs]);

  return (
    <TooltipProvider>
      <div className="bg-gray-50/50 dark:bg-gray-900/50 p-4 sm:p-6 lg:p-8 font-sans min-h-screen">
        <div className="w-full max-w-7xl mx-auto space-y-6">
          <Card className="shadow-lg border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-950">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-2xl font-bold text-gray-800 dark:text-gray-200">Deployment Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center space-x-2 sm:space-x-4 md:space-x-8 my-8">
                {stages.map((stage, index) => (
                  <React.Fragment key={stage.name}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex flex-col items-center space-y-2"
                    >
                      <div className="relative">
                        <StatusIcon status={stage.status} />
                      </div>
                      <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm sm:text-base">{stage.name}</span>
                      {stage.duration && <span className="text-xs text-gray-500 dark:text-gray-400">{stage.duration}</span>}
                    </motion.div>
                    {index < stages.length - 1 && (
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: index * 0.1 + 0.2, duration: 0.5 }}
                        className="flex-1 h-1 bg-gray-300 dark:bg-gray-700 origin-left relative top-[-18px] hidden sm:block"
                      >
                        <AnimatePresence>
                          {stage.status === 'success' && (
                            <motion.div
                              initial={{ scaleX: 0 }}
                              animate={{ scaleX: 1 }}
                              transition={{ duration: 0.5 }}
                              className="h-full bg-oklch(67.56% 0.224 150.35) origin-left"
                            />
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="shadow-lg border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-950">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-gray-800 dark:text-gray-200">
                    <Terminal className="h-5 w-5" />
                    <span>Build Logs</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea ref={scrollAreaRef} className="h-72 w-full bg-gray-900 dark:bg-black rounded-md p-4 font-mono text-sm">
                    {logs.map((log, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className={`whitespace-pre-wrap ${log.includes('[FAIL]') ? 'text-red-400' : log.includes('[PASS]') ? 'text-green-400' : 'text-gray-300'}`}
                      >
                        {log}
                      </motion.div>
                    ))}
                    {stages.find(s => s.status === 'running') && <div className="w-2 h-4 bg-gray-300 animate-pulse" />}
                  </ScrollArea>
                </CardContent>
              </Card>
              <Card className="shadow-lg border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-950">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-gray-800 dark:text-gray-200">
                    <KeyRound className="h-5 w-5" />
                    <span>Environment Variables</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {mockEnvVars.map(env => (
                      <div key={env.key} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded-md">
                        <span className="font-mono text-sm text-gray-600 dark:text-gray-400">{env.key}</span>
                        <span className="font-mono text-sm text-gray-800 dark:text-gray-200">{env.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="shadow-lg border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-950">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-gray-800 dark:text-gray-200">
                    <Server className="h-5 w-5" />
                    <span>Controls</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Deployment Target</label>
                    <Select defaultValue="staging">
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue placeholder="Select target..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="production">Production</SelectItem>
                        <SelectItem value="staging">Staging</SelectItem>
                        <SelectItem value="preview">Preview</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator />
                  <div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="destructive" className="w-full">
                          <History className="mr-2 h-4 w-4" /> Rollback
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Confirm Rollback</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to roll back to the previous version? This action cannot be undone.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline">Cancel</Button>
                          <Button variant="destructive">Confirm Rollback</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-lg border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-950">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-gray-800 dark:text-gray-200">
                    <Globe className="h-5 w-5" />
                    <span>Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Deployment URL</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Input readOnly value={deploymentUrl} className="flex-1" />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" onClick={handleCopy}>
                            {isCopied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{isCopied ? 'Copied!' : 'Copy URL'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="h-5 w-5 text-green-500" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">SSL Certificate</span>
                    </div>
                    <Badge variant="outline" className="text-green-600 border-green-500/50 bg-green-50 dark:text-green-400 dark:border-green-500/30 dark:bg-green-900/20">Valid</Badge>
                  </div>
                  <Button variant="outline" className="w-full">
                    <RefreshCw className="mr-2 h-4 w-4" /> Purge CDN Cache
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
