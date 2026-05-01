import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MoreVertical, Trash2, ArrowRight, Power, Zap, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

// --- TYPES --- //

interface Rule {
  id: string;
  name: string;
  trigger: {
    type: string;
    config: Record<string, string>;
  };
  action: {
    type: string;
    config: Record<string, string>;
  };
  isActive: boolean;
  lastTriggered?: number;
  triggerCount: number;
}

interface ConfigField {
  type: string;
  label: string;
  configFields: string[];
}

interface TaskAutomationRulesProps {
  rules: Rule[];
  onAddRule: (rule: { name: string; trigger: object; action: object }) => void;
  onDeleteRule: (id: string) => void;
  onToggleRule: (id: string, active: boolean) => void;
  availableTriggers: ConfigField[];
  availableActions: ConfigField[];
}

// --- HELPER COMPONENTS --- //

const RuleDialog: React.FC<{
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddRule: TaskAutomationRulesProps['onAddRule'];
  availableTriggers: ConfigField[];
  availableActions: ConfigField[];
}> = ({ isOpen, onOpenChange, onAddRule, availableTriggers, availableActions }) => {
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState<string | undefined>();
  const [actionType, setActionType] = useState<string | undefined>();
  const [triggerConfig, setTriggerConfig] = useState<Record<string, string>>({});
  const [actionConfig, setActionConfig] = useState<Record<string, string>>({});

  const selectedTrigger = useMemo(() => availableTriggers.find(t => t.type === triggerType), [triggerType, availableTriggers]);
  const selectedAction = useMemo(() => availableActions.find(a => a.type === actionType), [actionType, availableActions]);

  const handleAddRule = () => {
    if (name && selectedTrigger && selectedAction) {
      onAddRule({
        name,
        trigger: { type: selectedTrigger.type, config: triggerConfig },
        action: { type: selectedAction.type, config: actionConfig },
      });
      // Reset form
      setName('');
      setTriggerType(undefined);
      setActionType(undefined);
      setTriggerConfig({});
      setActionConfig({});
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>Add New Automation Rule</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <label htmlFor="rule-name">Rule Name</label>
            <Input id="rule-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., 'Notify on task completion'" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="grid gap-2">
              <label>Trigger (IF)</label>
              <Select value={triggerType} onValueChange={val => {
                setTriggerType(val);
                setTriggerConfig({});
              }}>
                <SelectTrigger><SelectValue placeholder="Select a trigger" /></SelectTrigger>
                <SelectContent>
                  {availableTriggers.map(t => <SelectItem key={t.type} value={t.type}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedTrigger?.configFields.map(field => (
                <div key={field} className="grid gap-1.5">
                  <label htmlFor={`trigger-${field}`} className="text-sm text-muted-foreground">{field}</label>
                  <Input id={`trigger-${field}`} value={triggerConfig[field] || ''} onChange={e => setTriggerConfig(prev => ({ ...prev, [field]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="grid gap-2">
              <label>Action (THEN)</label>
              <Select value={actionType} onValueChange={val => {
                setActionType(val);
                setActionConfig({});
              }}>
                <SelectTrigger><SelectValue placeholder="Select an action" /></SelectTrigger>
                <SelectContent>
                  {availableActions.map(a => <SelectItem key={a.type} value={a.type}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedAction?.configFields.map(field => (
                <div key={field} className="grid gap-1.5">
                  <label htmlFor={`action-${field}`} className="text-sm text-muted-foreground">{field}</label>
                  <Input id={`action-${field}`} value={actionConfig[field] || ''} onChange={e => setActionConfig(prev => ({ ...prev, [field]: e.target.value }))} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">Cancel</Button>
          </DialogClose>
          <Button type="button" onClick={handleAddRule} disabled={!name || !triggerType || !actionType}>Add Rule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const RuleCard: React.FC<{
  rule: Rule;
  onDeleteRule: (id: string) => void;
  onToggleRule: (id: string, active: boolean) => void;
  triggerLabel: string;
  actionLabel: string;
}> = ({ rule, onDeleteRule, onToggleRule, triggerLabel, actionLabel }) => {

  const formatDescription = (label: string, config: Record<string, string>) => {
    let desc = label;
    Object.entries(config).forEach(([key, value]) => {
      desc = desc.replace(`{${key}}`, value);
    });
    return desc;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="w-full"
    >
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-medium">{rule.name}</CardTitle>
          <div className="flex items-center space-x-2">
            <Switch
              checked={rule.isActive}
              onCheckedChange={(checked) => onToggleRule(rule.id, checked)}
              aria-label={`Toggle rule ${rule.name}`}
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the rule "{rule.name}". This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDeleteRule(rule.id)} className={cn(buttonVariants({ variant: 'destructive' }))}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center space-x-4 my-4">
            <div className="flex-1 text-center p-4 bg-accent rounded-lg">
              <p className="text-sm font-semibold text-accent-foreground">IF</p>
              <p className="text-muted-foreground">{formatDescription(triggerLabel, rule.trigger.config)}</p>
            </div>
            <ArrowRight className="h-6 w-6 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 text-center p-4 bg-accent rounded-lg">
              <p className="text-sm font-semibold text-accent-foreground">THEN</p>
              <p className="text-muted-foreground">{formatDescription(actionLabel, rule.action.config)}</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t border-border">
            <div className="flex items-center space-x-2">
              <Power className={cn('h-4 w-4', rule.isActive ? 'text-green-500' : 'text-red-500')} />
              <Badge variant={rule.isActive ? 'default' : 'secondary'}>{rule.isActive ? 'Active' : 'Inactive'}</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Zap className="h-4 w-4" />
                <span>Triggered: {rule.triggerCount} times</span>
              </div>
              {rule.lastTriggered && (
                <span>Last triggered: {new Date(rule.lastTriggered).toLocaleString()}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// --- MAIN COMPONENT --- //

export const TaskAutomationRules: React.FC<TaskAutomationRulesProps> = ({ 
  rules, 
  onAddRule, 
  onDeleteRule, 
  onToggleRule, 
  availableTriggers, 
  availableActions 
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const getLabelForType = (type: string, collection: ConfigField[]) => {
    return collection.find(item => item.type === type)?.label || 'Unknown';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Task Automation Rules</h2>
          <p className="text-muted-foreground">Create if-this-then-that style rules to automate your workflow.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Rule
        </Button>
      </div>

      <RuleDialog 
        isOpen={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        onAddRule={onAddRule} 
        availableTriggers={availableTriggers} 
        availableActions={availableActions} 
      />

      <div className="space-y-4">
        <AnimatePresence>
          {rules.length > 0 ? (
            rules.map(rule => (
              <RuleCard 
                key={rule.id} 
                rule={rule} 
                onDeleteRule={onDeleteRule} 
                onToggleRule={onToggleRule}
                triggerLabel={getLabelForType(rule.trigger.type, availableTriggers)}
                actionLabel={getLabelForType(rule.action.type, availableActions)}
              />
            ))
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
              <p className="text-muted-foreground">No automation rules yet.</p>
              <Button variant="link" onClick={() => setIsDialogOpen(true)}>Create your first rule</Button>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Helper for Storybook and variants
const buttonVariants = ({ variant }: { variant: 'destructive' | 'default' }) => {
  if (variant === 'destructive') {
    return 'bg-destructive text-destructive-foreground hover:bg-destructive/90';
  }
  return '';
};
