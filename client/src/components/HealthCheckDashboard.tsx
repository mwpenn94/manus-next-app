import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Cpu, MemoryStick, HardDrive, Shield, ShieldAlert, Wrench, RefreshCw, Server, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- TYPE DEFINITIONS ---
type DependencyStatus = 'operational' | 'degraded' | 'outage';

interface Dependency {
  name: string;
  status: DependencyStatus;
  responseTime: number;
}

interface SystemResource {
  name: 'CPU' | 'Memory' | 'Disk';
  usage: number; // percentage
}

interface Incident {
  id: string;
  timestamp: Date;
  description: string;
  resolved: boolean;
}

// --- MOCK DATA ---
const initialDependencies: Dependency[] = [
  { name: 'Database', status: 'operational', responseTime: 52 },
  { name: 'Redis Cache', status: 'operational', responseTime: 15 },
  { name: 'S3 Storage', status: 'operational', responseTime: 128 },
  { name: 'External API', status: 'degraded', responseTime: 540 },
];

const initialResources: SystemResource[] = [
  { name: 'CPU', usage: 42 },
  { name: 'Memory', usage: 68 },
  { name: 'Disk', usage: 75 },
];

const initialIncidents: Incident[] = [
  { id: 'inc-1', timestamp: new Date(Date.now() - 3600000), description: 'High latency on External API', resolved: false },
  { id: 'inc-2', timestamp: new Date(Date.now() - 86400000), description: 'Database migration completed', resolved: true },
];

// --- HELPER FUNCTIONS & COMPONENTS ---
const statusConfig: { [key in DependencyStatus]: { color: string; icon: React.ReactNode } } = {
  operational: { color: 'bg-green-500', icon: <Shield className="h-4 w-4" /> },
  degraded: { color: 'bg-yellow-500', icon: <ShieldAlert className="h-4 w-4" /> },
  outage: { color: 'bg-red-500', icon: <ShieldAlert className="h-4 w-4 text-white" /> },
};

const resourceIcons = {
  CPU: <Cpu className="h-6 w-6" />,
  Memory: <MemoryStick className="h-6 w-6" />,
  Disk: <HardDrive className="h-6 w-6" />,
};

const dependencyIcons = {
  Database: <Database className="h-6 w-6" />,
  'Redis Cache': <Database className="h-6 w-6" />,
  'S3 Storage': <HardDrive className="h-6 w-6" />,
  'External API': <Server className="h-6 w-6" />,
};

const HealthCheckDashboard: React.FC = () => {
  const [dependencies, setDependencies] = useState<Dependency[]>(initialDependencies);
  const [resources, setResources] = useState<SystemResource[]>(initialResources);
  const [incidents, setIncidents] = useState<Incident[]>(initialIncidents);
  const [lastChecked, setLastChecked] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const up = 99.98;
    setUptime(up);
  }, []);

    const runHealthCheck = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      setDependencies(prev => prev.map(d => ({ ...d, status: Math.random() > 0.8 ? 'degraded' : 'operational', responseTime: Math.floor(Math.random() * 200) + 10 })))
      setResources(prev => prev.map(r => ({ ...r, usage: Math.floor(Math.random() * 80) + 10 })))
      setLastChecked(new Date());
      setIsLoading(false);
    }, 1500);
  }, []);

  const UptimeCounter = ({ targetUptime }: { targetUptime: number }) => {
    // This component is simplified as framer-motion's useMotionValue hook is not available in this context.
    return <div className="text-2xl font-bold">{targetUptime}%</div>;
  };

  return (
    <div className="bg-background text-foreground p-4 lg:p-8 font-sans dark">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Health Check Dashboard</h1>
            <p className="text-muted-foreground">Real-time system status and incident report.</p>
          </div>
          <Button onClick={runHealthCheck} disabled={isLoading} className="mt-4 sm:mt-0 w-[180px]">
            <motion.div animate={{ rotate: isLoading ? 360 : 0 }} transition={{ duration: 1, repeat: isLoading ? Infinity : 0, ease: 'linear' }}>
              <RefreshCw className="mr-2 h-4 w-4" />
            </motion.div>
            {isLoading ? 'Checking...' : 'Run Health Check'}
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                    <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <UptimeCounter targetUptime={uptime} />
                    <p className="text-xs text-muted-foreground">in the last 90 days</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Last Checked</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{lastChecked.toLocaleTimeString()}</div>
                    <p className="text-xs text-muted-foreground">{lastChecked.toLocaleDateString()}</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Incidents</CardTitle>
                    <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{incidents.filter(i => !i.resolved).length} Active</div>
                    <p className="text-xs text-muted-foreground">{incidents.length} total incidents</p>
                </CardContent>
            </Card>
        </div>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Dependency Status</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AnimatePresence>
                {dependencies.map((dep) => (
                  <motion.div key={dep.name} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}>
                    <Card>
                      <CardContent className="p-4 flex items-start">
                          <motion.div layout className={cn("w-2 h-12 rounded-full mr-4", statusConfig[dep.status].color)}></motion.div>
                          <div className="flex-1">
                              <div className="flex justify-between items-center">
                                  <h3 className="font-semibold">{dep.name}</h3>
                                  {dependencyIcons[dep.name as keyof typeof dependencyIcons]}
                              </div>
                              <p className={cn("text-sm font-semibold", dep.status === 'degraded' && 'text-yellow-500', dep.status === 'outage' && 'text-red-500')}>{dep.status.charAt(0).toUpperCase() + dep.status.slice(1)}</p>
                              <p className="text-xs text-muted-foreground">{dep.responseTime}ms response</p>
                          </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Resources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {resources.map(res => (
                    <div key={res.name}>
                        <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center">
                                {resourceIcons[res.name]} <span className="ml-2 font-medium">{res.name}</span>
                            </div>
                            <span className="text-sm font-mono">{res.usage}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2.5">
                            <motion.div className="bg-primary h-2.5 rounded-full" initial={{ width: 0 }} animate={{ width: `${res.usage}%` }} transition={{ duration: 1, ease: 'easeOut' }}></motion.div>
                        </div>
                    </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Tabs defaultValue="incidents" className="w-full">
              <TabsList className="grid w-full grid-cols-1">
                <TabsTrigger value="incidents">Incident Timeline</TabsTrigger>
              </TabsList>
              <TabsContent value="incidents">
                <Card>
                  <CardContent className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
                    <AnimatePresence initial={false}>
                    {incidents.map(incident => (
                      <motion.div key={incident.id} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="flex items-start">
                        <div className="h-5 w-5 flex-shrink-0 mt-0.5">
                          {incident.resolved ? <Shield className="h-5 w-5 text-green-500" /> : <ShieldAlert className="h-5 w-5 text-yellow-500" />}
                        </div>
                        <div className="ml-3 flex-1">
                          <p className="text-sm leading-tight">{incident.description}</p>
                          <p className="text-xs text-muted-foreground">{incident.timestamp.toLocaleString()}</p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}

export default HealthCheckDashboard;
