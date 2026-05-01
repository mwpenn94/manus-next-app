import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { ShieldAlert, ShieldCheck, Shield, RefreshCw, AlertTriangle, Info, X } from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface AgentErrorRecoveryProps {
  error: {
    code: string;
    message: string;
    timestamp: number;
    retryCount: number;
    maxRetries: number;
    nextRetryAt?: number;
    isRetrying: boolean;
    canRetry: boolean;
  };
  onRetry: () => void;
  onDismiss: () => void;
  onReport: () => void;
  recoveryOptions?: Array<{
    id: string;
    label: string;
    description: string;
    action: () => void;
  }>;
}

const getSeverity = (retryCount: number, maxRetries: number): { level: 'warning' | 'error' | 'critical', icon: React.ReactNode, color: string } => {
  const progress = retryCount / maxRetries;
  if (progress > 0.75) {
    return { level: 'critical', icon: <ShieldAlert className="h-6 w-6 text-destructive" />, color: 'text-destructive' };
  }
  if (progress > 0.4) {
    return { level: 'error', icon: <ShieldAlert className="h-6 w-6 text-yellow-500" />, color: 'text-yellow-500' };
  }
  return { level: 'warning', icon: <Shield className="h-6 w-6 text-muted-foreground" />, color: 'text-muted-foreground' };
};

const CountdownCircle: React.FC<{ nextRetryAt: number, isRetrying: boolean }> = ({ nextRetryAt, isRetrying }) => {
  const [countdown, setCountdown] = useState(0);
  const controls = useAnimation();

  const totalDuration = useMemo(() => {
    if (!nextRetryAt) return 0;
    const now = Date.now();
    return (nextRetryAt - now) / 1000;
  }, [nextRetryAt]);

  useEffect(() => {
    if (!isRetrying || !nextRetryAt) {
      setCountdown(0);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, (nextRetryAt - now) / 1000);
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isRetrying, nextRetryAt]);

  useEffect(() => {
    if (isRetrying && totalDuration > 0) {
      controls.set({ pathLength: 1 });
      controls.start({
        pathLength: 0,
        transition: { duration: totalDuration, ease: "linear" as const }
      });
    } else {
      controls.set({ pathLength: 0 });
    }
  }, [isRetrying, totalDuration, controls]);

  if (!isRetrying || !nextRetryAt || countdown <= 0) {
    return null;
  }

  return (
    <div className="relative h-16 w-16">
      <svg className="absolute top-0 left-0 h-full w-full" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          className="stroke-current text-border"
          strokeWidth="10"
          fill="transparent"
        />
        <motion.circle
          cx="50"
          cy="50"
          r="45"
          className="stroke-current text-primary"
          strokeWidth="10"
          fill="transparent"
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          animate={controls}
        />
      </svg>
      <div className="absolute top-0 left-0 flex h-full w-full items-center justify-center text-lg font-bold text-foreground">
        {Math.ceil(countdown)}
      </div>
    </div>
  );
};

const ExponentialBackoffViz: React.FC<{ retryCount: number, maxRetries: number }> = ({ retryCount, maxRetries }) => {
    return (
        <div className="flex items-end justify-center space-x-1 h-12 mt-2">
            {Array.from({ length: maxRetries }).map((_, i) => {
                const height = `${(Math.pow(1.6, i) / Math.pow(1.6, maxRetries - 1)) * 100}%`;
                return (
                    <motion.div
                        key={i}
                        className={cn(
                            "w-2 rounded-full",
                            i < retryCount ? "bg-yellow-500" : "bg-border"
                        )}
                        initial={{ height: 0 }}
                        animate={{ height }}
                        transition={{ type: "spring" as const, stiffness: 300, damping: 20, delay: i * 0.05 }}
                    />
                );
            })}
        </div>
    );
};

export const AgentErrorRecovery: React.FC<AgentErrorRecoveryProps> = ({ error, onRetry, onDismiss, onReport, recoveryOptions }) => {
  const { code, message, timestamp, retryCount, maxRetries, nextRetryAt, isRetrying, canRetry } = error;
  const severity = getSeverity(retryCount, maxRetries);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.98 }}
        transition={{ type: "spring" as const, damping: 30, stiffness: 300 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      >
        <Card className="w-full max-w-2xl shadow-2xl border-2 border-border">
          <CardHeader className="flex flex-row items-start justify-between">
            <div className="flex items-center space-x-4">
              {severity.icon}
              <div>
                <CardTitle className={cn("text-xl", severity.color)}>Agent Error: {severity.level}</CardTitle>
                <p className="text-sm text-muted-foreground">Code: {code} | Occurred: {new Date(timestamp).toLocaleString()}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onDismiss} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <Alert variant={severity.level === 'critical' ? "destructive" : "default"} className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Details</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="flex flex-col items-center justify-center space-y-3 p-4 bg-card-foreground/5 rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">Automatic Retry</p>
                {isRetrying && nextRetryAt ? (
                  <CountdownCircle nextRetryAt={nextRetryAt} isRetrying={isRetrying} />
                ) : (
                  <div className="flex items-center justify-center h-16 w-16 text-muted-foreground">
                    {isRetrying ? <RefreshCw className="h-8 w-8 animate-spin" /> : <ShieldCheck className="h-8 w-8 text-green-500" />}
                  </div>
                )}
                <div className="text-center">
                    <p className="font-semibold">Attempt {retryCount + 1} of {maxRetries}</p>
                    <div className="flex justify-center space-x-1 mt-1">
                        {Array.from({ length: maxRetries }).map((_, i) => (
                            <motion.div 
                                key={i} 
                                className={cn("h-2 w-2 rounded-full", i <= retryCount ? "bg-primary" : "bg-border")}
                                initial={{ scale: 0.5, opacity: 0.5 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: i * 0.1 }}
                            />
                        ))}
                    </div>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center space-y-2 p-4 bg-card-foreground/5 rounded-lg">
                 <p className="text-sm font-medium text-muted-foreground">Retry Delay Pattern</p>
                 <ExponentialBackoffViz retryCount={retryCount} maxRetries={maxRetries} />
                 <p className="text-xs text-muted-foreground text-center">Exponential backoff increases wait time after each failure.</p>
              </div>
            </div>

            {recoveryOptions && recoveryOptions.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2 flex items-center"><Info className="h-5 w-5 mr-2 text-primary"/>Recovery Suggestions</h3>
                <div className="space-y-2">
                  {recoveryOptions.map(option => (
                    <motion.div
                      key={option.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <button onClick={option.action} className="w-full text-left p-3 rounded-lg bg-card-foreground/5 hover:bg-accent hover:text-accent-foreground transition-colors">
                        <p className="font-semibold">{option.label}</p>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-end space-x-2 bg-card-foreground/5 py-3 px-6">
            <Button variant="ghost" onClick={onReport}>Report Issue</Button>
            <Button variant="secondary" onClick={onDismiss}>Dismiss</Button>
            <Button onClick={onRetry} disabled={!canRetry || isRetrying}>
              {isRetrying ? (
                <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Retrying...</>
              ) : (
                'Retry Now'
              )}
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};
