
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Shield, ShieldAlert, ShieldCheck, Zap, AlertTriangle, History, RefreshCw, PowerOff, ArrowRight } from 'lucide-react';

type CircuitState = 'closed' | 'open' | 'half-open';

interface Circuit {
  id: string;
  name: string;
  state: CircuitState;
  failures: number;
  successes: number;
  failureThreshold: number;
  resetTimeout: number; // in seconds
  countdown: number;
}

const mockCircuits: Circuit[] = [
  { id: 'service-auth', name: 'Auth Service', state: 'closed', failures: 2, successes: 152, failureThreshold: 5, resetTimeout: 30, countdown: 0 },
  { id: 'service-payment', name: 'Payment Gateway', state: 'open', failures: 5, successes: 89, failureThreshold: 5, resetTimeout: 60, countdown: 45 },
  { id: 'service-notifications', name: 'Notifications API', state: 'half-open', failures: 0, successes: 1, failureThreshold: 3, resetTimeout: 20, countdown: 0 },
  { id: 'service-database', name: 'User Database', state: 'closed', failures: 0, successes: 531, failureThreshold: 10, resetTimeout: 45, countdown: 0 },
];

const StateBadge = ({ state }: { state: CircuitState }) => {
  const stateConfig = {
    closed: { icon: <ShieldCheck className="h-4 w-4" />, color: 'text-green-400', bgColor: 'bg-green-500/20', borderColor: 'border-green-500/30' },
    open: { icon: <ShieldAlert className="h-4 w-4" />, color: 'text-red-400', bgColor: 'bg-red-500/20', borderColor: 'border-red-500/30' },
    'half-open': { icon: <Shield className="h-4 w-4" />, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', borderColor: 'border-yellow-500/30' },
  };
  const { icon, color, bgColor, borderColor } = stateConfig[state];
  return (
    <Badge variant="outline" className={cn('capitalize gap-1.5 pl-2 pr-2.5', color, bgColor, borderColor)}>
      {icon}
      {state.replace('-', ' ')}
    </Badge>
  );
};

const StateMachineDiagram = ({ currentState }: { currentState: CircuitState }) => {
  const states: CircuitState[] = ['closed', 'half-open', 'open'];
  return (
    <div className="flex items-center justify-center space-x-2 p-4 rounded-lg bg-background/40 relative">
      {states.map((state, i) => (
        <React.Fragment key={state}>
          <div className="relative flex flex-col items-center">
            <div className={cn('flex items-center justify-center h-16 w-16 rounded-full border-2 transition-all duration-300', {
              'border-green-500 bg-green-500/10': state === 'closed',
              'border-yellow-500 bg-yellow-500/10': state === 'half-open',
              'border-red-500 bg-red-500/10': state === 'open',
            })}>
              {state === 'closed' && <ShieldCheck className="h-8 w-8 text-green-500" />}
              {state === 'half-open' && <Shield className="h-8 w-8 text-yellow-500" />}
              {state === 'open' && <ShieldAlert className="h-8 w-8 text-red-500" />}
            </div>
            <span className="mt-2 text-xs font-semibold capitalize">{state.replace('-', ' ')}</span>
            {currentState === state && (
              <motion.div layoutId="active-state-indicator" className="absolute -bottom-2 h-1.5 w-12 rounded-full bg-primary" />
            )}
          </div>
          {i < states.length - 1 && <ArrowRight className="h-5 w-5 text-muted-foreground self-center shrink-0" />}
        </React.Fragment>
      ))}
    </div>
  );
};

export default function CircuitBreakerPanel() {
  const [circuits, setCircuits] = useState<Circuit[]>(mockCircuits);
  const [tripHistory, setTripHistory] = useState<{ circuitId: string; name: string; state: CircuitState; timestamp: Date }[]>([]);

  const logHistory = (circuit: Pick<Circuit, 'id' | 'name'>, state: CircuitState) => {
    setTripHistory(prev => [{ circuitId: circuit.id, name: circuit.name, state, timestamp: new Date() }, ...prev].slice(0, 20));
  };

  const tripCircuit = useCallback((id: string) => {
    setCircuits(prev => prev.map(c => {
      if (c.id === id) {
        logHistory(c, 'open');
        return { ...c, state: 'open', failures: c.failureThreshold, countdown: c.resetTimeout };
      }
      return c;
    }));
  }, []);

  const resetCircuit = useCallback((id: string) => {
    setCircuits(prev => prev.map(c => {
      if (c.id === id) {
        logHistory(c, 'closed');
        return { ...c, state: 'closed', failures: 0, successes: 0, countdown: 0 };
      }
      return c;
    }));
  }, []);

  useEffect(() => {
    const simInterval = setInterval(() => {
      setCircuits(prevCircuits => prevCircuits.map(circuit => {
        if (circuit.state === 'closed') {
          const hasFailed = Math.random() > 0.9;
          if (hasFailed) {
            const newFailures = circuit.failures + 1;
            if (newFailures >= circuit.failureThreshold) {
              logHistory(circuit, 'open');
              return { ...circuit, state: 'open', failures: newFailures, countdown: circuit.resetTimeout };
            }
            return { ...circuit, failures: newFailures };
          }
          return { ...circuit, successes: circuit.successes + 1 };
        } else if (circuit.state === 'half-open') {
          const isSuccess = Math.random() > 0.5;
          const newState = isSuccess ? 'closed' : 'open';
          logHistory(circuit, newState);
          return { ...circuit, state: newState, failures: isSuccess ? 0 : circuit.failureThreshold, successes: isSuccess ? 1 : 0, countdown: isSuccess ? 0 : circuit.resetTimeout };
        }
        return circuit;
      }));
    }, 2000);

    const countdownInterval = setInterval(() => {
      setCircuits(prev => prev.map(c => {
        if (c.state === 'open' && c.countdown > 0) {
          const newCountdown = c.countdown - 1;
          if (newCountdown <= 0) {
            logHistory(c, 'half-open');
            return { ...c, state: 'half-open', countdown: 0, failures: 0, successes: 0 };
          }
          return { ...c, countdown: newCountdown };
        }
        return c;
      }));
    }, 1000);

    return () => {
      clearInterval(simInterval);
      clearInterval(countdownInterval);
    };
  }, []);

  return (
    <Card className="w-full max-w-5xl mx-auto bg-card text-foreground shadow-2xl font-sans">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-2xl font-bold">
          <Zap className="h-7 w-7 text-primary" />
          Circuit Breaker Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="history">Trip History</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {circuits.map((circuit) => (
                <Card key={circuit.id} className="bg-background/50 flex flex-col hover:border-primary/50 transition-colors">
                  <CardHeader className="flex flex-row items-start justify-between pb-3">
                    <CardTitle className="text-lg font-semibold">{circuit.name}</CardTitle>
                    <StateBadge state={circuit.state} />
                  </CardHeader>
                  <CardContent className="flex-grow space-y-4">
                    <StateMachineDiagram currentState={circuit.state} />
                    <div className="space-y-3 pt-2">
                      <div>
                        <div className="flex justify-between text-sm mb-1 text-muted-foreground">
                          <span>Failure Threshold</span>
                          <span>{circuit.failures} / {circuit.failureThreshold}</span>
                        </div>
                        <div className="w-full bg-border rounded-full h-2.5">
                          <motion.div
                            className="bg-red-500 h-2.5 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${(circuit.failures / circuit.failureThreshold) * 100}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                      <AnimatePresence>
                        {circuit.state === 'open' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: '8px' }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className="text-sm text-yellow-400 flex items-center gap-2 font-medium"
                          >
                            <AlertTriangle className="h-4 w-4" />
                            <span>Auto-reset in {circuit.countdown}s...</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <div className="flex justify-between text-sm pt-2">
                        <span className="font-medium">Successes: <span className="text-green-400 font-bold">{circuit.successes}</span></span>
                        <span className="font-medium">Failures: <span className="text-red-400 font-bold">{circuit.failures}</span></span>
                      </div>
                    </div>
                  </CardContent>
                  <div className="flex items-center justify-end gap-2 p-4 pt-2">
                    <Button variant="outline" size="sm" onClick={() => tripCircuit(circuit.id)} disabled={circuit.state === 'open'} aria-label={`Trip ${circuit.name} circuit`}>
                      <PowerOff className="h-4 w-4 mr-2" /> Manual Trip
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => resetCircuit(circuit.id)} disabled={circuit.state === 'closed'} aria-label={`Reset ${circuit.name} circuit`}>
                      <RefreshCw className="h-4 w-4 mr-2" /> Manual Reset
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="history" className="mt-6">
            <Card className="bg-background/50">
              <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5"/>Recent State Changes</CardTitle></CardHeader>
              <CardContent className="max-h-[440px] overflow-y-auto">
                <div className="space-y-1">
                  <AnimatePresence initial={false}>
                    {tripHistory.map((entry) => (
                      <motion.div
                        key={entry.timestamp.toISOString()}
                        layout
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                        className="flex items-center justify-between p-2.5 rounded-md border border-transparent hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <StateBadge state={entry.state} />
                          <div>
                            <span className="font-semibold">{entry.name}</span>
                            <span className="text-muted-foreground"> moved to state </span>
                            <span className="font-bold capitalize">{entry.state.replace('-', ' ')}</span>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">{entry.timestamp.toLocaleTimeString()}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {tripHistory.length === 0 && <p className="text-muted-foreground text-center p-8">No state changes recorded yet.</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
