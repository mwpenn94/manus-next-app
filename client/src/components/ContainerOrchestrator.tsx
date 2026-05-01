import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Server, Cpu, MemoryStick, ShieldCheck, ShieldAlert, Terminal, Power, Plus, Minus, RefreshCw } from 'lucide-react';

type ServiceStatus = "running" | "stopped" | "error";
type HealthStatus = "healthy" | "unhealthy";

interface PortMapping {
  containerPort: number;
  hostPort: number;
}

interface Service {
  id: string;
  name: string;
  image: string;
  status: ServiceStatus;
  cpuUsage: number;
  memoryUsage: number;
  replicas: number;
  logs: string[];
  healthStatus: HealthStatus;
  ports: PortMapping[];
  environment: "production" | "staging" | "development";
}

const mockServices: Service[] = [
  { id: "svc-1", name: "Auth API", image: "api-gateway", status: "running", cpuUsage: 45, memoryUsage: 60, replicas: 3, logs: ["200 OK: GET /health", "Authenticated user: user-123"], healthStatus: "healthy", ports: [{ containerPort: 3000, hostPort: 8080 }], environment: "production" },
  { id: "svc-2", name: "User Database", image: "postgres-db", status: "running", cpuUsage: 25, memoryUsage: 85, replicas: 2, logs: ["Query executed in 15ms", "Connection established"], healthStatus: "healthy", ports: [{ containerPort: 5432, hostPort: 5432 }], environment: "production" },
  { id: "svc-3", name: "Frontend App", image: "webapp-ui", status: "stopped", cpuUsage: 0, memoryUsage: 0, replicas: 0, logs: ["Service stopped by user."], healthStatus: "unhealthy", ports: [{ containerPort: 80, hostPort: 80 }], environment: "staging" },
  { id: "svc-4", name: "Cache Service", image: "redis-cache", status: "error", cpuUsage: 95, memoryUsage: 98, replicas: 1, logs: ["Error: Connection refused", "Failed to connect to master"], healthStatus: "unhealthy", ports: [{ containerPort: 6379, hostPort: 6379 }], environment: "production" },
  { id: "svc-5", name: "Worker Queue", image: "task-runner", status: "running", cpuUsage: 60, memoryUsage: 50, replicas: 5, logs: ["Processing job: job-xyz", "Job completed successfully"], healthStatus: "healthy", ports: [], environment: "staging" },
  { id: "svc-6", name: "Logging Pipeline", image: "log-collector", status: "running", cpuUsage: 30, memoryUsage: 40, replicas: 2, logs: ["Ingested 1.5k logs", "Log batch forwarded"], healthStatus: "healthy", ports: [{ containerPort: 5044, hostPort: 5044 }], environment: "development" },
];

const statusConfig: Record<ServiceStatus, { color: string; icon: React.ReactNode }> = {
  running: { color: "bg-green-500", icon: <Power className="h-4 w-4" /> },
  stopped: { color: "bg-gray-500", icon: <Power className="h-4 w-4" /> },
  error: { color: "bg-red-500", icon: <ShieldAlert className="h-4 w-4" /> },
};

const ServiceCard: React.FC<{ service: Service; onUpdateReplicas: (id: string, newReplicas: number) => void }> = ({ service, onUpdateReplicas }) => {
  const handleReplicaChange = (amount: number) => {
    const newReplicas = Math.max(0, service.replicas + amount);
    onUpdateReplicas(service.id, newReplicas);
  };

  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3 }}>
      <Card className="bg-card border-border overflow-hidden h-full flex flex-col">
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
          <div className="flex items-center gap-3">
            <Server className="h-8 w-8 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg">{service.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{service.image}</p>
            </div>
          </div>
          <Badge variant={service.environment === 'production' ? 'default' : 'secondary'} className="capitalize">{service.environment}</Badge>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col justify-between pt-2">
          <div>
            <div className="flex items-center gap-2 text-sm mb-3">
              <div className={cn("h-3 w-3 rounded-full animate-pulse", statusConfig[service.status].color)} />
              <span className="capitalize">{service.status}</span>
              <span className="mx-1 text-muted-foreground">&bull;</span>
              {service.healthStatus === 'healthy' ? (
                <ShieldCheck className="h-4 w-4 text-green-500" />
              ) : (
                <ShieldAlert className="h-4 w-4 text-red-500" />
              )}
              <span className="capitalize">{service.healthStatus}</span>
            </div>

            <div className="space-y-3 text-sm mb-4">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-muted-foreground" />
                <Progress value={service.cpuUsage} className="w-full h-2" />
                <span className="w-10 text-right">{service.cpuUsage}%</span>
              </div>
              <div className="flex items-center gap-2">
                <MemoryStick className="h-4 w-4 text-muted-foreground" />
                <Progress value={service.memoryUsage} className="w-full h-2" />
                <span className="w-10 text-right">{service.memoryUsage}%</span>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold text-sm mb-2">Replicas</h4>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="outline" onClick={() => handleReplicaChange(-1)} disabled={service.replicas <= 0}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="font-mono text-lg w-12 text-center">{service.replicas}</span>
                <Button size="icon" variant="outline" onClick={() => handleReplicaChange(1)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {service.ports.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-sm mb-2">Port Mappings</h4>
                <div className="flex flex-wrap gap-2">
                  {service.ports.map(p => (
                    <Badge key={p.containerPort} variant="secondary">{`${p.hostPort}:${p.containerPort}`}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-auto">
            <div className="bg-muted rounded-md p-2 mb-3 h-20 overflow-y-auto">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Terminal className="h-4 w-4" />
                <h5 className="text-xs font-semibold">Logs</h5>
              </div>
              <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap break-all">
                {service.logs.join('\n')}
              </pre>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Restart Service
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Trigger a rolling restart of all replicas.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default function ContainerOrchestrator() {
  const [services, setServices] = useState<Service[]>(mockServices);

  const handleUpdateReplicas = useCallback((id: string, newReplicas: number) => {
    setServices(currentServices =>
      currentServices.map(s => (s.id === id ? { ...s, replicas: newReplicas } : s))
    );
  }, []);

  return (
    <div className="bg-background text-foreground p-4 sm:p-6 lg:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Container Orchestrator</h1>
          <p className="text-muted-foreground">Manage and monitor your running services.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {services.map(service => (
              <ServiceCard key={service.id} service={service} onUpdateReplicas={handleUpdateReplicas} />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
