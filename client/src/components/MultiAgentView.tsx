
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { ChevronDown, MessageSquare, User, Bot, BrainCircuit } from 'lucide-react';

// --- Mock shadcn/ui components and utils ---
// In a real project, these would be imported from '@/components/ui/*'

import { cn } from '@/lib/utils'; // Assuming this exists

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)} {...props} />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-col space-y-1.5 p-4', className)} {...props} />
));
CardHeader.displayName = 'CardHeader';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-4 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const Progress = ({ value, className }: { value: number; className?: string }) => (
  <div className={cn('relative h-2 w-full overflow-hidden rounded-full bg-secondary', className)}>
    <motion.div className="h-full w-full flex-1 bg-primary transition-all" style={{ transform: `translateX(-${100 - (value || 0)}%)` }} />
  </div>
);

const Badge = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2', className)} {...props} />
);

// --- Type Definitions ---

type AgentStatus = 'idle' | 'working' | 'waiting' | 'done';

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  currentTask?: string;
  progress?: number;
  avatar?: string;
}

export interface Communication {
  from: string;
  to: string;
  message: string;
  timestamp: number;
  type: 'request' | 'response' | 'broadcast';
}

export interface MultiAgentViewProps {
  agents: Agent[];
  communications: Communication[];
  layout?: 'circle' | 'grid';
}

// --- Helper Components ---

const statusColors: { [key in AgentStatus]: { dot: string; pulse: string } } = {
  idle: { dot: 'bg-gray-500', pulse: '' },
  working: { dot: 'bg-blue-500', pulse: 'animate-pulse' },
  waiting: { dot: 'bg-yellow-500', pulse: '' },
  done: { dot: 'bg-green-500', pulse: '' },
};

const AgentAvatar = ({ agent }: { agent: Agent }) => {
    const Icon = useMemo(() => {
        if (agent.role.toLowerCase().includes('user')) return User;
        if (agent.role.toLowerCase().includes('orchestrator')) return BrainCircuit;
        return Bot;
    }, [agent.role]);

    if (agent.avatar) {
        return <img src={agent.avatar} alt={agent.name} className="h-12 w-12 rounded-full object-cover" />;
    }
    return <Icon className="h-10 w-10 text-muted-foreground" />;
};

const AgentCard = ({ agent, onClick }: { agent: Agent; onClick: () => void }) => (
  <motion.div layoutId={`agent-card-${agent.id}`}>
    <Card
      onClick={onClick}
      className="w-48 cursor-pointer transition-all hover:shadow-lg hover:border-primary"
    >
      <CardHeader className="flex-row items-center gap-3">
        <AgentAvatar agent={agent} />
        <div className="flex-1 truncate">
          <h3 className="font-semibold truncate">{agent.name}</h3>
          <Badge className="mt-1">{agent.role}</Badge>
        </div>
        <div className={cn('h-3 w-3 rounded-full', statusColors[agent.status].dot, statusColors[agent.status].pulse)} />
      </CardHeader>
      <CardContent>
        {agent.currentTask && <p className="text-xs text-muted-foreground h-8 truncate">{agent.currentTask}</p>}
        {agent.progress !== undefined && <Progress value={agent.progress} className="mt-2" />}
      </CardContent>
    </Card>
  </motion.div>
);

const CommunicationLog = ({ communications }: { communications: Communication[] }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="absolute bottom-4 right-4 w-full max-w-md">
            <Card className="bg-background/80 backdrop-blur-sm">
                <CardHeader className="cursor-pointer flex-row justify-between items-center" onClick={() => setIsOpen(!isOpen)}>
                    <div className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        <h3 className="font-semibold">Communication Log</h3>
                    </div>
                    <motion.div animate={{ rotate: isOpen ? 180 : 0 }}><ChevronDown /></motion.div>
                </CardHeader>
                <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <CardContent className="pt-0">
                            <div className="max-h-64 overflow-y-auto pr-2">
                                {[...communications].reverse().map((comm, index) => (
                                    <div key={index} className="text-xs text-muted-foreground mb-2 border-b border-border pb-1">
                                        <p><span className="font-bold text-foreground">{comm.from}</span> to <span className="font-bold text-foreground">{comm.to}</span>:</p>
                                        <p className="truncate">{comm.message}</p>
                                        <p className="text-right text-[10px]">{new Date(comm.timestamp).toLocaleTimeString()}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </motion.div>
                )}
                </AnimatePresence>
            </Card>
        </div>
    );
};

// --- Main Component ---

export const MultiAgentView: React.FC<MultiAgentViewProps> = ({ agents, communications, layout = 'grid' }) => {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const agentPositions = useRef<{ [key: string]: { x: number; y: number } }>({});

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const agentMap = useMemo(() => new Map(agents.map(a => [a.id, a])), [agents]);

  const renderLayout = () => {
    const effectiveLayout = isMobile ? 'list' : layout;

    const cardVariants: Variants = {
        hidden: { opacity: 0, scale: 0.8 },
        visible: (i: number) => ({
            opacity: 1,
            scale: 1,
            transition: { delay: i * 0.05, type: 'spring', stiffness: 300, damping: 20 },
        }),
    };

    switch (effectiveLayout) {
      case 'circle':
        return (
          <div className="relative w-full h-full flex items-center justify-center">
            {agents.map((agent, i) => {
              const angle = (i / agents.length) * 2 * Math.PI;
              const radius = Math.min(window.innerWidth, window.innerHeight) / 3;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              agentPositions.current[agent.id] = { x, y };
              return (
                <motion.div
                  key={agent.id}
                  custom={i}
                  initial="hidden"
                  animate="visible"
                  variants={cardVariants}
                  style={{ position: 'absolute', x, y }}
                >
                  <AgentCard agent={agent} onClick={() => setSelectedAgentId(agent.id)} />
                </motion.div>
              );
            })}
          </div>
        );
      case 'list':
        return (
            <div className="flex flex-col items-center gap-4 p-4">
                {agents.map((agent, i) => (
                    <motion.div key={agent.id} custom={i} initial="hidden" animate="visible" variants={cardVariants}>
                        <AgentCard agent={agent} onClick={() => setSelectedAgentId(agent.id)} />
                    </motion.div>
                ))}
            </div>
        );
      case 'grid':
      default:
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-8">
            {agents.map((agent, i) => (
                <motion.div key={agent.id} custom={i} initial="hidden" animate="visible" variants={cardVariants}>
                    <AgentCard agent={agent} onClick={() => setSelectedAgentId(agent.id)} />
                </motion.div>
            ))}
          </div>
        );
    }
  };

  const renderCommunicationLines = () => {
    if (isMobile || layout !== 'circle') return null;

    return (
        <svg className="absolute top-1/2 left-1/2 w-0 h-0 overflow-visible">
            <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#9ca3af" />
                </marker>
            </defs>
            <AnimatePresence>
            {communications.slice(-5).map((comm, i) => {
                const fromPos = agentPositions.current[comm.from];
                const toPos = agentPositions.current[comm.to];
                if (!fromPos || !toPos) return null;

                return (
                    <motion.path
                        key={`${comm.timestamp}-${i}`}
                        d={`M ${fromPos.x} ${fromPos.y} L ${toPos.x} ${toPos.y}`}
                        stroke="#9ca3af"
                        strokeWidth="1.5"
                        markerEnd="url(#arrowhead)"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 0.7 }}
                        transition={{ duration: 0.5, ease: 'easeInOut' as const }}
                        exit={{ opacity: 0, transition: { duration: 2 } }}
                    />
                );
            })}
            </AnimatePresence>
        </svg>
    );
  }

  const selectedAgent = useMemo(() => selectedAgentId ? agentMap.get(selectedAgentId) : null, [selectedAgentId, agentMap]);

  return (
    <div className="relative w-full h-screen bg-background text-foreground overflow-auto">
      {renderLayout()}
      {renderCommunicationLines()}
      <CommunicationLog communications={communications} />

      <AnimatePresence>
        {selectedAgent && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedAgentId(null)}
          >
            <motion.div layoutId={`agent-card-${selectedAgent.id}`} onClick={(e) => e.stopPropagation()}>
                 <Card className="w-96">
                    <CardHeader className="flex-row items-center gap-4">
                        <AgentAvatar agent={selectedAgent} />
                        <div className="flex-1">
                            <h2 className="text-xl font-bold">{selectedAgent.name}</h2>
                            <Badge className="mt-1 text-sm">{selectedAgent.role}</Badge>
                        </div>
                        <div className={cn('h-4 w-4 rounded-full', statusColors[selectedAgent.status].dot)} />
                    </CardHeader>
                    <CardContent>
                        <p className="font-semibold">Status: <span className="font-normal capitalize">{selectedAgent.status}</span></p>
                        {selectedAgent.currentTask && <p className="font-semibold mt-2">Current Task:</p>}
                        {selectedAgent.currentTask && <p className="text-muted-foreground">{selectedAgent.currentTask}</p>}
                        {selectedAgent.progress !== undefined && (
                            <div className="mt-4">
                                <p className="font-semibold mb-2">Progress</p>
                                <Progress value={selectedAgent.progress} />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
