import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Users, Shield, ShieldAlert, Settings, X, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

// --- Component Implementation ---

const RateLimiterDashboard = () => {
  const [requestsPerSecond, setRequestsPerSecond] = useState(Array(30).fill(0));
  const [throttledLog, setThrottledLog] = useState<{id: number; ip: string; timestamp: string}[]>([]);
  const [rateLimits, setRateLimits] = useState<Record<string, { limit: number; cost: number }>>({
    '/api/users': { limit: 100, cost: 1 },
    '/api/posts': { limit: 200, cost: 2 },
    '/api/analytics': { limit: 50, cost: 5 },
  });

  const userQuotas = useMemo(() => [
    { id: 'user-123', name: 'Alice', usage: 78, tokens: 780, limit: 1000 },
    { id: 'user-456', name: 'Bob', usage: 45, tokens: 450, limit: 1000 },
    { id: 'user-789', name: 'Charlie', usage: 92, tokens: 920, limit: 1000 },
  ], []);

  useEffect(() => {
    const interval = setInterval(() => {
      const newRps = Math.floor(Math.random() * 25) + 5;
      setRequestsPerSecond(prev => [...prev.slice(1), newRps]);

      if (Math.random() < 0.1) {
        setThrottledLog(prev => [
          { id: Date.now(), ip: `192.168.1.${Math.floor(Math.random() * 255)}`, timestamp: new Date().toISOString() },
          ...prev
        ].slice(0, 5));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLimitChange = (endpoint: string, amount: number) => {
    setRateLimits(prev => ({
      ...prev,
      [endpoint]: { ...prev[endpoint], limit: Math.max(10, prev[endpoint].limit + amount) }
    }));
  };

  const Sparkline = ({ data }: { data: number[] }) => (
    <svg width="100%" height="40" className="-ml-2">
      <path
        d={`M0,${40 - data[0] / 30 * 40} ` + data.map((p: number, i: number) => `L${(i / (data.length - 1)) * 100}%,${40 - p / 30 * 40}`).join(' ')}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
      />
    </svg>
  );

  return (
    <div className="bg-background text-foreground p-6 font-sans grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold col-span-1 lg:col-span-3 flex items-center"><BarChart className="mr-3 h-8 w-8"/>Rate Limiter Dashboard</h1>

      <Card className="lg:col-span-2">
        <CardHeader><CardTitle>Token Bucket Fill Level</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(rateLimits).map(([endpoint, { limit }]) => (
            <div key={endpoint}>
              <div className="flex justify-between items-center mb-1">
                <code className="text-sm text-muted-foreground">{endpoint}</code>
                <span className="text-sm font-medium">{limit} tokens/min</span>
              </div>
              <Progress value={Math.random() * 80 + 10} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Real-time RPS</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-baseline">
            <p className="text-4xl font-bold">{requestsPerSecond[requestsPerSecond.length - 1]}</p>
            <span className="text-sm text-muted-foreground ml-2">req/s</span>
          </div>
          <Sparkline data={requestsPerSecond} />
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader><CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5"/>Per-User Quotas</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {userQuotas.map(user => (
            <motion.div key={user.id} whileHover={{ scale: 1.03 }} transition={{ type: 'spring', stiffness: 300 }}>
              <Card className={cn('flex flex-col justify-between h-full', user.usage > 90 ? 'border-destructive/50' : '')}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{user.name}</CardTitle>
                    <Badge className={cn(user.usage > 90 ? 'bg-destructive/20 text-destructive-foreground' : 'bg-secondary text-secondary-foreground')}>{user.usage}%</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{user.tokens}<span className="text-sm font-normal text-muted-foreground"> / {user.limit} tokens</span></p>
                  <Progress value={user.usage} className="mt-2" />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center"><Shield className="mr-2 h-5 w-5"/>Rate Limit Headers</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Header</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow><TableCell>X-RateLimit-Limit</TableCell><TableCell>1000</TableCell></TableRow>
              <TableRow><TableCell>X-RateLimit-Remaining</TableCell><TableCell>{1000 - userQuotas[0].tokens}</TableCell></TableRow>
              <TableRow><TableCell>X-RateLimit-Reset</TableCell><TableCell>{Math.floor(Date.now() / 1000) + 3600}</TableCell></TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center"><ShieldAlert className="mr-2 h-5 w-5"/>Throttled Requests</CardTitle></CardHeader>
        <CardContent>
          <AnimatePresence>
            {throttledLog.map(log => (
              <motion.div key={log.id} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                <div className="flex justify-between items-center text-sm p-2 rounded-lg hover:bg-muted/50">
                  <span className="text-muted-foreground">IP: {log.ip}</span>
                  <span className="font-mono text-xs">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {throttledLog.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No throttled requests.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center"><Settings className="mr-2 h-5 w-5"/>Adjust Rate Limits</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(rateLimits).map(([endpoint, { limit }]) => (
            <div key={endpoint} className="flex items-center justify-between">
              <code className="text-sm">{endpoint}</code>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => handleLimitChange(endpoint, -10)}><Minus className="h-4 w-4"/></Button>
                <span className="font-mono w-12 text-center">{limit}</span>
                <Button variant="outline" size="icon" onClick={() => handleLimitChange(endpoint, 10)}><Plus className="h-4 w-4"/></Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

    </div>
  );
};

export default RateLimiterDashboard;
