import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Play, Pause, FileUp, MessageSquare, ShieldAlert, Wrench, CheckCircle2 } from "lucide-react";

type EventType = "TASK_CREATED" | "MESSAGE_SENT" | "FILE_UPLOADED" | "AGENT_COMPLETED" | "ERROR_OCCURRED";

interface PlatformEvent {
  id: string;
  type: EventType;
  description: string;
  user: {
    name: string;
    avatarUrl?: string;
  };
  timestamp: Date;
}

const eventIcons: { [key in EventType]: React.ElementType } = {
  TASK_CREATED: Wrench,
  MESSAGE_SENT: MessageSquare,
  FILE_UPLOADED: FileUp,
  AGENT_COMPLETED: CheckCircle2,
  ERROR_OCCURRED: ShieldAlert,
};

const users = [
    { name: "Alex Johnson", avatarUrl: "https://i.pravatar.cc/150?u=a042581f4e29026704d" },
    { name: "Maria Garcia", avatarUrl: "https://i.pravatar.cc/150?u=a042581f4e29026704e" },
    { name: "James Smith", avatarUrl: "https://i.pravatar.cc/150?u=a042581f4e29026704f" },
    { name: "System" },
];

const eventTypes: EventType[] = ["TASK_CREATED", "MESSAGE_SENT", "FILE_UPLOADED", "AGENT_COMPLETED", "ERROR_OCCURRED"];
const descriptions: { [key in EventType]: string } = {
    TASK_CREATED: "Created a new task: 'Analyze market trends'",
    MESSAGE_SENT: "Sent a message to the team",
    FILE_UPLOADED: "Uploaded 'Q2_Report.pdf'",
    AGENT_COMPLETED: "Agent 'DataMiner' completed its run successfully",
    ERROR_OCCURRED: "An error occurred in 'WebScraper' agent",
};

const generateMockEvent = (): PlatformEvent => {
    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const user = users[Math.floor(Math.random() * users.length)];
    return {
      id: `evt-${Date.now()}-${Math.random()}`,
      type,
      description: descriptions[type],
      user: {
        name: user.name,
        avatarUrl: user.name === "System" ? undefined : user.avatarUrl,
      },
      timestamp: new Date(),
    };
};

const generateInitialMockEvents = (count: number): PlatformEvent[] => {
  return Array.from({ length: count }, (_, i) => {
    const type = eventTypes[i % eventTypes.length];
    const user = users[i % users.length];
    return {
      id: `evt-${Date.now()}-${i}`,
      type,
      description: descriptions[type],
      user: {
        name: user.name,
        avatarUrl: user.name === "System" ? undefined : user.avatarUrl,
      },
      timestamp: new Date(Date.now() - (count - i) * 1000 * 30 - Math.random() * 1000 * 60),
    };
  }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
};

const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
    if (seconds < 5) return "just now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
};

export default function LiveActivityStream() {
  const [events, setEvents] = useState<PlatformEvent[]>([]);
  const [filter, setFilter] = useState<EventType | "ALL">("ALL");
  const [isPaused, setIsPaused] = useState(false);
  const [, setNow] = useState(new Date());
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEvents(generateInitialMockEvents(20));
  }, []);

  useEffect(() => {
    const liveTimer = setInterval(() => setNow(new Date()), 2000); // Update timestamps
    return () => clearInterval(liveTimer);
  }, []);

  useEffect(() => {
    if (isPaused) return;

    const eventTimer = setInterval(() => {
      setEvents(prevEvents => {
        const newEvents = [...prevEvents, generateMockEvent()];
        return newEvents.length > 50 ? newEvents.slice(newEvents.length - 50) : newEvents;
      });
    }, 4000);

    return () => clearInterval(eventTimer);
  }, [isPaused]);

  useEffect(() => {
    if (!isPaused && viewportRef.current) {
      setTimeout(() => {
        if (viewportRef.current) {
            viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' });
        }
      }, 100);
    }
  }, [events, isPaused]);

  const filteredEvents = useMemo(() => {
    if (filter === "ALL") return events;
    return events.filter(event => event.type === filter);
  }, [events, filter]);

  return (
    <TooltipProvider>
      <Card className="w-full max-w-2xl mx-auto bg-background text-foreground border-border shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border">
          <CardTitle className="text-lg font-semibold">Live Activity Stream</CardTitle>
          <div className="flex items-center space-x-2">
              <Badge variant="outline" className="whitespace-nowrap font-mono text-sm">{filteredEvents.length} Events</Badge>
              <Select value={filter} onValueChange={(value: EventType | 'ALL') => setFilter(value)}>
                  <SelectTrigger className="w-[160px] h-9">
                      <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="ALL">All Events</SelectItem>
                      <SelectItem value="TASK_CREATED">Task Created</SelectItem>
                      <SelectItem value="MESSAGE_SENT">Message Sent</SelectItem>
                      <SelectItem value="FILE_UPLOADED">File Uploaded</SelectItem>
                      <SelectItem value="AGENT_COMPLETED">Agent Completed</SelectItem>
                      <SelectItem value="ERROR_OCCURRED">Error Occurred</SelectItem>
                  </SelectContent>
              </Select>
              <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setIsPaused(!isPaused)}>
                        {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{isPaused ? "Resume Stream" : "Pause Stream"}</p>
                </TooltipContent>
              </Tooltip>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[450px]">
              <div className="p-6 space-y-2">
                  <AnimatePresence initial={false}>
                      {filteredEvents.map(event => (
                          <motion.div
                              key={event.id}
                              layout
                              initial={{ opacity: 0, y: 20, scale: 0.98, x: 50 }}
                              animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
                              exit={{ opacity: 0, transition: { duration: 0.2 } }}
                              transition={{ type: "spring", stiffness: 260, damping: 25 }}
                              className="flex items-start space-x-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                              <Avatar className="h-9 w-9 border-2 border-muted">
                                  <AvatarImage src={event.user.avatarUrl} alt={event.user.name} />
                                  <AvatarFallback className="text-xs">{event.user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                  <p className="text-sm text-muted-foreground truncate">
                                      <span className="font-semibold text-foreground">{event.user.name}</span>
                                      {' '}{event.description}
                                  </p>
                                  <p className="text-xs text-muted-foreground/80 pt-1">{formatRelativeTime(event.timestamp)}</p>
                              </div>
                              <Tooltip>
                                <TooltipTrigger>
                                    {React.createElement(eventIcons[event.type], { className: "h-5 w-5 text-muted-foreground flex-shrink-0" })}
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{event.type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}</p>
                                </TooltipContent>
                              </Tooltip>
                          </motion.div>
                      ))}
                  </AnimatePresence>
              </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
