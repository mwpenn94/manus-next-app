import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, Bot, Power, AlertTriangle, RefreshCw, Send, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// --- PROPS AND TYPES ---
type AgentStatus = 'available' | 'busy' | 'offline';

interface Agent {
  id: string;
  name: string;
  specialty: string;
  status: AgentStatus;
  avatar?: string;
  capabilities: string[];
}

interface Delegation {
  id: string;
  agentId: string;
  task: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startedAt: number;
}

interface AgentDelegationPanelProps {
  agents: Agent[];
  delegations: Delegation[];
  onDelegate: (agentId: string, task: string) => void;
  onCancel: (delegationId: string) => void;
  onRetry: (delegationId: string) => void;
}

const statusConfig: Record<AgentStatus, { color: string; icon: React.ReactNode }> = {
  available: { color: 'bg-green-500', icon: <Power className="h-2 w-2" /> },
  busy: { color: 'bg-yellow-500', icon: <Wrench className="h-2 w-2 animate-spin" /> },
  offline: { color: 'bg-gray-500', icon: <Power className="h-2 w-2" /> },
};

// --- SUB-COMPONENTS ---

const AgentCard: React.FC<{ agent: Agent; onSelect: () => void }> = ({ agent, onSelect }) => (
  <Card className="hover:border-primary transition-colors">
    <CardHeader className="flex flex-row items-center gap-4 pb-2">
      <Avatar>
        <AvatarImage src={agent.avatar} alt={agent.name} />
        <AvatarFallback>{agent.name.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <CardTitle className="text-lg">{agent.name}</CardTitle>
        <CardDescription>{agent.specialty}</CardDescription>
      </div>
      <div className="flex items-center gap-2">
        <div className={cn('h-3 w-3 rounded-full', statusConfig[agent.status].color)} />
        <span className="text-sm capitalize text-muted-foreground">{agent.status}</span>
      </div>
    </CardHeader>
    <CardContent className="pb-4">
      <p className="text-sm text-muted-foreground mb-2">Capabilities:</p>
      <div className="flex flex-wrap gap-2">
        {agent.capabilities.map((cap) => (
          <Badge key={cap} variant="secondary">{cap}</Badge>
        ))}
      </div>
    </CardContent>
    <CardFooter>
        <Button onClick={onSelect} disabled={agent.status !== 'available'} className="w-full">
            <Send className="mr-2 h-4 w-4" /> Delegate Task
        </Button>
    </CardFooter>
  </Card>
);

const DelegationForm: React.FC<{ 
    agents: Agent[]; 
    selectedAgentId: string;
    setSelectedAgentId: (id: string) => void;
    onDelegate: (agentId: string, task: string) => void;
    onClose: () => void;
}> = ({ agents, selectedAgentId, setSelectedAgentId, onDelegate, onClose }) => {
    const [task, setTask] = useState('');
    const availableAgents = useMemo(() => agents.filter(a => a.status === 'available'), [agents]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedAgentId && task) {
            onDelegate(selectedAgentId, task);
            onClose();
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="agent-select" className="text-sm font-medium text-muted-foreground">Assign to Agent</label>
                <Select value={selectedAgentId} onValueChange={setSelectedAgentId as (value: string) => void}>
                    <SelectTrigger id="agent-select">
                        <SelectValue placeholder="Select an available agent..." />
                    </SelectTrigger>
                    <SelectContent>
                        {availableAgents.map(agent => (
                            <SelectItem key={agent.id} value={agent.id}>{agent.name} - {agent.specialty}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div>
                <label htmlFor="task-description" className="text-sm font-medium text-muted-foreground">Task Description</label>
                <Input
                    id="task-description"
                    value={task}
                    onChange={(e) => setTask(e.target.value)}
                    placeholder="e.g., 'Analyze market trends for Q3'"
                    required
                />
            </div>
            <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={!selectedAgentId || !task}>Confirm Delegation</Button>
            </div>
        </form>
    );
};

const DelegationItem: React.FC<{ delegation: Delegation; agent?: Agent; onCancel: (id: string) => void; onRetry: (id: string) => void; }> = ({ delegation, agent, onCancel, onRetry }) => {
  const getStatusInfo = () => {
    switch (delegation.status) {
      case 'running': return { color: 'bg-blue-500', text: 'Running' };
      case 'pending': return { color: 'bg-yellow-500', text: 'Pending' };
      case 'completed': return { color: 'bg-green-500', text: 'Completed' };
      case 'failed': return { color: 'bg-red-500', text: 'Failed' };
      default: return { color: 'bg-gray-500', text: 'Unknown' };
    }
  };

  const { color, text } = getStatusInfo();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: 'easeInOut' as const }}
      className="p-4 border rounded-lg bg-card"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <p className="font-semibold text-foreground">{delegation.task}</p>
          <p className="text-sm text-muted-foreground">To: {agent?.name || 'Unknown Agent'}</p>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn('border-transparent', color)}>{text}</Badge>
            {delegation.status === 'running' && <span className="text-sm text-muted-foreground">{delegation.progress.toFixed(0)}%</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
            {delegation.status === 'running' && (
                <Button size="sm" variant="ghost" onClick={() => onCancel(delegation.id)}><X className="h-4 w-4 mr-1"/> Cancel</Button>
            )}
            {delegation.status === 'failed' && (
                <Button size="sm" variant="destructive" onClick={() => onRetry(delegation.id)}><RefreshCw className="h-4 w-4 mr-1"/> Retry</Button>
            )}
            {delegation.status === 'completed' && (
                <span className="text-xs text-muted-foreground">{new Date(delegation.startedAt).toLocaleTimeString()}</span>
            )}
        </div>
      </div>
      {(delegation.status === 'running' || delegation.status === 'pending') && (
        <Progress value={delegation.progress} className="mt-3 h-2" />
      )}
    </motion.div>
  );
};

// --- MAIN COMPONENT ---

export const AgentDelegationPanel: React.FC<AgentDelegationPanelProps> = ({ agents, delegations, onDelegate, onCancel, onRetry }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState('');

  const agentsById = useMemo(() => 
    agents.reduce((acc, agent) => {
      acc[agent.id] = agent;
      return acc;
    }, {} as Record<string, Agent>)
  , [agents]);

  const activeDelegations = useMemo(() => 
    delegations.filter(d => d.status === 'pending' || d.status === 'running' || d.status === 'failed')
  , [delegations]);

  const delegationHistory = useMemo(() => 
    delegations.filter(d => d.status === 'completed')
  , [delegations]);

  const handleSelectAgent = (agentId: string) => {
    setSelectedAgentId(agentId);
    setIsModalOpen(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4 md:p-6">
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Delegate a New Task</DialogTitle>
            </DialogHeader>
            <DelegationForm 
                agents={agents}
                selectedAgentId={selectedAgentId}
                setSelectedAgentId={setSelectedAgentId}
                onDelegate={onDelegate}
                onClose={() => setIsModalOpen(false)}
            />
        </DialogContent>
      </Dialog>

      {/* Agent Roster */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5"/> Agent Roster</CardTitle>
          <CardDescription>Available agents for task delegation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto">
          {agents.map(agent => (
            <AgentCard key={agent.id} agent={agent} onSelect={() => handleSelectAgent(agent.id)} />
          ))}
        </CardContent>
      </Card>

      {/* Active & History Delegations */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Active Delegations</CardTitle>
            <CardDescription>Tasks currently in progress or requiring attention.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AnimatePresence>
              {activeDelegations.length > 0 ? (
                activeDelegations.map(d => (
                  <DelegationItem key={d.id} delegation={d} agent={agentsById[d.agentId]} onCancel={onCancel} onRetry={onRetry} />
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">No active delegations.</p>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delegation History</CardTitle>
            <CardDescription>Completed tasks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[40vh] overflow-y-auto">
            {delegationHistory.length > 0 ? (
              delegationHistory.map(d => (
                <div key={d.id} className="flex justify-between items-center p-2 rounded-md hover:bg-accent">
                    <div>
                        <p className="text-sm font-medium">{d.task}</p>
                        <p className="text-xs text-muted-foreground">Completed by {agentsById[d.agentId]?.name || 'Unknown'}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(d.startedAt).toLocaleDateString()}</span>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">No completed delegations yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
