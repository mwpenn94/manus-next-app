import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Wrench, ShieldAlert, Clock } from "lucide-react";

// Type Definitions
type RateLimitTier = "Free" | "Pro" | "Enterprise";

type EndpointLimit = {
  id: string;
  name: string;
  limit: number;
  used: number;
  resetsIn: number; // seconds
  burstAllowance: number;
};

type Consumer = {
  id: string;
  name: string;
  requests: number;
};

type TierDetails = {
  name: RateLimitTier;
  requestsPerMinute: number;
  burst: number;
  concurrentConnections: number;
};

// Mock Data
const mockEndpoints: EndpointLimit[] = [
  { id: "ep-1", name: "/v1/users", limit: 1000, used: 750, resetsIn: 1800, burstAllowance: 200 },
  { id: "ep-2", name: "/v1/posts", limit: 1500, used: 1450, resetsIn: 1200, burstAllowance: 300 },
  { id: "ep-3", name: "/v1/analytics", limit: 500, used: 100, resetsIn: 3600, burstAllowance: 100 },
  { id: "ep-4", name: "/v1/search", limit: 2000, used: 1980, resetsIn: 600, burstAllowance: 500 },
  { id: "ep-5", name: "/v1/files/upload", limit: 250, used: 245, resetsIn: 900, burstAllowance: 50 },
  { id: "ep-6", name: "/v1/webhooks", limit: 5000, used: 1200, resetsIn: 2400, burstAllowance: 1000 },
  { id: "ep-7", name: "/v1/payments", limit: 750, used: 300, resetsIn: 1800, burstAllowance: 150 },
  { id: "ep-8", name: "/v1/integrations", limit: 1200, used: 950, resetsIn: 1500, burstAllowance: 250 },
];

const mockTopConsumers: Consumer[] = [
  { id: "consumer-1", name: "WebApp-Main", requests: 3450 },
  { id: "consumer-2", name: "Mobile-iOS", requests: 2100 },
  { id: "consumer-3", name: "Data-Pipeline-A", requests: 1500 },
  { id: "consumer-4", name: "Partner-Integration-X", requests: 980 },
  { id: "consumer-5", name: "Internal-Tool-B", requests: 420 },
];

const mockTierDetails: TierDetails[] = [
    { name: "Free", requestsPerMinute: 60, burst: 10, concurrentConnections: 5 },
    { name: "Pro", requestsPerMinute: 1000, burst: 200, concurrentConnections: 50 },
    { name: "Enterprise", requestsPerMinute: 5000, burst: 1000, concurrentConnections: 250 },
];

const generateUsageTimeline = () => {
    const data = [];
    const now = new Date();
    for (let i = 60; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 1000);
        const requests = Math.floor(Math.random() * (150 - 20 + 1)) + 20; // Random requests between 20 and 150
        data.push({ time, requests });
    }
    return data;
};

export default function APIRateLimitViewer() {
    const [endpoints, setEndpoints] = useState<EndpointLimit[]>(mockEndpoints);
    const usageTimeline = useMemo(() => generateUsageTimeline(), []);

    useEffect(() => {
        const timer = setInterval(() => {
            setEndpoints(prevEndpoints =>
                prevEndpoints.map(ep => ({
                    ...ep,
                    resetsIn: ep.resetsIn > 0 ? ep.resetsIn - 1 : 0,
                    used: ep.resetsIn > 1 ? ep.used + Math.floor(Math.random() * (5 - 0 + 1)) : ep.used
                }))
            );
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds: number): string => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const highUsageEndpoints = endpoints.filter(ep => (ep.used / ep.limit) > 0.95);

    const UsageTimelineChart = ({ data }: { data: { time: Date; requests: number }[] }) => {
        const maxRequests = Math.max(...data.map(d => d.requests), 0) * 1.2;
        const width = 500;
        const height = 256;

        return (
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                </defs>

                <path
                    d={`M0,${height} ` + data.map((d, i) => {
                        const x = (i / (data.length - 1)) * width;
                        const y = height - (d.requests / maxRequests) * height;
                        return `L${x.toFixed(2)},${y.toFixed(2)}`;
                    }).join(' ') + ` L${width},${height} Z`}
                    fill="url(#chart-gradient)"
                />
                <path
                    d={data.map((d, i) => {
                        const x = (i / (data.length - 1)) * width;
                        const y = height - (d.requests / maxRequests) * height;
                        return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
                    }).join(' ')}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                />
            </svg>
        );
    };

    return (
        <TooltipProvider>
            <div className="bg-background text-foreground p-4 sm:p-6 md:p-8 space-y-8">
                <header className="flex justify-between items-center">
                    <h1 className="text-2xl sm:text-3xl font-bold">API Rate Limit Dashboard</h1>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Live Updates</span>
                    </div>
                </header>

                {highUsageEndpoints.length > 0 && (
                    <AnimatePresence>
                        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                            <Alert variant="destructive">
                                <ShieldAlert className="h-4 w-4" />
                                <AlertTitle>Throttle Warning!</AlertTitle>
                                <AlertDescription>
                                    The following endpoints are approaching their rate limits: {
                                        highUsageEndpoints.map(ep => ep.name).join(', ')
                                    }
                                </AlertDescription>
                            </Alert>
                        </motion.div>
                    </AnimatePresence>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <main className="lg:col-span-2 space-y-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Endpoint Rate Limits</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {endpoints.map(endpoint => (
                                    <motion.div layout key={endpoint.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} whileHover={{ scale: 1.02, transition: { duration: 0.2 } }} className="space-y-3 p-4 rounded-lg border bg-muted/20">
                                        <div className="flex justify-between items-start">
                                            <p className="font-semibold">{endpoint.name}</p>
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <Badge variant={ (endpoint.used / endpoint.limit) > 0.9 ? "destructive" : "secondary" }>
                                                        {Math.round((endpoint.used / endpoint.limit) * 100)}%
                                                    </Badge>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Burst Allowance: {endpoint.burstAllowance}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                        <div className="w-full bg-muted rounded-full h-2">
                                            <motion.div className="h-2 rounded-full" style={{ backgroundColor: 'hsl(var(--primary))', width: `${(endpoint.used / endpoint.limit) * 100}%` }} initial={{ width: 0 }} animate={{ width: `${(endpoint.used / endpoint.limit) * 100}%` }} transition={{ duration: 0.5, ease: 'easeOut' }} />
                                        </div>
                                        <div className="text-xs text-muted-foreground flex justify-between items-center">
                                            <span>{endpoint.used.toLocaleString()} / {endpoint.limit.toLocaleString()} requests</span>
                                            <span>Resets in: {formatTime(endpoint.resetsIn)}</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Usage Timeline (Last Hour)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-64 bg-muted/20 rounded-md p-4"><UsageTimelineChart data={usageTimeline} /></div>
                            </CardContent>
                        </Card>
                    </main>
                    <aside className="space-y-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Top Consumers</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Consumer</TableHead>
                                            <TableHead className="text-right">Requests</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {mockTopConsumers.map(consumer => (
                                            <TableRow key={consumer.id}>
                                                <TableCell className="font-medium">{consumer.name}</TableCell>
                                                <TableCell className="text-right">{consumer.requests.toLocaleString()}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Wrench className="h-5 w-5" />
                                    <span>Rate Limit Tiers</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Tier</TableHead>
                                            <TableHead>RPM</TableHead>
                                            <TableHead>Burst</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {mockTierDetails.map(tier => (
                                            <TableRow key={tier.name}>
                                                <TableCell><Badge variant={tier.name === 'Pro' ? "default" : "secondary"}>{tier.name}</Badge></TableCell>
                                                <TableCell>{tier.requestsPerMinute.toLocaleString()}</TableCell>
                                                <TableCell>{tier.burst.toLocaleString()}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </aside>
                </div>
            </div>
        </TooltipProvider>
    );
}
