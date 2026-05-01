import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertCircle, CheckCircle, Clock, Database, Layers, Server, ShieldAlert, SlidersHorizontal, Wifi, Zap } from 'lucide-react';

// Type Definitions
type ServiceStatus = 'operational' | 'degraded' | 'outage';

interface Service {
  id: string;
  name: string;
  status: ServiceStatus;
  uptime: number;
  responseTime: number;
  dependencies: string[];
}

interface Incident {
  id: string;
  timestamp: string;
  service: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}

interface AlertRule {
  id: string;
  metric: 'uptime' | 'responseTime' | 'errorRate';
  threshold: number;
  operator: '>' | '<';
  enabled: boolean;
}

// Mock Data
const mockServices: Service[] = [
  { id: 'api', name: 'API Gateway', status: 'operational', uptime: 99.98, responseTime: 120, dependencies: ['database', 'cache'] },
  { id: 'database', name: 'Primary Database', status: 'operational', uptime: 99.99, responseTime: 45, dependencies: ['storage'] },
  { id: 'cache', name: 'Redis Cache', status: 'degraded', uptime: 99.50, responseTime: 250, dependencies: [] },
  { id: 'queue', name: 'Message Queue', status: 'operational', uptime: 100.00, responseTime: 15, dependencies: ['storage'] },
  { id: 'storage', name: 'Object Storage', status: 'operational', uptime: 99.99, responseTime: 80, dependencies: [] },
  { id: 'auth', name: 'Authentication Service', status: 'outage', uptime: 98.2, responseTime: 1500, dependencies: ['database'] },
];

const mockIncidents: Incident[] = [
  { id: 'inc-1', timestamp: '2026-05-01T10:00:00Z', service: 'Authentication Service', severity: 'critical', description: 'Full service outage due to certificate expiration.' },
  { id: 'inc-2', timestamp: '2026-04-30T18:30:00Z', service: 'Redis Cache', severity: 'high', description: 'High latency and intermittent connection drops.' },
  { id: 'inc-3', timestamp: '2026-04-29T05:00:00Z', service: 'API Gateway', severity: 'medium', description: 'Increased 5xx error rate on /v1/users endpoint.' },
];

const mockAlertRules: AlertRule[] = [
  { id: 'rule-1', metric: 'responseTime', operator: '>', threshold: 500, enabled: true },
  { id: 'rule-2', metric: 'uptime', operator: '<', threshold: 99.9, enabled: true },
  { id: 'rule-3', metric: 'errorRate', operator: '>', threshold: 5, enabled: false },
];

const serviceIcons: { [key: string]: React.ElementType } = {
  api: Layers,
  database: Database,
  cache: Zap,
  queue: Server,
  storage: ShieldAlert,
  auth: Wifi,
};

const statusConfig = {
  operational: { color: 'bg-green-500', icon: CheckCircle, label: 'Operational' },
  degraded: { color: 'bg-yellow-500', icon: AlertCircle, label: 'Degraded' },
  outage: { color: 'bg-red-500', icon: ShieldAlert, label: 'Outage' },
};

const ResponseTimeGauge = ({ time }: { time: number }) => {
  const percentage = Math.min(time / 500, 1) * 100;
  const color = percentage > 80 ? 'bg-red-500' : percentage > 50 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="w-full bg-muted rounded-full h-2.5">
      <motion.div
        className={`h-2.5 rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  );
};

const DependencyGraph = ({ services }: { services: Service[] }) => {
  const positions = useMemo(() => {
    const pos: { [key: string]: { x: number; y: number } } = {};
    services.forEach((service, i) => {
      const angle = (i / services.length) * 2 * Math.PI;
      pos[service.id] = {
        x: 50 + Math.cos(angle) * 40,
        y: 50 + Math.sin(angle) * 40,
      };
    });
    return pos;
  }, [services]);

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3" markerHeight="3" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
        </marker>
      </defs>
      {services.map((service) =>
        service.dependencies.map((depId) => {
          const start = positions[service.id];
          const end = positions[depId];
          if (!start || !end) return null;
          return (
            <line
              key={`${service.id}-${depId}`}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke="#475569"
              strokeWidth="0.5"
              markerEnd="url(#arrow)"
            />
          );
        })
      )}
      {services.map((service) => {
        const pos = positions[service.id];
        const StatusIcon = statusConfig[service.status].icon;
        return (
          <g key={service.id} transform={`translate(${pos.x}, ${pos.y})`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <circle r="4" className={`${statusConfig[service.status].color.replace('bg-', 'fill-')} cursor-pointer`} />
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-bold">{service.name}</p>
                <p>Status: {statusConfig[service.status].label}</p>
              </TooltipContent>
            </Tooltip>
          </g>
        );
      })}
    </svg>
  );
};

export default function SystemHealthMonitor() {
  const [services, setServices] = useState<Service[]>(mockServices);
  const [alertRules, setAlertRules] = useState<AlertRule[]>(mockAlertRules);

  const handleRuleToggle = useCallback((id: string, enabled: boolean) => {
    setAlertRules(prevRules =>
      prevRules.map(rule => (rule.id === id ? { ...rule, enabled } : rule))
    );
  }, []);

  return (
    <TooltipProvider>
      <div className="bg-background text-foreground p-6 font-sans">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">System Health</h1>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-sm text-muted-foreground">Real-time updates</span>
          </div>
        </header>

        <section id="service-status">
          <h2 className="text-xl font-semibold mb-4">Service Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) => {
              const Icon = serviceIcons[service.id] || Server;
              const StatusIcon = statusConfig[service.status].icon;
              return (
                <motion.div key={service.id} layout whileHover={{ scale: 1.03 }}>
                  <Card className="bg-card border-border overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <div className="flex items-center gap-3">
                        <Icon className="w-6 h-6 text-muted-foreground" />
                        <CardTitle className="text-lg font-medium">{service.name}</CardTitle>
                      </div>
                      <Tooltip>
                        <TooltipTrigger>
                          <StatusIcon className={`w-5 h-5 ${statusConfig[service.status].color.replace('bg-', 'text-')}`} />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{statusConfig[service.status].label}</p>
                        </TooltipContent>
                      </Tooltip>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-baseline text-sm mb-2">
                        <span className="text-muted-foreground">Uptime</span>
                        <span className="font-semibold text-green-400">{service.uptime.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between items-baseline text-sm">
                        <span className="text-muted-foreground">Response Time</span>
                        <span className="font-semibold">{service.responseTime}ms</span>
                      </div>
                      <div className="mt-3">
                        <ResponseTimeGauge time={service.responseTime} />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </section>

        <section id="incidents-and-dependencies" className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Recent Incidents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockIncidents.map((incident, index) => (
                  <div key={incident.id}>
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-4 h-4 rounded-full ${{
                          critical: 'bg-red-500',
                          high: 'bg-orange-500',
                          medium: 'bg-yellow-500',
                          low: 'bg-blue-500',
                        }[incident.severity]}`} />
                        {index < mockIncidents.length - 1 && (
                          <div className="w-px h-16 bg-border mt-1"></div>
                        )}
                      </div>
                      <div className="flex-1 -mt-1">
                        <p className="font-semibold">{incident.service}</p>
                        <p className="text-sm text-muted-foreground">{new Date(incident.timestamp).toLocaleString()}</p>
                        <p className="text-sm mt-1">{incident.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Dependency Graph</CardTitle>
            </CardHeader>
            <CardContent className="relative h-80">
              <DependencyGraph services={services} />
            </CardContent>
          </Card>
        </section>

        <section id="configuration" className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5" />
                Alert Rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alertRules.map(rule => (
                  <motion.div key={rule.id} layout className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{`${rule.metric.charAt(0).toUpperCase() + rule.metric.slice(1)} ${rule.operator} ${rule.threshold}${rule.metric === 'uptime' ? '%' : rule.metric === 'responseTime' ? 'ms' : ''}`}</p>
                      <p className="text-xs text-muted-foreground">{`Notify when ${rule.metric} is ${rule.operator === '>' ? 'above' : 'below'} ${rule.threshold}`}</p>
                    </div>
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={(checked: boolean) => handleRuleToggle(rule.id, checked)}
                      aria-label={`Toggle rule ${rule.id}`}
                    />
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Maintenance Windows
              </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <p className="text-muted-foreground mb-2">Next window:</p>
                    <p className="text-lg font-semibold">May 15, 2026, 02:00-04:00 UTC</p>
                    <Button variant="outline" className="mt-4">Schedule New</Button>
                </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </TooltipProvider>
  );
}
