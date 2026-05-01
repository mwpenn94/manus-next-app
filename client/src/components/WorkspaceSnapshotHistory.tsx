import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, FileText, HardDrive, MoreVertical, X, Trash2, History, GitCompareArrows, ChevronsRightLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Helper to format time since a timestamp
const timeAgo = (timestamp: number): string => {
  const now = Date.now();
  const seconds = Math.floor((now - timestamp) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
};

// Helper to format file size
const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export interface Snapshot {
  id: string;
  timestamp: number;
  description: string;
  fileCount: number;
  preview?: string;
  size: number;
}

export interface WorkspaceSnapshotHistoryProps {
  snapshots: Snapshot[];
  currentSnapshotId: string;
  onRestore: (snapshotId: string) => void;
  onDelete: (snapshotId: string) => void;
  onCompare: (id1: string, id2: string) => void;
}

export const WorkspaceSnapshotHistory: React.FC<WorkspaceSnapshotHistoryProps> = ({
  snapshots,
  currentSnapshotId,
  onRestore,
  onDelete,
  onCompare,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const currentSnapshotRef = useRef<HTMLDivElement>(null);

  const sortedSnapshots = useMemo(() => 
    [...snapshots].sort((a, b) => b.timestamp - a.timestamp),
    [snapshots]
  );

  useEffect(() => {
    currentSnapshotRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentSnapshotId]);

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: 'spring' as const, stiffness: 100, damping: 12 }
    },
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b">
        <CardTitle className="text-lg font-semibold">Workspace History</CardTitle>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)}>
                <ChevronsRightLeft className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-0' : 'rotate-180'}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isExpanded ? 'Collapse All' : 'Expand All'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardHeader>
      <CardContent className="p-0 flex-grow">
        <ScrollArea className="h-full p-4">
          <motion.div
            className="relative pl-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Timeline line */}
            <div className="absolute left-[30px] top-2 bottom-2 w-0.5 bg-border" />

            {sortedSnapshots.map((snapshot, index) => {
              const isCurrent = snapshot.id === currentSnapshotId;
              return (
                <motion.div
                  key={snapshot.id}
                  ref={isCurrent ? currentSnapshotRef : null}
                  className="relative mb-8"
                  variants={itemVariants}
                >
                  {/* Timeline dot */}
                  <div className={cn(
                    "absolute left-[-4px] top-[5px] h-4 w-4 rounded-full border-4 box-content",
                    isCurrent ? "bg-primary border-primary/30" : "bg-muted-foreground/50 border-background"
                  )} style={{left: 'calc(1.875rem - 8px)'}}/>

                  <div className="ml-8">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {snapshot.description}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(snapshot.timestamp)}
                      </span>
                    </div>

                    {isExpanded && (
                      <AnimatePresence>
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          {snapshot.preview && (
                            <img src={snapshot.preview} alt={`Preview of ${snapshot.description}`} className="rounded-md border my-2 max-h-32 object-cover" />
                          )}
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-2">
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <FileText className="h-3 w-3" /> {snapshot.fileCount} files
                            </Badge>
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <HardDrive className="h-3 w-3" /> {formatBytes(snapshot.size)}
                            </Badge>
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    )}

                    <div className="flex items-center space-x-2 mt-2">
                      {!isCurrent && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <History className="h-3 w-3 mr-1" />
                              Restore
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Restore Snapshot?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to restore the workspace to the state from "{snapshot.description}"? Any unsaved changes will be lost.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onRestore(snapshot.id)}>Restore</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      {index > 0 && (
                        <Button size="sm" variant="ghost" onClick={() => onCompare(snapshot.id, currentSnapshotId)}>
                          <GitCompareArrows className="h-3 w-3 mr-1" />
                          Compare
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Snapshot?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the "{snapshot.description}" snapshot. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => onDelete(snapshot.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};