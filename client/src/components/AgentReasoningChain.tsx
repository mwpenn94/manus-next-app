import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { CheckCircle2, XCircle, Loader, ChevronRight, Wrench, ChevronsUpDown, Eye, EyeOff } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

type ReasoningStep = {
  id: string;
  title: string;
  content: string;
  status: 'thinking' | 'complete' | 'error';
  duration?: number;
  toolCalls?: Array<{
    name: string;
    args: string;
    result?: string;
  }>;
};

interface AgentReasoningChainProps {
  steps: ReasoningStep[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  showToolCalls: boolean;
  onToggleToolCalls: () => void;
}

const StatusIcon = ({ status }: { status: ReasoningStep['status'] }) => {
  switch (status) {
    case 'thinking':
      return <Loader className="h-5 w-5 animate-spin text-blue-500" />;
    case 'complete':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'error':
      return <XCircle className="h-5 w-5 text-destructive" />;
    default:
      return null;
  }
};

const stepVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0 },
} as const satisfies Variants;

const contentVariants = {
  collapsed: { height: 0, opacity: 0, marginTop: 0 },
  expanded: { height: 'auto', opacity: 1, marginTop: '0.75rem' },
} as const satisfies Variants;

const ToolCall = ({ toolCall }: { toolCall: NonNullable<ReasoningStep['toolCalls']>[0] }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-2">
      <Card className="bg-background/50">
        <CardHeader className="flex flex-row items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-sm font-medium">{toolCall.name}</span>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-9 p-0">
              <ChevronRight className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-90')} />
              <span className="sr-only">Toggle tool call details</span>
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent asChild>
          <motion.div
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            variants={contentVariants}
            transition={{ duration: 0.3, ease: 'easeInOut' as const }}
          >
            <CardContent className="p-3 pt-0">
              <div className="space-y-2 text-xs font-mono">
                <div>
                  <p className="text-muted-foreground">Arguments:</p>
                  <pre className="mt-1 rounded-md bg-background p-2 text-foreground/80 whitespace-pre-wrap break-all">{toolCall.args}</pre>
                </div>
                {toolCall.result && (
                  <div>
                    <p className="text-muted-foreground">Result:</p>
                    <pre className="mt-1 rounded-md bg-background p-2 text-foreground/80 whitespace-pre-wrap break-all">{toolCall.result}</pre>
                  </div>
                )}
              </div>
            </CardContent>
          </motion.div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

const Step = ({ step, index, isExpanded, showToolCalls }: { step: ReasoningStep; index: number; isExpanded: boolean; showToolCalls: boolean }) => {
  const [isOpen, setIsOpen] = useState(isExpanded);

  React.useEffect(() => {
    setIsOpen(isExpanded);
  }, [isExpanded]);

  const isThinking = step.status === 'thinking';

  return (
    <motion.li
      className="relative pl-12 pb-8 last:pb-0"
      variants={stepVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay: index * 0.05 }}
    >
      <div className="absolute left-[1.125rem] top-1 h-full w-0.5 bg-border" />
      <div className="absolute left-0 top-0 flex h-9 w-9 items-center justify-center">
        {isThinking && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-blue-500/50"
            animate={{ rotate: 360, scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' as const }}
          />
        )}
        <div className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full bg-card border border-border">
          <span className="text-sm font-medium text-muted-foreground">{index + 1}</span>
        </div>
      </div>

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center gap-4">
          <CollapsibleTrigger className="flex-1 text-left">
            <div className="flex items-center gap-3">
              <h4 className="font-medium text-foreground">{step.title}</h4>
              <div className="flex-shrink-0">
                <StatusIcon status={step.status} />
              </div>
            </div>
          </CollapsibleTrigger>
          {step.duration && (
            <Badge variant="secondary" className="font-mono text-xs">
              {step.duration}ms
            </Badge>
          )}
        </div>

        <CollapsibleContent asChild>
          <motion.div
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            variants={contentVariants}
            transition={{ duration: 0.3, ease: 'easeInOut' as const }}
            className="overflow-hidden"
          >
            <p className="text-muted-foreground">{step.content}</p>
            {showToolCalls && step.toolCalls && step.toolCalls.length > 0 && (
              <div className="mt-4">
                <h5 className="mb-2 text-sm font-semibold">Tool Calls</h5>
                <div className="space-y-2">
                  {step.toolCalls.map((toolCall, i) => (
                    <ToolCall key={i} toolCall={toolCall} />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </CollapsibleContent>
      </Collapsible>
    </motion.li>
  );
};

export const AgentReasoningChain = ({ steps, isExpanded, onToggleExpand, showToolCalls, onToggleToolCalls }: AgentReasoningChainProps) => {
  const memoizedSteps = useMemo(() => steps.map((step, index) => (
    <Step key={step.id} step={step} index={index} isExpanded={isExpanded} showToolCalls={showToolCalls} />
  )), [steps, isExpanded, showToolCalls]);

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onToggleToolCalls}>
          {showToolCalls ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
          {showToolCalls ? 'Hide Tools' : 'Show Tools'}
        </Button>
        <Button variant="outline" size="sm" onClick={onToggleExpand}>
          <ChevronsUpDown className="mr-2 h-4 w-4" />
          {isExpanded ? 'Collapse All' : 'Expand All'}
        </Button>
      </div>
      <ul className="w-full">
        <AnimatePresence initial={false}>
          {memoizedSteps}
        </AnimatePresence>
      </ul>
    </div>
  );
};
