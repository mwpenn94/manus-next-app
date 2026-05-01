import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, Database, FileCheck, Globe, Server, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

interface RestorePoint {
  id: string;
  timestamp: Date;
  size: number; // in GB
  duration: number; // in minutes
  status: 'Completed' | 'Failed';
}

const mockRestorePoints: RestorePoint[] = Array.from({ length: 10 }, (_, i) => ({
  id: `rp-${i + 1}`,
  timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000 - Math.random() * 100000000),
  size: parseFloat((Math.random() * 5 + 2).toFixed(2)),
  duration: Math.floor(Math.random() * 15 + 5),
  status: Math.random() > 0.1 ? 'Completed' : 'Failed',
}));

export default function BackupRecoveryPanel() {
  const [selectedPoint, setSelectedPoint] = useState<RestorePoint | null>(mockRestorePoints[0]);

  const storageUsage = useMemo(() => {
    const total = mockRestorePoints.reduce((sum, p) => sum + p.size, 0);
    return { total, percentage: (total / 250) * 100 }; // Assuming 250GB total storage
  }, []);

  const lastBackup = mockRestorePoints[0];

  return (
    <TooltipProvider>
      <Card className="w-full max-w-4xl mx-auto bg-background text-foreground border-border">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center">
                <Database className="mr-3 h-6 w-6" />
                Backup & Disaster Recovery
              </CardTitle>
              <CardDescription className="mt-1 text-muted-foreground">
                Manage your data protection and recovery strategies.
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center space-x-2 p-2 rounded-md bg-muted">
                            <span className="font-semibold text-sm">RPO: 1h</span>
                            <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent><p>Recovery Point Objective: Max acceptable data loss.</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center space-x-2 p-2 rounded-md bg-muted">
                            <span className="font-semibold text-sm">RTO: 4h</span>
                            <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent><p>Recovery Time Objective: Max acceptable downtime.</p></TooltipContent>
                </Tooltip>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div>
              <h3 className="font-semibold mb-3 text-lg">Restore Points</h3>
              <div className="h-[350px] overflow-y-auto rounded-lg border border-border pr-2">
                <div className="flex flex-col">
                  {mockRestorePoints.map((point) => (
                    <motion.div
                      key={point.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      onClick={() => setSelectedPoint(point)}
                      className={cn(
                        'flex items-center justify-between p-3 cursor-pointer rounded-md hover:bg-muted/50 transition-colors',
                        selectedPoint?.id === point.id && 'bg-muted'
                      )}
                    >
                      <div className="flex items-center">
                        {point.status === 'Completed' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 mr-3" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
                        )}
                        <div>
                          <p className="font-medium">{point.timestamp.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">
                            Size: {point.size} GB | Duration: {point.duration} min
                          </p>
                        </div>
                      </div>
                      {point.status === 'Completed' ? (
                        <Badge variant="outline" className="text-green-400 border-green-400/50">Completed</Badge>
                      ) : (
                        <Badge variant="destructive">Failed</Badge>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <Card className="bg-muted/30">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium">Backup Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Schedule</span>
                        <span className="font-semibold">Daily at 3:00 AM UTC</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Last Backup</span>
                        <div className="flex items-center space-x-1">
                            {lastBackup.status === 'Completed' ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-red-500" />}
                            <span className="font-semibold">{lastBackup.timestamp.toLocaleTimeString()}</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Retention</span>
                        <span className="font-semibold">30 days</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Geo-Replication</span>
                        <div className="flex items-center space-x-1.5">
                            <Globe className="h-4 w-4 text-blue-400" />
                            <span className="font-semibold">Active (3 Regions)</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div>
              <h3 className="font-semibold mb-2">Storage Usage</h3>
              <Progress value={storageUsage.percentage} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2 text-right">
                {storageUsage.total.toFixed(2)} GB of 250 GB used
              </p>
            </div>

            <Separator />

            <AnimatePresence mode="wait">
              {selectedPoint && (
                <motion.div
                  key={selectedPoint.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  <h3 className="font-semibold">Restore from Point</h3>
                  <p className="text-sm text-muted-foreground">
                    Point selected: {selectedPoint.timestamp.toLocaleString()}
                  </p>
                  <Button className="w-full" disabled={selectedPoint.status === 'Failed'}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Test Restore
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
