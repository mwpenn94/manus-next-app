import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { PlusCircle, KeyRound, MoreVertical, Trash2, RotateCw, Copy, AlertTriangle, ShieldCheck, Shield } from 'lucide-react'

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: number;
  lastUsed?: number;
  expiresAt?: number;
  permissions: string[];
  isActive: boolean;
}

interface ApiKeyManagerProps {
  keys: ApiKey[];
  onCreateKey: (name: string, permissions: string[]) => void;
  onRevokeKey: (id: string) => void;
  onRotateKey: (id: string) => void;
  onToggleKey: (id: string, active: boolean) => void;
  availablePermissions: string[];
}

const formatDate = (timestamp?: number) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const timeAgo = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    const now = Date.now();
    const seconds = Math.floor((now - timestamp * 1000) / 1000);
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
}

export const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ keys, onCreateKey, onRevokeKey, onRotateKey, onToggleKey, availablePermissions }) => {
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());

  const handleCreateKey = () => {
    if (newKeyName.trim()) {
      onCreateKey(newKeyName.trim(), Array.from(selectedPermissions));
      setNewKeyName('');
      setSelectedPermissions(new Set());
      setCreateDialogOpen(false);
    }
  };

  const handlePermissionChange = (permission: string) => {
    setSelectedPermissions(prev => {
      const newPermissions = new Set(prev);
      if (newPermissions.has(permission)) {
        newPermissions.delete(permission);
      } else {
        newPermissions.add(permission);
      }
      return newPermissions;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const isExpiringSoon = (expiresAt?: number) => {
    if (!expiresAt) return false;
    const sevenDaysInSeconds = 7 * 24 * 60 * 60;
    const now = Date.now() / 1000;
    return expiresAt - now < sevenDaysInSeconds && expiresAt > now;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyRound className="h-6 w-6" />
          <CardTitle>API Key Management</CardTitle>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Input
                placeholder="Key Name (e.g., 'Production Server')"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
              <div>
                <h4 className="mb-2 font-medium">Permissions</h4>
                <div className="grid grid-cols-2 gap-2">
                  {availablePermissions.map(permission => (
                    <div key={permission} className="flex items-center space-x-2">
                      <Checkbox
                        id={`perm-${permission}`}
                        checked={selectedPermissions.has(permission)}
                        onCheckedChange={() => handlePermissionChange(permission)}
                      />
                      <label
                        htmlFor={`perm-${permission}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {permission}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateKey} disabled={!newKeyName.trim()}>Create Key</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Prefix</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Used</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence initial={false}>
              {keys.map(key => (
                <motion.tr
                  key={key.id}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                  className={cn(!key.isActive && "text-muted-foreground")}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {key.name}
                      {isExpiringSoon(key.expiresAt) && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>This key will expire soon.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                        {key.permissions.map(p => <Badge key={p} variant="secondary">{p}</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 font-mono text-sm">
                      {key.prefix}••••••••
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(key.prefix)}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Copy prefix</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(key.createdAt)}</TableCell>
                  <TableCell>{timeAgo(key.lastUsed)}</TableCell>
                  <TableCell>{formatDate(key.expiresAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={key.isActive}
                        onCheckedChange={(checked) => onToggleKey(key.id, checked)}
                        aria-label="Toggle key status"
                      />
                      <Badge variant={key.isActive ? 'default' : 'outline'}>
                        {key.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure you want to revoke this key?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the API key "{key.name}" and it will no longer be able to make requests.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onRevokeKey(key.id)} className={cn(buttonVariants({ variant: "destructive" }))}>Revoke Key</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => onRotateKey(key.id)}>
                            <RotateCw className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Rotate Key (generates a new key, revokes this one)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                </motion.tr>
              ))}
            </AnimatePresence>
          </TableBody>
        </Table>
        {keys.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
                <KeyRound className="mx-auto h-12 w-12" />
                <h3 className="mt-4 text-lg font-semibold">No API Keys yet</h3>
                <p className="mt-2 text-sm">Create your first API key to get started.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
};

// Helper for storybook/testing, not part of the component itself
const buttonVariants = (opts: { variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | null | undefined }) => {
    // In a real app, this would come from a variants helper
    if (opts.variant === 'destructive') {
        return "bg-destructive text-destructive-foreground hover:bg-destructive/90"
    }
    return ""
}
