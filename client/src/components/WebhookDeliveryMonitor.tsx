import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Clock, Trash2, RefreshCw, Settings, PlusCircle, ChevronRight, Server, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

// Type Definitions
type DeliveryStatus = 'delivered' | 'retrying' | 'failed' | 'dead-lettered';

type DeliveryAttempt = {
  id: string;
  eventId: string;
  timestamp: string;
  status: DeliveryStatus;
  statusCode: number | null;
  latency: number; // in ms
  retryAttempt: number;
};

type WebhookEndpoint = {
  id: string;
  url: string;
  isActive: boolean;
  createdAt: string;
};

type DeadLetter = {
  id: string;
  eventId: string;
  endpointId: string;
  reason: string;
  failedAt: string;
};

// Mock Data
const mockEndpoints: WebhookEndpoint[] = [
  { id: 'wh_1', url: 'https://api.example.com/v1/webhooks/orders', isActive: true, createdAt: '2023-10-26T10:00:00Z' },
  { id: 'wh_2', url: 'https://api.another-app.com/notifications', isActive: true, createdAt: '2023-09-15T14:30:00Z' },
  { id: 'wh_3', url: 'https://internal-service.local/events', isActive: false, createdAt: '2023-08-01T18:00:00Z' },
];

const mockDeliveryAttempts: DeliveryAttempt[] = [
  { id: 'att_1', eventId: 'evt_xyz789', timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(), status: 'delivered', statusCode: 200, latency: 150, retryAttempt: 1 },
  { id: 'att_2', eventId: 'evt_xyz788', timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), status: 'delivered', statusCode: 200, latency: 120, retryAttempt: 1 },
  { id: 'att_3', eventId: 'evt_abc124', timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), status: 'failed', statusCode: 503, latency: 5000, retryAttempt: 3 },
  { id: 'att_4', eventId: 'evt_abc124', timestamp: new Date(Date.now() - 11 * 60 * 1000).toISOString(), status: 'retrying', statusCode: 503, latency: 5000, retryAttempt: 2 },
  { id: 'att_5', eventId: 'evt_def456', timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), status: 'delivered', statusCode: 200, latency: 180, retryAttempt: 1 },
  { id: 'att_6', eventId: 'evt_abc123', timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), status: 'dead-lettered', statusCode: 410, latency: 300, retryAttempt: 5 },
];

const mockDeadLetters: DeadLetter[] = [
    { id: 'dl_1', eventId: 'evt_abc123', endpointId: 'wh_1', reason: 'Endpoint returned 410 Gone after 5 attempts', failedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
];

const StatusIcon = ({ status }: { status: DeliveryStatus }) => {
  const iconMap: Record<DeliveryStatus, React.ReactElement> = {
    delivered: <CheckCircle className="h-5 w-5 text-green-500" />,
    retrying: <Clock className="h-5 w-5 text-yellow-500 animate-spin" />,
    failed: <XCircle className="h-5 w-5 text-red-500" />,
    'dead-lettered': <AlertTriangle className="h-5 w-5 text-zinc-500" />,
  };
  return iconMap[status];
};

const RetrySchedule = ({ attempt }: { attempt: number }) => {
    const nextRetries = [5, 15, 30, 60].slice(attempt-1);
    return (
        <div className="flex items-center space-x-2 mt-1">
            <p className="text-xs text-muted-foreground">Next retry in: </p>
            {nextRetries.map((t, i) => (
                <Badge key={i} variant="secondary" className="text-xs">{t} min</Badge>
            ))}
        </div>
    );
}

const WebhookDeliveryMonitor: React.FC = () => {
  const [deliveries, setDeliveries] = useState<DeliveryAttempt[]>(mockDeliveryAttempts);
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>(mockEndpoints);
  const [deadLetters, setDeadLetters] = useState<DeadLetter[]>(mockDeadLetters);
  const [_tab, setTab] = useState('timeline');

  const successRate = useMemo(() => {
    const deliveredCount = deliveries.filter(d => d.status === 'delivered').length;
    const totalCount = deliveries.length;
    return totalCount > 0 ? (deliveredCount / totalCount) * 100 : 100;
  }, [deliveries]);

  const getEndpointUrl = useCallback((id: string) => endpoints.find(e => e.id === id)?.url || 'Unknown Endpoint', [endpoints]);

  const handleRequeue = (dl: DeadLetter) => {
    // Mock requeue logic
    setDeadLetters(prev => prev.filter(d => d.id !== dl.id));
    const newAttempt: DeliveryAttempt = {
        id: `att_${Date.now()}`,
        eventId: dl.eventId,
        timestamp: new Date().toISOString(),
        status: 'retrying',
        statusCode: null,
        latency: 0,
        retryAttempt: 1,
    };
    setDeliveries(prev => [newAttempt, ...prev]);
  };

  return (
    <div className="bg-background text-foreground p-4 sm:p-6 font-sans max-w-5xl mx-auto">
      <Card className="bg-card border-border shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-x-4">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center"><Zap className="mr-2 h-6 w-6 text-primary"/>Webhook Delivery Monitor</CardTitle>
            <CardDescription>Live monitoring of your webhook delivery performance.</CardDescription>
          </div>
          <div className="flex items-center space-x-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }} className="text-right">
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className={cn("text-2xl font-bold", successRate > 95 ? 'text-green-500' : successRate > 80 ? 'text-yellow-500' : 'text-red-500')}>{successRate.toFixed(1)}%</p>
            </motion.div>
            <Button variant="outline" size="icon" aria-label="Refresh Data"><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="timeline" className="w-full" onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="dead-letter">Dead Letter Queue</TabsTrigger>
              <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
            </TabsList>
            <AnimatePresence mode="wait">
              <motion.div key={_tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <TabsContent value="timeline" className="mt-4">
                  <div className="space-y-2">
                    <AnimatePresence>
                      {deliveries.map((delivery) => (
                        <motion.div layout key={delivery.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                          <div className="flex items-start space-x-4 p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                            <div className="mt-1"><StatusIcon status={delivery.status} /></div>
                            <div className="flex-grow">
                              <p className="font-semibold">Event <span className="font-mono text-muted-foreground">{delivery.eventId}</span> {delivery.status}</p>
                              <p className="text-sm text-muted-foreground">{new Date(delivery.timestamp).toLocaleString()}</p>
                              {delivery.status === 'retrying' && <RetrySchedule attempt={delivery.retryAttempt} />}
                            </div>
                            <div className="text-right">
                                <Badge variant={delivery.statusCode && delivery.statusCode >= 400 ? "destructive" : "secondary"}>
                                    {delivery.statusCode ? `HTTP ${delivery.statusCode}` : 'Pending'}
                                </Badge>
                                <p className="text-sm font-mono text-muted-foreground mt-1">{delivery.latency}ms</p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground self-center"/>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </TabsContent>
                <TabsContent value="dead-letter" className="mt-4">
                    <Card>
                        <CardContent className="p-4 space-y-3">
                            <AnimatePresence>
                            {deadLetters.length > 0 ? deadLetters.map(dl => (
                                <motion.div layout key={dl.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -50 }} className="flex items-center justify-between p-3 rounded-lg bg-card hover:bg-muted border border-border">
                                    <div>
                                        <p className="font-bold flex items-center"><AlertTriangle className="h-4 w-4 mr-2 text-red-500"/>Event ID: <span className="font-mono ml-2">{dl.eventId}</span></p>
                                        <p className="text-sm text-muted-foreground ml-6">To: {getEndpointUrl(dl.endpointId)}</p>
                                        <p className="text-sm ml-6">Reason: {dl.reason}</p>
                                    </div>
                                    <div className="flex space-x-2">
                                        <Button variant="outline" size="sm" onClick={() => handleRequeue(dl)}><RefreshCw className="mr-2 h-4 w-4"/>Re-queue</Button>
                                        <Button variant="destructive" size="sm" onClick={() => setDeadLetters(p => p.filter(d => d.id !== dl.id))}><Trash2 className="mr-2 h-4 w-4"/>Delete</Button>
                                    </div>
                                </motion.div>
                            )) : <p className="text-muted-foreground text-center p-4">Dead letter queue is empty.</p>}
                            </AnimatePresence>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="endpoints" className="mt-4">
                    <div className="flex justify-end mb-4">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button><PlusCircle className="mr-2 h-4 w-4"/>Add Endpoint</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add New Webhook Endpoint</DialogTitle>
                                </DialogHeader>
                                <p className="text-muted-foreground">Endpoint configuration form would be here.</p>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <div className="space-y-3">
                        {endpoints.map(ep => (
                            <motion.div key={ep.id} whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 400 }}>
                                <Card className="p-4 flex items-center justify-between border-border">
                                    <div className="flex items-center">
                                        <Server className="h-6 w-6 mr-4 text-muted-foreground"/>
                                        <div>
                                            <p className="font-semibold flex items-center">
                                                <span className={cn("h-2 w-2 rounded-full mr-2", ep.isActive ? 'bg-green-500' : 'bg-gray-500', 'inline-block')}></span>
                                                {ep.url}
                                            </p>
                                            <p className="text-sm text-muted-foreground">Created: {new Date(ep.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" aria-label="Endpoint Settings"><Settings className="h-4 w-4"/></Button>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </TabsContent>
              </motion.div>
            </AnimatePresence>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default WebhookDeliveryMonitor;
