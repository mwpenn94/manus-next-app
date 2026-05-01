import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Plus, Minus, Trash2, GripVertical, Clock, Calendar, MoveHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Mock data for events
const initialEvents = [
  { id: 1, time: 10, title: 'Event 1', category: 'Meeting' },
  { id: 2, time: 30, title: 'Event 2', category: 'Task' },
  { id: 3, time: 60, title: 'Event 3', category: 'Reminder' },
  { id: 4, time: 85, title: 'Event 4', category: 'Meeting' },
];

const TOTAL_DURATION = 100;
const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const GRID_INTERVAL = 10;

const TimelineEditor = () => {
  const [events, setEvents] = useState(initialEvents);
  const [zoom, setZoom] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLDivElement>(null);
  const viewportX = useMotionValue(0);

  const timelineWidth = useMemo(() => (timelineRef.current?.offsetWidth || 0) * zoom, [zoom]);

  const addEvent = () => {
    const newEvent = {
      id: Date.now(),
      time: Math.random() * TOTAL_DURATION,
      title: `New Event ${events.length + 1}`,
      category: 'Task',
    };
    setEvents([...events, newEvent]);
  };

  const removeEvent = (id: number) => {
    setEvents(events.filter(event => event.id !== id));
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, MAX_ZOOM));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.5, MIN_ZOOM));

  const handleMarkerDrag = (id: number, info: any) => {
    if (!timelineRef.current) return;
    const timelineRect = timelineRef.current.getBoundingClientRect();
    const newTime = ((info.point.x - timelineRect.left) / timelineWidth) * TOTAL_DURATION;
    const snappedTime = Math.round(newTime / (GRID_INTERVAL / 10)) * (GRID_INTERVAL / 10);
    setEvents(events.map(e => e.id === id ? { ...e, time: Math.max(0, Math.min(snappedTime, TOTAL_DURATION)) } : e));
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(prev => (prev + 0.1) % TOTAL_DURATION);
    }, 100);
    return () => clearInterval(timer);
  }, []);

  const gridLines = useMemo(() => {
    const numLines = Math.floor(TOTAL_DURATION / GRID_INTERVAL);
    return Array.from({ length: numLines }, (_, i) => (i + 1) * GRID_INTERVAL);
  }, []);

  const minimapViewportWidth = useMemo(() => {
    if (!minimapRef.current || !timelineRef.current) return 0;
    return (timelineRef.current.offsetWidth / timelineWidth) * minimapRef.current.offsetWidth;
  }, [timelineWidth]);

  const minimapViewportX = useTransform(
    viewportX,
    [-timelineWidth + (timelineRef.current?.offsetWidth || 0), 0],
    [ (minimapRef.current?.offsetWidth || 0) - minimapViewportWidth, 0]
  );

  return (
    <Card className="w-full max-w-4xl mx-auto bg-card text-foreground select-none">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Timeline Editor</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={addEvent}><Plus className="h-4 w-4 mr-2" /> Add Event</Button>
            <Button size="sm" variant="outline" onClick={handleZoomOut} disabled={zoom <= MIN_ZOOM}><Minus className="h-4 w-4" /></Button>
            <Button size="sm" variant="outline" onClick={handleZoomIn} disabled={zoom >= MAX_ZOOM}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>

        <div ref={timelineRef} className="relative w-full h-48 bg-background rounded-lg overflow-hidden cursor-grab active:cursor-grabbing">
          <motion.div
            className="relative h-full"
            style={{ width: timelineWidth, x: viewportX }}
            drag="x"
            dragConstraints={{ 
              left: -timelineWidth + (timelineRef.current?.offsetWidth || 0),
              right: 0 
            }}
          >
            {/* Grid Lines */}
            {gridLines.map(time => (
              <div key={time} className="absolute top-0 bottom-0 w-px bg-border"
                   style={{ left: `${(time / TOTAL_DURATION) * 100}%` }}>
                <span className="absolute -top-5 -translate-x-1/2 text-xs text-muted-foreground">{time}s</span>
              </div>
            ))}

            {/* Current Time Indicator */}
            <motion.div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
              style={{ left: `${(currentTime / TOTAL_DURATION) * 100}%` }}
              transition={{ duration: 0.1, ease: 'linear' }}
            >
                <div className="absolute -top-2 -translate-x-1/2 bg-red-500 p-1 rounded-full">
                    <Clock className="h-3 w-3 text-white" />
                </div>
            </motion.div>

            {/* Events */}
            <AnimatePresence>
              {events.map(event => (
                <motion.div
                  key={event.id}
                  className="absolute top-1/2 -translate-y-1/2 z-10 group"
                  style={{ left: `${(event.time / TOTAL_DURATION) * 100}%` }}
                  drag
                  dragMomentum={false}
                  onDrag={(e, info) => handleMarkerDrag(event.id, info)}
                  dragConstraints={timelineRef}
                  layout
                >
                  <div className="relative flex flex-col items-center">
                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-pointer" />
                    <div className="hidden group-hover:block absolute bottom-full mb-2 w-max bg-card p-2 rounded-md shadow-lg border border-border">
                      <p className="font-bold">{event.title}</p>
                      <p className="text-sm text-muted-foreground">Time: {event.time.toFixed(1)}s</p>
                      <Badge variant="secondary">{event.category}</Badge>
                      <Button size="icon" variant="ghost" className="absolute top-0 right-0 h-6 w-6" onClick={() => removeEvent(event.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Minimap */}
        <div className="mt-4 h-12 bg-background rounded-lg relative" ref={minimapRef}>
            <div className="relative w-full h-full">
                {events.map(event => (
                    <div key={`map-${event.id}`}
                         className="absolute top-1/2 -translate-y-1/2 h-4 w-1 bg-primary rounded-full"
                         style={{ left: `${(event.time / TOTAL_DURATION) * 100}%` }} />
                ))}
                <motion.div 
                    className="absolute top-0 h-full bg-primary/20 border-x border-primary cursor-pointer"
                    style={{ width: minimapViewportWidth, x: minimapViewportX }}
                    drag="x"
                    dragConstraints={minimapRef}
                    dragMomentum={false}
                    onDrag={(e, info) => {
                        if(!minimapRef.current || !timelineRef.current) return;
                        const minimapWidth = minimapRef.current.offsetWidth;
                        const newViewportX = -(info.point.x / minimapWidth) * timelineWidth;
                        viewportX.set(Math.max(-timelineWidth + timelineRef.current.offsetWidth, Math.min(0, newViewportX)));
                    }}
                />
            </div>
        </div>

      </CardContent>
    </Card>
  );
};

export default TimelineEditor;
