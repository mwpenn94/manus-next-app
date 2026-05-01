import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Plus, Trash2, Copy, Search, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

// --- PROPS TYPE ---
type Variable = {
  key: string;
  value: string;
  isSecret: boolean;
  source: 'user' | 'system' | 'inherited';
  updatedAt: number;
};

interface EnvironmentVariableManagerProps {
  variables: Variable[];
  onAdd: (variable: { key: string; value: string; isSecret: boolean }) => void;
  onUpdate: (key: string, value: string) => void;
  onDelete: (key: string) => void;
  onToggleVisibility: (key: string) => void; // This is a placeholder, we'll manage visibility locally
}

// --- HELPER COMPONENTS ---
const SourceBadge = ({ source }: { source: Variable['source'] }) => {
  const style = {
    user: 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30',
    system: 'bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30',
    inherited: 'bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30',
  }[source];

  return <Badge variant="outline" className={cn('capitalize', style)}>{source}</Badge>;
};

const AddVariableDialog = ({ onAdd, setOpen }: { onAdd: EnvironmentVariableManagerProps['onAdd'], setOpen: (open: boolean) => void }) => {
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [isSecret, setIsSecret] = useState(true);

  const handleAdd = () => {
    if (key && value) {
      onAdd({ key, value, isSecret });
      setKey('');
      setValue('');
      setIsSecret(true);
      setOpen(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add New Environment Variable</DialogTitle>
        <DialogDescription>System variables can be overridden, but not deleted.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <Input placeholder="Variable Name (e.g., API_KEY)" value={key} onChange={(e) => setKey(e.target.value.toUpperCase())} />
        <Input placeholder="Value" value={value} onChange={(e) => setValue(e.target.value)} />
        <div className="flex items-center space-x-2">
          <Switch id="is-secret" checked={isSecret} onCheckedChange={setIsSecret} />
          <label htmlFor="is-secret">Secret (value will be masked)</label>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
        <Button onClick={handleAdd}>Add Variable</Button>
      </DialogFooter>
    </DialogContent>
  );
};

const EditableValueCell = ({
  variable,
  isEditing,
  isVisible,
  onStartEditing,
  onCancelEditing,
  onUpdate,
}: {
  variable: Variable;
  isEditing: boolean;
  isVisible: boolean;
  onStartEditing: (currentValue: string) => void;
  onCancelEditing: () => void;
  onUpdate: (newValue: string) => void;
}) => {
  const [localValue, setLocalValue] = useState(variable.value);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isEditing) {
      setLocalValue(variable.value);
      inputRef.current?.focus();
    }
  }, [isEditing, variable.value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onUpdate(localValue);
    }
    if (e.key === 'Escape') {
      onCancelEditing();
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => onUpdate(localValue)}
        onKeyDown={handleKeyDown}
        className="h-8"
        disabled={variable.source === 'system'}
      />
    );
  }

  const canEdit = variable.source !== 'system';

  return (
    <div 
      className={cn('font-mono text-sm', canEdit && 'cursor-pointer')}
      onClick={() => canEdit && onStartEditing(variable.value)}
    >
      {variable.isSecret && !isVisible ? '••••••••••••••••••••' : variable.value}
      {variable.source === 'system' && <p className="text-xs text-muted-foreground italic mt-1">System variables are read-only.</p>}
    </div>
  );
};

// --- MAIN COMPONENT ---
export const EnvironmentVariableManager: React.FC<EnvironmentVariableManagerProps> = ({ variables, onAdd, onUpdate, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);

  const filteredVariables = useMemo(() => {
    return variables.filter(v => v.key.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [variables, searchTerm]);

  const handleToggleVisibility = (key: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Environment Variables
          <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Plus className="mr-2 h-4 w-4" /> Add Variable</Button>
            </DialogTrigger>
            <AddVariableDialog onAdd={onAdd} setOpen={setAddDialogOpen} />
          </Dialog>
        </CardTitle>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by key..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          {searchTerm && (
            <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6" onClick={() => setSearchTerm('')}> 
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%]">Key</TableHead>
              <TableHead>Value</TableHead>
              <TableHead className="w-[100px]">Source</TableHead>
              <TableHead className="text-right w-[180px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {filteredVariables.map((variable) => (
                <motion.tr
                  key={variable.key}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' as const }}
                  className="relative"
                >
                  <TableCell className="font-medium">{variable.key}</TableCell>
                  <TableCell>
                    <EditableValueCell 
                      variable={variable} 
                      isEditing={editingKey === variable.key}
                      isVisible={visibleKeys.has(variable.key)}
                      onStartEditing={(val) => { setEditingKey(variable.key); }}
                      onCancelEditing={() => setEditingKey(null)}
                      onUpdate={(newVal) => {
                        if (variable.source !== 'system') {
                          onUpdate(variable.key, newVal);
                        }
                        setEditingKey(null);
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <SourceBadge source={variable.source} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {variable.isSecret && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleVisibility(variable.key)}>
                          {visibleKeys.has(variable.key) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigator.clipboard.writeText(variable.value)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" disabled={variable.source === 'system'}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the <span className="font-mono p-1 bg-muted rounded-sm">{variable.key}</span> variable. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(variable.key)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </AnimatePresence>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
