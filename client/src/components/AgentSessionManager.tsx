import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, Clock, MessageSquare, Zap, Plus, Trash2, Edit, Check, X, Server } from 'lucide-react';

// --- TYPES ---
type SessionStatus = 'active' | 'idle' | 'terminated';

interface Session {
  id: string;
  name: string;
  model: string;
  status: SessionStatus;
  startedAt: number;
  messageCount: number;
  tokenUsage: number;
  lastActivity: number;
}

interface AgentSessionManagerProps {
  sessions: Session[];
  onCreateSession: (name: string, model: string) => void;
  onTerminate: (id: string) => void;
  onSwitch: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  activeSessionId: string;
  maxSessions: number;
}

// --- HELPER FUNCTIONS ---
const formatDuration = (startTime: number) => {
  const seconds = Math.floor((Date.now() - startTime) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
};

const formatTokenUsage = (tokens: number) => {
  if (tokens < 1000) return tokens.toString();
  return `${(tokens / 1000).toFixed(1)}k`;
};

// --- SUB-COMPONENTS ---

const StatusIndicator = ({ status }: { status: SessionStatus }) => {
  const statusConfig = {
    active: { color: 'bg-green-500', label: 'Active' },
    idle: { color: 'bg-yellow-500', label: 'Idle' },
    terminated: { color: 'bg-red-500', label: 'Terminated' },
  };
  const { color, label } = statusConfig[status];

  return (
    <div className="flex items-center gap-2">
      <div className={cn('h-2 w-2 rounded-full', color)} />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
};

const CreateSessionDialog = ({ onCreate, models }: { onCreate: (name: string, model: string) => void; models: string[] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [model, setModel] = useState(models[0] || '');

  const handleCreate = () => {
    if (name.trim() && model) {
      onCreate(name.trim(), model);
      setIsOpen(false);
      setName('');
      setModel(models[0] || '');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New Session
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Agent Session</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            id="name"
            placeholder="Session Name (e.g., 'Feature Research')"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger>
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {models.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleCreate} disabled={!name.trim() || !model}>
            Create Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const SessionItem = React.memo(({
  session,
  isActive,
  onSwitch,
  onRename,
  onTerminate,
}: {
  session: Session;
  isActive: boolean;
  onSwitch: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onTerminate: (id: string) => void;
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(session.name);

  const handleRename = () => {
    if (newName.trim() && newName.trim() !== session.name) {
      onRename(session.id, newName.trim());
    }
    setIsRenaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleRename();
    if (e.key === 'Escape') {
      setNewName(session.name);
      setIsRenaming(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: 'easeInOut' as const }}
      className={cn(
        'rounded-lg border p-4 transition-all',
        isActive ? 'bg-accent border-primary/50' : 'bg-card',
        session.status === 'terminated' && 'opacity-50 bg-muted/50'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-grow cursor-pointer" onClick={() => session.status !== 'terminated' && onSwitch(session.id)}>
          {isRenaming ? (
            <div className="flex items-center gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onBlur={handleRename}
                onKeyDown={handleKeyDown}
                className="h-8 text-base"
                autoFocus
              />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleRename}><Check className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsRenaming(false)}><X className="h-4 w-4" /></Button>
            </div>
          ) : (
            <h3 className="text-lg font-semibold text-foreground">{session.name}</h3>
          )}
          <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
            <Badge variant="secondary" className="flex items-center gap-1"><Bot className="h-3 w-3" />{session.model}</Badge>
            <StatusIndicator status={session.status} />
          </div>
        </div>
        <div className="flex items-center gap-1">
          {session.status !== 'terminated' && (
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsRenaming(true)}>
              <Edit className="h-4 w-4" />
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will terminate the session "{session.name}". This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onTerminate(session.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Terminate
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      {session.status !== 'terminated' && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4" /><span>{formatDuration(session.startedAt)}</span></div>
          <div className="flex items-center gap-2 text-muted-foreground"><MessageSquare className="h-4 w-4" /><span>{session.messageCount} msgs</span></div>
          <div className="flex items-center gap-2 text-muted-foreground"><Zap className="h-4 w-4" /><span>{formatTokenUsage(session.tokenUsage)} tokens</span></div>
          <div className="flex items-center gap-2 text-muted-foreground"><Server className="h-4 w-4" /><span>Active {formatDuration(session.lastActivity)} ago</span></div>
        </div>
      )}
    </motion.div>
  );
});

// --- MAIN COMPONENT ---

export const AgentSessionManager = ({ 
  sessions, 
  onCreateSession, 
  onTerminate, 
  onSwitch, 
  onRename, 
  activeSessionId, 
  maxSessions 
}: AgentSessionManagerProps) => {

  const availableModels = useMemo(() => ['gemini-2.5-flash', 'gpt-4.1-mini', 'claude-3-haiku'], []);

  const handleCreateSession = useCallback((name: string, model: string) => {
    if (sessions.filter(s => s.status !== 'terminated').length < maxSessions) {
      onCreateSession(name, model);
    }
  }, [sessions, maxSessions, onCreateSession]);

  const activeSessionsCount = useMemo(() => sessions.filter(s => s.status !== 'terminated').length, [sessions]);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex flex-col">
          <CardTitle>Agent Session Manager</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {activeSessionsCount} / {maxSessions} active sessions
          </p>
        </div>
        <CreateSessionDialog onCreate={handleCreateSession} models={availableModels} />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <AnimatePresence>
            {sessions.length > 0 ? (
              sessions
                .slice()
                .sort((a, b) => (a.id === activeSessionId ? -1 : b.id === activeSessionId ? 1 : b.lastActivity - a.lastActivity))
                .map(session => (
                  <SessionItem
                    key={session.id}
                    session={session}
                    isActive={session.id === activeSessionId}
                    onSwitch={onSwitch}
                    onRename={onRename}
                    onTerminate={onTerminate}
                  />
                ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No active sessions. Create one to get started.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
      {sessions.length > 0 && (
        <CardFooter className="text-xs text-muted-foreground">
          <p>Click on a session to switch. Active session is highlighted.</p>
        </CardFooter>
      )}
    </Card>
  );
};
