import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, StepForward, StepBack, History, Filter, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// Mock Data and Types
type Event = {
  id: number;
  type: 'USER_CREATED' | 'USER_UPDATED' | 'ORDER_PLACED' | 'ORDER_SHIPPED';
  timestamp: string;
  payload: Record<string, any>;
  aggregateId: string;
};

const mockEvents: Event[] = [
  { id: 1, type: 'USER_CREATED', timestamp: '2023-10-27T10:00:00Z', payload: { name: 'Alice', email: 'alice@example.com' }, aggregateId: 'user-123' },
  { id: 2, type: 'USER_UPDATED', timestamp: '2023-10-27T10:05:00Z', payload: { email: 'new.alice@example.com' }, aggregateId: 'user-123' },
  { id: 3, type: 'ORDER_PLACED', timestamp: '2023-10-27T10:10:00Z', payload: { items: ['book', 'pen'], total: 25.50 }, aggregateId: 'order-456' },
  { id: 4, type: 'USER_UPDATED', timestamp: '2023-10-27T10:15:00Z', payload: { address: '123 Main St' }, aggregateId: 'user-123' },
  { id: 5, type: 'ORDER_SHIPPED', timestamp: '2023-10-27T10:20:00Z', payload: { trackingNumber: 'ABC123XYZ' }, aggregateId: 'order-456' },
];

const EventSourcingViewer = () => {
    const [events, setEvents] = useState<Event[]>(mockEvents);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<string>('');
  const [filterAggregate, setFilterAggregate] = useState<string>("");

  const filteredEvents = useMemo(() => {
    return events.filter(event => 
      (filterType === '' || event.type.includes(filterType.toUpperCase())) &&
      (filterAggregate === '' || event.aggregateId.includes(filterAggregate))
    );
  }, [events, filterType, filterAggregate]);

  useEffect(() => {
    if (isPlaying) {
      if (activeIndex >= filteredEvents.length - 1) {
        setIsPlaying(false);
        return;
      }
      const timer = setInterval(() => {
        setActiveIndex(prevIndex => {
          if (prevIndex >= filteredEvents.length - 1) {
            clearInterval(timer);
            setIsPlaying(false);
            return prevIndex;
          }
          return prevIndex + 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isPlaying, activeIndex, filteredEvents.length]);

  const handleStepBack = useCallback(() => {
    setActiveIndex(prev => Math.max(-1, prev - 1));
  }, []);

  const handleStepForward = useCallback(() => {
    setActiveIndex(prev => Math.min(filteredEvents.length - 1, prev + 1));
  }, [filteredEvents.length]);

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);


  const aggregateState = useMemo(() => {
    if (activeIndex === -1) return {};
    const activeEvents = filteredEvents.slice(0, activeIndex + 1);
    return activeEvents.reduce((acc, event) => {
      return { ...acc, [event.aggregateId]: { ...acc[event.aggregateId], ...event.payload } };
    }, {} as Record<string, any>);
  }, [activeIndex, filteredEvents]);

  const getBadgeVariant = (type: Event['type']) => {
    switch (type) {
      case 'USER_CREATED': return 'secondary';
      case 'USER_UPDATED': return 'outline';
      case 'ORDER_PLACED': return 'default';
      case 'ORDER_SHIPPED': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <Card className="w-full max-w-6xl mx-auto bg-card text-foreground shadow-2xl h-[800px] flex flex-col">
      <CardHeader className="border-b border-border">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2"><History className="w-6 h-6" /> Event Sourcing Viewer</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Filter by type..." value={filterType} onChange={e => setFilterType(e.target.value)} className="pl-8 w-48" />
            </div>
            <div className="relative">
              <Filter className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Filter by aggregate ID..." value={filterAggregate} onChange={e => setFilterAggregate(e.target.value)} className="pl-8 w-48" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-0 flex overflow-hidden">
        <div className="w-1/2 border-r border-border overflow-y-auto p-4 space-y-2">
          <AnimatePresence>
            {filteredEvents.map((event, index) => (
              <motion.div key={event.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className={cn(
                "p-3 rounded-lg border transition-all",
                activeIndex === index ? 'bg-primary/10 border-primary' : 'bg-card-foreground/5 border-border'
              )} onClick={() => setActiveIndex(index)}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Badge variant={getBadgeVariant(event.type)}>{event.type}</Badge>
                    <span className="text-xs text-muted-foreground">{event.aggregateId}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(event.timestamp).toLocaleTimeString()}</span>
                </div>
                <pre className="text-xs mt-2 p-2 bg-background/50 rounded whitespace-pre-wrap">{JSON.stringify(event.payload, null, 2)}</pre>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div className="w-1/2 p-4">
          <Tabs defaultValue="state" className="h-full flex flex-col">
            <TabsList>
              <TabsTrigger value="state">Aggregate State</TabsTrigger>
              <TabsTrigger value="projection">Projection Builder</TabsTrigger>
            </TabsList>
            <TabsContent value="state" className="flex-grow mt-2 bg-background/50 rounded-md p-4 overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.pre key={activeIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm whitespace-pre-wrap">
                  {JSON.stringify(aggregateState, null, 2)}
                </motion.pre>
              </AnimatePresence>
            </TabsContent>
            <TabsContent value="projection" className="flex-grow mt-2 text-center text-muted-foreground">
              <p>Projection Builder Interface Coming Soon</p>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
      <div className="border-t border-border p-3 flex justify-center items-center gap-4">
        <Button variant="outline" size="icon" aria-label="Step Back" onClick={handleStepBack} disabled={activeIndex <= -1}><StepBack className="w-5 h-5" /></Button>
        <Button variant="outline" size="icon" aria-label={isPlaying ? 'Pause' : 'Play'} onClick={togglePlay}>{isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}</Button>
        <Button variant="outline" size="icon" aria-label="Step Forward" onClick={handleStepForward} disabled={activeIndex >= filteredEvents.length - 1}><StepForward className="w-5 h-5" /></Button>
      </div>
    </Card>
  );
};

export default EventSourcingViewer;
