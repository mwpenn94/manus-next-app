import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ZoomIn, ZoomOut, Server, Database, Cloud, Globe, Shield, Waypoints, Network } from 'lucide-react';
import { cn } from "@/lib/utils";

// --- TYPE DEFINITIONS ---
type ServiceStatus = 'healthy' | 'degraded' | 'unhealthy';

interface Service {
  id: string;
  name: string;
  type: string;
  status: ServiceStatus;
  icon: React.ElementType;
  details: Record<string, string>;
}

interface Connection {
  from: string;
  to: string;
  protocol: string;
}

interface Tier {
  id: string;
  name: string;
  services: Service[];
}

// --- MOCK DATA ---
const mockTiers: Tier[] = [
  {
    id: 'client',
    name: 'Client Tier',
    services: [
      { id: 'client-browser', name: 'User Browser', type: 'Client', status: 'healthy', icon: Globe, details: { 'Location': 'Global', 'Framework': 'React' } },
    ]
  },
  {
    id: 'delivery',
    name: 'Delivery Tier',
    services: [
        { id: 'cdn', name: 'CDN', type: 'Content Delivery', status: 'healthy', icon: Cloud, details: { 'Provider': 'Cloudflare', 'PoPs': '250+' } },
        { id: 'lb', name: 'Load Balancer', type: 'Balancer', status: 'healthy', icon: Waypoints, details: { 'Algorithm': 'Round Robin', 'HA': 'Active-Passive' } },
    ]
  },
  {
    id: 'application',
    name: 'Application Tier',
    services: [
      { id: 'app-server-1', name: 'App Server 1', type: 'Backend', status: 'healthy', icon: Server, details: { 'Region': 'us-east-1', 'Runtime': 'Node.js' } },
      { id: 'app-server-2', name: 'App Server 2', type: 'Backend', status: 'degraded', icon: Server, details: { 'Region': 'us-east-1', 'Runtime': 'Node.js' } },
      { id: 'auth-service', name: 'Auth Service', type: 'Microservice', status: 'healthy', icon: Shield, details: { 'Provider': 'Okta', 'Protocol': 'OAuth 2.0' } },
    ]
  },
  {
    id: 'data',
    name: 'Data Tier',
    services: [
      { id: 'db', name: 'Primary DB', type: 'Database', status: 'healthy', icon: Database, details: { 'Engine': 'PostgreSQL', 'Replicas': '2' } },
      { id: 'cache', name: 'Redis Cache', type: 'Cache', status: 'unhealthy', icon: Network, details: { 'Version': '7.0', 'Mode': 'Cluster' } },
    ]
  }
];

const mockConnections: Connection[] = [
  { from: 'client-browser', to: 'cdn', protocol: 'HTTPS' },
  { from: 'cdn', to: 'lb', protocol: 'HTTPS' },
  { from: 'lb', to: 'app-server-1', protocol: 'HTTP' },
  { from: 'lb', to: 'app-server-2', protocol: 'HTTP' },
  { from: 'app-server-1', to: 'auth-service', protocol: 'gRPC' },
  { from: 'app-server-2', to: 'auth-service', protocol: 'gRPC' },
  { from: 'app-server-1', to: 'db', protocol: 'TCP' },
  { from: 'app-server-2', to: 'db', protocol: 'TCP' },
  { from: 'app-server-1', to: 'cache', protocol: 'TCP' },
];

const statusColors: Record<ServiceStatus, string> = {
  healthy: 'bg-green-500',
  degraded: 'bg-yellow-500',
  unhealthy: 'bg-red-500',
};

// --- HELPER COMPONENTS ---
const ServiceBox = React.forwardRef<HTMLDivElement, { service: Service; onClick: (service: Service) => void }>(({ service, onClick }, ref) => (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <motion.div
                    ref={ref}
                    onClick={() => onClick(service)}
                    className="relative w-32 h-24 bg-card border border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted transition-colors duration-200"
                    whileHover={{ scale: 1.05 }}
                    layoutId={`service-${service.id}`}
                >
                    <div className={cn("absolute top-2 right-2 w-3 h-3 rounded-full", statusColors[service.status])} />
                    <service.icon className="w-8 h-8 text-foreground mb-1" />
                    <p className="text-xs text-center text-muted-foreground">{service.name}</p>
                </motion.div>
            </TooltipTrigger>
            <TooltipContent>
                <p>{service.type}</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
));

// --- MAIN COMPONENT ---
export default function InfrastructureDiagram() {
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [zoom, setZoom] = useState(1);

    const serviceRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const diagramAreaRef = useRef<HTMLDivElement>(null);
    const [lineCoords, setLineCoords] = useState<Array<{x1: number, y1: number, x2: number, y2: number, protocol: string}>>([]);

    useEffect(() => {
        const calculateCoords = () => {
            if (!diagramAreaRef.current) return;
            const containerRect = diagramAreaRef.current.getBoundingClientRect();

            const coords = mockConnections.map(conn => {
                const fromEl = serviceRefs.current[conn.from];
                const toEl = serviceRefs.current[conn.to];

                if (fromEl && toEl) {
                    const fromRect = fromEl.getBoundingClientRect();
                    const toRect = toEl.getBoundingClientRect();

                    const x1 = (fromRect.right - containerRect.left) / zoom;
                    const y1 = (fromRect.top + fromRect.height / 2 - containerRect.top) / zoom;
                    const x2 = (toRect.left - containerRect.left) / zoom;
                    const y2 = (toRect.top + toRect.height / 2 - containerRect.top) / zoom;

                    return { x1, y1, x2, y2, protocol: conn.protocol };
                }
                return null;
            }).filter((c): c is {x1: number, y1: number, x2: number, y2: number, protocol: string} => c !== null);
            setLineCoords(coords);
        };

        calculateCoords();
        const handleResize = () => calculateCoords();
        window.addEventListener('resize', handleResize);
        
        // Recalculate on modal close
        if (!selectedService) {
            setTimeout(calculateCoords, 300); // delay for animation
        }

        return () => window.removeEventListener('resize', handleResize);
    }, [zoom, selectedService]);

    return (
        <div className="w-full h-[700px] bg-background text-foreground flex flex-col p-4 rounded-lg border relative">
            <h1 className="text-2xl font-bold mb-4">Infrastructure Diagram</h1>
            <div className="flex-grow relative overflow-hidden" id="diagram-container">
                <AnimatePresence>
                    {selectedService && (
                        <motion.div 
                            className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center p-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedService(null)}
                        >
                            <motion.div
                                layoutId={`service-${selectedService.id}`}
                                className="w-full max-w-md bg-card rounded-lg border border-border overflow-hidden shadow-2xl"
                                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            >
                                <CardHeader className="flex flex-row items-center space-x-4">
                                    <selectedService.icon className="w-8 h-8" />
                                    <CardTitle>{selectedService.name}</CardTitle>
                                    <div className={cn("w-4 h-4 rounded-full ml-auto", statusColors[selectedService.status])} />
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground mb-4">{selectedService.type}</p>
                                    <Separator className="my-4" />
                                    <h4 className="font-semibold mb-2">Details</h4>
                                    <ul className="space-y-2 text-sm">
                                        {Object.entries(selectedService.details).map(([key, value]) => (
                                            <li key={key} className="flex justify-between">
                                                <span className="text-muted-foreground">{key}:</span>
                                                <span className="font-mono">{value}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
                
                <motion.div 
                    className="absolute top-0 left-0 w-full h-full origin-top-left"
                    style={{ scale: zoom }}
                >
                    <div className="relative w-full h-full p-8" ref={diagramAreaRef}>
                        <svg className="absolute top-0 left-0 w-full h-full" style={{ pointerEvents: 'none' }}>
                            <defs>
                                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto" strokeWidth="1.5">
                                    <polygon points="0 0, 10 3.5, 0 7" className="fill-border" />
                                </marker>
                            </defs>
                            {lineCoords.map((line, i) => (
                                <g key={i}>
                                    <motion.line
                                        x1={line.x1}
                                        y1={line.y1}
                                        x2={line.x2}
                                        y2={line.y2}
                                        className="stroke-border"
                                        strokeWidth="1.5"
                                        markerEnd="url(#arrowhead)"
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        transition={{ duration: 0.5, delay: i * 0.05 }}
                                    />
                                    <text x={(line.x1 + line.x2) / 2} y={(line.y1 + line.y2) / 2 - 6} className="fill-muted-foreground" fontSize="10" textAnchor="middle">
                                        {line.protocol}
                                    </text>
                                </g>
                            ))}
                        </svg>

                        <div className="flex justify-around h-full">
                            {mockTiers.map((tier) => (
                                <div key={tier.id} className="flex flex-col items-center h-full pt-8 px-4">
                                    <h3 className="text-lg font-semibold text-foreground mb-8 tracking-wider uppercase">{tier.name}</h3>
                                    <div className="flex flex-col gap-12">
                                        {tier.services.map((service) => (
                                            <ServiceBox key={service.id} service={service} onClick={setSelectedService} ref={(el) => { serviceRefs.current[service.id] = el; }} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>

            <div className="absolute bottom-6 right-6 flex items-center gap-2 z-10">
                <Card className="p-2 text-xs">
                    <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full bg-green-500"/>Healthy</div>
                    <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full bg-yellow-500"/>Degraded</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"/>Unhealthy</div>
                </Card>
                <div className="flex items-center gap-1 bg-muted p-1 rounded-md border">
                    <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(z + 0.1, 2))}><ZoomIn className="w-5 h-5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(z - 0.1, 0.5))}><ZoomOut className="w-5 h-5" /></Button>
                </div>
            </div>
        </div>
    );
}
