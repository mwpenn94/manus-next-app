import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { FileText, HardDrive, Trash2, History, PlusCircle, Loader, AlertTriangle, CheckCircle } from 'lucide-react';

type Backup = {
  id: string;
  name: string;
  createdAt: number;
  size: number;
  type: 'auto' | 'manual';
  status: 'complete' | 'in-progress' | 'failed';
};

interface WorkspaceBackupManagerProps {
  backups: Backup[];
  onCreateBackup: (name: string) => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
  onScheduleChange: (schedule: string) => void;
  currentSchedule: string;
  isBackingUp: boolean;
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const WorkspaceBackupManager: React.FC<WorkspaceBackupManagerProps> = ({
  backups,
  onCreateBackup,
  onRestore,
  onDelete,
  onScheduleChange,
  currentSchedule,
  isBackingUp,
}) => {
  const [newBackupName, setNewBackupName] = useState('');

  const sortedBackups = useMemo(() => {
    return [...backups].sort((a, b) => b.createdAt - a.createdAt);
  }, [backups]);

  const handleCreateBackup = () => {
    if (newBackupName.trim()) {
      onCreateBackup(newBackupName.trim());
      setNewBackupName('');
    }
  };

  const getStatusIcon = (status: Backup['status']) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in-progress':
        return <Loader className="h-4 w-4 animate-spin text-blue-500" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center"><HardDrive className="mr-2 h-6 w-6" /> Workspace Backup Manager</CardTitle>
        <CardDescription>Manage your workspace backups and restore points.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Create Backup</h3>
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Manual backup name (e.g., 'pre-refactor')"
              value={newBackupName}
              onChange={(e) => setNewBackupName(e.target.value)}
              disabled={isBackingUp}
            />
            <Button onClick={handleCreateBackup} disabled={!newBackupName.trim() || isBackingUp}>
              {isBackingUp ? (
                <><Loader className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
              ) : (
                <><PlusCircle className="mr-2 h-4 w-4" /> Create Manual Backup</>
              )}
            </Button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Backup Schedule</h3>
          <div className="w-full md:w-1/4">
             <Select value={currentSchedule} onValueChange={onScheduleChange as (value: string) => void}>
                <SelectTrigger>
                    <SelectValue placeholder="Select schedule" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="off">Off</SelectItem>
                </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Available Backups</h3>
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-4 py-2 grid grid-cols-12 gap-4 font-medium text-sm text-muted-foreground">
                <div className="col-span-4">Name</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-1">Size</div>
                <div className="col-span-1">Type</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-3 text-right">Actions</div>
            </div>
            <AnimatePresence initial={false}>
              {sortedBackups.map((backup) => (
                <motion.div
                  key={backup.id}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
                  className={cn(
                    'px-4 py-3 grid grid-cols-12 gap-4 items-center border-t',
                    backup.status === 'failed' && 'bg-destructive/10 text-destructive-foreground'
                  )}
                >
                  <div className="col-span-4 flex items-center font-medium">
                    <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                    {backup.name}
                  </div>
                  <div className="col-span-2 text-sm text-muted-foreground">
                    {new Date(backup.createdAt).toLocaleString()}
                  </div>
                  <div className="col-span-1 text-sm text-muted-foreground">{formatBytes(backup.size)}</div>
                  <div className="col-span-1">
                    <Badge variant={backup.type === 'auto' ? 'secondary' : 'default'}>
                      {backup.type}
                    </Badge>
                  </div>
                  <div className="col-span-1 flex items-center space-x-2 text-sm">
                    {getStatusIcon(backup.status)}
                    <span className="capitalize">{backup.status}</span>
                  </div>
                  <div className="col-span-3 flex justify-end space-x-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={backup.status !== 'complete'}>
                          <History className="mr-2 h-4 w-4" /> Restore
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure you want to restore?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will revert your entire workspace to the state from{' '}
                            <strong>{new Date(backup.createdAt).toLocaleString()}</strong>. All changes since then will be lost.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onRestore(backup.id)}>Restore Workspace</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure you want to delete this backup?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the backup file for{' '}
                            <strong>{backup.name}</strong>.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(backup.id)}>Delete Backup</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {backups.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                    No backups found.
                </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
